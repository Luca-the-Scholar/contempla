import { useCallback, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

type VibrationPattern = number | number[];

interface HapticState {
  isSupported: boolean;
  vibrate: (pattern?: VibrationPattern) => Promise<boolean>;
  impact: (style?: 'light' | 'medium' | 'heavy') => Promise<boolean>;
  notification: (type?: 'success' | 'warning' | 'error') => Promise<boolean>;
  testVibration: () => Promise<boolean>;
}

export function useHaptic(): HapticState {
  const [isNative, setIsNative] = useState(false);
  const isWebSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;
  
  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  const isSupported = isNative || isWebSupported;

  const vibrate = useCallback(async (pattern: VibrationPattern = 200): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      if (isNative) {
        // Use Capacitor Haptics for native platforms
        await Haptics.vibrate({ duration: Array.isArray(pattern) ? pattern[0] : pattern });
        return true;
      } else {
        // Fallback to Web Vibration API for web/Android
        return navigator.vibrate(pattern);
      }
    } catch (err) {
      console.warn('Vibration failed:', err);
      return false;
    }
  }, [isSupported, isNative]);

  const impact = useCallback(async (style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      if (isNative) {
        const impactStyle = {
          light: ImpactStyle.Light,
          medium: ImpactStyle.Medium,
          heavy: ImpactStyle.Heavy,
        }[style];
        await Haptics.impact({ style: impactStyle });
        return true;
      } else {
        // Approximate impact with web vibration
        const duration = { light: 50, medium: 100, heavy: 200 }[style];
        return navigator.vibrate(duration);
      }
    } catch (err) {
      console.warn('Impact haptic failed:', err);
      return false;
    }
  }, [isSupported, isNative]);

  const notification = useCallback(async (type: 'success' | 'warning' | 'error' = 'success'): Promise<boolean> => {
    if (!isSupported) return false;
    
    try {
      if (isNative) {
        const notificationType = {
          success: NotificationType.Success,
          warning: NotificationType.Warning,
          error: NotificationType.Error,
        }[type];
        await Haptics.notification({ type: notificationType });
        return true;
      } else {
        // Approximate notification with web vibration patterns
        const patterns = {
          success: [100, 50, 100],
          warning: [200, 100, 200],
          error: [300, 100, 300, 100, 300],
        };
        return navigator.vibrate(patterns[type]);
      }
    } catch (err) {
      console.warn('Notification haptic failed:', err);
      return false;
    }
  }, [isSupported, isNative]);

  const testVibration = useCallback(async (): Promise<boolean> => {
    return notification('success');
  }, [notification]);

  return { isSupported, vibrate, impact, notification, testVibration };
}

// Timer completion haptic - use notification type for native
export const TIMER_COMPLETE_PATTERN = [300, 100, 300, 100, 500];
