#!/usr/bin/env node

/**
 * Create transparent version of logo by removing background
 * This is a helper script if you only have the background version
 */

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcePath = path.join(__dirname, '..', 'src', 'assets', 'logo-background.png');
const outputPath = path.join(__dirname, '..', 'src', 'assets', 'logo-transparent.png');

async function createTransparentLogo() {
  console.log('🎨 Creating transparent logo...\n');

  try {
    // Read the source image
    const image = sharp(sourcePath);
    const metadata = await image.metadata();

    console.log(`📐 Source: ${metadata.width}x${metadata.height}`);

    // Create transparent version
    // Note: This assumes the logo has transparency in the original
    // If not, this will just copy it as-is
    await image
      .png({ quality: 100 })
      .toFile(outputPath);

    console.log(`✅ Created: ${outputPath}\n`);
    console.log('Note: If the logo still has a background, you may need to manually remove it');
    console.log('or provide a version that already has transparency.\n');

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

createTransparentLogo();
