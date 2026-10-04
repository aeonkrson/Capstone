import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = path.join(ROOT, "vendor", "mediapipe");
const read = (...p) => readFileSync(path.join(ROOT, ...p), "utf8");
const pkg = JSON.parse(read("package.json"));

const REQUIRED = [
  "vision_bundle.mjs",
  "wasm/vision_wasm_internal.js",
  "wasm/vision_wasm_internal.wasm",
  "wasm/vision_wasm_nosimd_internal.js",
  "wasm/vision_wasm_nosimd_internal.wasm",
  "models/pose_landmarker_full.task",
];
const HEAVY = "models/pose_landmarker_heavy.task";

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

test("dependency versions are exact and tasks-vision is 1.0.1", () => {
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const [name, version] of Object.entries(all)) {
    assert.match(version, /^\d+\.\d+\.\d+$/, `${name} is not an exact version: ${version}`);
  }
  assert.equal(pkg.devDependencies["@mediapipe/tasks-vision"], "1.0.1");
});

test("package.json has no install-time scripts", () => {
  const scripts = pkg.scripts || {};
  for (const name of ["postinstall", "preinstall", "install", "prepare"]) {
    assert.equal(scripts[name], undefined, `${name} script must not exist`);
  }
});

test("SHA256SUMS lists seven files and recorded hashes match", () => {
  const lines = read("vendor", "mediapipe", "SHA256SUMS").split("\n").filter(Boolean);
  const entries = lines.map((line) => {
    const m = /^([0-9a-f]{64}) {2}(.+)$/.exec(line);
    assert.ok(m, `bad line: ${line}`);
    return { hash: m[1], rel: m[2] };
  });
  assert.equal(entries.length, 7);
  const rels = entries.map((e) => e.rel);
  for (const rel of [...REQUIRED, HEAVY]) assert.ok(rels.includes(rel), `missing entry ${rel}`);
  for (const { hash, rel } of entries) {
    const file = path.join(VENDOR, rel);
    if (rel === HEAVY && !existsSync(file)) continue;
    assert.ok(existsSync(file), `missing file ${rel}`);
    assert.equal(sha256(file), hash, `hash mismatch for ${rel}`);
  }
});

test("vision_bundle.mjs has no bare imports and exposes the pose API", () => {
  const src = read("vendor", "mediapipe", "vision_bundle.mjs");
  const bare = /(?:^|[\s;}])(?:import|export)\s[^;]*?\sfrom\s*["'](?![./])[^"']+["']/m;
  assert.equal(bare.test(src), false, "bare-specifier import found");
  assert.ok(src.includes("PoseLandmarker"));
  assert.ok(src.includes("FilesetResolver"));
});

test("vite.config.js disables ws and denies sensitive paths", () => {
  const cfg = read("vite.config.js");
  for (const s of ["ws: false", "\"**/validation/**\"", "\"**/.planning/**\"", "\"**/.git/**\""]) {
    assert.ok(cfg.includes(s), `vite.config.js missing ${s}`);
  }
});

test("git tracks the full model but not the heavy model", () => {
  const files = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" }).split("\n");
  assert.ok(files.includes("vendor/mediapipe/models/pose_landmarker_full.task"));
  assert.ok(!files.some((f) => f.endsWith("pose_landmarker_heavy.task")));
});
