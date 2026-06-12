// Script tạo tất cả icon sizes cần thiết từ logo.png gốc
// Chạy: node scripts/generate-icons.mjs

import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT = path.join(__dirname, "../public/logo.png");
const OUTPUT_DIR = path.join(__dirname, "../public/icons");

import fs from "fs";
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const sizes = [
  // PWA / Web App Manifest
  { size: 72,   name: "icon-72x72.png" },
  { size: 96,   name: "icon-96x96.png" },
  { size: 128,  name: "icon-128x128.png" },
  { size: 144,  name: "icon-144x144.png" },
  { size: 152,  name: "icon-152x152.png" },
  { size: 192,  name: "icon-192x192.png" },
  { size: 384,  name: "icon-384x384.png" },
  { size: 512,  name: "icon-512x512.png" },
  // Apple Touch Icons
  { size: 57,   name: "apple-touch-icon-57x57.png" },
  { size: 60,   name: "apple-touch-icon-60x60.png" },
  { size: 72,   name: "apple-touch-icon-72x72.png" },
  { size: 76,   name: "apple-touch-icon-76x76.png" },
  { size: 114,  name: "apple-touch-icon-114x114.png" },
  { size: 120,  name: "apple-touch-icon-120x120.png" },
  { size: 144,  name: "apple-touch-icon-144x144.png" },
  { size: 152,  name: "apple-touch-icon-152x152.png" },
  { size: 180,  name: "apple-touch-icon-180x180.png" },
  { size: 180,  name: "apple-touch-icon.png" }, // main apple touch icon
  // Windows / Microsoft Tiles
  { size: 70,   name: "mstile-70x70.png" },
  { size: 144,  name: "mstile-144x144.png" },
  { size: 150,  name: "mstile-150x150.png" },
  { size: 310,  name: "mstile-310x310.png" },
  // Favicon sizes
  { size: 16,   name: "favicon-16x16.png" },
  { size: 32,   name: "favicon-32x32.png" },
  { size: 48,   name: "favicon-48x48.png" },
  // Android shortcut icon
  { size: 192,  name: "android-chrome-192x192.png" },
  { size: 512,  name: "android-chrome-512x512.png" },
];

console.log("🎨 Generating icons from logo.png...\n");

for (const { size, name } of sizes) {
  const dest = path.join(OUTPUT_DIR, name);
  await sharp(INPUT)
    .resize(size, size, { fit: "contain", background: { r: 8, g: 8, b: 10, alpha: 1 } })
    .png()
    .toFile(dest);
  console.log(`  ✅ ${name} (${size}x${size})`);
}

// Also copy a 180x180 apple-touch-icon.png to /public root (standard location)
await sharp(INPUT)
  .resize(180, 180, { fit: "contain", background: { r: 8, g: 8, b: 10, alpha: 1 } })
  .png()
  .toFile(path.join(__dirname, "../public/apple-touch-icon.png"));

console.log("\n✅ All icons generated successfully!");
console.log(`📁 Output: public/icons/`);
