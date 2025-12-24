import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Build allowed origins list from environment or use production defaults
const ALLOWED_ORIGINS = (() => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim());
  }
  // Default production origins + localhost for development
  return [
    'https://contempla.lovable.app',
    'https://c0338147-c332-4b2c-b5d7-a5ad61c0e9ec.lovableproject.com',
    'http://localhost:5173',
    'http://localhost:4173',
    'http://localhost:8080',
  ];
})();

function getCorsHeaders(origin: string | null): Record<string, string> {
  // Allow Capacitor native origins (capacitor://, ionic://) and configured origins
  const isCapacitorOrigin = origin && (origin.startsWith('capacitor://') || origin.startsWith('ionic://'));
  const allowedOrigin = origin && (
    isCapacitorOrigin ||
    ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app'))
  ) ? origin : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Helper to create consistent error responses
function errorResponse(error: string, corsHeaders: Record<string, string>, details?: unknown, spotifyError?: unknown, status = 400): Response {
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
async function handleSpotifyResponse(response: Response, context: string, corsHeaders: Record<string, string>): Promise<{ data: unknown; error: Response | null }> {
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
      error: errorResponse(errorMessage, corsHeaders, { context, httpStatus: response.status }, spotifyError, response.status >= 500 ? 502 : 400),
    };
  }
  
  return { data: parsed, error: null };
}

serve(async (req) => {
  // Get origin for CORS
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);
  
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
      return errorResponse('Authorization header required', corsHeaders, { context: 'auth_check', reqId });
    }

    // Parse body from rawBody (never use req.json())
    let body: { playlist_id?: string; action?: string } = {};
    if (rawBody && rawBody.trim()) {
      try {
        body = JSON.parse(rawBody);
      } catch {
        return errorResponse('Invalid JSON body', corsHeaders, { context: 'parse_body', reqId, bodyPreview: rawBody.substring(0, 200) });
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
      return errorResponse('Unauthorized', corsHeaders, { userError: userError?.message }, null, 401);
    }

    // Get access token from database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: settings, error: settingsError } = await supabase
      .from('spotify_settings')
      .select('access_token, token_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError || !settings?.access_token) {
      return errorResponse('Spotify not connected', corsHeaders, { settingsError: settingsError?.message, userId: user.id });
    }

    // Check if token is expired
    if (new Date(settings.token_expires_at) < new Date()) {
      return errorResponse('Token expired - refresh required', corsHeaders, { expiresAt: settings.token_expires_at });
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

      const { error: pauseError } = await handleSpotifyResponse(pauseResponse, 'Pause Playback', corsHeaders);
      if (pauseError) return pauseError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // For play action, playlist_id is required
    if (!playlist_id) {
      return errorResponse('playlist_id is required for play action', corsHeaders, { providedBody: body, reqId });
    }

    console.log(`[spotify-play] Starting playback for playlist: ${playlist_id}`);

    // NEW APPROACH: Try to start playback FIRST without checking devices
    // This works in more scenarios and gives us better error information
    const basePlayUrl = 'https://api.spotify.com/v1/me/player/play';

    console.log('[spotify-play] Attempting playback (no device_id - let Spotify choose)');
    let playResponse = await fetch(basePlayUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        context_uri: `spotify:playlist:${playlist_id}`,
      }),
    });

    // 204 = success - playback started!
    if (playResponse.status === 204) {
      console.log('[spotify-play] Playback started successfully (no device targeting needed)');
      return new Response(JSON.stringify({ success: true, reqId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 403 = Forbidden - Premium required or restricted account
    if (playResponse.status === 403) {
      const forbiddenBody = await playResponse.text();
      console.log('[spotify-play] 403 Forbidden:', forbiddenBody);

      let reason = 'PREMIUM_REQUIRED';
      let message = 'Spotify Premium is required for remote playback control.';

      try {
        const parsed = JSON.parse(forbiddenBody);
        if (parsed.error?.reason === 'PREMIUM_REQUIRED') {
          message = 'Spotify Premium is required for remote playback control.';
        }
      } catch {
        // Use default message
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: message,
          code: reason,
          reqId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 401 = Unauthorized - Token expired or invalid
    if (playResponse.status === 401) {
      console.log('[spotify-play] 401 Unauthorized - token may be expired');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Spotify authentication expired. Please reconnect your Spotify account in Settings.',
          code: 'TOKEN_EXPIRED',
          reqId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 404 = No active device OR device not ready for remote control
    // NOW we check devices to give better diagnostics
    if (playResponse.status === 404) {
      console.log('[spotify-play] 404 - fetching devices for diagnostics');

      const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: {
          'Authorization': `Bearer ${settings.access_token}`,
        },
      });

      const { data: devicesData } = await handleSpotifyResponse(devicesResponse, 'Get Devices (after 404)', corsHeaders);
      const devices = (devicesData as any)?.devices || [];
      const deviceNames = devices.map((d: any) => d.name).join(', ');

      console.log('[spotify-play] Devices found:', deviceNames || 'none');

      if (devices.length === 0) {
        // No devices at all - Spotify app didn't activate in time
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Spotify app opened but device not ready yet. Please tap Play in Spotify once, then try again.',
            code: 'NO_ACTIVE_DEVICE',
            devices: [],
            reqId,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Devices exist but none are "ready" for playback
      // Use Transfer Playback API to ACTIVATE the device and start playback
      const targetDevice = devices[0];
      const targetDeviceId = targetDevice?.id;

      console.log('[spotify-play] Transferring playback to activate device:', targetDeviceId);

      // Step 1: Transfer playback to the device with play=true
      const transferResponse = await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${settings.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_ids: [targetDeviceId],
          play: true,
        }),
      });

      // 204 = Transfer successful
      if (transferResponse.status === 204) {
        console.log('[spotify-play] Device activated via transfer, now starting playlist...');

        // Step 2: Now start the playlist on the activated device
        playResponse = await fetch(`${basePlayUrl}?device_id=${encodeURIComponent(targetDeviceId)}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${settings.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            context_uri: `spotify:playlist:${playlist_id}`,
          }),
        });

        if (playResponse.status === 204) {
          console.log('[spotify-play] Playback started successfully after transfer');
          return new Response(JSON.stringify({ success: true, reqId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Transfer or playback failed
      const { error: transferError } = await handleSpotifyResponse(transferResponse, 'Transfer Playback', corsHeaders);
      if (transferError) {
        console.log('[spotify-play] Transfer failed, device may not support remote control');
        return new Response(
          JSON.stringify({
            success: false,
            error: `Found "${targetDevice.name}" but couldn't activate it. The Spotify app may need to be opened and played manually once.`,
            code: 'NO_ACTIVE_DEVICE',
            devices,
            reqId,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Fallback error
      return new Response(
        JSON.stringify({
          success: false,
          error: `Spotify is available on "${targetDevice.name}" but playback couldn't start. Try playing any song in Spotify first.`,
          code: 'NO_ACTIVE_DEVICE',
          devices,
          reqId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 429 = Rate limited
    if (playResponse.status === 429) {
      console.log('[spotify-play] 429 Rate Limited');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Spotify API rate limit exceeded. Please wait a moment and try again.',
          code: 'RATE_LIMITED',
          reqId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Handle other non-2xx responses
    const { error: playError } = await handleSpotifyResponse(playResponse, 'Start Playback (unexpected status)', corsHeaders);
    if (playError) return playError;

    return new Response(JSON.stringify({ success: true, reqId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error('[spotify-play] Unhandled error:', { message, stack });
    return errorResponse(message, corsHeaders, { stack }, null, 500);
  }
});
