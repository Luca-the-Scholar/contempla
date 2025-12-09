import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

/**
 * Share content using native share sheet on mobile or Web Share API on web
 */
export async function shareContent(options: ShareOptions): Promise<boolean> {
  const { title, text, url, dialogTitle } = options;

  try {
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor Share for native platforms
      await Share.share({
        title,
        text,
        url,
        dialogTitle: dialogTitle || 'Share',
      });
      return true;
    } else if (navigator.share) {
      // Use Web Share API if available
      await navigator.share({
        title,
        text,
        url,
      });
      return true;
    } else {
      // Fallback: copy to clipboard
      const shareText = [title, text, url].filter(Boolean).join('\n');
      await navigator.clipboard.writeText(shareText);
      return true;
    }
  } catch (err: any) {
    // User cancelled share or error occurred
    if (err.name !== 'AbortError') {
      console.warn('Share failed:', err);
    }
    return false;
  }
}

/**
 * Share a meditation session
 */
export async function shareSession(
  techniqueName: string,
  durationMinutes: number,
  userName?: string
): Promise<boolean> {
  const text = userName
    ? `${userName} just completed a ${durationMinutes}-minute ${techniqueName} meditation on Contempla!`
    : `Just completed a ${durationMinutes}-minute ${techniqueName} meditation on Contempla!`;

  return shareContent({
    title: 'Meditation Complete',
    text,
    dialogTitle: 'Share your meditation',
  });
}

/**
 * Check if native sharing is available
 */
export function canShare(): boolean {
  return Capacitor.isNativePlatform() || !!navigator.share;
}
