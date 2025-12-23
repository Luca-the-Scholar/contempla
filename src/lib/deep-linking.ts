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
    handleDeepLink(event.url);
  });
}

/**
 * Parse and handle a deep link URL
 */
async function handleDeepLink(url: string): Promise<void> {
  try {
    // Check if this is a Spotify OAuth callback
    // Format: contempla://spotify/callback?code=xxx
    if (url.includes('spotify/callback') || url.includes('spotify_code')) {
      await handleSpotifyCallback(url);
      return;
    }

    // Check if this is a Google/Supabase OAuth callback
    // Format: contempla://auth/callback#access_token=xxx
    if (url.includes('auth/callback') || url.includes('access_token') || url.includes('refresh_token')) {
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
    // Close the browser window that was opened for OAuth
    try {
      await Browser.close();
    } catch (e) {
      // Browser might already be closed, ignore
    }

    // Extract the fragment/query which may contain either tokens (implicit flow)
    // or a code (PKCE flow).
    // Examples:
    // - contempla://auth/callback#access_token=...&refresh_token=...
    // - contempla://auth/callback?code=...
    let paramString = '';

    // Check query params FIRST (preferred - more reliable), then hash
    if (url.includes('?')) {
      // Extract query string, handling case where there might also be a hash
      const urlWithoutScheme = url.split('://')[1] || url;
      const queryStart = urlWithoutScheme.indexOf('?');
      const hashStart = urlWithoutScheme.indexOf('#');
      
      if (queryStart !== -1) {
        const queryEnd = hashStart !== -1 && hashStart > queryStart ? hashStart : urlWithoutScheme.length;
        paramString = urlWithoutScheme.substring(queryStart + 1, queryEnd);
      }
    } else if (url.includes('#')) {
      paramString = url.split('#')[1] ?? '';
    }

    if (!paramString) {
      console.error('No fragment/query found in OAuth callback');
      if (deepLinkHandler) deepLinkHandler('/auth/callback', new URLSearchParams());
      return;
    }

    const params = new URLSearchParams(paramString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      console.error('OAuth error:', error, errorDescription);
      if (deepLinkHandler) deepLinkHandler('/auth/callback', new URLSearchParams());
      return;
    }

    // 1) Implicit flow: tokens are present
    if (accessToken && refreshToken) {
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (setSessionError) {
        console.error('Error setting session from OAuth callback:', setSessionError);
      }
    }
    // 2) PKCE flow: code must be exchanged for a session
    else if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError);
      }
    } else {
      console.error('No tokens or code found in OAuth callback');
    }

    // Navigate to auth page to complete the flow
    // The Auth page will check the session and handle profile creation
    if (deepLinkHandler) {
      deepLinkHandler('/auth/callback', new URLSearchParams());
    }
  } catch (err) {
    console.error('Error handling OAuth callback:', err);
  }
}

/**
 * Handle Spotify OAuth callback from deep link
 * URL format: contempla://spotify/callback?code=xxx
 */
async function handleSpotifyCallback(url: string): Promise<void> {
  try {
    // Close the browser window that was opened for OAuth
    try {
      await Browser.close();
    } catch (e) {
      // Browser might already be closed, ignore
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
      // Check for error
      const errorMatch = url.match(/error=([^&]+)/);
      if (errorMatch) {
        console.error('Spotify OAuth error:', decodeURIComponent(errorMatch[1]));
      }
      // Navigate to settings anyway
      if (deepLinkHandler) {
        deepLinkHandler('/settings', new URLSearchParams());
      }
      return;
    }

    // Store the code in sessionStorage for the SpotifySettings component to pick up
    sessionStorage.setItem('spotify_oauth_code', code);
    sessionStorage.setItem('spotify_oauth_from_deeplink', 'true');

    // Dispatch event so Settings screen can handle the code if already mounted
    try {
      window.dispatchEvent(new CustomEvent('spotify-oauth-code', { detail: { code } }));
    } catch (e) {
      // Ignore dispatch errors
    }

    // Navigate to settings page where SpotifySettings will handle the code
    if (deepLinkHandler) {
      deepLinkHandler('/settings', new URLSearchParams({ spotify_callback: 'true' }));
    }
  } catch (err) {
    console.error('Error handling Spotify callback:', err);
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
