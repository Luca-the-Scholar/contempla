import { supabase } from "@/integrations/supabase/client";

/**
 * Check if Spotify autoplay is enabled for the current user.
 * Returns true only if user has connected Spotify, selected a playlist,
 * and enabled the autoplay setting.
 */
export async function isSpotifyAutoplayEnabled(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: settings, error } = await supabase
      .from('spotify_settings')
      .select('play_on_meditation_start, selected_playlist_id, access_token')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !settings) return false;

    return !!(
      settings.play_on_meditation_start &&
      settings.selected_playlist_id &&
      settings.access_token
    );
  } catch {
    return false;
  }
}

/**
 * Trigger Spotify playback when meditation starts.
 * Fails gracefully if Spotify is not configured or unavailable.
 * 
 * This function:
 * - Checks if autoplay is enabled and playlist is selected
 * - Calls the spotify-play edge function to start playback
 * - Returns success: false (without throwing) if anything fails
 */
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

    // Standardized payload for play action
    const payload = { 
      action: 'play',
      playlist_id: settings.selected_playlist_id,
    };
    console.log('[Spotify] Play payload:', JSON.stringify(payload));

    const { data, error } = await supabase.functions.invoke('spotify-play', {
      body: payload,
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
