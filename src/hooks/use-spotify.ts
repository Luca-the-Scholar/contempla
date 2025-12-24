import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";

// Token refresh lock to prevent concurrent refresh requests
let tokenRefreshPromise: Promise<void> | null = null;

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
 *
 * @param playlistId - Spotify playlist ID (not URI, just the ID)
 * @param returnToApp - If true, schedules a deep link back to Contempla after delay
 * @param returnDelayMs - Milliseconds to wait before returning to app (default 800ms)
 */
export async function openSpotifyApp(
  playlistId?: string,
  returnToApp: boolean = false,
  returnDelayMs: number = 800
): Promise<boolean> {
  const isNative = Capacitor.isNativePlatform();

  // Spotify URI for opening content
  const spotifyUri = playlistId
    ? `spotify:playlist:${playlistId}`
    : 'spotify:';

  const spotifyWebUrl = playlistId
    ? `https://open.spotify.com/playlist/${playlistId}`
    : 'https://open.spotify.com';

  if (isNative) {
    try {
      // On iOS, window.location.href is the most reliable way to open another app
      // This WILL switch to Spotify briefly to activate it as a device
      console.log('[Spotify] Opening Spotify with URI:', spotifyUri);
      window.location.href = spotifyUri;

      // Schedule return to Contempla using deep link
      if (returnToApp) {
        setTimeout(() => {
          console.log('[Spotify] Returning to Contempla...');
          // Use our app's deep link scheme to bring it back to foreground
          window.location.href = 'contempla://timer';
        }, returnDelayMs);
      }

      return true;
    } catch (error) {
      console.log('[Spotify] Deep link failed:', error);
      return false;
    }
  } else {
    // On web, open in new tab
    window.open(spotifyWebUrl, '_blank');
    return true;
  }
}

export async function startSpotifyPlayback(): Promise<{ success: boolean; error?: string; code?: string; reqId?: string; spotifyAppOpened?: boolean }> {
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

      // Use existing refresh promise if one is in progress, otherwise create new one
      if (!tokenRefreshPromise) {
        tokenRefreshPromise = (async () => {
          try {
            // Call spotify-auth to refresh the token
            const { data: refreshData, error: refreshError } = await supabase.functions.invoke('spotify-auth', {
              body: { action: 'refresh' },
            });

            if (refreshError || refreshData?.error) {
              console.error('[Spotify] Token refresh failed:', refreshError?.message || refreshData?.error);
              throw new Error('TOKEN_EXPIRED');
            }

            console.log('[Spotify] Token refreshed successfully');
          } finally {
            // Clear the lock after refresh completes (success or failure)
            tokenRefreshPromise = null;
          }
        })();
      }

      try {
        await tokenRefreshPromise;
      } catch {
        return {
          success: false,
          error: 'Spotify authentication expired. Please reconnect Spotify in Settings.',
          code: 'TOKEN_EXPIRED'
        };
      }
    }

    // OPTIMIZED APPROACH:
    // 1. First try Web API without opening Spotify (fastest, works if device already active)
    // 2. If no device found, open Spotify app briefly to register device
    // 3. Then use Transfer Playback API to activate and start playlist
    console.log('[Spotify] Starting playback via Web API...');

    const payload = {
      action: 'play',
      playlist_id: settings.selected_playlist_id,
    };

    let { data, error } = await supabase.functions.invoke('spotify-play', {
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

      // If NO_ACTIVE_DEVICE, try opening Spotify to register device, then retry
      if (code === 'NO_ACTIVE_DEVICE') {
        console.log('[Spotify] No active device - opening Spotify app to register device...');

        // Open Spotify app with deep link to register the device
        await openSpotifyApp(settings.selected_playlist_id, false);

        // Wait for device registration (1 second should be enough)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Retry the playback request - Transfer Playback API will activate device
        console.log('[Spotify] Retrying playback after device registration...');
        const retryResult = await supabase.functions.invoke('spotify-play', {
          body: payload,
        });

        // Handle retry response
        if (retryResult.error) {
          let parsed: any = null;
          try {
            const ctx = (retryResult.error as any)?.context as Response | undefined;
            if (ctx) {
              const text = await ctx.text();
              parsed = text ? JSON.parse(text) : null;
            }
          } catch {
            // ignore
          }

          return {
            success: false,
            error: parsed?.error || retryResult.error.message,
            code: parsed?.code,
            reqId: parsed?.reqId
          };
        }

        if (retryResult.data?.success === false || retryResult.data?.error) {
          return {
            success: false,
            error: retryResult.data?.error || 'Spotify playback could not be started after retry.',
            code: retryResult.data?.code,
            reqId: retryResult.data?.reqId
          };
        }

        // Retry succeeded!
        console.log('[Spotify] Playback started successfully after device activation');
        return { success: true, spotifyAppOpened: true };
      }

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
