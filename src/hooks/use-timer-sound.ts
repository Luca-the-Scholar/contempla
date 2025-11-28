import { useCallback, useRef } from 'react';

export type TimerSound = 'none' | 'gong' | 'singing-bowl' | 'chime';

export const SOUND_LABELS: Record<TimerSound, string> = {
  'none': 'None',
  'gong': 'Gong',
  'singing-bowl': 'Tibetan Singing Bowl',
  'chime': 'Single Chime',
};

// Generate sounds using Web Audio API
function createGongSound(audioContext: AudioContext) {
  const now = audioContext.currentTime;
  
  // Main tone
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(150, now);
  oscillator.frequency.exponentialRampToValueAtTime(80, now + 3);
  
  gainNode.gain.setValueAtTime(0.6, now);
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + 4);
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Harmonics
  const harmonic = audioContext.createOscillator();
  const harmonicGain = audioContext.createGain();
  
  harmonic.type = 'sine';
  harmonic.frequency.setValueAtTime(300, now);
  harmonic.frequency.exponentialRampToValueAtTime(160, now + 3);
  
  harmonicGain.gain.setValueAtTime(0.3, now);
  harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 3);
  
  harmonic.connect(harmonicGain);
  harmonicGain.connect(audioContext.destination);
  
  oscillator.start(now);
  harmonic.start(now);
  oscillator.stop(now + 4);
  harmonic.stop(now + 3);
  
  return { oscillator, harmonic };
}

function createSingingBowlSound(audioContext: AudioContext) {
  const now = audioContext.currentTime;
  
  // Fundamental frequency (around 200-400 Hz for singing bowls)
  const fundamental = audioContext.createOscillator();
  const fundamentalGain = audioContext.createGain();
  
  fundamental.type = 'sine';
  fundamental.frequency.setValueAtTime(280, now);
  fundamental.frequency.setValueAtTime(280, now + 0.5);
  fundamental.frequency.linearRampToValueAtTime(275, now + 5);
  
  fundamentalGain.gain.setValueAtTime(0.5, now);
  fundamentalGain.gain.setValueAtTime(0.5, now + 0.1);
  fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + 6);
  
  fundamental.connect(fundamentalGain);
  fundamentalGain.connect(audioContext.destination);
  
  // Second harmonic
  const harmonic2 = audioContext.createOscillator();
  const harmonic2Gain = audioContext.createGain();
  
  harmonic2.type = 'sine';
  harmonic2.frequency.setValueAtTime(560, now);
  
  harmonic2Gain.gain.setValueAtTime(0.25, now);
  harmonic2Gain.gain.exponentialRampToValueAtTime(0.001, now + 5);
  
  harmonic2.connect(harmonic2Gain);
  harmonic2Gain.connect(audioContext.destination);
  
  // Third harmonic (beatings)
  const harmonic3 = audioContext.createOscillator();
  const harmonic3Gain = audioContext.createGain();
  
  harmonic3.type = 'sine';
  harmonic3.frequency.setValueAtTime(840, now);
  
  harmonic3Gain.gain.setValueAtTime(0.15, now);
  harmonic3Gain.gain.exponentialRampToValueAtTime(0.001, now + 4);
  
  harmonic3.connect(harmonic3Gain);
  harmonic3Gain.connect(audioContext.destination);
  
  fundamental.start(now);
  harmonic2.start(now);
  harmonic3.start(now);
  fundamental.stop(now + 6);
  harmonic2.stop(now + 5);
  harmonic3.stop(now + 4);
  
  return { fundamental, harmonic2, harmonic3 };
}

function createChimeSound(audioContext: AudioContext) {
  const now = audioContext.currentTime;
  
  // High-pitched chime
  const chime = audioContext.createOscillator();
  const chimeGain = audioContext.createGain();
  
  chime.type = 'sine';
  chime.frequency.setValueAtTime(1200, now);
  chime.frequency.exponentialRampToValueAtTime(800, now + 2);
  
  chimeGain.gain.setValueAtTime(0.4, now);
  chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
  
  chime.connect(chimeGain);
  chimeGain.connect(audioContext.destination);
  
  // Harmonic overtone
  const overtone = audioContext.createOscillator();
  const overtoneGain = audioContext.createGain();
  
  overtone.type = 'sine';
  overtone.frequency.setValueAtTime(2400, now);
  overtone.frequency.exponentialRampToValueAtTime(1600, now + 1.5);
  
  overtoneGain.gain.setValueAtTime(0.15, now);
  overtoneGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
  
  overtone.connect(overtoneGain);
  overtoneGain.connect(audioContext.destination);
  
  chime.start(now);
  overtone.start(now);
  chime.stop(now + 2.5);
  overtone.stop(now + 1.5);
  
  return { chime, overtone };
}

export function useTimerSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Get or create audio context
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  // Unlock audio on iOS - call this on user interaction before timer starts
  const unlockAudio = useCallback(async () => {
    const audioContext = getAudioContext();
    
    // Resume if suspended
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Play a silent sound to unlock audio on iOS
    const buffer = audioContext.createBuffer(1, 1, 22050);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
    
    return true;
  }, [getAudioContext]);

  const playSound = useCallback((sound: TimerSound, repeat: number = 1) => {
    if (sound === 'none') return;

    const audioContext = getAudioContext();
    
    // Resume if suspended (required for some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const playSingle = () => {
      switch (sound) {
        case 'gong':
          createGongSound(audioContext);
          break;
        case 'singing-bowl':
          createSingingBowlSound(audioContext);
          break;
        case 'chime':
          createChimeSound(audioContext);
          break;
      }
    };

    // Play sound immediately
    playSingle();
    
    // Repeat if requested (helps ensure user hears it)
    if (repeat > 1) {
      for (let i = 1; i < repeat; i++) {
        setTimeout(playSingle, i * 3000); // Space out repeats
      }
    }
  }, [getAudioContext]);

  const stopSound = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  return { playSound, stopSound, unlockAudio };
}
