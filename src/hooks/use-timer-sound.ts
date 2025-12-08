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

export function useTimerSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preload audio for better responsiveness
  const preloadSound = useCallback((sound: TimerSound) => {
    if (sound === 'none') return;
    
    const audio = new Audio(SOUND_FILES[sound]);
    audio.preload = 'auto';
    audioRef.current = audio;
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

  const playSound = useCallback((sound: TimerSound, repeat: number = 1) => {
    if (sound === 'none') return;

    const playSingle = () => {
      const audio = new Audio(SOUND_FILES[sound]);
      audio.play().catch(console.error);
    };

    // Play sound immediately
    playSingle();
    
    // Repeat if requested
    if (repeat > 1) {
      for (let i = 1; i < repeat; i++) {
        setTimeout(playSingle, i * 3000);
      }
    }
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  return { playSound, stopSound, unlockAudio, preloadSound };
}
