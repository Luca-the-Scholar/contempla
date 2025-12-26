# Xcode Setup Instructions for Lock Screen Meditation Feature

## Overview
The Lock Screen Meditation feature requires manual setup in Xcode to register the custom native plugin and configure iOS entitlements.

## Prerequisites
- Xcode 14.0 or later
- Apple Developer account
- Physical iOS device (feature won't work in simulator)

---

## Step 1: Add the Swift Plugin File to Xcode

1. **Open the project in Xcode:**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Add OpenSettingsPlugin.swift to the project:**
   - In Xcode's Project Navigator (left sidebar), right-click on the "App" folder
   - Select "Add Files to 'App'..."
   - Navigate to: `ios/App/App/OpenSettingsPlugin.swift`
   - **IMPORTANT**: Make sure "Copy items if needed" is UNCHECKED (file is already in the right location)
   - Make sure "Add to targets" has "App" checked
   - Click "Add"

3. **Verify the file was added:**
   - You should see `OpenSettingsPlugin.swift` in the Project Navigator under the "App" group
   - The file should have a checkmark next to "App" target in the File Inspector (right sidebar)

---

## Step 2: Configure Time Sensitive Notifications Capability

### In Xcode:

1. **Select the App target:**
   - Click on the blue "App" icon at the top of the Project Navigator
   - Select the "App" target from the TARGETS list

2. **Go to Signing & Capabilities tab:**
   - Click the "Signing & Capabilities" tab

3. **Add Time Sensitive Notifications capability:**
   - Click the "+ Capability" button
   - Search for "Time Sensitive Notifications"
   - Click to add it
   - You should now see "Time Sensitive Notifications" in your capabilities list

4. **Verify Code Signing Entitlements:**
   - In the "Signing" section, you should see a field "Code Signing Entitlements"
   - It should say "App/App.entitlements"
   - If it's blank or says "None", set it to: `App/App.entitlements`

### In Apple Developer Portal:

1. **Go to Identifiers:**
   - Visit https://developer.apple.com/account/resources/identifiers/list
   - Sign in with your Apple Developer account

2. **Select your App ID:**
   - Find and click on your app's identifier (e.g., `com.contempla.app`)

3. **Enable Time Sensitive Notifications:**
   - Scroll down to find "Time Sensitive Notifications" in the capabilities list
   - Check the box to enable it
   - Click "Save" at the top right

4. **Regenerate Provisioning Profiles:**
   - Go to Profiles section: https://developer.apple.com/account/resources/profiles/list
   - Find your app's provisioning profiles (Development and Distribution)
   - Click on each one and select "Edit"
   - Click "Generate" to regenerate with the new capability
   - Download the new profiles

5. **Install new profiles in Xcode:**
   - In Xcode, go to Preferences → Accounts
   - Select your Apple ID
   - Click "Download Manual Profiles"
   - OR: Double-click the downloaded .mobileprovision files to install them

---

## Step 3: Clean and Build

1. **Clean the build folder:**
   - In Xcode menu: Product → Clean Build Folder (⇧⌘K)

2. **Build the project:**
   - Product → Build (⌘B)
   - Fix any build errors that appear

3. **Run on a physical device:**
   - Select a physical iOS device from the device dropdown (top bar)
   - Click the Run button (▶) or press ⌘R
   - **NOTE**: This feature will NOT work in the iOS Simulator

---

## Step 4: Verify Plugin Registration

If you get build errors or the plugin doesn't work, verify the plugin is properly registered:

1. **Check that OpenSettingsPlugin.swift compiles:**
   - Open the file in Xcode
   - Make sure there are no red error markers
   - The file should compile without issues

2. **Verify the plugin is discovered by Capacitor:**
   - Build the project
   - Check the build output/console for any plugin-related warnings
   - The plugin should be automatically discovered via the `@objc` annotation

---

## Testing the Feature

1. **Open the app on your device**

2. **Navigate to Settings → Experimental Features**
   - You should see "Lock Screen Meditation (Beta)" toggle
   - This section only appears on iOS

3. **Enable the toggle:**
   - Turn ON "Lock Screen Meditation (Beta)"
   - A setup dialog should appear

4. **Test the "Open Settings" button:**
   - Click "Open Settings" in the dialog
   - The iOS Settings app should open
   - It should navigate to either:
     - Settings → Contempla (best case)
     - Settings (acceptable - user can manually find the app)

5. **Configure iOS Settings:**
   - In Settings → Contempla → Notifications
   - Turn ON "Time Sensitive Notifications"

6. **Test with a timer:**
   - Set a 1-minute meditation timer
   - Lock your iPhone screen
   - Wait for the timer to complete
   - Verify you receive a notification with sound and vibration

---

## Troubleshooting

### Build Error: "No such module 'Capacitor'"
- Clean build folder: Product → Clean Build Folder
- Close Xcode
- Run: `npx cap sync ios`
- Reopen Xcode and rebuild

### Plugin not found / UNIMPLEMENTED error
- Verify OpenSettingsPlugin.swift is added to the Xcode project
- Verify it has the "App" target checked
- Clean and rebuild
- Make sure the file is in `ios/App/App/` directory

### "Open Settings" button doesn't work
- Check the Console in Xcode for error messages
- Verify the plugin method signature matches the TypeScript interface
- Try building and running again
- Check that you're running on a physical device (not simulator)

### Notifications don't appear when locked
- Verify Time Sensitive Notifications is enabled in iOS Settings
- Check that notification permissions are granted
- Verify the entitlement is in App.entitlements file
- Make sure you regenerated provisioning profiles in Developer Portal

### Timer stops when screen locks
- This should be fixed by the elapsed-time calculation
- If it still happens, check Console for JavaScript errors
- Verify the app has audio background mode permission (already configured)

---

## Support

If you encounter issues:
1. Check build output and console logs in Xcode
2. Verify all steps above were completed
3. Try cleaning and rebuilding
4. Test on a different iOS device
5. Check Apple Developer account has Time Sensitive Notifications enabled

---

## Files Modified

- `ios/App/App/OpenSettingsPlugin.swift` - Native iOS plugin
- `ios/App/App/App.entitlements` - iOS entitlements configuration
- `src/lib/native-settings.ts` - TypeScript plugin interface
- `src/components/settings/LockScreenSetupDialog.tsx` - Setup UI
- `src/components/views/SettingsView.tsx` - Settings integration
- `src/components/views/TimerView.tsx` - Timer fixes
- `src/lib/notifications.ts` - Time-sensitive notification support
