---
phase: 02-manual-entry-fit-check
plan: 04
subsystem: ui
tags: [catalog, fit-check, history, i18n, unstyled-html]
requires:
  - phase: 02-manual-entry-fit-check
    provides: checkFit, recommendAll, CATALOG, profileState, initFitApp shell
provides:
  - catalogView (garment list, cut label, size chart table)
  - fitView (size and preference pickers, verdict, breakdown, comparison table, history list)
  - fitApp wiring: Check fit appends history and re-runs on every render
  - 44 new i18n keys in English and Indonesian
affects: [03]
tech-stack:
  added: []
  patterns: [last-check re-run on render, createElement/textContent-only tables]
key-files:
  created:
    - src/ui/catalogView.js
    - src/ui/fitView.js
    - test/fit.flow.test.js
  modified:
    - index.html
    - src/app/fitApp.js
    - src/i18n/en.js
    - src/i18n/id.js
    - test/i18n.parity.test.js
key-decisions:
  - "Fit section is visible once a profile exists; a hint replaces the controls until all three measurements are saved"
  - "The on-screen result is re-run from current state on every render, so corrections and language switches never leave a stale verdict"
  - "Changing the preference or garment hides the old result instead of silently recomputing it"
metrics:
  duration: 15min
  completed: 2026-10-08
---

# Phase 2 Plan 04: Catalog, Fit Check and History Summary

Unstyled HTML catalog with cut label and size chart, size and preference pick, verdict with per-area tight/ok/loose breakdown, recommended size (or "between X and Y"), three-preference comparison table and persisted fit history, in English and Indonesian.

## Tasks

| Task | Commit | Files |
|------|--------|-------|
| 1. Catalog view, fit view, i18n | 66c45cb | index.html, src/ui/catalogView.js, src/ui/fitView.js, src/i18n/en.js, src/i18n/id.js, test/i18n.parity.test.js |
| 2. fitApp wiring and flow test | 2e2a1f5 | src/app/fitApp.js, test/fit.flow.test.js |

## Verification

`npm test`: 124 pass, 0 fail. `npm run build`: passes. No browser run was done.

## Deviations from Plan

- The Fit section is shown whenever a profile exists (with a hint and hidden controls until measurements are complete) rather than fully hidden without one; without a profile it is hidden. Same intent as the plan.
- Recommended size line is shown for every verdict except "fits" (borderline included), as specified.
- No DOM-level tests for the views (no DOM in the node:test setup); the flow test covers the pure path and i18n coverage.
- state.advance-plan not run, per instruction.

## Requirements

Implemented in code but NOT verified in a browser, so REQUIREMENTS.md is left unticked: CAT-01, CAT-02, CAT-03, FIT-01, FIT-02, FIT-03, FIT-04, FIT-05, FIT-06, PROF-02, PROF-03 (status: implemented-pending-browser-check). Earlier plan items (PROF-01, MEAS-07, MEAS-08, I18N-01, I18N-02, PRIV-03) are also still pending a browser check.

## Known Stubs

None in the UI. Chart widths and back length midpoints are ASSUMED/placeholder data (flagged in the chart note), to be confirmed on a real shirt.

## Threat Flags

None. T-02-11 (textContent/createElement only; privacy static test passes), T-02-12 (checkFit throws on bad size/preference; fitApp catches and shows no result) mitigated; T-02-13 accepted.

## Self-Check: PASSED
