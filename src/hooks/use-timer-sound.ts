import { useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { playNativeSound } from '@/lib/audio-session';

/**
 * iOS Audio Playback Notes:
 * -------------------------
 * On native iOS, we use ONLY native audio (@capacitor-community/native-audio)
 * configured with .mixWithOthers + .duckOthers to allow bell sounds to play
 * over Spotify without interrupting it.
 * 
 * CRITICAL: We do NOT start web audio (HTMLAudioElement) on native platforms
 * because it uses WKWebView's audio session which interrupts other audio.
 * Web audio is only used on non-native platforms (browser).
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

// Web audio paths (used on non-native platforms only)
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

interface PlaySoundOptions {
  onBeforePlay?: () => Promise<void>;
  onAfterPlay?: () => Promise<void>;
}

export function useTimerSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  // Stop any currently playing sound
  const stopSound = useCallback(() => {
    isPlayingRef.current = false;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  // Preload audio for better responsiveness
  const preloadSound = useCallback((sound: TimerSound) => {
    if (sound === 'none') return;
    
    // Only preload web audio on non-native platforms
    if (!Capacitor.isNativePlatform()) {
      const audio = new Audio(SOUND_FILES[sound]);
      audio.preload = 'auto';
    }
  }, []);

  // Unlock audio on iOS - call this on user interaction before timer starts
  const unlockAudio = useCallback(() => {
    // Create and play a silent audio to unlock audio on iOS
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    audio.play().catch(() => {
      // Ignore errors - this is just to unlock audio context
    });
    return true;
  }, []);

  /**
   * Play web audio - used only on non-native platforms
   */
  const playWebAudio = useCallback((sound: TimerSound, options?: PlaySoundOptions) => {
    console.log('[use-timer-sound] Starting web audio playback');
    
    const soundFile = SOUND_FILES[sound as Exclude<TimerSound, 'none'>];
    if (!soundFile) {
      console.error('[use-timer-sound] No sound file found for:', sound);
      isPlayingRef.current = false;
      return;
    }

    const audio = new Audio(soundFile);
    audioRef.current = audio;

    audio.onended = async () => {
      console.log('[use-timer-sound] Web audio ended');
      isPlayingRef.current = false;
      audioRef.current = null;

      if (options?.onAfterPlay) {
        console.log('[use-timer-sound] Calling onAfterPlay (web)');
        try {
          await options.onAfterPlay();
        } catch (err) {
          console.error('[use-timer-sound] onAfterPlay error:', err);
        }
      }
    };

    audio.onerror = () => {
      console.error('[use-timer-sound] Web audio error');
      isPlayingRef.current = false;
      audioRef.current = null;
    };

    audio.play().catch((err) => {
      console.error('[use-timer-sound] Failed to play web audio:', err);
      isPlayingRef.current = false;
      audioRef.current = null;
    });
  }, []);

  /**
   * Play a sound. On native iOS, uses native audio with mixing enabled.
   * On non-native platforms, uses web audio.
   */
  const playSound = useCallback((sound: TimerSound, options?: PlaySoundOptions) => {
    if (sound === 'none') return;

    // Guard: prevent multiple simultaneous plays
    if (isPlayingRef.current) {
      console.log('[use-timer-sound] Already playing, ignoring');
      return;
    }

    isPlayingRef.current = true;
    console.log(`[use-timer-sound] Playing sound: ${sound}`);

    // Call onBeforePlay callback
    if (options?.onBeforePlay) {
      options.onBeforePlay().catch(err => 
        console.error('[use-timer-sound] onBeforePlay error:', err)
      );
    }

    // Check if we're on native platform with native audio available
    const isNativePlatform = Capacitor.isNativePlatform();
    const nativeSoundId = NATIVE_SOUND_IDS[sound as Exclude<TimerSound, 'none'>];
    const canUseNativeAudio = isNativePlatform && nativeSoundId;

    if (canUseNativeAudio) {
      // On native platforms, ONLY use native audio (don't start web audio)
      // Web audio interrupts other audio sessions on iOS
      console.log('[use-timer-sound] Native platform detected - using native audio only');
      
      playNativeSound(nativeSoundId).then(async (played) => {
        if (played) {
          console.log('[use-timer-sound] Native audio succeeded');
          isPlayingRef.current = false;
          
          if (options?.onAfterPlay) {
            console.log('[use-timer-sound] Calling onAfterPlay (native)');
            try {
              await options.onAfterPlay();
            } catch (err) {
              console.error('[use-timer-sound] onAfterPlay error:', err);
            }
          }
        } else {
          console.log('[use-timer-sound] Native audio failed - falling back to web');
          // Only fall back to web audio if native failed
          playWebAudio(sound, options);
        }
      }).catch((error) => {
        console.error('[use-timer-sound] Native audio error:', error);
        // Fall back to web audio on error
        playWebAudio(sound, options);
      });
      
      return; // Don't start web audio on native platforms
    }

    // Non-native platforms: use web audio
    playWebAudio(sound, options);
  }, [playWebAudio]);

  return { playSound, stopSound, unlockAudio, preloadSound };
}
