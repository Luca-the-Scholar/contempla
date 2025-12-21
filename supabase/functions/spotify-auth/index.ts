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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    console.log(`Spotify auth action: ${action}`);

    // Generate authorization URL
    if (action === 'authorize') {
      const redirectUri = url.searchParams.get('redirect_uri');
      if (!redirectUri) {
        throw new Error('redirect_uri is required');
      }

      const scopes = [
        'playlist-read-private',
        'playlist-read-collaborative',
        'user-modify-playback-state',
        'user-read-playback-state'
      ].join(' ');

      const authUrl = new URL('https://accounts.spotify.com/authorize');
      authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID!);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('show_dialog', 'true');

      return new Response(JSON.stringify({ url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Exchange code for tokens
    if (action === 'callback') {
      const { code, redirect_uri, user_id } = await req.json();
      
      if (!code || !redirect_uri || !user_id) {
        throw new Error('code, redirect_uri, and user_id are required');
      }

      console.log('Exchanging code for tokens...');

      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('Spotify token error:', tokenData);
        throw new Error(tokenData.error_description || tokenData.error);
      }

      console.log('Token exchange successful');

      // Calculate token expiration time
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Store tokens in database using service role
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      const { error: upsertError } = await supabase
        .from('spotify_settings')
        .upsert({
          user_id,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_expires_at: expiresAt,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Database upsert error:', upsertError);
        throw upsertError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh access token
    if (action === 'refresh') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Authorization header required');
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      // Get user from JWT
      const anonSupabase = createClient(
        SUPABASE_URL!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Unauthorized');
      }

      // Get refresh token from database
      const { data: settings, error: settingsError } = await supabase
        .from('spotify_settings')
        .select('refresh_token')
        .eq('user_id', user.id)
        .maybeSingle();

      if (settingsError || !settings?.refresh_token) {
        throw new Error('No refresh token found');
      }

      console.log('Refreshing Spotify token...');

      const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: settings.refresh_token,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('Token refresh error:', tokenData);
        throw new Error(tokenData.error_description || tokenData.error);
      }

      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

      // Update tokens in database
      const { error: updateError } = await supabase
        .from('spotify_settings')
        .update({
          access_token: tokenData.access_token,
          token_expires_at: expiresAt,
          ...(tokenData.refresh_token && { refresh_token: tokenData.refresh_token }),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Token update error:', updateError);
        throw updateError;
      }

      return new Response(JSON.stringify({ 
        access_token: tokenData.access_token,
        expires_at: expiresAt 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Disconnect Spotify
    if (action === 'disconnect') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Authorization header required');
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      const anonSupabase = createClient(
        SUPABASE_URL!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: { user }, error: userError } = await anonSupabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Unauthorized');
      }

      const { error: deleteError } = await supabase
        .from('spotify_settings')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        throw deleteError;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Spotify auth error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
