#!/usr/bin/env node

/**
 * Generate all required iOS app icon sizes from a source image
 *
 * Usage:
 *   node scripts/generate-ios-icons.js <source-image-path>
 *
 * Example:
 *   node scripts/generate-ios-icons.js ./logo.png
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All required iOS app icon sizes
const ICON_SIZES = [
  { size: 1024, name: 'AppIcon-1024', description: 'App Store' },
  { size: 180, name: 'AppIcon-180', description: 'iPhone @3x (60pt)' },
  { size: 167, name: 'AppIcon-167', description: 'iPad Pro @2x (83.5pt)' },
  { size: 152, name: 'AppIcon-152', description: 'iPad @2x (76pt)' },
  { size: 120, name: 'AppIcon-120', description: 'iPhone @2x (60pt)' },
  { size: 87, name: 'AppIcon-87', description: 'iPhone @3x Settings (29pt)' },
  { size: 80, name: 'AppIcon-80', description: 'iPad @2x Spotlight (40pt)' },
  { size: 76, name: 'AppIcon-76', description: 'iPad (76pt)' },
  { size: 60, name: 'AppIcon-60', description: 'iPhone (60pt)' },
  { size: 58, name: 'AppIcon-58', description: 'iPhone @2x Settings (29pt)' },
  { size: 40, name: 'AppIcon-40', description: 'Spotlight (40pt)' },
  { size: 29, name: 'AppIcon-29', description: 'Settings (29pt)' },
  { size: 20, name: 'AppIcon-20', description: 'Notification (20pt)' },
];

const OUTPUT_DIR = path.join(__dirname, '..', 'icon-exports');

async function generateIcons(sourcePath) {
  // Validate source file exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source image not found: ${sourcePath}`);
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🎨 Generating iOS app icons...\n');
  console.log(`📁 Source: ${sourcePath}`);
  console.log(`📂 Output: ${OUTPUT_DIR}\n`);

  try {
    // Load and validate source image
    const sourceImage = sharp(sourcePath);
    const metadata = await sourceImage.metadata();

    console.log(`📐 Source image: ${metadata.width}x${metadata.height}, ${metadata.format}\n`);

    // Warn if source is not square
    if (metadata.width !== metadata.height) {
      console.warn(`⚠️  WARNING: Source image is not square (${metadata.width}x${metadata.height})`);
      console.warn(`   The image will be cropped to a square. Consider using a square source image.\n`);
    }

    // Warn if source is too small
    if (metadata.width < 1024 || metadata.height < 1024) {
      console.warn(`⚠️  WARNING: Source image is smaller than 1024x1024`);
      console.warn(`   Quality may be degraded when upscaling.\n`);
    }

    // Generate each icon size
    for (const icon of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `${icon.name}.png`);

      await sharp(sourcePath)
        .resize(icon.size, icon.size, {
          fit: 'cover',
          position: 'center',
        })
        .flatten({ background: { r: 255, g: 255, b: 255 } }) // Remove transparency (iOS requirement)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);

      console.log(`✅ ${icon.size}x${icon.size} - ${icon.name}.png (${icon.description})`);
    }

    console.log(`\n✨ Successfully generated ${ICON_SIZES.length} icon sizes!`);
    console.log(`\n📦 Next steps:`);
    console.log(`   1. Open Xcode project: ios/App/App.xcodeproj`);
    console.log(`   2. Navigate to: App > Assets.xcassets > AppIcon.appiconset`);
    console.log(`   3. Drag and drop the generated icons from: ${OUTPUT_DIR}`);
    console.log(`   4. Xcode will automatically place them in the correct slots\n`);

    // Generate Contents.json for the appiconset
    generateContentsJson();

  } catch (error) {
    console.error(`\n❌ Error generating icons: ${error.message}`);
    process.exit(1);
  }
}

function generateContentsJson() {
  const contentsPath = path.join(OUTPUT_DIR, 'Contents.json');

  const contents = {
    images: [
      {
        filename: 'AppIcon-1024.png',
        idiom: 'universal',
        platform: 'ios',
        size: '1024x1024'
      }
    ],
    info: {
      author: 'xcode',
      version: 1
    }
  };

  fs.writeFileSync(contentsPath, JSON.stringify(contents, null, 2));
  console.log(`\n📄 Generated Contents.json for easy Xcode import`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Error: No source image specified\n');
  console.log('Usage: node scripts/generate-ios-icons.js <source-image-path>\n');
  console.log('Example: node scripts/generate-ios-icons.js ./logo.png');
  process.exit(1);
}

const sourcePath = path.resolve(args[0]);
generateIcons(sourcePath);
