/**
 * Trigger a simple vibration (stub - no-op for local development)
 */
export async function triggerVibration(_duration: number = 200): Promise<boolean> {
  // No-op stub for local development
  return false;
}

/**
 * Trigger a vibration pattern (stub - no-op for local development)
 * @param _pattern Array of milliseconds [vibrate, pause, vibrate, pause, ...]
 */
export async function triggerVibrationPattern(_pattern: number[]): Promise<boolean> {
  // No-op stub for local development
  return false;
}

/**
 * Trigger an impact haptic feedback (stub - no-op for local development)
 */
export async function triggerImpact(_style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<boolean> {
  // No-op stub for local development
  return false;
}

// Common patterns
export const TIMER_COMPLETE_PATTERN = [300, 100, 300, 100, 500];
