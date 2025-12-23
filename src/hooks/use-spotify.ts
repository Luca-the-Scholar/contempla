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
 * Uses window.location.href for deep linking on iOS which triggers the native app.
 * Falls back to opening Spotify web on other platforms.
 */
export async function openSpotifyApp(playlistId?: string): Promise<boolean> {
  const isNative = Capacitor.isNativePlatform();
  
  // Use Spotify URI scheme to open the app
  const spotifyUri = playlistId 
    ? `spotify:playlist:${playlistId}`
    : 'spotify:';
  
  const spotifyWebUrl = playlistId
    ? `https://open.spotify.com/playlist/${playlistId}`
    : 'https://open.spotify.com';

  if (isNative) {
    try {
      // On iOS, assign to window.location.href to trigger the deep link
      // This is the most reliable way to open another app via URI scheme
      console.log('[Spotify] Attempting deep link:', spotifyUri);
      window.location.href = spotifyUri;
      return true;
    } catch (error) {
      console.log('[Spotify] Deep link failed, trying browser:', error);
      try {
        // Fallback to web URL if app isn't installed
        await Browser.open({ url: spotifyWebUrl });
        return true;
      } catch {
        console.log('[Spotify] Browser fallback also failed');
        return false;
      }
    }
  } else {
    // On web, open in new tab
    window.open(spotifyWebUrl, '_blank');
    return true;
  }
}

export async function startSpotifyPlayback(): Promise<{ success: boolean; error?: string; code?: string; reqId?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    // Get user's Spotify settings INCLUDING token_expires_at
    const { data: settings, error: settingsError } = await supabase
      .from('spotify_settings')
      .select('selected_playlist_id, play_on_meditation_start, access_token, token_expires_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsError || !settings) {
      return { success: false };
    }

    // Check if autoplay is enabled and playlist is selected
    if (!settings.play_on_meditation_start || !settings.selected_playlist_id || !settings.access_token) {
      return { success: false };
    }

    // Check if token is expired or expiring soon (within 5 minutes)
    const now = new Date();
    const expiresAt = new Date(settings.token_expires_at);
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt < fiveMinutesFromNow) {
      console.log('[Spotify] Token expired or expiring soon, refreshing...');

      // Call spotify-auth to refresh the token
      const { data: refreshData, error: refreshError } = await supabase.functions.invoke('spotify-auth', {
        body: { action: 'refresh' },
      });

      if (refreshError || refreshData?.error) {
        console.error('[Spotify] Token refresh failed:', refreshError?.message || refreshData?.error);
        return {
          success: false,
          error: 'Spotify authentication expired. Please reconnect Spotify in Settings.',
          code: 'TOKEN_EXPIRED'
        };
      }

      console.log('[Spotify] Token refreshed successfully');
    }

    // CRITICAL FIX: Open Spotify app first to activate the device
    // This works around Spotify's API limitation where devices only appear when actively playing
    console.log('[Spotify] Opening Spotify app to activate device...');
    await openSpotifyApp(settings.selected_playlist_id);

    // Give Spotify time to register the device and start playing (1.5s to handle audio session handoff)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Standardized payload for play action
    const payload = {
      action: 'play',
      playlist_id: settings.selected_playlist_id,
    };

    const { data, error } = await supabase.functions.invoke('spotify-play', {
      body: payload,
    });

    // If the function returned a non-2xx, try to parse the JSON body from the Response
    if (error) {
      let parsed: any = null;
      try {
        const ctx = (error as any)?.context as Response | undefined;
        if (ctx) {
          const text = await ctx.text();
          parsed = text ? JSON.parse(text) : null;
        }
      } catch {
        // ignore
      }

      const errorMsg = parsed?.error || error.message;
      const code = parsed?.code;
      const reqId = parsed?.reqId;

      return { success: false, error: errorMsg, code, reqId };
    }

    // The function may return { success: false, error, code } with 200 status for recoverable states
    if (data?.success === false || data?.error) {
      const errorMsg = data?.error || 'Spotify playback could not be started.';
      const code = data?.code as string | undefined;
      const reqId = data?.reqId as string | undefined;

      return { success: false, error: errorMsg, code, reqId };
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
