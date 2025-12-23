import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Helper to create consistent error responses
function errorResponse(error: string, details?: unknown, spotifyError?: unknown, status = 400): Response {
  const body = {
    error,
    details: details ?? null,
    spotify_error: spotifyError ?? null,
    status,
  };
  console.error('[spotify-play] Error response:', JSON.stringify(body));
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper to handle Spotify API responses
async function handleSpotifyResponse(response: Response, context: string): Promise<{ data: unknown; error: Response | null }> {
  // For 204 No Content, return success
  if (response.status === 204) {
    console.log(`[spotify-play] ${context} - Status: 204 (No Content - Success)`);
    return { data: { success: true }, error: null };
  }
  
  const rawText = await response.text();
  console.log(`[spotify-play] ${context} - Status: ${response.status}, Body: ${rawText}`);
  
  let parsed: unknown = null;
  try {
    parsed = rawText ? JSON.parse(rawText) : null;
  } catch {
    console.error(`[spotify-play] ${context} - Failed to parse response as JSON`);
  }
  
  if (!response.ok) {
    const spotifyError = parsed && typeof parsed === 'object' ? parsed : { raw: rawText };
    const errorMessage = (parsed as any)?.error?.message || (parsed as any)?.error || `Spotify API error (${response.status})`;
    return {
      data: null,
      error: errorResponse(errorMessage, { context, httpStatus: response.status }, spotifyError, response.status >= 500 ? 502 : 400),
    };
  }
  
  return { data: parsed, error: null };
}

serve(async (req) => {
  // ========== DIAGNOSTIC LOGGING ==========
  const reqId = crypto.randomUUID();
  const method = req.method;
  const contentType = req.headers.get('content-type');
  
  let rawBody = '';
  if (method !== 'GET' && method !== 'OPTIONS') {
    try {
      rawBody = await req.text();
    } catch (e) {
      console.error(`[spotify-play] [${reqId}] Failed to read body:`, e);
    }
  }
  
  console.log(`[spotify-play] [${reqId}] DIAGNOSTIC:`, {
    method,
    contentType,
    bodyLength: rawBody.length,
    bodyPreview: rawBody.substring(0, 500),
  });
  // ========================================

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Authorization header required', { context: 'auth_check', reqId });
    }

    // Parse body from rawBody (never use req.json())
    let body: { playlist_id?: string; action?: string } = {};
    if (rawBody && rawBody.trim()) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return errorResponse('Invalid JSON body', { context: 'parse_body', reqId, bodyPreview: rawBody.substring(0, 200) });
      }
    }
    
    console.log(`[spotify-play] [${reqId}] Parsed body:`, JSON.stringify(body));
    
    const { playlist_id, action } = body;

    // Get user from JWT
    const anonSupabase = createClient(
      SUPABASE_URL!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('Unauthorized', { userError: userError?.message }, null, 401);
    }

    // Get access token from database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: settings, error: settingsError } = await supabase
      .from('spotify_settings')
      .select('access_token, token_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError || !settings?.access_token) {
      return errorResponse('Spotify not connected', { settingsError: settingsError?.message, userId: user.id });
    }

    // Check if token is expired
    if (new Date(settings.token_expires_at) < new Date()) {
      return errorResponse('Token expired - refresh required', { expiresAt: settings.token_expires_at });
    }

    // Handle pause action
    if (action === 'pause') {
      console.log('[spotify-play] Pausing playback');
      const pauseResponse = await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${settings.access_token}`,
        },
      });

      // 204 = success, 404 = no active device (also ok - nothing to pause)
      if (pauseResponse.status === 204 || pauseResponse.status === 404) {
        console.log('[spotify-play] Playback paused successfully');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error: pauseError } = await handleSpotifyResponse(pauseResponse, 'Pause Playback');
      if (pauseError) return pauseError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For play action, playlist_id is required
    if (!playlist_id) {
      return errorResponse('playlist_id is required for play action', { providedBody: body, reqId });
    }

    console.log(`[spotify-play] Starting playback for playlist: ${playlist_id}`);

    // First, try to get user's available devices
    const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
      },
    });

    const { data: devicesData, error: devicesError } = await handleSpotifyResponse(devicesResponse, 'Get Devices');
    if (devicesError) return devicesError;

    const devices = (devicesData as any)?.devices || [];
    console.log('[spotify-play] Available devices:', JSON.stringify(devicesData));

    // If no devices available at all, return early with NO_ACTIVE_DEVICE
    if (devices.length === 0) {
      console.log('[spotify-play] No devices available');
      return new Response(JSON.stringify({ 
        error: 'No active Spotify device found. Please open Spotify on a device first.', 
        code: 'NO_ACTIVE_DEVICE',
        devices: [] 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try to start playback
    const playResponse = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context_uri: `spotify:playlist:${playlist_id}`,
      }),
    });

    // 204 = success
    if (playResponse.status === 204) {
      console.log('[spotify-play] Playback started successfully');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 404 = no active device
    if (playResponse.status === 404) {
      const devices = (devicesData as any)?.devices;
      if (devices && devices.length > 0) {
        const device = devices[0];
        console.log(`[spotify-play] Activating device: ${device.name} (${device.id})`);
        
        const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${settings.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            device_ids: [device.id],
            play: true,
          }),
        });

        const { error: transferError } = await handleSpotifyResponse(transferResponse, 'Transfer Playback');
        if (transferError) return transferError;

        // Now try to play again
        const retryPlayResponse = await fetch('https://api.spotify.com/v1/me/player/play', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${settings.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context_uri: `spotify:playlist:${playlist_id}`,
          }),
        });

        const { error: retryError } = await handleSpotifyResponse(retryPlayResponse, 'Retry Play');
        if (retryError) return retryError;
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ 
        error: 'No active Spotify device found. Please open Spotify on a device first.', 
        code: 'NO_ACTIVE_DEVICE',
        devices 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle other non-2xx responses
    const { error: playError } = await handleSpotifyResponse(playResponse, 'Start Playback');
    if (playError) return playError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error('[spotify-play] Unhandled error:', { message, stack });
    return errorResponse(message, { stack }, null, 500);
  }
});
