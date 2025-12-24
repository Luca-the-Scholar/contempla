import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Build allowed origins list from environment or use production defaults
const ALLOWED_ORIGINS = (() => {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim());
  }
  // Default production origins
  return [
    'https://contempla.lovable.app',
    'https://c0338147-c332-4b2c-b5d7-a5ad61c0e9ec.lovableproject.com'
  ];
})();

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.some(o => 
    origin === o || origin.endsWith('.lovableproject.com') || origin.endsWith('.lovable.app')
  ) ? origin : ALLOWED_ORIGINS[0];
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
  console.error('[spotify-playlists] Error response:', JSON.stringify(body));
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper to handle Spotify API responses
async function handleSpotifyResponse(response: Response, context: string, corsHeaders: Record<string, string>): Promise<{ data: unknown; error: Response | null }> {
  const rawText = await response.text();
  console.log(`[spotify-playlists] ${context} - Status: ${response.status}, Body: ${rawText.substring(0, 500)}${rawText.length > 500 ? '...' : ''}`);
  
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error(`[spotify-playlists] ${context} - Failed to parse response as JSON`);
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
      console.error(`[spotify-playlists] [${reqId}] Failed to read body:`, e);
    }
  }
  
  console.log(`[spotify-playlists] [${reqId}] DIAGNOSTIC:`, {
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

    console.log('[spotify-playlists] Fetching ALL Spotify playlists with pagination...');

    // Fetch ALL playlists with pagination
    const allItems: any[] = [];
    let nextUrl: string | null = 'https://api.spotify.com/v1/me/playlists?limit=50';
    let pageCount = 0;

    while (nextUrl) {
      pageCount++;
      console.log(`[spotify-playlists] Fetching page ${pageCount}: ${nextUrl}`);
      
      const playlistsResponse = await fetch(nextUrl, {
        headers: {
          'Authorization': `Bearer ${settings.access_token}`,
        },
      });

      const { data: playlistsData, error: playlistsError } = await handleSpotifyResponse(playlistsResponse, `Fetch Playlists Page ${pageCount}`, corsHeaders);
      if (playlistsError) return playlistsError;

      const items = (playlistsData as any)?.items || [];
      allItems.push(...items);
      
      // Get next page URL (null when no more pages)
      nextUrl = (playlistsData as any)?.next || null;
    }

    // Map ALL playlists (owned + followed) with owner info
    const playlists = allItems.map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.url || null,
      tracks_total: p.tracks?.total || 0,
      owner_name: p.owner?.display_name || p.owner?.id || null,
    }));

    console.log(`[spotify-playlists] Found ${playlists.length} total playlists across ${pageCount} pages`);

    return new Response(JSON.stringify({ playlists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    
    console.error('[spotify-playlists] Unhandled error:', { message, stack });
    return errorResponse(message, corsHeaders, { stack }, null, 500);
  }
});
