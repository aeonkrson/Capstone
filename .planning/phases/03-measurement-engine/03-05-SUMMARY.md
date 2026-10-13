---
phase: 03-measurement-engine
plan: 05
subsystem: validation
tags: [calibration, validation, tape-accuracy, tdd, human-session-outstanding]
requires:
  - Scan page and calibration table (03-01..03-04)
provides:
  - validation/calibrate.mjs (parsePhase3Readings, analyse, CLI)
  - validation/phase3-readings.csv (header only)
  - Phase 3 definitions for waist, torso length, arm length
  - validation/PHASE3-RESULTS.md (every number "not measured")
affects:
  - Phase 3 verification (accuracy criteria 2 and 4 still open)
key-files:
  created:
    - validation/calibrate.mjs
    - validation/phase3-readings.csv
    - validation/PHASE3-RESULTS.md
    - test/validation.calibrate.test.js
  modified:
    - validation/DEFINITIONS.md
    - validation/GO-NO-GO.md
decisions:
  - "Task 2 (team scan + tape session) not run: took the 'no data yet' path, calibration stays prior, results recorded as not measured"
metrics:
  completed: 2026-10-13
  tasks: 3 (task 1 TDD, task 2 human checkpoint skipped as no data yet, task 3 results record)
  files: 6
---

# Phase 3 Plan 05: Calibration Fit and Accuracy Record Summary

**Status: complete with outstanding human data. NOT accuracy-verified.** The calibration script, definitions and results file exist and are tested, but the team scan and tape session has not been done. It must be done by Jordan.

## What was built

- `validation/calibrate.mjs`: strict parser for `phase3-readings.csv` (header, S1..S9 subjects, measurement names, numeric values, no commas in notes, file line numbers in errors) and `analyse(rows)` giving per device and measurement: subject count, mean signed raw error, scan MAE and max, repeat range per subject, and `suggestedOffsetCm` (null under 2 subjects, P3-D23). The CLI prints a table and per-key suggested offsets; on the header-only file it prints a "no data" line and exits 0.
- `validation/DEFINITIONS.md` has an appended "Phase 3 additions" section (waist, torso, arm tape and scan definitions, all estimates). `validation/GO-NO-GO.md` has the waist decision appended. Git diff shows additions only. Phase 1 files `readings.csv`, `report.mjs`, `PASS-CRITERIA.md` untouched.
- `validation/PHASE3-RESULTS.md`: every repeatability and accuracy number is "not measured"; all five calibration entries listed as prior; no threshold changes; shortfalls stated; steps for Jordan to close it.

## Outstanding (must be done by Jordan)

The Task 2 session: bad-capture checks, good captures, two tape readings per subject, 3 front+side scans per device, rows typed into `validation/phase3-readings.csv`, then `node validation/calibrate.mjs validation/phase3-readings.csv`. After that, apply fitted offsets by hand in `src/core/calibration.js` (`source: "fitted"`), adjust any misbehaving `QUALITY` value, update `scan.test.js` / `scan.e2e.test.js` if they assert changed calibration values, and replace the "not measured" entries in `PHASE3-RESULTS.md`.

## Calibration state

All of shoulderCm (+2.0), chestCm, waistCm, torsoCm, armCm remain `source: "prior"`. No `QUALITY` value changed (all still ASSUMED starting values). `src/core/calibration.js`, `src/core/quality.js` and the scan tests were not modified.

## Verification

- `node --test test/validation.calibrate.test.js`: 6/6 pass.
- `npm test`: 176/176 pass. `npm run build` passes.

## Commits

| Gate | Commit | Message |
|------|--------|---------|
| RED | 160f94d | test(03-05): add failing test for phase 3 calibration script |
| GREEN | 77298ca | feat(03-05): phase 3 definitions and calibration script |
| Task 3 | 0804124 | docs(03-05): record phase 3 results as not measured |

## TDD Gate Compliance

RED test commit failed (module missing) before the GREEN commit. No REFACTOR commit.

## Requirements

MEAS-01..05 stay **pending**, not ticked in REQUIREMENTS.md. They need the real-device tape session.

## Deviations from Plan

- Task 2 (checkpoint:human-verify) was not paused for; per the orchestrator the documented "no data yet" resume path was taken. No data was fabricated.
- Task 3 changes to calibration.js, quality.js and scan tests are none, since no data exists to justify them.
- The stale line "Not measured in this phase: Waist..." in DEFINITIONS.md was left in place because the plan says the text above the appended section is untouched; the appended section supersedes it.

## Known Stubs

None in code. `phase3-readings.csv` is intentionally header only until the session is run.

## Threat Flags

None. T-03-14 mitigated: parser rejects any subject not S1..S9; no names or images stored.

## Self-Check: PASSED

- FOUND: validation/calibrate.mjs, validation/phase3-readings.csv, validation/PHASE3-RESULTS.md, test/validation.calibrate.test.js
- FOUND: commits 160f94d, 77298ca, 0804124
