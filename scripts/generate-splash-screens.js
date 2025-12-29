#!/usr/bin/env node

/**
 * Generate iOS splash screens from logo image
 *
 * Usage:
 *   node scripts/generate-splash-screens.js <source-image-path>
 *
 * Example:
 *   node scripts/generate-splash-screens.js ./logo.png
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPLASH_SIZE = 2732; // iPad Pro 12.9" size (largest iOS device)
const LOGO_SIZE = 600; // Logo size on splash screen (22% of canvas)
const BACKGROUND_COLOR = '#141d2b'; // Match app's background

const IOS_SPLASH_DIR = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');

async function generateSplashScreens(sourcePath) {
  // Validate source file exists
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Source image not found: ${sourcePath}`);
    process.exit(1);
  }

  console.log('🎨 Generating iOS splash screens...\n');
  console.log(`📁 Source: ${sourcePath}`);
  console.log(`📂 Output: ${IOS_SPLASH_DIR}\n`);

  try {
    // Load source image metadata
    const sourceImage = sharp(sourcePath);
    const metadata = await sourceImage.metadata();

    console.log(`📐 Source image: ${metadata.width}x${metadata.height}, ${metadata.format}\n`);

    // Create splash screen with logo centered on dark background
    const splashBuffer = await sharp({
      create: {
        width: SPLASH_SIZE,
        height: SPLASH_SIZE,
        channels: 4,
        background: BACKGROUND_COLOR
      }
    })
    .png()
    .toBuffer();

    // Resize logo and composite onto splash background
    const resizedLogo = await sharp(sourcePath)
      .resize(LOGO_SIZE, LOGO_SIZE, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toBuffer();

    // Create final splash screen with centered logo
    const finalSplash = await sharp(splashBuffer)
      .composite([{
        input: resizedLogo,
        gravity: 'center'
      }])
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    // iOS requires three files (but they can all be the same image)
    const filenames = [
      'splash-2732x2732.png',
      'splash-2732x2732-1.png',
      'splash-2732x2732-2.png'
    ];

    for (const filename of filenames) {
      const outputPath = path.join(IOS_SPLASH_DIR, filename);
      await fs.promises.writeFile(outputPath, finalSplash);
      console.log(`✅ Generated: ${filename}`);
    }

    console.log(`\n✨ Successfully generated splash screens!`);
    console.log(`\n📦 Next steps:`);
    console.log(`   1. Build the iOS app: npm run build`);
    console.log(`   2. Sync to iOS: npx cap sync ios`);
    console.log(`   3. Open in Xcode: npx cap open ios`);
    console.log(`   4. Build and run to see the new splash screen!\n`);

  } catch (error) {
    console.error(`\n❌ Error generating splash screens: ${error.message}`);
    process.exit(1);
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Error: No source image specified\n');
  console.log('Usage: node scripts/generate-splash-screens.js <source-image-path>\n');
  console.log('Example: node scripts/generate-splash-screens.js ./logo-with-background.png');
  process.exit(1);
}

const sourcePath = path.resolve(args[0]);
generateSplashScreens(sourcePath);
