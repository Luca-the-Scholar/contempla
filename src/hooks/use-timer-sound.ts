import { useCallback, useRef } from 'react';

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

  // Stop any currently playing sound
  const stopSound = useCallback(() => {
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
  const unlockAudio = useCallback(async () => {
    // Create and play a silent audio to unlock audio on iOS
    const audio = new Audio();
    audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    try {
      await audio.play();
    } catch {
      // Ignore errors - this is just to unlock audio
    }
    return true;
  }, []);

  /**
   * Play a single sound with automatic 10-second cutoff
   * Returns the audio element for cleanup
   */
  const playAlarmSound = useCallback((soundPath: string): HTMLAudioElement => {
    const audio = new Audio(soundPath);
    
    // Start playing immediately
    audio.play().catch((err) => {
      console.error('Failed to play sound:', err);
    });
    
    // Set up 10-second cutoff timer
    const cutoff = setTimeout(() => {
      audio.pause();
      audio.currentTime = 0; // reset to start
      if (currentAudioRef.current === audio) {
        currentAudioRef.current = null;
      }
      if (currentTimeoutRef.current === cutoff) {
        clearTimeout(cutoff);
        currentTimeoutRef.current = null;
      }
    }, MAX_DURATION_MS);
    
    // Track the timeout for cleanup
    currentTimeoutRef.current = cutoff;
    
    // Clean up timeout if audio ends naturally or is paused
    const cleanup = () => {
      if (currentTimeoutRef.current === cutoff) {
        clearTimeout(cutoff);
        currentTimeoutRef.current = null;
      }
    };
    
    audio.addEventListener('ended', cleanup);
    audio.addEventListener('pause', cleanup);
    
    return audio;
  }, []);

  const playSound = useCallback((sound: TimerSound, repeat: number = 1) => {
    if (sound === 'none') return;

    // Stop any currently playing sound first
    stopSound();

    const playSingle = () => {
      // Stop previous before playing new
      stopSound();
      
      // Play sound with automatic 10-second cutoff
      const audio = playAlarmSound(SOUND_FILES[sound]);
      currentAudioRef.current = audio;
    };

    // Play sound immediately
    playSingle();
    
    // Repeat if requested
    if (repeat > 1) {
      for (let i = 1; i < repeat; i++) {
        setTimeout(playSingle, i * 3000);
      }
    }
  }, [stopSound, playAlarmSound]);

  return { playSound, stopSound, unlockAudio, preloadSound };
}
