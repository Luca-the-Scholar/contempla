# Spotify + Meditation Bell Audio Mixing Solution

## Problem Statement

When meditation timer played start/completion bells, Spotify music would pause and never resume, even though:
- Native audio plugin was configured with `.mixWithOthers`
- Audio session showed proper configuration in logs
- Test button sound worked perfectly (music ducked and continued)

User experience issue: Music was supposed to play throughout 10-45 minute meditation sessions, but would go silent after the start bell.

## Critical Constraint

Cannot accept any solution that switches away from Contempla app during meditation. Timer must stay in foreground at all times. This ruled out solutions requiring Spotify app activation.

## Root Cause

The issue was in `use-timer-sound.ts` which played BOTH web audio and native audio in parallel:

```typescript
// The bug:
console.log('[use-timer-sound] Starting web audio playback (synchronous)');
const audio = new Audio(soundFile);
audio.play();  // ← This INTERRUPTS Spotify immediately!

console.log('[use-timer-sound] Attempting native audio in parallel');
playNativeSound(...);  // ← This has mixing enabled, but too late!
```

**The sequence:**
1. Web audio (HTMLAudioElement) starts synchronously
2. Web audio uses WKWebView's audio session (interrupts Spotify)
3. Native audio starts in parallel (with mixing)
4. Native audio succeeds and stops web audio
5. But Spotify already paused from step 2
6. iOS sets `otherAudioPlaying: false`

**Why test button worked:** It only used native audio, never triggered web audio.

## The Solution

### Part 1: Patch Native Audio Plugin

File: `patches/@capacitor-community+native-audio+8.0.0.patch`

The `@capacitor-community/native-audio` plugin's `load()` method was overriding AppDelegate audio session configuration:

```swift
// Plugin was doing this (WRONG):
try self.session.setCategory(AVAudioSession.Category.playback)  // No .mixWithOthers!
try self.session.setActive(false)  // Inactive!
```

**Fix Applied:** Used `patch-package` to add `.mixWithOthers` and `.duckOthers`:

```swift
// Patched to do this (CORRECT):
try self.session.setCategory(.playback, mode: .default, options: [.mixWithOthers, .duckOthers])
try self.session.setActive(true, options: .notifyOthersOnDeactivation)
```

### Part 2: Separate Native and Web Audio Paths

File: `src/hooks/use-timer-sound.ts`

Complete rewrite to prevent web audio from running on native platforms:

```typescript
const playSound = useCallback((sound: TimerSound, options?: PlaySoundOptions) => {
  const isNativePlatform = Capacitor.isNativePlatform();
  const nativeSoundId = NATIVE_SOUND_IDS[sound];
  const canUseNativeAudio = isNativePlatform && nativeSoundId;

  if (canUseNativeAudio) {
    // Native iOS: Use ONLY native audio (never start web audio)
    playNativeSound(nativeSoundId).then(async (played) => {
      if (played) {
        // Success - native audio mixed with Spotify
        if (options?.onAfterPlay) await options.onAfterPlay();
      } else {
        // Fallback to web audio only if native fails
        playWebAudio(sound, options);
      }
    });
    return; // Don't start web audio!
  }

  // Non-native platforms: Use web audio
  playWebAudio(sound, options);
}, []);
```

Key changes:
- Native platforms: ONLY native audio (web audio never starts)
- Web platforms: ONLY web audio
- Fallback: If native fails, then use web audio
- No parallel execution that was causing the interruption

## Files Modified

1. **`patches/@capacitor-community+native-audio+8.0.0.patch`**
   - Added `.mixWithOthers` + `.duckOthers` to audio session configuration
   - Added proper `setActive()` options
   - Added debug logging

2. **`src/hooks/use-timer-sound.ts`**
   - Complete rewrite to separate native/web audio paths
   - Eliminated parallel web+native execution
   - Native platforms use ONLY native audio
   - Proper fallback chain

3. **`src/components/views/TimerView.tsx`**
   - Simplified sound playback calls
   - Removed retry/resume logic (no longer needed)

4. **`package.json`**
   - Added `postinstall` script: `"patch-package"`
   - Ensures patches apply on `npm install`

## Final Result

### Audio Behavior
- ✅ Bell plays with native audio mixing enabled
- ✅ Spotify volume ducks (lowers) during bell
- ✅ Both bell and Spotify audible simultaneously
- ✅ Spotify returns to normal volume after bell
- ✅ Music plays continuously throughout meditation
- ✅ No app switching
- ✅ Works on silent mode

## Technical Insights

### Why Web Audio Interrupted Spotify
- `HTMLAudioElement` runs in WKWebView's audio session
- WKWebView's audio session is separate from native audio session
- When web audio plays, iOS grants it audio focus
- This interrupts other audio (Spotify) despite native mixing configuration

### Why Native Audio Works
- Native audio uses `AVAudioPlayer` in the main app bundle
- Can be configured with `.mixWithOthers` before WKWebView loads
- iOS respects mixing configuration for native audio
- Ducking option lowers other audio instead of stopping it

### Why Test Button Worked
- Test button only triggered native audio path
- Never started web audio
- No WKWebView audio session involvement

## Debugging Journey

1. **Resume attempts failed**: Spotify device became inactive after bell, API resume impossible
2. **Native audio patch applied**: Still failed because web audio was the culprit
3. **Breakthrough**: Test button showed `otherAudioPlaying: true`, timer showed `false`
4. **Root cause found**: Web audio was playing synchronously, interrupting Spotify before native audio could mix

## Maintenance Notes

- The patch file must be maintained if upgrading `@capacitor-community/native-audio`
- Run `npx patch-package @capacitor-community/native-audio` to update patch after any changes
- The `postinstall` script ensures patches apply automatically on `npm install`

## References

- [iOS AVAudioSession Documentation](https://developer.apple.com/documentation/avfaudio/avaudiosession)
- [@capacitor-community/native-audio](https://github.com/capacitor-community/native-audio)
- [patch-package](https://www.npmjs.com/package/patch-package)

