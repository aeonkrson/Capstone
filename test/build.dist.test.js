import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyVendorToDist } from "../scripts/copy-vendor-to-dist.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const WASM = [
  "wasm/vision_wasm_internal.js",
  "wasm/vision_wasm_internal.wasm",
  "wasm/vision_wasm_nosimd_internal.js",
  "wasm/vision_wasm_nosimd_internal.wasm",
];
const FULL = "models/pose_landmarker_full.task";
const HEAVY = "models/pose_landmarker_heavy.task";

const sha = (s) => createHash("sha256").update(s).digest("hex");

function makeFixture({ skip = [], heavy = false, badHash = null, withOut = true } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "dist-test-"));
  const vendor = path.join(dir, "vendor", "mediapipe");
  const files = [...WASM, FULL, "vision_bundle.mjs"];
  if (heavy) files.push(HEAVY);
  const sums = [];
  for (const rel of files) {
    const content = `fake:${rel}`;
    sums.push(`${sha(content)}  ${rel}`);
    if (skip.includes(rel)) continue;
    const full = path.join(vendor, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, badHash === rel ? "tampered" : content);
  }
  mkdirSync(vendor, { recursive: true });
  writeFileSync(path.join(vendor, "SHA256SUMS"), sums.join("\n") + "\n");
  const outDir = path.join(dir, "dist");
  if (withOut) mkdirSync(outDir);
  return { dir, outDir };
}

test("copies wasm and full model, keeps relative paths, skips bundle and absent heavy", () => {
  const { dir, outDir } = makeFixture();
  try {
    const copied = copyVendorToDist({ root: dir, outDir });
    assert.equal(copied.length, 5);
    for (const rel of [...WASM, FULL]) {
      assert.ok(existsSync(path.join(outDir, "vendor", "mediapipe", rel)), rel);
    }
    assert.ok(!existsSync(path.join(outDir, "vendor", "mediapipe", "vision_bundle.mjs")));
    assert.ok(!existsSync(path.join(outDir, "vendor", "mediapipe", HEAVY)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("copies heavy model when present", () => {
  const { dir, outDir } = makeFixture({ heavy: true });
  try {
    const copied = copyVendorToDist({ root: dir, outDir });
    assert.ok(copied.includes(HEAVY));
    assert.ok(existsSync(path.join(outDir, "vendor", "mediapipe", HEAVY)));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("throws when outDir is missing", () => {
  const { dir, outDir } = makeFixture({ withOut: false });
  try {
    assert.throws(() => copyVendorToDist({ root: dir, outDir }), /build/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("throws naming a missing required file", () => {
  const { dir, outDir } = makeFixture({ skip: [FULL] });
  try {
    assert.throws(() => copyVendorToDist({ root: dir, outDir }), /pose_landmarker_full\.task/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("throws naming the file on hash mismatch", () => {
  const rel = "wasm/vision_wasm_internal.wasm";
  const { dir, outDir } = makeFixture({ badHash: rel });
  try {
    assert.throws(() => copyVendorToDist({ root: dir, outDir }), /vision_wasm_internal\.wasm/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("package.json build and demo scripts", () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.equal(pkg.scripts.build, "vite build && node scripts/copy-vendor-to-dist.mjs");
  assert.equal(pkg.scripts.demo, "npm run build && vite preview --host");
});
