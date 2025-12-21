import { supabase } from "@/integrations/supabase/client";

export async function startSpotifyPlayback(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    // Get user's Spotify settings
    const { data: settings, error: settingsError } = await supabase
      .from('spotify_settings')
      .select('selected_playlist_id, play_on_meditation_start, access_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError || !settings) {
      return { success: false };
    }

    // Check if autoplay is enabled and playlist is selected
    if (!settings.play_on_meditation_start || !settings.selected_playlist_id || !settings.access_token) {
      return { success: false };
    }

    console.log('Starting Spotify playback...');

    const { data, error } = await supabase.functions.invoke('spotify-play', {
      body: { playlist_id: settings.selected_playlist_id },
    });

    if (error) {
      console.error('Spotify play error:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      console.error('Spotify play error:', data.error);
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Spotify playback error:', error);
    return { success: false, error: error.message };
  }
}
