import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

/**
 * Trigger a simple vibration using Capacitor Haptics
 * @param duration Duration in milliseconds (ignored on iOS, uses system duration)
 */
export async function triggerVibration(duration: number = 200): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Fallback to web vibration API if available
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
      return true;
    }
    return false;
  }

  try {
    await Haptics.vibrate({ duration });
    return true;
  } catch (error) {
    console.warn('Haptics vibration failed:', error);
    return false;
  }
}

/**
 * Trigger a vibration pattern using Capacitor Haptics
 * Note: iOS doesn't support patterns natively, so we simulate with multiple impacts
 * @param pattern Array of milliseconds [vibrate, pause, vibrate, pause, ...]
 */
export async function triggerVibrationPattern(pattern: number[]): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Fallback to web vibration API if available
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
      return true;
    }
    return false;
  }

  try {
    // iOS doesn't support patterns, so we simulate with sequential impacts
    for (let i = 0; i < pattern.length; i++) {
      if (i % 2 === 0) {
        // Vibrate
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
      // Pause (both vibrate and pause durations)
      await new Promise(resolve => setTimeout(resolve, pattern[i]));
    }
    return true;
  } catch (error) {
    console.warn('Haptics vibration pattern failed:', error);
    return false;
  }
}

/**
 * Trigger an impact haptic feedback (iOS native)
 * @param style Impact style: 'light', 'medium', or 'heavy'
 */
export async function triggerImpact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Fallback to simple vibration
    if ('vibrate' in navigator) {
      const duration = style === 'light' ? 50 : style === 'medium' ? 100 : 200;
      navigator.vibrate(duration);
      return true;
    }
    return false;
  }

  try {
    const impactStyle = style === 'light' ? ImpactStyle.Light :
                       style === 'heavy' ? ImpactStyle.Heavy :
                       ImpactStyle.Medium;
    await Haptics.impact({ style: impactStyle });
    return true;
  } catch (error) {
    console.warn('Haptics impact failed:', error);
    return false;
  }
}

/**
 * Trigger a notification haptic (success/warning/error)
 * Best for timer completion and important events
 *
 * MAXIMUM INTENSITY: Uses Haptics.vibrate() with long duration for strongest possible feedback.
 * This is stronger than impact() and matches system notification intensity.
 */
export async function triggerNotificationHaptic(type: 'success' | 'warning' | 'error' = 'success'): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    // Fallback to strong vibration pattern for web
    if ('vibrate' in navigator) {
      // Maximum intensity pattern with rhythm - LONG vibrations
      const pattern = type === 'success' ? [800, 200, 800] :
                     type === 'warning' ? [600, 150, 600, 150, 600] :
                     [1000, 200, 1000];
      navigator.vibrate(pattern);
      return true;
    }
    return false;
  }

  try {
    // Use Haptics.vibrate() with LONG duration for maximum intensity
    // This is the same vibration strength as incoming calls and alarms
    // Pattern: LONG-pause-LONG-pause-LONG (unmistakable)

    await Haptics.vibrate({ duration: 800 });
    await new Promise(resolve => setTimeout(resolve, 200));

    await Haptics.vibrate({ duration: 800 });
    await new Promise(resolve => setTimeout(resolve, 200));

    await Haptics.vibrate({ duration: 800 });

    return true;
  } catch (error) {
    console.warn('Haptics notification failed:', error);
    return false;
  }
}

// Common patterns (legacy - prefer triggerNotificationHaptic for timer completion)
export const TIMER_COMPLETE_PATTERN = [300, 100, 300, 100, 500];
