import { useCallback } from 'react';

type VibrationPattern = number | number[];

interface HapticState {
  isSupported: boolean;
  vibrate: (pattern?: VibrationPattern) => boolean;
  testVibration: () => boolean;
}

export function useHaptic(): HapticState {
  const isSupported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

  const vibrate = useCallback((pattern: VibrationPattern = 200): boolean => {
    if (!isSupported) return false;
    
    try {
      return navigator.vibrate(pattern);
    } catch (err) {
      console.warn('Vibration failed:', err);
      return false;
    }
  }, [isSupported]);

  const testVibration = useCallback((): boolean => {
    // Short test vibration pattern
    return vibrate([100, 50, 100]);
  }, [vibrate]);

  return { isSupported, vibrate, testVibration };
}

// Timer completion vibration pattern (long-short-long)
export const TIMER_COMPLETE_PATTERN = [300, 100, 300, 100, 500];
