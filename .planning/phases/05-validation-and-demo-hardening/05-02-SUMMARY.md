---
phase: 05-validation-and-demo-hardening
plan: 02
subsystem: validation
tags: [accuracy-study, tdd, csv, verdict]
requires: [src/core/fit.js recommendSize, src/data/catalog.js CATALOG]
provides: [validation/study.mjs, validation/study-readings.csv, validation/STUDY-RESULTS.md]
affects: [ACC-01, ACC-02, ACC-03]
tech-stack:
  added: []
  patterns: [strict header + FIELDS validator CSV parser copied from report.mjs, generated-only results file]
key-files:
  created:
    - validation/study.mjs
    - validation/study-readings.csv
    - validation/STUDY-RESULTS.md
    - test/validation.study.test.js
  modified: []
decisions:
  - "Phase 5 study: an empty subject list renders as 'no data' in the Subjects column, so every no-data cell reads 'no data' (n stays 0)"
  - "Phase 5 study: size agreement uses recommendSize(chest, 'regular', CATALOG[0].chart); labels compared literally"
metrics:
  duration: 2 min
  completed: 2026-10-13
  tasks: 2
  files: 4
---

# Phase 5 Plan 02: Study Evaluator Summary

`node validation/study.mjs` takes typed tape and scan rows and prints the per-measurement, per-device error table (iphone, android, laptop, phone) plus MET / NOT MET / INSUFFICIENT DATA verdicts for shoulder (2.5 cm), chest (3.5 cm) and size agreement (the app's own `recommendSize`). With the shipped header-only file it prints `Overall outcome: INSUFFICIENT DATA`.

## What was built

- `validation/study.mjs` exports `parseStudyReadings`, `analyseStudy`, `renderMarkdown`, `TARGETS` (frozen: 2.5 / 3.5) and `MIN_SUBJECTS` (2). The CLI takes an optional CSV path and `--check` (prints `OK: N rows`) or `--write` (regenerates `STUDY-RESULTS.md`).
- The parser rejects any subject outside S1..S9, unknown devices or browsers, notes longer than 80 characters and notes that name a media file. Each rejection gives the file line number.
- Tape value per subject is the mean of all tape readings. Scan value is the median of the repeats. On phone, a subject counts once and its median covers repeats from both phones.
- `validation/study-readings.csv` contains only the header. `validation/STUDY-RESULTS.md` was made by `--write`: every cell reads `no data` and every target reads INSUFFICIENT DATA.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 RED | ea49418 | test(05-02): add failing tests for study evaluator |
| 2 GREEN | ef5906d | feat(05-02): implement study evaluator with header-only data file |

## Verification

- `node --test test/validation.study.test.js`: 21 pass. It failed before the module existed (RED confirmed).
- `node validation/study.mjs --check` prints `OK: 0 rows`. The default run prints `Overall outcome: INSUFFICIENT DATA`.
- `npm test`: 261 pass, 0 fail. `npm run build`: succeeds.
- A test checks that the shipped CSV is header-only and that `STUDY-RESULTS.md` matches the generator output exactly, so hand edits are caught.

## Requirements status

ACC-01, ACC-02 and ACC-03 stay **pending** (D-11). The tooling is ready, but no tape session has been run and no readings exist. All fixture readings are made up and live only in `test/validation.study.test.js`. Nothing was added to `validation/` data files.

## Deviations from Plan

None. The plan was executed as written. One detail the plan did not specify: when there are no subjects, the Subjects column shows `no data` (rather than leaving it empty), so that every data cell reads `no data`.

## TDD Gate Compliance

RED `test(05-02)` ea49418, then GREEN `feat(05-02)` ef5906d. No refactor was needed.

## Self-Check: PASSED

- FOUND: validation/study.mjs, validation/study-readings.csv, validation/STUDY-RESULTS.md, test/validation.study.test.js
- FOUND: ea49418, ef5906d
