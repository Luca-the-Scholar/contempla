import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    console.log('Spotify callback received:', { code: !!code, state, error });

    if (error) {
      console.error('Spotify auth error:', error);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${state}?spotify_error=${error}`,
        },
      });
    }

    if (!code || !state) {
      console.error('Missing code or state');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${state || '/'}?spotify_error=missing_params`,
        },
      });
    }

    const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
    const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!clientId || !clientSecret) {
      console.error('Missing Spotify credentials');
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${state}?spotify_error=config_error`,
        },
      });
    }

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/spotify-callback`;
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenData);
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${state}?spotify_error=token_exchange_failed`,
        },
      });
    }

    // Return tokens via URL fragment (client will store them)
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
    
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `${state}?spotify_success=true&access_token=${tokenData.access_token}&refresh_token=${tokenData.refresh_token}&expires_at=${expiresAt}`,
      },
    });
  } catch (error) {
    console.error('Callback error:', error);
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': `/?spotify_error=server_error`,
      },
    });
  }
});
