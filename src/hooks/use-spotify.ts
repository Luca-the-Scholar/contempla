import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

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
/**
 * Open the Spotify app on native iOS/Android devices.
 * Falls back to opening Spotify web on other platforms.
 */
async function openSpotifyApp(playlistId?: string): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  
  // Use Spotify URI scheme to open the app
  const spotifyUri = playlistId 
    ? `spotify:playlist:${playlistId}`
    : 'spotify://';
  
  const spotifyWebUrl = playlistId
    ? `https://open.spotify.com/playlist/${playlistId}`
    : 'https://open.spotify.com';

  if (isNative) {
    try {
      // Try to open Spotify app directly
      await Browser.open({ url: spotifyUri });
      console.log('[Spotify] Opened Spotify app');
    } catch {
      // Fallback to web URL if app isn't installed
      console.log('[Spotify] App not installed, opening web');
      await Browser.open({ url: spotifyWebUrl });
    }
  } else {
    // On web, open in new tab
    window.open(spotifyWebUrl, '_blank');
  }
}

export async function startSpotifyPlayback(): Promise<{ success: boolean; error?: string; reqId?: string; openedApp?: boolean }> {
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
      // Try to extract reqId from error context
      let reqId: string | undefined;
      try {
        const ctx = (error as any)?.context as Response | undefined;
        if (ctx) {
          const text = await ctx.text();
          const parsed = JSON.parse(text);
          reqId = parsed?.reqId;
        }
      } catch {
        // ignore
      }
      console.error('[Spotify] Play error:', { error: error.message, reqId });
      return { success: false, error: error.message, reqId };
    }

    if (data?.error) {
      const reqId = data?.reqId;
      const errorMsg = data.error?.toLowerCase() || '';
      
      // Check if error is due to no active device
      if (errorMsg.includes('no active device') || errorMsg.includes('no device') || data.code === 'NO_ACTIVE_DEVICE') {
        console.log('[Spotify] No active device, opening Spotify app');
        await openSpotifyApp(settings.selected_playlist_id);
        return { success: false, error: 'Opening Spotify app...', openedApp: true };
      }
      
      console.error('[Spotify] Play error:', { error: data.error, reqId });
      return { success: false, error: data.error, reqId };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Spotify] Playback error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Stop/pause Spotify playback when meditation ends.
 * Fails gracefully if Spotify is not configured or unavailable.
 */
export async function stopSpotifyPlayback(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    // Get user's Spotify settings to check if connected
    const { data: settings, error: settingsError } = await supabase
      .from('spotify_settings')
      .select('access_token, play_on_meditation_start')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError || !settings?.access_token) {
      return { success: false };
    }

    // Only stop if autoplay was enabled (user started music via the app)
    if (!settings.play_on_meditation_start) {
      return { success: false };
    }

    const { data, error } = await supabase.functions.invoke('spotify-play', {
      body: { action: 'pause' },
    });

    if (error || data?.error) {
      console.log('[Spotify] Pause failed (may be expected):', error?.message || data?.error);
      return { success: false, error: error?.message || data?.error };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[Spotify] Stop playback error:', error);
    return { success: false, error: error.message };
  }
}
