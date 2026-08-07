/**
 * Compress source PNGs in /background into public/backgrounds/*.webp
 *
 * Requires project deps: npm install (uses sharp)
 * Run: node scripts/optimize-backgrounds.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "background");
const outDir = path.join(root, "public", "backgrounds");

const mapping = [
  { from: "早上.png", to: "morning-desktop.webp", maxWidth: 2400 },
  { from: "中午.png", to: "noon-desktop.webp", maxWidth: 2400 },
  { from: "黄昏.png", to: "dusk-desktop.webp", maxWidth: 2400 },
  { from: "夜晚.png", to: "night-desktop.webp", maxWidth: 2400 },
  { from: "早上手机.png", to: "morning-mobile.webp", maxWidth: 1200 },
  { from: "中午手机.png", to: "noon-mobile.webp", maxWidth: 1200 },
  { from: "黄昏手机.png", to: "dusk-mobile.webp", maxWidth: 1200 },
  { from: "夜晚手机.png", to: "night-mobile.webp", maxWidth: 1200 },
];

await fs.mkdir(outDir, { recursive: true });

for (const item of mapping) {
  const input = path.join(srcDir, item.from);
  const output = path.join(outDir, item.to);
  const info = await sharp(input)
    .rotate()
    .resize({
      width: item.maxWidth,
      withoutEnlargement: true,
    })
    .webp({ quality: 78, effort: 4 })
    .toFile(output);
  const kb = (info.size / 1024).toFixed(0);
  console.log(`${item.to}  ${info.width}x${info.height}  ${kb}KB`);
}
