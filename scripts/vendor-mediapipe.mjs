// Vendors the pinned MediaPipe pose files into vendor/mediapipe/ and records/checks SHA-256 hashes.
// Usage: node scripts/vendor-mediapipe.mjs [--heavy] [--write-sums] [--check]
import { mkdir, copyFile, readFile, writeFile, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PKG = path.join(ROOT, "node_modules", "@mediapipe", "tasks-vision");
const OUT = path.join(ROOT, "vendor", "mediapipe");
const SUMS = path.join(OUT, "SHA256SUMS");

const COPIES = [
  "vision_bundle.mjs",
  "wasm/vision_wasm_internal.js",
  "wasm/vision_wasm_internal.wasm",
  "wasm/vision_wasm_nosimd_internal.js",
  "wasm/vision_wasm_nosimd_internal.wasm",
];

const BASE = "https://storage.googleapis.com/mediapipe-models/pose_landmarker";
const MODELS = {
  full: {
    dest: "models/pose_landmarker_full.task",
    url: `${BASE}/pose_landmarker_full/float16/1/pose_landmarker_full.task`,
    md5: "83879689d373d143be094c972355e48e",
    bytes: 9398198,
  },
  heavy: {
    dest: "models/pose_landmarker_heavy.task",
    url: `${BASE}/pose_landmarker_heavy/float16/1/pose_landmarker_heavy.task`,
    md5: "453dec4d02ccc4d3ce812b6de84fa516",
    bytes: null,
  },
};

const REQUIRED = [...COPIES, MODELS.full.dest];
const HEAVY = MODELS.heavy.dest;

const args = new Set(process.argv.slice(2));

const hashOf = async (file, algo) =>
  createHash(algo).update(await readFile(file)).digest("hex");

const exists = async (file) => {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
};

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const parseSums = (text) =>
  text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const m = /^([0-9a-f]{64}) {2}(.+)$/.exec(line);
      if (!m) fail(`Bad SHA256SUMS line: ${line}`);
      return { hash: m[1], rel: m[2] };
    });

async function check() {
  if (!(await exists(SUMS))) fail("Missing vendor/mediapipe/SHA256SUMS");
  const entries = parseSums(await readFile(SUMS, "utf8"));
  for (const rel of REQUIRED) {
    if (!(await exists(path.join(OUT, rel)))) fail(`Missing required file: ${rel}`);
  }
  for (const { hash, rel } of entries) {
    const file = path.join(OUT, rel);
    if (!(await exists(file))) {
      console.log(`Absent (not an error): ${rel}`);
      continue;
    }
    if ((await hashOf(file, "sha256")) !== hash) fail(`SHA-256 mismatch: ${rel}`);
  }
  console.log("vendor:check OK");
}

async function download(model) {
  const dest = path.join(OUT, model.dest);
  if (await exists(dest)) return;
  console.log(`Downloading ${model.url}`);
  const res = await fetch(model.url);
  if (!res.ok) fail(`Download failed (${res.status}): ${model.url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  const md5 = await hashOf(dest, "md5");
  if (md5 !== model.md5 || (model.bytes !== null && buf.length !== model.bytes)) {
    await rm(dest);
    fail(`MD5 or size mismatch for ${model.dest}`);
  }
}

async function vendor() {
  await mkdir(path.join(OUT, "wasm"), { recursive: true });
  await mkdir(path.join(OUT, "models"), { recursive: true });
  for (const rel of COPIES) await copyFile(path.join(PKG, rel), path.join(OUT, rel));
  await download(MODELS.full);
  if (args.has("--heavy")) await download(MODELS.heavy);

  const files = [...REQUIRED];
  if (await exists(path.join(OUT, HEAVY))) files.push(HEAVY);
  files.sort();
  const lines = [];
  for (const rel of files) lines.push(`${await hashOf(path.join(OUT, rel), "sha256")}  ${rel}`);
  const text = lines.join("\n") + "\n";

  if (args.has("--write-sums") || !(await exists(SUMS))) {
    await writeFile(SUMS, text);
    console.log("Wrote SHA256SUMS");
  } else if ((await readFile(SUMS, "utf8")) !== text) {
    fail("SHA256SUMS differs from recomputed hashes (use --write-sums to overwrite)");
  } else {
    console.log("SHA256SUMS matches");
  }
}

if (args.has("--check")) await check();
else await vendor();
