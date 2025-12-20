import { useCallback, useRef } from 'react';

/**
 * iOS Audio Playback Notes:
 * -------------------------
 * iOS (WKWebView) has strict requirements for audio playback:
 * 1. Audio must be initiated directly from a user gesture (click/tap handler)
 * 2. The audio.play() call must happen synchronously within the gesture context
 * 3. Awaiting promises before audio.play() can break the gesture context
 * 
 * The root cause of iOS-only failures was awaiting unlockAudio() before playing,
 * which broke the gesture context chain. Solution: call unlockAudio() without await
 * and immediately call playSound() in the same synchronous handler.
 */

export type TimerSound = 'none' | 'bowl-struck-1' | 'bowl-struck-2' | 'bowl-struck-3' | 'bowl-struck-4' | 'gong' | 'bell-1' | 'bell-2';

export const SOUND_LABELS: Record<TimerSound, string> = {
  'none': 'None',
  'bowl-struck-1': 'Bowl Strike 1',
  'bowl-struck-2': 'Bowl Strike 2',
  'bowl-struck-3': 'Bowl Strike 3',
  'bowl-struck-4': 'Bowl Strike 4',
  'gong': 'Gong',
  'bell-1': 'Small Bell 1',
  'bell-2': 'Small Bell 2',
};

const SOUND_FILES: Record<Exclude<TimerSound, 'none'>, string> = {
  'bowl-struck-1': '/sounds/tibetan-bowl-struck-1.wav',
  'bowl-struck-2': '/sounds/tibetan-bowl-struck-2.wav',
  'bowl-struck-3': '/sounds/tibetan-bowl-struck-3.wav',
  'bowl-struck-4': '/sounds/tibetan-bowl-struck-4.wav',
  'gong': '/sounds/gong-sweet.wav',
  'bell-1': '/sounds/small-bell-1.wav',
  'bell-2': '/sounds/small-bell-2.wav',
};

// Maximum duration for any sound playback (10 seconds)
const MAX_DURATION_MS = 10000;

export function useTimerSound() {
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Stop any currently playing sound
  const stopSound = useCallback(() => {
    // Clear playing flag
    isPlayingRef.current = false;
    
    // Clear any pending timeout
    if (currentTimeoutRef.current) {
      clearTimeout(currentTimeoutRef.current);
      currentTimeoutRef.current = null;
    }
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
  }, []);

  // Preload audio for better responsiveness
  const preloadSound = useCallback((sound: TimerSound) => {
    if (sound === 'none') return;
    
    const audio = new Audio(SOUND_FILES[sound]);
    audio.preload = 'auto';
  }, []);

  // Unlock audio on iOS - call this on user interaction before timer starts
  // IMPORTANT: On iOS, this must be called synchronously from a user gesture (click/tap)
  // and should NOT be awaited to avoid blocking the gesture context
  const unlockAudio = useCallback(() => {
    // Create and play a silent audio to unlock audio on iOS
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    // Don't await - fire and forget to avoid blocking the gesture
    audio.play().catch(() => {
      // Ignore errors - this is just to unlock audio context
    });
    return true;
  }, []);

  /**
   * Play a sound exactly once. Guarded against multiple calls.
   * IMPORTANT: On iOS, audio must be triggered from a user gesture context.
   * @param sound The sound to play
   */
  const playSound = useCallback((sound: TimerSound) => {
    if (sound === 'none') return;
    
    // Guard: prevent multiple simultaneous plays
    if (isPlayingRef.current) return;
    
    // Stop any previous sound and mark as playing
    stopSound();
    isPlayingRef.current = true;

    const audio = new Audio(SOUND_FILES[sound]);
    currentAudioRef.current = audio;
    
    // Clean up when sound ends or errors
    const cleanup = () => {
      isPlayingRef.current = false;
      if (currentTimeoutRef.current) {
        clearTimeout(currentTimeoutRef.current);
        currentTimeoutRef.current = null;
      }
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
      }
    };
    
    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);
    
    // Set up safety cutoff timer (10 seconds max)
    currentTimeoutRef.current = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0;
      cleanup();
    }, MAX_DURATION_MS);
    
    // Start playing - use .then().catch() for iOS compatibility
    audio.play().catch(cleanup);
  }, [stopSound]);

  return { playSound, stopSound, unlockAudio, preloadSound };
}
