import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '@/integrations/supabase/client';

type DeepLinkHandler = (path: string, params: URLSearchParams) => void;

let deepLinkHandler: DeepLinkHandler | null = null;

/**
 * Initialize deep linking listener
 * Call this once at app startup
 */
export function initDeepLinking(handler: DeepLinkHandler): void {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  deepLinkHandler = handler;

  App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
    console.log('[DeepLink] Received URL:', event.url);
    handleDeepLink(event.url);
  });
}

/**
 * Parse and handle a deep link URL
 */
async function handleDeepLink(url: string): Promise<void> {
  try {
    console.log('[DeepLink] Processing URL:', url);
    
    // Check if this is a Spotify OAuth callback
    // Format: contempla://spotify/callback?code=xxx
    if (url.includes('spotify/callback') || url.includes('spotify_code')) {
      console.log('[DeepLink] Detected Spotify OAuth callback');
      await handleSpotifyCallback(url);
      return;
    }
    
    // Check if this is a Google/Supabase OAuth callback
    // Format: contempla://auth/callback#access_token=xxx
    if (url.includes('auth/callback') || url.includes('access_token') || url.includes('refresh_token')) {
      console.log('[DeepLink] Detected Google OAuth callback');
      await handleOAuthCallback(url);
      return;
    }

    if (!deepLinkHandler) return;

    // Handle both custom scheme (contempla://) and universal links (https://contempla.app/)
    let path = '';
    let searchParams = new URLSearchParams();

    if (url.startsWith('contempla://')) {
      // Custom URL scheme: contempla://history?date=2024-01-15
      const withoutScheme = url.replace('contempla://', '');
      const [pathPart, queryPart] = withoutScheme.split('?');
      path = '/' + pathPart;
      if (queryPart) {
        searchParams = new URLSearchParams(queryPart);
      }
    } else {
      // Universal link: https://contempla.app/history?date=2024-01-15
      const urlObj = new URL(url);
      path = urlObj.pathname;
      searchParams = urlObj.searchParams;
    }

    deepLinkHandler(path, searchParams);
  } catch (err) {
    console.error('[DeepLink] Failed to parse deep link:', url, err);
  }
}

/**
 * Handle OAuth callback from deep link
 * URL format: contempla://auth/callback#access_token=...&refresh_token=...
 */
async function handleOAuthCallback(url: string): Promise<void> {
  try {
    console.log('[DeepLink] Processing OAuth callback URL');
    
    // Close the browser window that was opened for OAuth
    try {
      await Browser.close();
      console.log('[DeepLink] Closed browser window');
    } catch (e) {
      // Browser might already be closed, ignore
      console.log('[DeepLink] Browser already closed or error closing:', e);
    }

    // Extract the hash fragment which contains the tokens
    // URL format: contempla://auth/callback#access_token=xxx&refresh_token=xxx&...
    let hashFragment = '';
    
    if (url.includes('#')) {
      hashFragment = url.split('#')[1];
    } else if (url.includes('?')) {
      // Sometimes tokens come as query params
      hashFragment = url.split('?')[1];
    }

    if (!hashFragment) {
      console.error('[DeepLink] No hash fragment found in OAuth callback');
      // Navigate to auth page to let it handle the session check
      if (deepLinkHandler) {
        deepLinkHandler('/auth/callback', new URLSearchParams());
      }
      return;
    }

    console.log('[DeepLink] Found hash fragment, setting session...');
    
    // Parse the hash fragment to get tokens
    const params = new URLSearchParams(hashFragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      // Set the session using the tokens from the callback
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('[DeepLink] Error setting session:', error);
      } else {
        console.log('[DeepLink] Session set successfully:', data.user?.id);
      }
    } else {
      console.log('[DeepLink] No tokens in callback, checking for error');
      const errorDescription = params.get('error_description');
      if (errorDescription) {
        console.error('[DeepLink] OAuth error:', errorDescription);
      }
    }

    // Navigate to auth page to complete the flow
    // The Auth page will check the session and handle profile creation
    if (deepLinkHandler) {
      deepLinkHandler('/auth/callback', new URLSearchParams());
    }
  } catch (err) {
    console.error('[DeepLink] Error handling OAuth callback:', err);
  }
}

/**
 * Handle Spotify OAuth callback from deep link
 * URL format: contempla://spotify/callback?code=xxx
 */
async function handleSpotifyCallback(url: string): Promise<void> {
  try {
    console.log('[DeepLink] Processing Spotify callback URL');
    
    // Close the browser window that was opened for OAuth
    try {
      await Browser.close();
      console.log('[DeepLink] Closed browser window');
    } catch (e) {
      console.log('[DeepLink] Browser already closed or error closing:', e);
    }

    // Extract the code from URL
    // Format: contempla://spotify/callback?code=xxx
    let code = '';
    
    if (url.includes('?')) {
      const queryPart = url.split('?')[1];
      const params = new URLSearchParams(queryPart);
      code = params.get('code') || '';
    }

    if (!code) {
      console.error('[DeepLink] No code found in Spotify callback');
      // Check for error
      const errorMatch = url.match(/error=([^&]+)/);
      if (errorMatch) {
        console.error('[DeepLink] Spotify OAuth error:', decodeURIComponent(errorMatch[1]));
      }
      // Navigate to settings anyway
      if (deepLinkHandler) {
        deepLinkHandler('/settings', new URLSearchParams());
      }
      return;
    }

    console.log('[DeepLink] Found Spotify code, storing for callback handling');
    
    // Store the code in sessionStorage for the SpotifySettings component to pick up
    // This is needed because we can't directly call React component methods from here
    sessionStorage.setItem('spotify_oauth_code', code);
    sessionStorage.setItem('spotify_oauth_from_deeplink', 'true');

    // Also dispatch a runtime event so the Settings screen can handle the code
    // even if it is already mounted (common on iOS when returning from the system browser).
    try {
      window.dispatchEvent(new CustomEvent('spotify-oauth-code', { detail: { code } }));
    } catch (e) {
      console.log('[DeepLink] Could not dispatch spotify-oauth-code event:', e);
    }
    
    // Navigate to settings page where SpotifySettings will handle the code
    if (deepLinkHandler) {
      deepLinkHandler('/settings', new URLSearchParams({ spotify_callback: 'true' }));
    }
  } catch (err) {
    console.error('[DeepLink] Error handling Spotify callback:', err);
  }
}

/**
 * Supported deep link routes:
 * - contempla://timer - Opens the timer view
 * - contempla://history - Opens the history view
 * - contempla://library - Opens the library view
 * - contempla://community - Opens the community view
 * - contempla://settings - Opens the settings view
 * - contempla://auth/callback - Google OAuth callback
 * - contempla://spotify/callback - Spotify OAuth callback
 */
export const DEEP_LINK_ROUTES = {
  TIMER: '/timer',
  HISTORY: '/history',
  LIBRARY: '/library',
  COMMUNITY: '/community',
  SETTINGS: '/settings',
} as const;
