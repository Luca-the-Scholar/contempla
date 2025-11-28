import { useCallback, useRef } from 'react';

export type TimerSound = 'none' | 'gong' | 'singing-bowl' | 'chime';

// Using royalty-free sounds from freesound.org and similar sources
const SOUND_URLS: Record<Exclude<TimerSound, 'none'>, string> = {
  'gong': 'https://cdn.freesound.org/previews/411/411749_5121236-lq.mp3',
  'singing-bowl': 'https://cdn.freesound.org/previews/746/746125_10710720-lq.mp3',
  'chime': 'https://cdn.freesound.org/previews/352/352661_5858296-lq.mp3',
};

export const SOUND_LABELS: Record<TimerSound, string> = {
  'none': 'None',
  'gong': 'Gong',
  'singing-bowl': 'Tibetan Singing Bowl',
  'chime': 'Single Chime',
};

export function useTimerSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((sound: TimerSound) => {
    if (sound === 'none') return;

    const url = SOUND_URLS[sound];
    if (!url) return;

    // Stop any currently playing sound
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    // Create and play new audio
    const audio = new Audio(url);
    audio.volume = 0.7;
    audioRef.current = audio;
    
    audio.play().catch((error) => {
      console.error('Error playing timer sound:', error);
    });
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return { playSound, stopSound };
}
