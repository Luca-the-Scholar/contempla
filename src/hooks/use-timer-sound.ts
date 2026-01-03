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
   * CRITICAL iOS FIX: We start web audio SYNCHRONOUSLY to preserve the user gesture
   * context. Native audio is attempted in parallel - if it succeeds, we stop web audio.
   * This ensures sounds always work on iOS regardless of native plugin state.
   * 
   * On native iOS, uses @capacitor-community/native-audio with focus: false
   * to allow mixing with Spotify. Falls back to web audio on other platforms.
   * 
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

    // ============================================
    // STEP 1: Start web audio SYNCHRONOUSLY
    // This MUST happen in the same tick as the user gesture to work on iOS
    // ============================================
    const audio = new Audio(SOUND_FILES[sound]);
    currentAudioRef.current = audio;
    let webAudioStopped = false;

    // Clean up when sound ends or errors
    const cleanup = async () => {
      if (webAudioStopped) return; // Already cleaned up by native audio
      
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
      if (!webAudioStopped) {
        audio.pause();
        audio.currentTime = 0;
        cleanup();
      }
    }, MAX_DURATION_MS);

    // Call onBeforePlay synchronously if provided (fire-and-forget for logging)
    if (options?.onBeforePlay) {
      console.log('[use-timer-sound] Calling onBeforePlay');
      options.onBeforePlay().catch(err => 
        console.error('[use-timer-sound] onBeforePlay error:', err)
      );
    }

    // Start web audio IMMEDIATELY (synchronous - preserves iOS gesture context)
    console.log('[use-timer-sound] Starting web audio playback (synchronous)');
    audio.play().catch((error) => {
      console.error('[use-timer-sound] Failed to play web audio:', error);
      cleanup();
    });

    // ============================================
    // STEP 2: Try native audio IN PARALLEL (async)
    // If native works, stop web audio and use native instead
    // This allows mixing with Spotify when the plugin is working
    // ============================================
    if (isNativeAudioAvailable()) {
      const nativeSoundId = NATIVE_SOUND_IDS[sound];
      if (nativeSoundId) {
        console.log('[use-timer-sound] Attempting native audio in parallel:', nativeSoundId);
        
        playNativeSound(nativeSoundId).then(played => {
          if (played) {
            // Native audio succeeded! Stop web audio and use native instead
            console.log('[use-timer-sound] Native audio succeeded, stopping web audio');
            webAudioStopped = true;
            audio.pause();
            audio.currentTime = 0;
            
            // Clear the web audio timeout
            if (currentTimeoutRef.current) {
              clearTimeout(currentTimeoutRef.current);
            }
            
            // Set up native audio cleanup timeout
            currentTimeoutRef.current = setTimeout(async () => {
              console.log('[use-timer-sound] Native audio cleanup');
              isPlayingRef.current = false;
              
              if (options?.onAfterPlay) {
                console.log('[use-timer-sound] Calling onAfterPlay (native)');
                try {
                  await options.onAfterPlay();
                } catch (err) {
                  console.error('[use-timer-sound] onAfterPlay error:', err);
                }
              }
            }, 5000); // Most sounds are ~3-5 seconds
          } else {
            // Native failed, web audio continues (already playing)
            console.log('[use-timer-sound] Native audio failed, web audio continues');
          }
        }).catch(error => {
          console.error('[use-timer-sound] Native audio error:', error);
          // Web audio continues (already playing)
        });
      }
    }
  }, [stopSound]);

  return { playSound, stopSound, unlockAudio, preloadSound };
}
