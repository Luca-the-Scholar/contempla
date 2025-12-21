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

    console.log('Fetching Spotify playlists...');

    // Fetch user's playlists from Spotify
    const playlistsResponse = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
      },
    });

    if (!playlistsResponse.ok) {
      const errorData = await playlistsResponse.json();
      console.error('Spotify API error:', errorData);
      throw new Error(errorData.error?.message || 'Failed to fetch playlists');
    }

    const playlistsData = await playlistsResponse.json();

    const playlists = playlistsData.items.map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.images?.[0]?.url || null,
      tracks_total: p.tracks?.total || 0,
    }));

    console.log(`Found ${playlists.length} playlists`);

    return new Response(JSON.stringify({ playlists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Spotify playlists error:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
