# iOS App Setup & App Store Submission Guide

This guide will walk you through setting up your Contempla app for iOS and submitting it to the App Store.

## Prerequisites

Before you begin, make sure you have:

1. **macOS** (required for iOS development)
2. **Xcode** (latest version from Mac App Store)
3. **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com)
4. **CocoaPods** (usually installed automatically with Xcode, but verify with `pod --version`)

## Step 1: Open the Project in Xcode

1. Navigate to your project directory
2. Open the iOS project:
   ```bash
   open ios/App/App.xcodeproj
   ```
   Or double-click `ios/App/App.xcodeproj` in Finder

## Step 2: Configure Your App Identity

### Update Bundle Identifier

1. In Xcode, select the **App** project in the left sidebar
2. Select the **App** target
3. Go to the **General** tab
4. Under **Identity**, change the **Bundle Identifier** from `app.lovable.c0338147c3324b2cb5d7a5ad61c0e9ec` to your own:
   - Format: `com.yourcompany.contempla` or `com.yourname.contempla`
   - Example: `com.contempla.app` or `com.johndoe.contempla`
   - **Important**: This must be unique and match what you'll register in App Store Connect

5. Update the **Display Name** if needed (this is what appears under the app icon)

6. Update **Version** and **Build** numbers:
   - Version: `1.0.0` (or your current version)
   - Build: `1` (increment this for each App Store submission)

### Update capacitor.config.ts

Update the `appId` in `capacitor.config.ts` to match your bundle identifier:

```typescript
appId: 'com.yourcompany.contempla', // Must match Xcode bundle identifier
```

Then rebuild and sync:
```bash
npm run build
npx cap sync ios
```

## Step 3: Configure Signing & Capabilities

### Set Up Signing

1. In Xcode, still in the **General** tab, scroll to **Signing & Capabilities**
2. Check **Automatically manage signing**
3. Select your **Team** (your Apple Developer account)
4. Xcode will automatically create/select a provisioning profile

**If you see signing errors:**
- Make sure you're logged into Xcode with your Apple ID
- Go to **Xcode → Settings → Accounts** and add your Apple ID
- Select your team from the dropdown

### Add Required Capabilities

Your app may need these capabilities (add them in the **Signing & Capabilities** tab):

1. **Push Notifications** (if using local notifications)
   - Click **+ Capability** → **Push Notifications**

2. **Background Modes** (for notifications)
   - Click **+ Capability** → **Background Modes**
   - Check **Remote notifications** and **Background fetch**

## Step 4: Configure App Icons and Splash Screen

### App Icon

1. In Xcode, go to `App/Assets.xcassets/AppIcon.appiconset`
2. Replace the placeholder icons with your app icon in all required sizes:
   - 20x20 (@2x, @3x)
   - 29x29 (@2x, @3x)
   - 40x40 (@2x, @3x)
   - 60x60 (@2x, @3x)
   - 1024x1024 (App Store icon)

**Tip**: Use a tool like [App Icon Generator](https://www.appicon.co/) to generate all sizes from a single 1024x1024 image.

### Splash Screen

The splash screen is configured in `capacitor.config.ts`. The images are in `App/Assets.xcassets/Splash.imageset/`. Update these if needed.

## Step 5: Configure Info.plist

1. Open `ios/App/App/Info.plist`
2. Verify/update these important settings:

   - **Privacy - Camera Usage Description** (if using camera)
   - **Privacy - Photo Library Usage Description** (if accessing photos)
   - **Privacy - Location When In Use Description** (if using location)
   - **Privacy - Microphone Usage Description** (if using microphone)
   - **Privacy - Notifications Usage Description** (for notifications)

   Add any missing privacy descriptions your app needs.

## Step 6: Test on Simulator

1. In Xcode, select a simulator from the device dropdown (top toolbar)
2. Click the **Play** button (▶️) or press `Cmd + R`
3. The app should build and launch in the simulator

## Step 7: Test on Physical Device

1. Connect your iPhone via USB
2. Trust the computer on your iPhone if prompted
3. In Xcode, select your device from the device dropdown
4. You may need to:
   - Go to **Settings → General → VPN & Device Management** on your iPhone
   - Trust your developer certificate
5. Click **Play** to build and install on your device

## Step 8: Prepare for App Store Submission

### Create App Store Connect Record

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Contempla (or your app name)
   - **Primary Language**: English (or your language)
   - **Bundle ID**: Select the one you created (or create new)
   - **SKU**: Unique identifier (e.g., `contempla-001`)
   - **User Access**: Full Access (unless you have a team)

### App Information

Fill in all required information:
- **App Name**: Contempla
- **Subtitle**: Brief description (optional)
- **Category**: Primary and Secondary (e.g., Health & Fitness, Lifestyle)
- **Privacy Policy URL**: Required (host your privacy policy)
- **Support URL**: Your support website/email

### App Store Listing

1. **Screenshots** (required):
   - iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max): 1290 x 2796 pixels
   - iPhone 6.5" (iPhone 11 Pro Max, XS Max): 1242 x 2688 pixels
   - iPhone 5.5" (iPhone 8 Plus): 1242 x 2208 pixels
   - At least 3 screenshots required, up to 10

