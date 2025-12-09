import { Capacitor } from '@capacitor/core';
import { App, URLOpenListenerEvent } from '@capacitor/app';

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
function handleDeepLink(url: string): void {
  if (!deepLinkHandler) return;

  try {
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
    console.warn('Failed to parse deep link:', url, err);
  }
}

/**
 * Supported deep link routes:
 * - contempla://timer - Opens the timer view
 * - contempla://history - Opens the history view
 * - contempla://library - Opens the library view
 * - contempla://community - Opens the community view
 * - contempla://settings - Opens the settings view
 * - contempla://technique/:id - Opens a specific technique (future)
 */
export const DEEP_LINK_ROUTES = {
  TIMER: '/timer',
  HISTORY: '/history',
  LIBRARY: '/library',
  COMMUNITY: '/community',
  SETTINGS: '/settings',
} as const;
