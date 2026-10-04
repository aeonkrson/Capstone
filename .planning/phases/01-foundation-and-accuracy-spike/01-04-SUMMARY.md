---
phase: 01-foundation-and-accuracy-spike
plan: 04
subsystem: validation
tags: [size-chart, tape-to-size, pass-criteria, report, validation-kit]

requires: [01-02]
provides:
  - PLAIN_TEE, FITTED_TEE charts and UNCONFIRMED_BOXY_TEE raw record
  - sizeFromBust, sizesAgree, chestCircumferenceCm (one written tape-to-size rule)
  - Frozen DEFINITIONS, PROTOCOL and PASS-CRITERIA sheets
  - validation/report.mjs (parseReadings, summarise) and empty readings.csv
  - Device checklist, garment check and go/no-go templates
affects: [01-05, 01-06, 01-07, 01-08]

tech-stack:
  added: []
  patterns: [chart passed as argument to a pure function, strict allow-list CSV parsing]

key-files:
  created: [src/data/colourboxCharts.js, src/core/sizeFromTape.js, test/data/colourboxCharts.test.js, test/core/sizeFromTape.test.js, test/validation.report.test.js, validation/DEFINITIONS.md, validation/PROTOCOL.md, validation/PASS-CRITERIA.md, validation/readings.csv, validation/report.mjs, validation/DEVICE-CHECKLIST.md, validation/GARMENT-CHECK.md, validation/GO-NO-GO.md]
  modified: []

key-decisions:
  - "Size boundaries derived from the chart (circumference minus 8 cm ease); no size literals in code"
  - "Shoulder PASS-WITH-OFFSET caps the overall outcome at CONDITIONAL, tested by Fixture B"
  - "Report row numbers are file line numbers (header is line 1)"

requirements-completed: [PRIV-02]

duration: 15min
completed: 2026-10-04
---

# Phase 1 Plan 04: Charts, Size Rule and Validation Kit Summary

ColourBox charts recorded as named-field data, one tested tape-to-size rule with a 1.0 cm borderline band, and a validation kit (definitions, protocol, frozen pass criteria, strict report script) written before any reading exists.

## Commits

| Task | Name | Commit |
|---|---|---|
| 1 RED | Failing chart and size-rule tests | 1c2dad8 |
| 1 GREEN | Charts and sizeFromTape | fb8a975 |
| 2 | Definitions, protocol, pass criteria | 74de49d |
| 3 | Readings, report, sheets (RED a690d8a) | ce32b14 |

## Verification

- `node --test` on the three new test files: all pass; purity and privacy guards still pass.
- `node validation/report.mjs --check` prints `OK: 0 rows`; plain run prints `No data rows yet.` and `Overall outcome: INSUFFICIENT DATA`.
- `npm test`: 58 pass, 1 fail (`test/pipeline.e2e.test.js`, expected until plan 01-06).

## Deviations from Plan

None - plan executed as written.

## Known Stubs

None. `readings.csv`, `GO-NO-GO.md`, `DEVICE-CHECKLIST.md` and `GARMENT-CHECK.md` are intentionally blank templates filled by plans 01-07 and 01-08.

## Self-Check: PASSED
