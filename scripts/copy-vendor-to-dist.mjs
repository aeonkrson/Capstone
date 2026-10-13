import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = [
  "wasm/vision_wasm_internal.js",
  "wasm/vision_wasm_internal.wasm",
  "wasm/vision_wasm_nosimd_internal.js",
  "wasm/vision_wasm_nosimd_internal.wasm",
  "models/pose_landmarker_full.task",
];

function readSums(vendorDir) {
  const file = path.join(vendorDir, "SHA256SUMS");
  if (!existsSync(file)) throw new Error(`Missing ${file}`);
  const sums = new Map();
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^([0-9a-f]{64})\s+(.+)$/.exec(line.trim());
    if (m) sums.set(m[2], m[1]);
  }
  return sums;
}

// Copy runtime pose files (wasm + models) into dist and verify SHA-256 of each.
export function copyVendorToDist({ root, outDir }) {
  if (!existsSync(outDir)) {
    throw new Error(`Output folder not found: ${outDir}. Run the build first.`);
  }
  const vendorDir = path.join(root, "vendor", "mediapipe");
  const sums = readSums(vendorDir);

  const wanted = [...REQUIRED];
  const modelsDir = path.join(vendorDir, "models");
  if (existsSync(modelsDir)) {
    for (const name of readdirSync(modelsDir).sort()) {
      const rel = `models/${name}`;
      if (name.endsWith(".task") && !wanted.includes(rel)) wanted.push(rel);
    }
  }

  const copied = [];
  for (const rel of wanted) {
    const src = path.join(vendorDir, rel);
    if (!existsSync(src)) throw new Error(`Missing vendor file: ${rel}`);
    const expected = sums.get(rel);
    if (!expected) throw new Error(`No SHA-256 entry in SHA256SUMS for ${rel}`);
    const actual = createHash("sha256").update(readFileSync(src)).digest("hex");
    if (actual !== expected) throw new Error(`SHA-256 mismatch for ${rel}`);
    const dest = path.join(outDir, "vendor", "mediapipe", rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    const destHash = createHash("sha256").update(readFileSync(dest)).digest("hex");
    if (destHash !== expected) throw new Error(`SHA-256 mismatch after copy for ${rel}`);
    copied.push(rel);
  }
  return copied;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    const copied = copyVendorToDist({ root, outDir: path.join(root, "dist") });
    console.log(`Copied ${copied.length} vendor files to dist/vendor/mediapipe`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
