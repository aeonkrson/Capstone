---
phase: 01-foundation-and-accuracy-spike
plan: 02
subsystem: infra
tags: [vite, https, mediapipe, tasks-vision, sha256, vendoring]

requires: []
provides:
  - Exact-pinned tooling (vite 8.3.2, plugin-basic-ssl 2.3.0, tasks-vision 1.0.1)
  - Self-hosted MediaPipe bundle, WASM and pose models under vendor/mediapipe/ with SHA256SUMS
  - HTTPS LAN dev server with no WebSocket, denying validation/ and .planning/
affects: [01-03, 01-04, 01-05, 01-07]

tech-stack:
  added: [vite 8.3.2, "@vitejs/plugin-basic-ssl 2.3.0", "@mediapipe/tasks-vision 1.0.1"]
  patterns: [explicit vendor script (no postinstall), node:test with hash-checked vendor files]

key-files:
  created: [package.json, package-lock.json, vite.config.js, scripts/vendor-mediapipe.mjs, vendor/mediapipe/SHA256SUMS, vendor/mediapipe/vision_bundle.mjs, vendor/mediapipe/wasm/, vendor/mediapipe/models/pose_landmarker_full.task, test/vendor.test.js]
  modified: [.gitignore]

key-decisions:
  - "Vendored files committed; heavy model gitignored but hash recorded in SHA256SUMS"
  - "Vite ws:false honoured as written; hmr:false not needed"

requirements-completed: [PRIV-02]

duration: 10min
completed: 2026-10-04
---

# Phase 1 Plan 02: Tooling, Vendored Pose Files, HTTPS Dev Server Summary

Exact-pinned Vite/tasks-vision tooling, hash-verified self-hosted MediaPipe files, and an HTTPS LAN dev server that returns 403 for validation/ and .planning/.

## Tasks

| Task | Name | Commit |
|---|---|---|
| 1 | Package legitimacy check (human, approved by Jordan) | n/a |
| 2 | Pin tooling, vendor files, HTTPS server | 4e651d6 |

## Verification

- Lockfile integrity for tasks-vision equals the recorded sha512.
- Five package-file SHA-256 values equal the plan's recorded values.
- Full model 9398198 bytes; heavy model 30664242 bytes (gitignored).
- `npm run vendor:check` OK; `node --test test/vendor.test.js` 6/6 pass.
- Dev server printed `https://192.168.1.9:5173/`; `/.planning/ROADMAP.md` returned 403, `/vendor/mediapipe/SHA256SUMS` returned 200.
- `git check-ignore` confirms heavy model and `validation/x/photo.jpg` are ignored.

## Deviations from Plan

None - plan executed as written. The WebSocket (`ws: false`) was not checked in a browser Network tab; `hmr:false` was not added.

## Pending Human Check

Phone on the LAN and laptop Network-tab check (same-origin only, no WS, 403 on planning file) is carried to the end-of-phase review.

## Self-Check: PASSED
