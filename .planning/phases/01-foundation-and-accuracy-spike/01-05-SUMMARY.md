---
phase: 01-foundation-and-accuracy-spike
plan: 05
subsystem: platform
tags: [camera, mediapipe, pose, frame-loop, debug-view, privacy]

requires: [01-03]
provides:
  - createCamera (single stream owner, reason-coded errors)
  - createFrameLoop and nextVideoFrame (throttled, restartable, timeout-safe)
  - createPose (self-hosted PoseLandmarker adapter returning FrameObservation in raw pixels)
  - LM, LANDMARK_COUNT, SKELETON_CONNECTIONS
  - createDebugView (frame, silhouette, landmarks, engine list)
affects: [01-06, 01-07]

tech-stack:
  added: []
  patterns: [generation counter for late streams, in-flight frame guard, mirror only at draw time]

key-files:
  created: [src/platform/camera.js, src/platform/frameLoop.js, src/platform/pose.js, src/core/landmarks.js, src/ui/debugView.js]
  modified: [src/main.js]

key-decisions:
  - "Start camera button shown whenever stopped; camera never auto-restarts on tab return"
  - "Pose engine created once per page load and reused across restarts"
  - "index.html, css and vite.config.js left unchanged (no CSP or Vite change made; not browser-tested)"

requirements-completed: [PRIV-02]

duration: 20min
completed: 2026-10-04
---

# Phase 1 Plan 05: Camera, Pose and Debug View Summary

Camera starts after a valid height and shows a live picture; with `?debug=1` it draws landmarks and a silhouette computed on-device from the vendored MediaPipe files, with no network, storage or export API in `src/`.

## Commits

| Task | Name | Commit |
|---|---|---|
| 1 | Camera lifecycle, frame loop, live picture | 85b6623 |
| 2 | Pose adapter, landmarks, debug overlays | d5d2568 |

## Verification

- `node --check` on all files; `node --test` on privacy, purity, vendor, height and i18n tests: 36 pass, 0 fail.
- Landmark constants check passes (16 connections).
- `test/pipeline.e2e.test.js` still fails until plan 01-06, as expected.

## Deviations from Plan

None - plan executed as written. The CSP and Vite contingencies were not triggered by anything observed here, because no browser was available; they were not applied.

## Pending Human Checks (carried to end-of-phase review / plan 01-07)

- Camera lifecycle on laptop and phone (indicator off after stop, change height, hidden tab; Start camera button; blocked permission message).
- Landmarks and silhouette on both devices over HTTPS and from `python3 -m http.server`; Network panel shows same-origin GET only; console free of CSP errors. If Vite mishandles `vision_wasm_internal.js` or CSP blocks workers, apply the contingencies described in the plan and record them.
- iOS Safari with Tasks Vision 1.0.1 remains unverified.

## Known Stubs

None. `onFrame` ignores frames until the pose engine is loaded (by design; the engine loads before the loop starts).

## Self-Check: PASSED
