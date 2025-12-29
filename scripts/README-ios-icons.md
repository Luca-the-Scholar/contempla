# iOS App Icon Generation Guide

## Quick Start

Generate all required iOS app icon sizes from your logo:

```bash
node scripts/generate-ios-icons.js /path/to/your/logo.png
```

## Requirements

- Source image should be:
  - **Square** (1:1 aspect ratio) - at least 1024x1024px
  - **PNG or JPG** format
  - **High quality** - will be resized down to smaller sizes
  - **No transparency** (or it will be flattened to white background)

## What It Does

The script generates these iOS app icon sizes:

| Size    | Usage                          |
|---------|--------------------------------|
| 1024x1024 | App Store                    |
| 180x180 | iPhone @3x (60pt)              |
| 167x167 | iPad Pro @2x (83.5pt)          |
| 152x152 | iPad @2x (76pt)                |
| 120x120 | iPhone @2x (60pt)              |
| 87x87   | iPhone @3x Settings (29pt)     |
| 80x80   | iPad @2x Spotlight (40pt)      |
| 76x76   | iPad (76pt)                    |
| 60x60   | iPhone (60pt)                  |
| 58x58   | iPhone @2x Settings (29pt)     |
| 40x40   | Spotlight (40pt)               |
| 29x29   | Settings (29pt)                |
| 20x20   | Notification (20pt)            |

## Output

All generated icons will be saved to `./icon-exports/` directory with names like:
- `AppIcon-1024.png`
- `AppIcon-180.png`
- etc.

## Adding Icons to Xcode

After running the script:

1. Open Xcode project: `ios/App/App.xcodeproj`
2. In Project Navigator, expand: **App → Assets.xcassets → AppIcon.appiconset**
3. Drag and drop all generated PNG files from `icon-exports/` folder into the AppIcon wells
4. Xcode will automatically match sizes to the correct slots
5. Build and run to see your new app icon!

## Current App Icon

The current app icon is located at:
```
ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```

This is a 1024x1024 icon but only one size exists. You should generate all sizes for proper iOS support.

## Troubleshooting

### "Source image is not square"
Your source image will be center-cropped to a square. For best results, use a square source image.

### "Source image is smaller than 1024x1024"
The script will upscale the image, but quality may suffer. Use a larger source image for best results.

### Icons have white background
iOS requires app icons without transparency. Any transparent pixels are automatically converted to white.

## Example

```bash
# Generate from your logo
node scripts/generate-ios-icons.js ./logo.png

# Generate from existing app icon
node scripts/generate-ios-icons.js ./ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png
```
