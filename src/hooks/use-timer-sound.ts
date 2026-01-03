import { useCallback, useRef } from 'react';
import { playNativeSound, isNativeAudioAvailable } from '@/lib/audio-session';

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
 * 
 * Native Audio Mixing:
 * --------------------
 * On iOS, we now use @capacitor-community/native-audio with focus: false to allow
 * bell sounds to mix with Spotify instead of interrupting it. This eliminates the
 * need for pause/resume Spotify API calls.
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

// Web audio paths (used as fallback on non-native platforms)
const SOUND_FILES: Record<Exclude<TimerSound, 'none'>, string> = {
  'bowl-struck-1': '/sounds/tibetan-bowl-struck-1.wav',
  'bowl-struck-2': '/sounds/tibetan-bowl-struck-2.wav',
  'bowl-struck-3': '/sounds/tibetan-bowl-struck-3.wav',
  'bowl-struck-4': '/sounds/tibetan-bowl-struck-4.wav',
  'gong': '/sounds/gong-sweet.wav',
  'bell-1': '/sounds/small-bell-1.wav',
  'bell-2': '/sounds/small-bell-2.wav',
};

// Native audio asset IDs (must match files in ios/App/App/sounds/)
const NATIVE_SOUND_IDS: Record<Exclude<TimerSound, 'none'>, string> = {
  'bowl-struck-1': 'bowl-struck-1',
  'bowl-struck-2': 'bowl-struck-2',
  'bowl-struck-3': 'bowl-struck-3',
  'bowl-struck-4': 'bowl-struck-4',
  'gong': 'gong-sweet',
  'bell-1': 'small-bell-1',
  'bell-2': 'small-bell-2',
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
   * 
   * On native iOS, uses @capacitor-community/native-audio with focus: false
   * to allow mixing with Spotify. Falls back to web audio on other platforms.
   * 
   * IMPORTANT: On iOS web fallback, audio must be triggered from a user gesture context.
   * @param sound The sound to play
   * @param options Optional callbacks for before/after sound playback
   */
  const playSound = useCallback((sound: TimerSound, options?: {
    onBeforePlay?: () => Promise<void>;
    onAfterPlay?: () => Promise<void>;
  }) => {
    if (sound === 'none') return;

    // Guard: prevent multiple simultaneous plays
    if (isPlayingRef.current) return;

    // Stop any previous sound and mark as playing
    stopSound();
    isPlayingRef.current = true;

    // Try native audio first (allows mixing with Spotify on iOS)
    const tryNativeAudio = async (): Promise<boolean> => {
      if (!isNativeAudioAvailable()) {
        return false;
      }

      const nativeSoundId = NATIVE_SOUND_IDS[sound];
      if (!nativeSoundId) {
        return false;
      }

      try {
        // Call onBeforePlay if provided (now just for logging, no Spotify pause needed)
        if (options?.onBeforePlay) {
          console.log('[use-timer-sound] Calling onBeforePlay (native)');
          await options.onBeforePlay();
        }

        console.log('[use-timer-sound] Playing native audio with mixing:', nativeSoundId);
        const played = await playNativeSound(nativeSoundId);
        
        if (played) {
          // Set up a timeout for cleanup (native audio doesn't have 'ended' event via this API)
          currentTimeoutRef.current = setTimeout(async () => {
            console.log('[use-timer-sound] Native audio cleanup');
            isPlayingRef.current = false;
            
            if (options?.onAfterPlay) {
              console.log('[use-timer-sound] Calling onAfterPlay (native)');
              await options.onAfterPlay();
            }
          }, 5000); // Most sounds are ~3-5 seconds
          
          return true;
        }
      } catch (error) {
        console.error('[use-timer-sound] Native audio failed:', error);
      }

      return false;
    };

    // Start playback - try native first, then fall back to web
    const startPlayback = async () => {
      // Try native audio first (supports mixing with Spotify)
      const playedNatively = await tryNativeAudio();
      if (playedNatively) {
        return;
      }

      // Fall back to web audio (will interrupt Spotify on iOS)
      console.log('[use-timer-sound] Falling back to web audio');
      
      const audio = new Audio(SOUND_FILES[sound]);
      currentAudioRef.current = audio;

      // Clean up when sound ends or errors
      const cleanup = async () => {
        console.log('[use-timer-sound] Web audio cleanup called');
        isPlayingRef.current = false;

        // Clear safety timeout
        if (currentTimeoutRef.current) {
          clearTimeout(currentTimeoutRef.current);
          currentTimeoutRef.current = null;
        }

        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }

        // Call onAfterPlay callback AFTER sound finishes
        if (options?.onAfterPlay) {
          try {
            console.log('[use-timer-sound] Calling onAfterPlay (web)');
            await options.onAfterPlay();
            console.log('[use-timer-sound] onAfterPlay completed');
          } catch (error) {
            console.error('[use-timer-sound] Error in onAfterPlay callback:', error);
          }
        }
      };

      audio.addEventListener('ended', cleanup);
      audio.addEventListener('error', (error) => {
        console.error('[Audio] Sound playback error:', error);
        cleanup();
      });

      // Set up safety cutoff timer (10 seconds max)
      currentTimeoutRef.current = setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
        cleanup();
      }, MAX_DURATION_MS);

      // Call onBeforePlay callback BEFORE playing sound (web fallback)
      if (options?.onBeforePlay) {
        try {
          console.log('[use-timer-sound] Calling onBeforePlay (web)');
          await options.onBeforePlay();
          console.log('[use-timer-sound] onBeforePlay completed');
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error('[use-timer-sound] Error in onBeforePlay callback:', error);
        }
      }

      console.log('[use-timer-sound] Starting web audio playback');
      audio.play().catch((error) => {
        console.error('[use-timer-sound] Failed to play sound:', error);
        cleanup();
      });
    };

    startPlayback();
  }, [stopSound]);

  return { playSound, stopSound, unlockAudio, preloadSound };
}
