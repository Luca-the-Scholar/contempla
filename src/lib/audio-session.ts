import { Capacitor } from '@capacitor/core';
import { NativeAudio } from '@capacitor-community/native-audio';

// Track if native audio has been configured
let isConfigured = false;

// Map of timer sound names to native asset IDs
const NATIVE_SOUND_ASSETS: Record<string, string> = {
  'gong-sweet': 'gong-sweet.wav',
  'small-bell-1': 'small-bell-1.wav',
  'small-bell-2': 'small-bell-2.wav',
  'bowl-singing': 'tibetan-bowl-singing.wav',
  'bowl-struck-1': 'tibetan-bowl-struck-1.wav',
  'bowl-struck-2': 'tibetan-bowl-struck-2.wav',
  'bowl-struck-3': 'tibetan-bowl-struck-3.wav',
  'bowl-struck-4': 'tibetan-bowl-struck-4.wav',
};

/**
 * Configure native audio for mixing with other audio sources.
 * This sets focus: false which allows bell sounds to play over Spotify.
 * On non-native platforms, this is a no-op.
 */
export async function configureNativeAudioForMixing(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[NativeAudio] Skipping configuration - not a native platform');
    return;
  }

  if (isConfigured) {
    console.log('[NativeAudio] Already configured for mixing');
    return;
  }

  try {
    // Configure native audio with focus: false to allow mixing with other apps
    // fade: true provides a nice transition
    await NativeAudio.configure({
      fade: true,
      focus: false,  // This is the key! Allows mixing with Spotify
    });
    
    console.log('[NativeAudio] Configured for mixing with other audio (focus: false)');
    isConfigured = true;
  } catch (error) {
    console.error('[NativeAudio] Failed to configure:', error);
  }
}

/**
 * Preload a sound for native playback.
 * Sounds must be placed in ios/App/App/sounds/ directory.
 * 
 * @param soundId - The timer sound ID (e.g., 'bowl-struck-1')
 */
export async function preloadNativeSound(soundId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  const assetPath = NATIVE_SOUND_ASSETS[soundId];
  if (!assetPath) {
    console.warn(`[NativeAudio] Unknown sound ID: ${soundId}`);
    return;
  }

  try {
    await NativeAudio.preload({
      assetId: soundId,
      assetPath: assetPath,
      audioChannelNum: 1,
      isUrl: false,
    });
    console.log(`[NativeAudio] Preloaded sound: ${soundId}`);
  } catch (error) {
    // Might already be preloaded, which is fine
    console.log(`[NativeAudio] Preload for ${soundId}:`, error);
  }
}

/**
 * Play a sound natively with audio mixing enabled.
 * This allows the bell sound to play over Spotify without interrupting it.
 * Falls back to returning false if not on native platform.
 * 
 * @param soundId - The timer sound ID (e.g., 'bowl-struck-1')
 * @returns true if played natively, false if fallback needed
 */
export async function playNativeSound(soundId: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    console.log('[NativeAudio] Not native platform, falling back to web audio');
    return false;
  }

  if (!NATIVE_SOUND_ASSETS[soundId]) {
    console.warn(`[NativeAudio] Unknown sound ID: ${soundId}, falling back`);
    return false;
  }

  try {
    // Ensure configured for mixing
    await configureNativeAudioForMixing();
    
    // Preload if needed
    await preloadNativeSound(soundId);
    
    // Play the sound
    await NativeAudio.play({ assetId: soundId });
    console.log(`[NativeAudio] Playing sound: ${soundId} (mixing with background audio)`);
    
    return true;
  } catch (error) {
    console.error(`[NativeAudio] Failed to play ${soundId}:`, error);
    return false;
  }
}

/**
 * Check if we're on a native platform where native audio is available.
 */
export function isNativeAudioAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

