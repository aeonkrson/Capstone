---
phase: 01-foundation-and-accuracy-spike
plan: 06
subsystem: measurement
tags: [measurement, silhouette, bust-band, burst-capture, debug-view]

requires: [01-04, 01-05]
provides:
  - geometry (dist, median, mad, summarise, ellipsePerimeter)
  - mask (maskBBox, rowRuns, torsoRunAtRow, widestTorsoRun)
  - cmPerPxFromMask (per-view scale from silhouette extent)
  - MEASUREMENTS registry (shoulder, bust), frozen bust band 0.22 to 0.36, measureView, bustCircumferenceCm
  - runBurst (numbers-only burst, abortable)
  - live and captured readings panels with bust band guides in the debug view
affects: [01-07, 01-08]

tech-stack:
  added: []
  patterns: [pure core returning reason codes, capture token abort, numbers-only burst]

key-files:
  created: [src/core/geometry.js, src/core/mask.js, src/core/scale.js, src/core/measure.js, src/app/burst.js, test/core/geometry.test.js, test/core/mask.test.js, test/core/scale.test.js, test/core/measure.test.js]
  modified: [src/ui/debugView.js, src/main.js, README.md]

key-decisions:
  - "Bust taken at widest midline run in a frozen 22%-36% band; each view picks its own row"
  - "Capture abort via module-level token bumped in stopCamera; height read once per capture"

requirements-completed: [CAPT-01, PRIV-02]

duration: 25min
completed: 2026-10-04
---

# Phase 1 Plan 06: Measurement Core, Burst Capture and Readings Summary

Pure measurement core (shoulder landmark distance, bust width/depth at the widest torso row in the frozen 22%-36% band, ellipse circumference) with an abortable numbers-only 15-frame burst and live/captured panels; `test/pipeline.e2e.test.js` and the whole suite are green (85 pass, 0 fail).

## Commits

| Task | Name | Commit |
|---|---|---|
| 1 | Geometry and silhouette primitives | f018b2d |
| 2 | Scale and measurement registry (acceptance test green) | aa06f79 |
| 3 | Live readings and front/side capture | 18d7963 |

## Verification

- `npm test`: 85 pass, 0 fail, including `test/pipeline.e2e.test.js` (unchanged), purity and privacy guards, i18n parity.
- `node --check` on burst.js, debugView.js, main.js; all plan grep checks print OK.
- `index.html` and both dictionaries untouched.

## Deviations from Plan

None - plan executed as written. Tests and modules were committed together per task (not as separate RED/GREEN commits); tests were written and run failing first.

## Pending Human Checks (carried to end-of-phase review / plan 01-07)

- Task 3 human check: plausible live and captured readings on laptop and phone, bust line position on a real body, capture abort behaviour (Stop camera during countdown and burst, tab switch), everyday-clothes note visible. Not run here (no camera available).

## Known Stubs

None.

## Self-Check: PASSED
