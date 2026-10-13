---
phase: 05-validation-and-demo-hardening
plan: 01
subsystem: profile / guided scan
tags: [rescan, MEAS-09, profile-state, i18n]
requires: [applyReview, guided scan (Phase 4), reviewView]
provides: [applyRescan, fitApp.hasMeasurements, "#btn-rescan", "#review-replace-note"]
affects: [src/app/fitApp.js applyReview semantics (now replace, not merge)]
tech-stack:
  added: []
  patterns: [pure core function with key lists, textContent-only UI]
key-files:
  created: []
  modified:
    - src/core/profileState.js
    - src/app/fitApp.js
    - src/ui/profileView.js
    - src/ui/reviewView.js
    - src/main.js
    - index.html
    - src/i18n/en.js
    - src/i18n/id.js
    - test/profileState.test.js
    - test/review.flow.test.js
    - test/i18n.parity.test.js
decisions:
  - "A saved review always replaces all five measurements (applyRescan); empty or out-of-range keys are cleared, never kept from the old scan"
  - "beginRescan goes to the height form when no height is set or the height form is open; otherwise straight to startCamera/guided.restart so the consent gate stays"
metrics:
  duration: ~4 min
  completed: 2026-10-13
  tasks: 2
  files: 11
---

# Phase 5 Plan 01: Rescan (Scan again) Summary

Scan again button that runs consent, height, guided scan and review, and a pure `applyRescan` that makes the saved review replace all five measurements (empty or rejected keys cleared), so no old waist or arm survives next to a new chest.

## Tasks

| Task | Name | Commits |
| ---- | ---- | ------- |
| 1 | applyRescan in core and fitApp (TDD) | 52a5b79 (RED test), 9a14870 (GREEN feat) |
| 2 | Scan again button, replace note and wiring | eee1ea9 |

## What changed

- `applyRescan(state, scanned, values)` in `src/core/profileState.js` returns `{ state, applied, rejected, cleared }`. Null values are cleared. Out-of-range or non-finite values go in both `rejected` and `cleared`. The scanned/edited source rule matches applyReview. `applyReview` itself is unchanged.
- `fitApp.applyReview` now calls applyRescan and returns `cleared` and `replaced` (true when the state had any measurement before the save). The new `hasMeasurements()` is on the handle.
- `#btn-rescan` in `#body-section` is shown by profileView only when a measurement is saved. `beginRescan()` in main.js opens `#scan-area`, aborts any capture, clears captured views and hides review. It then shows the height form, or restarts the guided scan / calls startCamera (which shows consent first).
- The guide restart handler now uses the same `resetScan()` / `restartGuidedScan()` helpers. Its behaviour has not changed.
- reviewView shows `#review-replace-note` when `hasMeasurements` is true. After a save that replaced values, the status reads `review.replaced`.
- New en/id keys `body.rescan`, `review.replace-note` and `review.replaced` are in the parity list.

## Verification

- `npm test`: 240 pass, 0 fail. This includes the core purity, privacy static and i18n parity tests.
- `npm run build`: green.
- `css/` has no diff.

## Requirement status

MEAS-09 has passing code and tests. It is still pending a run on a real device, so it is not ticked in REQUIREMENTS.md (D-11). Nobody has run a manual browser or phone check yet.

## Deviations from Plan

**1. [Rule 1 - Bug] Height form open but height already set**
- **Found during:** Task 2
- **Issue:** "Change height" hides the camera section but leaves `heightCm` set. Following the plan, beginRescan would then start the camera while the camera section was hidden.
- **Fix:** beginRescan also sends the user to the height form when `#camera-section` is hidden.
- **Files modified:** src/main.js
- **Commit:** eee1ea9

**2. [Minor] Scroll to the camera section**
- **Found during:** Task 2
- **Issue:** The plan said to scroll only on the height-form branch, so the camera branch left the user wherever they were on the page.
- **Fix:** On the camera branch beginRescan also scrolls the camera section into view, so the user sees the scan start.
- **Files modified:** src/main.js
- **Commit:** eee1ea9

## TDD Gate Compliance

The RED commit (test 52a5b79) comes before the GREEN commit (feat 9a14870). No refactor commit was needed.

## Known Stubs

None.

## Self-Check: PASSED

- Files: all modified files are present. Commits 52a5b79, 9a14870 and eee1ea9 are in git log.
