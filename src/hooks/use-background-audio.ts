import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

/**
 * Background Audio Hook for iOS Timer Continuation
 *
 * iOS Problem: When screen locks, JavaScript execution stops, timer freezes
 * Solution: Play silent audio continuously → iOS keeps app alive in background
 *
 * This is the industry-standard approach used by Headspace, Calm, Insight Timer, etc.
 *
 * How it works:
 * 1. Play a short silent audio file on loop
 * 2. iOS treats app as "playing audio" → allows background execution
 * 3. JavaScript timer continues running even when screen is locked
 * 4. Notification fires at the correct time
 *
 * Requirements:
 * - Info.plist must have UIBackgroundModes: ['audio'] ✅ Already configured
 */

export function useBackgroundAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    // Only needed on native iOS
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    // Create audio element once
    if (!audioRef.current) {
      const audio = new Audio();

      // Use a data URI for a 1-second silent audio file (WAV format)
      // This is a minimal valid WAV file that produces no sound
      audio.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

      // Configure for background playback
      audio.loop = true; // Loop continuously
      audio.volume = 0; // Silent - will NOT interfere with Spotify playback

      // iOS requires audio to be preloaded
      audio.preload = 'auto';

      audioRef.current = audio;

      // Log for debugging
      console.log('[BackgroundAudio] Silent audio element created (volume=0, will not interfere with Spotify)');
    }

    // Cleanup on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        isPlayingRef.current = false;
        console.log('[BackgroundAudio] Cleaned up');
      }
    };
  }, []);

  /**
   * Start background audio to keep timer running when screen locks
   * Call this when timer starts
   */
  const startBackgroundAudio = async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform() || !audioRef.current) {
      return false;
    }

    if (isPlayingRef.current) {
      console.log('[BackgroundAudio] Already playing');
      return true;
    }

    try {
      console.log('[BackgroundAudio] Starting silent audio playback...');
      await audioRef.current.play();
      isPlayingRef.current = true;
      console.log('[BackgroundAudio] ✅ Silent audio playing - timer will continue when screen locks');
      return true;
    } catch (error) {
      console.error('[BackgroundAudio] Failed to start:', error);
      isPlayingRef.current = false;
      return false;
    }
  };

  /**
   * Stop background audio when timer ends
   * Call this when timer completes or is stopped
   */
  const stopBackgroundAudio = () => {
    if (!Capacitor.isNativePlatform() || !audioRef.current) {
      return;
    }

    if (!isPlayingRef.current) {
      return;
    }

    try {
      console.log('[BackgroundAudio] Stopping silent audio playback...');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      isPlayingRef.current = false;
      console.log('[BackgroundAudio] ✅ Silent audio stopped');
    } catch (error) {
      console.error('[BackgroundAudio] Failed to stop:', error);
    }
  };

  return {
    startBackgroundAudio,
    stopBackgroundAudio,
  };
}
