import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { playlist_id } = await req.json();
    
    if (!playlist_id) {
      throw new Error('playlist_id is required');
    }

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

    // Get access token from database
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: settings, error: settingsError } = await supabase
      .from('spotify_settings')
      .select('access_token, token_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError || !settings?.access_token) {
      throw new Error('Spotify not connected');
    }

    // Check if token is expired
    if (new Date(settings.token_expires_at) < new Date()) {
      throw new Error('Token expired - refresh required');
    }

    console.log(`Starting playback for playlist: ${playlist_id}`);

    // Start playback on Spotify
    // First, try to get user's available devices
    const devicesResponse = await fetch('https://api.spotify.com/v1/me/player/devices', {
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
      },
    });

    const devicesData = await devicesResponse.json();
    console.log('Available devices:', devicesData);

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

    // 204 = success, 404 = no active device
    if (playResponse.status === 204) {
      console.log('Playback started successfully');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (playResponse.status === 404) {
      // No active device - try to activate one if available
      if (devicesData.devices && devicesData.devices.length > 0) {
        const device = devicesData.devices[0];
        console.log(`Activating device: ${device.name}`);
        
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

        if (transferResponse.status === 204) {
          // Now try to play again
          await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${settings.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              context_uri: `spotify:playlist:${playlist_id}`,
            }),
          });
          
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      
      throw new Error('No active Spotify device found. Please open Spotify on a device first.');
    }

    const errorData = await playResponse.json().catch(() => ({}));
    console.error('Spotify play error:', errorData);
    throw new Error(errorData.error?.message || 'Failed to start playback');

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Spotify play error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
