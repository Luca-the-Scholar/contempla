# iOS App Icon Installation Guide

## ✅ Icon Generation Complete!

All 13 required iOS app icon sizes have been generated from your source image.

## 📁 Generated Files

All icon files are in this directory (`icon-exports/`):

- **AppIcon-1024.png** - 1024x1024 - App Store
- **AppIcon-180.png** - 180x180 - iPhone @3x (60pt)
- **AppIcon-167.png** - 167x167 - iPad Pro @2x (83.5pt)
- **AppIcon-152.png** - 152x152 - iPad @2x (76pt)
- **AppIcon-120.png** - 120x120 - iPhone @2x (60pt)
- **AppIcon-87.png** - 87x87 - iPhone @3x Settings (29pt)
- **AppIcon-80.png** - 80x80 - iPad @2x Spotlight (40pt)
- **AppIcon-76.png** - 76x76 - iPad (76pt)
- **AppIcon-60.png** - 60x60 - iPhone (60pt)
- **AppIcon-58.png** - 58x58 - iPhone @2x Settings (29pt)
- **AppIcon-40.png** - 40x40 - Spotlight (40pt)
- **AppIcon-29.png** - 29x29 - Settings (29pt)
- **AppIcon-20.png** - 20x20 - Notification (20pt)

## 📱 How to Add to Xcode (Method 1 - Recommended)

1. **Open Xcode:**
   ```bash
   open ios/App/App.xcodeproj
   ```

2. **Navigate to AppIcon:**
   - In the Project Navigator (left sidebar), expand: **App**
   - Expand: **Assets.xcassets**
   - Click on: **AppIcon**

3. **Drag and Drop:**
   - Select ALL `.png` files from this `icon-exports/` folder (except Contents.json)
   - Drag them into the AppIcon editor in Xcode
   - Xcode will automatically match each icon to the correct size slot

4. **Verify:**
   - All slots should now have icons
   - No yellow warning triangles should appear

5. **Build and Test:**
   - Build the app (⌘+B)
   - Run on simulator or device
   - Your new app icon should appear!

## 🔧 How to Add to Xcode (Method 2 - Manual)

If drag-and-drop doesn't work:

1. Open Xcode and navigate to AppIcon as above

2. For each icon slot:
   - Click the empty icon slot
   - Select the corresponding `.png` file from `icon-exports/`
   - Match the size (e.g., for "iPhone App iOS 60pt @3x", use `AppIcon-180.png`)

3. Reference table:

   | Xcode Slot | Size | Use This File |
   |------------|------|---------------|
   | App Store | 1024x1024 | AppIcon-1024.png |
   | iPhone App 60pt @3x | 180x180 | AppIcon-180.png |
   | iPad Pro App 83.5pt @2x | 167x167 | AppIcon-167.png |
   | iPad App 76pt @2x | 152x152 | AppIcon-152.png |
   | iPhone App 60pt @2x | 120x120 | AppIcon-120.png |
   | iPhone Settings 29pt @3x | 87x87 | AppIcon-87.png |
   | iPad Spotlight 40pt @2x | 80x80 | AppIcon-80.png |
   | iPad App 76pt | 76x76 | AppIcon-76.png |
   | iPhone App 60pt | 60x60 | AppIcon-60.png |
   | iPhone Settings 29pt @2x | 58x58 | AppIcon-58.png |
   | Spotlight 40pt | 40x40 | AppIcon-40.png |
   | Settings 29pt | 29x29 | AppIcon-29.png |
   | Notification 20pt | 20x20 | AppIcon-20.png |

## 🎯 Quick Commands

### Regenerate Icons (if you update the logo):

```bash
# Using npm script
npm run generate-icons path/to/your/logo.png

# Or directly
node scripts/generate-ios-icons.js path/to/your/logo.png
```

### From current app icon:
```bash
npm run generate-icons ios/App/App/Assets.xcassets/AppIcon.appiconset/contempla_favicon_squared.png
```

## ✔️ Verification Checklist

After adding icons to Xcode:

- [ ] All 13 icon slots are filled in Xcode
- [ ] No yellow warning triangles in AppIcon editor
- [ ] App builds successfully (⌘+B)
- [ ] Icon appears correctly on iOS simulator Home Screen
- [ ] Icon appears correctly in Settings
- [ ] Icon appears correctly in Spotlight search
- [ ] Icon appears correctly on physical device (if available)

## 📝 Technical Notes

- **Format:** All icons are PNG with no transparency (iOS requirement)
- **Color Space:** RGB (not CMYK)
- **Compression:** Maximum quality, optimized file size
- **Source:** Generated from `contempla_favicon_squared.png` (1024x1024)

## 🐛 Troubleshooting

### Icons not appearing in Xcode?
- Make sure you're dragging the `.png` files, not the folder
- Try the manual method (Method 2) instead

### Yellow warning triangles?
- This means a required size is missing
- Regenerate icons and ensure all files are present
- Check that filenames match expected sizes

### Icon looks wrong on device?
- Clear derived data: Xcode > Product > Clean Build Folder (⇧⌘K)
- Delete the app from device/simulator
- Rebuild and reinstall

### Need different sizes?
- Edit `scripts/generate-ios-icons.js`
- Add new sizes to the `ICON_SIZES` array
- Regenerate icons

## 📚 More Information

- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Asset Catalog Format Reference](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/)

---

Generated on: 2025-12-28
Script: `scripts/generate-ios-icons.js`
Source: `ios/App/App/Assets.xcassets/AppIcon.appiconset/contempla_favicon_squared.png`
