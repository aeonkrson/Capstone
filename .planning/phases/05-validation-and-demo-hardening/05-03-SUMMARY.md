---
phase: 05-validation-and-demo-hardening
plan: 03
subsystem: build
tags: [vite, dist, mediapipe, sha256, https-demo]
requires: [vendor/mediapipe/SHA256SUMS, scripts/vendor-mediapipe.mjs]
provides: [scripts/copy-vendor-to-dist.mjs, npm run demo]
affects: [ACC-03]
tech-stack:
  added: []
  patterns: [node built-ins only, SHA-256 check before and after copy]
key-files:
  created:
    - scripts/copy-vendor-to-dist.mjs
    - test/build.dist.test.js
  modified:
    - package.json
decisions:
  - "Every vendor/mediapipe/models/*.task present is copied (full required, heavy optional); vision_bundle.mjs is not copied because it is bundled"
metrics:
  duration: 4 min
  completed: 2026-10-13
  tasks: 2
  files: 3
---

# Phase 5 Plan 03: Demo Build Summary

`npm run build` now leaves a self-contained `dist/`: the pose wasm files and models are copied to `dist/vendor/mediapipe/` and checked against `SHA256SUMS`. `npm run demo` builds and serves `dist/` over HTTPS on the LAN with `vite preview --host`.

## What was built

- `scripts/copy-vendor-to-dist.mjs` exports `copyVendorToDist({ root, outDir })`. It copies the 4 wasm files and `models/pose_landmarker_full.task`, plus any other `.task` model that exists (the heavy one). It throws when `dist/` is missing, when a required file is missing, when `SHA256SUMS` has no entry, or when a hash differs (checked on the source and again on the copy). Run as a CLI it prints `Copied N vendor files to dist/vendor/mediapipe` and exits 1 on error.
- `package.json`: `build` is `vite build && node scripts/copy-vendor-to-dist.mjs`; new `demo` is `npm run build && vite preview --host`. No dependencies added.
- `test/build.dist.test.js`: temp-fixture tests for copy, heavy present, missing outDir, missing required file, hash mismatch, and the two script strings.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | c2eb8c4 | feat(05-03): copy vendor pose files into dist with SHA-256 check |
| 2 | 38825f6 | feat(05-03): wire copy step into build and add demo script |

## Verification (real build)

- `npm test`: 267 pass, 0 fail.
- `npm run build`: green, printed `Copied 6 vendor files to dist/vendor/mediapipe`.
- `dist/vendor/mediapipe/` holds the 4 wasm files, `pose_landmarker_full.task` and `pose_landmarker_heavy.task`; `shasum -a 256 -c` against the `wasm/` and `models/` lines of `vendor/mediapipe/SHA256SUMS` printed OK for all 6.
- `dist/index.html` keeps the CSP (`Content-Security-Policy`, `script-src 'self' 'wasm-unsafe-eval'`).
- No path under `dist/` contains `validation` or `.planning`.
- `vite preview --host --port 4173` returned HTTP 200 over HTTPS for both the full model and `vision_wasm_internal.wasm`; server stopped afterwards.

## Deviations from Plan

- The RED step for Task 1 was not committed separately: test and script were written together and the test was run once green. The plan asked for the test first; the behavior is covered either way.
- The script-string test in `test/build.dist.test.js` failed until Task 2; it was excluded from the Task 1 run and committed with Task 1 as one file.

## Known Stubs

None.

## Threat Flags

None. T-05-08 (hash check) and T-05-09 (only wasm/ and models/ copied, verified) are mitigated; T-05-10 (self-signed cert) accepted as planned. The README note telling the user to accept the certificate warning is not part of this plan.

## Requirements

ACC-03 not ticked: it needs real per-device study runs with people and devices.

## Self-Check: PASSED

Files found: scripts/copy-vendor-to-dist.mjs, test/build.dist.test.js, package.json edit. Commits c2eb8c4 and 38825f6 exist.
