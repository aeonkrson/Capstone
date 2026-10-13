---
phase: 04-live-ar-guided-capture
plan: 06
subsystem: ui-app
tags: [review, fitApp, manual-entry]
requires: [04-02, 04-05]
provides:
  - "createReviewView({ doc, t, formatNumber, onSave }) -> { show, hide, refresh, isShown }"
  - "fitApp handle: applyReview, hasProfile, goToFitCheck, showManualEntry"
affects: [04-07]
key-files:
  created: [src/ui/reviewView.js, test/review.flow.test.js]
  modified: [src/app/fitApp.js]
key-decisions:
  - "applyReview creates the profile name and saves the review in one update(); name errors return code name-empty / name-too-long"
  - "showManualEntry remembers its message key and re-translates it in render()"
metrics:
  duration: 6min
  completed: 2026-10-13
  tasks: 2
  files: 3
---

# Phase 4 Plan 06: Review view and fitApp entry points Summary

Review screen view (five cm fields with scanned/edited markers, estimate note for waist, torso, arm) plus fitApp entry points for saving a review, jumping to the fit check and routing to manual entry.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | fitApp entry points and flow test | 6b09876 |
| 2 | Review view | 3fd79b6 |

## Verification

`npm test` 235/235 pass, `npm run build` green, `reviewView.js` imports in Node. textContent only; no innerHTML.

## Deviations from Plan

None - plan executed as written.

## Requirements (pending, not ticked)

- MEAS-06: review view exists, but it is not wired into main.js until 04-07 and needs a real-device check.
- CAPT-08: the manual-entry route helper exists, but the denial and decline wiring is in 04-07.

## Known Stubs

None in this plan's files. src/main.js still calls the removed `scanView.showUseResult`; 04-07 rewires it.

## Threat Flags

None. T-04-12 and T-04-13 are mitigated: parseReviewInputs validates before onSave, applyReview re-checks ranges, and textContent is used throughout.

## Self-Check: PASSED

FOUND: src/ui/reviewView.js, test/review.flow.test.js, commits 6b09876 and 3fd79b6.
