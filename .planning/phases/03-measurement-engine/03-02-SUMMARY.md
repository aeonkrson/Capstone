---
phase: 03-measurement-engine
plan: 02
subsystem: core
tags: [quality-gates, tdd, pure-core, device-orientation]
requires:
  - src/core/measure.js MIN_VISIBILITY
  - src/core/mask.js maskBBox, rowRuns
  - src/core/geometry.js median, mad
provides:
  - src/core/quality.js QUALITY, checkFrame, checkStability, cameraPitchDeg
  - src/platform/tilt.js createTiltSensor
affects:
  - plan 03-04 wires these gates into the burst; plan 03-05 tunes QUALITY thresholds on real captures
tech-stack:
  added: []
  patterns: [frozen threshold object, first-failure reason code, injectable browser globals for Node tests]
key-files:
  created:
    - src/core/quality.js
    - src/platform/tilt.js
    - test/core/quality.test.js
    - test/tilt.test.js
  modified: []
decisions:
  - "Reason codes are stable strings checked in a fixed order (P3-D7); thresholds live in one frozen QUALITY object, all marked as starting values (P3-D8)"
  - "Tilt is checked by image (lean, shoulder roll) everywhere and by device pitch when the sensor exists (P3-D10)"
metrics:
  duration: 6min
  completed: 2026-10-13
  tasks: 2 (both TDD, RED + GREEN)
  files: 4
---

# Phase 3 Plan 02: Capture Quality Gates Summary

Pure per-frame and per-burst quality gates (`checkFrame`, `checkStability`) plus a deviceorientation adapter, so a bad capture returns a named reason code instead of a confident number.

## What was built

- `src/core/quality.js`
  - `QUALITY`: frozen thresholds with the P3-D8 values, each noted as a starting value.
  - `checkFrame(obs, view, { devicePitchDeg })`: returns the first failure of no-pose, no-mask, not-full-body, too-close, too-far, low-visibility, wrong-side, tilted, arms-against-body. The side view accepts either side facing the camera, and the arm rule applies to the front view only.
  - `checkStability(readings)`: `moving` when anchor range exceeds 4% of the median span, or the MAD of shoulder or bust extent exceeds 1.0 cm. Fewer than 2 readings pass.
  - `cameraPitchDeg(beta, gamma)`: degrees off vertical, null for non-finite input.
- `src/platform/tilt.js`: `createTiltSensor` asks for iOS motion permission when the API exists, keeps only the latest beta and gamma in memory, and clears them on `stop()`. Any error resolves `false`. Globals are read lazily so the module imports in Node.

## Verification

- `npm test`: 156/156 pass (includes core purity and privacy static tests). `npm run build` passes.
- `src/core/quality.js` imports only landmarks, measure, mask and geometry.

## Commits

| Gate | Commit | Message |
|------|--------|---------|
| RED (quality) | 5376c02 | test(03-02): add failing tests for frame and burst quality gates |
| GREEN (quality) | 2545c21 | feat(03-02): add frame and burst quality gates |
| RED (tilt) | 69cb924 | test(03-02): add failing tests for device orientation adapter |
| GREEN (tilt) | a6f0811 | feat(03-02): add device orientation tilt adapter |

## TDD Gate Compliance

Both tasks have a `test(...)` commit that failed (module missing) before the `feat(...)` commit. No REFACTOR commit was needed.

## Requirements

MEAS-01..05 stay **pending**, not ticked in REQUIREMENTS.md. The gates are tested on synthetic fixtures only. Each requirement still needs the scan page and a real browser and camera check on team members. The QUALITY thresholds are unconfirmed starting values until plan 03-05.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None. Thresholds are starting values by design (P3-D8).

## Threat Flags

None. T-03-04 and T-03-05 mitigated as planned: only finite numbers reach `cameraPitchDeg`, and readings stay in memory and are cleared on `stop()`.

## Self-Check: PASSED

- FOUND: src/core/quality.js, src/platform/tilt.js, test/core/quality.test.js, test/tilt.test.js
- FOUND: commits 5376c02, 2545c21, 69cb924, a6f0811
