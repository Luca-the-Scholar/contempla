import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_CLIENT_ID = Deno.env.get('SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

// Helper to create consistent error responses
function errorResponse(error: string, details?: unknown, spotifyError?: unknown, status = 400): Response {
  const body = {
    error,
    details: details ?? null,
    spotify_error: spotifyError ?? null,
    status,
  };
  console.error('[spotify-auth] Error response:', JSON.stringify(body));
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Helper to handle Spotify API responses
async function handleSpotifyResponse(response: Response, context: string): Promise<{ data: unknown; error: Response | null }> {
  const rawText = await response.text();
  console.log(`[spotify-auth] ${context} - Status: ${response.status}, Body: ${rawText}`);
  
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    console.error(`[spotify-auth] ${context} - Failed to parse response as JSON`);
  }
  
  if (!response.ok) {
    const spotifyError = parsed && typeof parsed === 'object' ? parsed : { raw: rawText };
    const errorMessage = (parsed as any)?.error_description || (parsed as any)?.error?.message || (parsed as any)?.error || `Spotify API error (${response.status})`;
    return {
      data: null,
      error: errorResponse(errorMessage, { context, httpStatus: response.status }, spotifyError, response.status >= 500 ? 502 : 400),
    };
  }
  
  return { data: parsed, error: null };
}

serve(async (req) => {
  // ========== DIAGNOSTIC LOGGING START ==========
  const reqId = crypto.randomUUID();
  const method = req.method;
  const contentType = req.headers.get('content-type');
  
  // Read body once using req.text() - NEVER use req.json()
  let rawBody = '';
  if (method !== 'GET' && method !== 'OPTIONS') {
    try {
      rawBody = await req.text();
    } catch (e) {
      console.error(`[spotify-auth] [${reqId}] Failed to read body:`, e);
    }
  }
  
  console.log(`[spotify-auth] [${reqId}] DIAGNOSTIC:`, {
    method,
    contentType,
    bodyLength: rawBody.length,
    bodyPreview: rawBody.substring(0, 500),
  });
  // ========== DIAGNOSTIC LOGGING END ==========

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    // Support action from both query params (legacy) AND JSON body (new standard)
    let action = url.searchParams.get('action');
    let bodyData: Record<string, unknown> = {};
    
    // Parse body if available
    if (rawBody && rawBody.trim()) {
      try {
        bodyData = JSON.parse(rawBody);
        // If action is in body, use it (overrides query param)
        if (bodyData.action && typeof bodyData.action === 'string') {
          action = bodyData.action;
        }
      } catch {
        // Body parse failed - will be handled by specific action handlers
      }
    }
    
    const hasAuthHeader = !!req.headers.get('authorization');
    console.log(`[spotify-auth] [${reqId}] Action: ${action}`, { hasAuthHeader, method: req.method, bodyKeys: Object.keys(bodyData) });

    // Generate authorization URL
    if (action === 'authorize') {
      // Support redirect_uri from query param (legacy) or body (new)
      const redirectUri = url.searchParams.get('redirect_uri') || (bodyData.redirect_uri as string);
      if (!redirectUri) {
        return errorResponse('redirect_uri is required', { action, reqId });
      }

      const clientId = requireEnv('SPOTIFY_CLIENT_ID', SPOTIFY_CLIENT_ID);

      console.log(`[spotify-auth] [${reqId}] Authorize redirect_uri:`, redirectUri);

      const scopes = [
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-modify-playback-state',
        'user-read-playback-state'
      ].join(' ');

      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('show_dialog', 'true');

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange code for tokens (called via POST with body containing code)
    // Match if action=callback OR POST with no action but body has code
    if (action === 'callback' || (req.method === 'POST' && !action && bodyData.code)) {
      // Handle empty body
      if (!rawBody || rawBody.trim() === '') {
        console.error(`[spotify-auth] [${reqId}] Empty body received`);
        return new Response(JSON.stringify({ error: 'Empty body', reqId }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Use already parsed bodyData
      const code = bodyData.code as string;
      const redirect_uri = bodyData.redirect_uri as string;
      const user_id = bodyData.user_id as string;
      
      if (!code || !redirect_uri || !user_id) {
        return errorResponse('code, redirect_uri, and user_id are required', { 
          code: !!code, 
          redirect_uri: !!redirect_uri, 
          user_id: !!user_id,
          reqId,
        });
      }

      const clientId = requireEnv('SPOTIFY_CLIENT_ID', SPOTIFY_CLIENT_ID);
      const clientSecret = requireEnv('SPOTIFY_CLIENT_SECRET', SPOTIFY_CLIENT_SECRET);

      console.log(`[spotify-auth] [${reqId}] Exchanging code for tokens...`, {
        redirect_uri,
        user_id,
        code_length: code.length,
      });

      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
        }),
      });

      const { data: tokenData, error: tokenError } = await handleSpotifyResponse(tokenResponse, 'Token Exchange');
      if (tokenError) return tokenError;

      const tokens = tokenData as { access_token: string; refresh_token: string; expires_in: number };
      console.log('[spotify-auth] Token exchange successful');

      // Calculate token expiration time
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Store tokens in database using service role
      const supabase = createClient(
        requireEnv('SUPABASE_URL', SUPABASE_URL),
        requireEnv('SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY),
      );

      const { error: upsertError } = await supabase
        .from('spotify_settings')
        .upsert({
          user_id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('[spotify-auth] Database upsert error:', upsertError);
        return errorResponse('Failed to save Spotify tokens', { supabaseError: upsertError.message }, null, 500);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh access token
    if (action === 'refresh') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return errorResponse('Authorization header required', { action });
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      // Get user from JWT
      const anonSupabase = createClient(
        requireEnv('SUPABASE_URL', SUPABASE_URL),
        requireEnv('SUPABASE_ANON_KEY', SUPABASE_ANON_KEY),
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
      if (userError || !user) {
        return errorResponse('Unauthorized', { userError: userError?.message }, null, 401);
      }

      // Get refresh token from database
      const { data: settings, error: settingsError } = await supabase
        .from('spotify_settings')
        .select('refresh_token')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError || !settings?.refresh_token) {
        return errorResponse('No refresh token found', { settingsError: settingsError?.message, userId: user.id });
      }

      console.log('[spotify-auth] Refreshing Spotify token...');

      const clientId = requireEnv('SPOTIFY_CLIENT_ID', SPOTIFY_CLIENT_ID);
      const clientSecret = requireEnv('SPOTIFY_CLIENT_SECRET', SPOTIFY_CLIENT_SECRET);

      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: settings.refresh_token,
        }),
      });

      const { data: tokenData, error: tokenError } = await handleSpotifyResponse(tokenResponse, 'Token Refresh');
      if (tokenError) return tokenError;

      const tokens = tokenData as { access_token: string; expires_in: number; refresh_token?: string };
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Update tokens in database
      const { error: updateError } = await supabase
        .from('spotify_settings')
        .update({
          access_token: tokens.access_token,
          token_expires_at: expiresAt,
          ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('[spotify-auth] Token update error:', updateError);
        return errorResponse('Failed to update tokens', { supabaseError: updateError.message }, null, 500);
      }

      return new Response(JSON.stringify({ 
        access_token: tokens.access_token,
        expires_at: expiresAt 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Disconnect Spotify
    if (action === 'disconnect') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return errorResponse('Authorization header required', { action });
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      const anonSupabase = createClient(
        requireEnv('SUPABASE_URL', SUPABASE_URL),
        requireEnv('SUPABASE_ANON_KEY', SUPABASE_ANON_KEY),
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
      if (userError || !user) {
        return errorResponse('Unauthorized', { userError: userError?.message }, null, 401);
      }

      const { error: deleteError } = await supabase
        .from('spotify_settings')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[spotify-auth] Delete error:', deleteError);
        return errorResponse('Failed to disconnect Spotify', { supabaseError: deleteError.message }, null, 500);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return errorResponse(`Unknown action: ${action || 'none'}. Valid actions: authorize, refresh, disconnect`, { providedAction: action });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    const isConfigError = message.toLowerCase().includes('is not set');
    
    console.error('[spotify-auth] Unhandled error:', { message, stack });
    return errorResponse(message, { stack }, null, isConfigError ? 500 : 400);
  }
});
