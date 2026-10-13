---
phase: 03-measurement-engine
plan: 03
subsystem: core
tags: [profile, scanned-source, estimate-marker, i18n, tdd]
requires:
  - src/core/profileState.js (Phase 2)
  - src/core/bodyMeasurements.js (Phase 2)
provides:
  - BODY_FIELDS waist and arm
  - profileState applyScan, ESTIMATE_KEYS, MEASUREMENT_KEYS, "scanned" source
  - fitApp handle applyScan(measurements)
affects:
  - plan 03-04 calls fitApp.applyScan from the scan page and asserts ESTIMATE_KEYS equals the scan.js list
tech-stack:
  added: []
  patterns: [derived estimate marker, field-by-field sanitising with source whitelist]
key-files:
  created: []
  modified:
    - src/core/bodyMeasurements.js
    - src/core/profileState.js
    - src/ui/profileView.js
    - src/app/fitApp.js
    - src/i18n/en.js
    - src/i18n/id.js
    - test/bodyMeasurements.test.js
    - test/profileState.test.js
    - test/i18n.parity.test.js
decisions:
  - "Waist and arm are scan-only: the manual form keeps its three fields; the sources list shows all five (P3-D11)"
  - "Estimate marker is derived from ESTIMATE_KEYS, not stored (P3-D12)"
  - "applyScan replaces existing values, rejects null/out-of-range, rounds to 0.1 cm; no STATE_VERSION bump (P3-D13, P3-D14)"
metrics:
  duration: 8min
  completed: 2026-10-13
  tasks: 2 (task 1 TDD, RED + GREEN)
  files: 9
---

# Phase 3 Plan 03: Scan Results Into the Profile Summary

The saved profile now accepts five scanned measurements with a "scanned" source, shows an estimate marker on waist, torso and arm, and exposes `fitApp.applyScan` so a scan can feed the existing fit check.

## What was built

- `BODY_FIELDS` gained `waist` (50-150) and `arm` (40-85).
- `profileState`: `waistCm` and `armCm` in `emptyState`; exports `ESTIMATE_KEYS`, `MEASUREMENT_KEYS`, `applyScan(state, measurements)` returning `{ state, applied, rejected }`; `sanitiseState` keeps `"scanned"` sources (anything else becomes `"typed"`). Old stored states load with waist and arm null.
- `profileView`: the sources list covers all five keys; scanned estimate keys show "scanned, estimate" (id: "dipindai, perkiraan"), shoulder and chest show "scanned". Form inputs and validation unchanged. textContent only.
- `fitApp`: `applyScan(measurements)` returns `{ ok: false, code: "no-profile" }` without a profile, else applies, saves, re-renders and returns `{ ok: true, applied, rejected }`.
- i18n (en, id): waist, arm, scanned, scanned-estimate keys, added to the parity test.

## Verification

- `npm test`: 162/162 pass. `npm run build` passes.

## Commits

| Gate | Commit | Message |
|------|--------|---------|
| RED | b08de46 | test(03-03): add failing tests for scanned profile measurements |
| GREEN | 1657bc1 | feat(03-03): profile state accepts scanned measurements |
| Task 2 | 80ba68e | feat(03-03): scanned and estimate markers, fitApp.applyScan |

## TDD Gate Compliance

Task 1 has a `test(...)` commit that failed before its `feat(...)` commit. Task 2 is not TDD (UI and wiring, covered by the parity test and the full suite). No REFACTOR commit.

## Requirements

MEAS-01..05 stay **pending**, not ticked in REQUIREMENTS.md. This plan only lets scan values enter the profile; the user still needs the scan page (03-04) and a real browser and camera check.

## Deviations from Plan

None - plan executed exactly as written. fitApp.applyScan and the profileView sources list have no direct unit test (they need a DOM); they are exercised by the build and by plan 03-04.

## Known Stubs

None.

## Threat Flags

None. T-03-07 and T-03-08 mitigated as planned (source whitelist, range checks on load and in applyScan).

## Self-Check: PASSED

- FOUND: modified files listed above, commits b08de46, 1657bc1