2. **App Preview** (optional but recommended):
   - Video preview of your app (30 seconds max)

3. **Description**: Write compelling app description (up to 4000 characters)

4. **Keywords**: Comma-separated keywords (up to 100 characters)

5. **Support URL**: Your website or support email

6. **Marketing URL**: Optional marketing website

7. **Promotional Text**: Optional (up to 170 characters, can be updated without new version)

8. **App Icon**: 1024x1024 pixels (no transparency, no rounded corners)

### Build and Archive

1. In Xcode, select **Any iOS Device** or **Generic iOS Device** from device dropdown
2. Go to **Product → Archive**
3. Wait for the archive to complete
4. The **Organizer** window will open
5. Select your archive and click **Distribute App**
6. Choose **App Store Connect**
7. Follow the wizard:
   - **Distribution Options**: App Store Connect
   - **Distribution**: Upload
   - Review the app information
   - Click **Upload**

### Submit for Review

1. Go back to App Store Connect
2. In your app, go to the **App Store** tab
3. Click **+ Version or Platform** → **iOS**
4. Fill in version information
5. Select your build (may take a few minutes to appear)
6. Answer **Export Compliance** questions
7. Fill in **App Review Information**:
   - Contact information
   - Demo account (if needed)
   - Notes for reviewer
8. Click **Submit for Review**

## Step 9: Common Issues & Solutions

### Build Errors

- **"No such module"**: Run `pod install` in `ios/App` directory
- **Signing errors**: Check your Apple Developer account and team selection
- **Capacitor plugins not found**: Run `npx cap sync ios`

### App Store Rejection Reasons

Common issues:
- Missing privacy descriptions in Info.plist
- App crashes on launch (test thoroughly!)
- Missing required app information
- Screenshots don't match app functionality
- Missing privacy policy URL

### Updating Your App

1. Update version/build numbers in Xcode
2. Update version in `package.json` and `capacitor.config.ts`
3. Make your changes
4. Build: `npm run build`
5. Sync: `npx cap sync ios`
6. Archive and upload new build
7. Submit new version in App Store Connect

## Step 10: Development Workflow

### Making Changes

1. Make changes to your web app code
2. Build: `npm run build`
3. Sync: `npx cap sync ios`
4. Open in Xcode: `open ios/App/App.xcodeproj`
5. Run on simulator/device

### Live Reload (Development)

For development with live reload, uncomment the `server` section in `capacitor.config.ts`:

```typescript
server: {
  url: 'https://your-dev-server.com',
  cleartext: true,
},
```

Then sync: `npx cap sync ios`

## Additional Resources

- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

## Checklist Before Submission

- [ ] Bundle identifier is unique and matches App Store Connect
- [ ] App icons in all required sizes
- [ ] Splash screen configured
- [ ] Privacy descriptions added to Info.plist
- [ ] App tested on physical device
- [ ] App Store screenshots prepared
- [ ] App description and metadata complete
- [ ] Privacy policy URL added
- [ ] Support URL added
- [ ] Version and build numbers set
- [ ] Archive created and uploaded
- [ ] Export compliance questions answered
- [ ] App review information filled in

Good luck with your App Store submission! 🚀






