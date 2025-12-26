# Quick Start: Xcode Setup (5 Minutes)

## 1. Open Project
```bash
open ios/App/App.xcworkspace
```

## 2. Add Swift File to Xcode

1. Right-click "App" folder in Project Navigator
2. Select "Add Files to 'App'..."
3. Select: `ios/App/App/OpenSettingsPlugin.swift`
4. **UNCHECK** "Copy items if needed"
5. **CHECK** "App" target
6. Click "Add"

## 3. Add Capability

1. Click blue "App" icon → Select "App" target
2. Go to "Signing & Capabilities" tab
3. Click "+ Capability"
4. Add "Time Sensitive Notifications"
5. Verify "Code Signing Entitlements" shows: `App/App.entitlements`

## 4. Build & Run

1. Clean: Product → Clean Build Folder (⇧⌘K)
2. Build: Product → Build (⌘B)
3. Select physical iOS device (NOT simulator)
4. Run: Click ▶ or press ⌘R

## 5. Test

1. Open app → Settings → Experimental Features
2. Toggle "Lock Screen Meditation (Beta)" ON
3. Tap "Open Settings" - should open iOS Settings
4. Enable "Time Sensitive Notifications"
5. Set 1-minute timer
6. Lock screen
7. Wait for notification

---

## Apple Developer Portal (One-Time Setup)

1. Go to: https://developer.apple.com/account/resources/identifiers/list
2. Select your App ID
3. Enable "Time Sensitive Notifications"
4. Save
5. Go to Profiles → Download new profiles
6. Xcode → Preferences → Accounts → Download Manual Profiles

---

## Troubleshooting

**Build Error?**
- Clean build folder (⇧⌘K)
- Run: `npx cap sync ios`
- Rebuild

**Plugin not working?**
- Check OpenSettingsPlugin.swift is in Xcode
- Verify "App" target is checked
- Clean and rebuild

**Notifications don't appear?**
- Must be physical device (not simulator)
- Check Settings → Contempla → Notifications
- Enable "Time Sensitive Notifications"

---

## Done!

The feature is now ready to use. Lock your screen during meditation and the timer will continue accurately with notifications breaking through Do Not Disturb mode.

See `XCODE_SETUP_INSTRUCTIONS.md` for detailed documentation.
