---
phase: 03-measurement-engine
plan: 01
subsystem: core
tags: [measurement, calibration, tdd, pure-core]
requires:
  - src/core/measure.js measureView (frozen Phase 1)
  - src/core/mask.js torsoRunAtRow
  - src/core/geometry.js summarise, ellipsePerimeter, dist
provides:
  - src/core/scan.js readFrame, summariseBurst, combineScan, SCAN_KEYS, ESTIMATE_KEYS, WAIST_BAND_MIN_FRAC, WAIST_BAND_MAX_FRAC, SCAN_MIN_OK_FRAMES
  - src/core/calibration.js CALIBRATION, calibrate
  - src/core/mask.js narrowestTorsoRun
affects:
  - plans 03-02..03-05 (quality gates, profile, scan page, tape fit) build against these contracts
tech-stack:
  added: []
  patterns: [single calibration table rawCm * scale + offsetCm, burst median/MAD summary, 0.1 cm rounding at combine]
key-files:
  created:
    - src/core/scan.js
    - src/core/calibration.js
    - test/scan.e2e.test.js
    - test/core/scan.test.js
  modified:
    - src/core/mask.js (additive only)
    - test/core/mask.test.js
decisions:
  - "Phase 3 measurements live in src/core/scan.js on top of the frozen measureView; measure.js and the MEASUREMENTS registry are byte-for-byte unchanged (P3-D1)"
  - "Calibration priors: shoulder +2.0 cm offset, all others identity, every entry source 'prior' until plan 03-05 fits tape data (P3-D5)"
  - "Torso length uses the Euclidean shoulder-midpoint to hip-midpoint distance in the front view (P3-D3)"
metrics:
  duration: 5min
  completed: 2026-10-13
  tasks: 1 (TDD feature, RED + GREEN)
  files: 6
---

# Phase 3 Plan 01: Five-Measurement Scan Engine Summary

A pure scan engine (`readFrame` → `summariseBurst` → `combineScan`) turns front and side bursts plus typed height into calibrated shoulder, chest, waist, torso length and arm length in cm. Waist, torso and arm are flagged as estimates, and every value goes through one `CALIBRATION` table.

## What was built

- `narrowestTorsoRun` in `src/core/mask.js`: mirrors `widestTorsoRun` (same row rounding and clamping, rows with no midline run skipped, ties keep the highest row). Added only; existing functions untouched.
- `src/core/calibration.js`: `CALIBRATION` with the five scan keys, each `{ scale, offsetCm, source: "prior" }` and a note on where it comes from. `calibrate(key, rawCm)` throws on an unknown key.
- `src/core/scan.js`:
  - `readFrame` calls `measureView` first and passes its failure codes through unchanged. It then finds the waist with `narrowestTorsoRun` over 0.55..0.80 of the torso span, using the same image-to-mask mapping as measureView (`no-waist-run` if none is found). On the front view it also computes torso length and arm length (mean of the sides where shoulder, elbow and wrist all have v >= 0.5). Returns anchors.
  - `summariseBurst` gives median/MAD/n for each field, plus `armsMergedFrames`. It fails with `burst-too-few` and `reason` = the most common failing code (ties go to the first seen).
  - `combineScan` gives chest from `bustCircumferenceCm` and waist from a Ramanujan ellipse. Values are calibrated and rounded to 0.1 cm, and the result also carries raw values, `estimate` flags and `spreadCm`. Returns `missing-front` / `missing-side` instead of throwing.

## Verification

- `npm test`: 139/139 pass. That covers the new e2e test (front, side, clean-burst combine, jitter repeatability within 1.0 cm, arm visibility, reason codes, missing views), the calibration and constants tests, and the narrowestTorsoRun tests. pipeline.e2e, measure and core purity tests pass unchanged.
- `git diff --stat src/core/measure.js` is empty. The `src/core/mask.js` diff is 20 added lines and 0 removed.
- `npm run build` passes.

## Commits

| Gate | Commit | Message |
|------|--------|---------|
| RED | 6de469b | test(03-01): add failing tests for five-measurement scan engine |
| GREEN | e386ad7 | feat(03-01): implement five-measurement scan engine |

No REFACTOR commit was needed.

## TDD Gate Compliance

The RED commit (`test(...)`) comes before the GREEN commit (`feat(...)`). In RED, all three new test files failed: the modules were missing and `narrowestTorsoRun` was not exported.

## Requirements

MEAS-01..05 are **pending**, not ticked. The engine contracts and synthetic acceptance pass, but each requirement says "user gets ... from the scan". That still needs the scan page (later Phase 3 plans) and a real browser/camera check.

## Deviations from Plan

None - plan executed exactly as written. Added `test/core/scan.test.js` cases for `summariseBurst` reason tie-breaking and the empty-readings `reason: null` case. These test the contract in the interface spec; no behaviour was changed.

## Known Stubs

None. The calibration entries are priors by design (P3-D5), and plan 03-05 will replace them with tape-fitted values.

## Self-Check: PASSED

- FOUND: src/core/scan.js, src/core/calibration.js, test/scan.e2e.test.js, test/core/scan.test.js
- FOUND: commits 6de469b, e386ad7
