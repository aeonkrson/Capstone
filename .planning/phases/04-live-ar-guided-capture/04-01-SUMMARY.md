---
phase: 04-live-ar-guided-capture
plan: 01
subsystem: core
tags: [auto-lock, state-machine, pure, tdd]
requires:
  - src/core/landmarks.js (LM indices)
provides:
  - src/core/autoLock.js (AUTO_LOCK, initialLock, bodyAnchors, stepLock, lockMessageKey)
affects:
  - 04-04 (live frame driver), 04-07 (page wiring)
tech-stack:
  added: []
  patterns: [pure reducer (state, event) -> { state, cues, action }, time passed in events]
key-files:
  created:
    - src/core/autoLock.js
    - test/core/autoLock.test.js
  modified: []
decisions:
  - "04-01: guide/hold frames with gate.ok but null anchors are treated as not ok with hint no-pose"
  - "04-01: drift check runs before the HOLD_MS check, so a moved frame at 1500 ms cancels instead of capturing"
metrics:
  duration: 3min
  completed: 2026-10-13
  tasks: 1
  files: 2
---

# Phase 4 Plan 01: Auto-lock State Machine Summary

Pure reducer `stepLock(state, event)` that turns per-frame gate results and timestamps into guide/hold/capturing/turn/done phases, hint codes, cue names ("hold", "captured", "turn") and capture requests for front then side, with no clock or browser globals.

## What was built

- `src/core/autoLock.js`: `AUTO_LOCK` frozen constants (HOLD_MS 1500, TURN_MS 2500, MAX_HOLD_DRIFT_FRAC 0.05, HOLD_CUE_GAP_MS 2000, all marked starting value ASSUMED), `initialLock`, `bodyAnchors`, `stepLock`, `lockMessageKey`. Imports only `LM` from `./landmarks.js`. Every transition builds a new object; input is never mutated.
- `test/core/autoLock.test.js`: 18 tests on synthetic frame streams covering every behavior bullet in the plan, plus a frozen-input test and an unknown-event test.

## Commits

| Gate | Commit | Message |
|------|--------|---------|
| RED | 5a467b3 | test(04-01): add failing tests for auto-lock state machine |
| GREEN | ba59e19 | feat(04-01): pure auto-lock state machine |

No refactor commit was needed.

## Verification

- `node --test test/core/autoLock.test.js`: 18/18 pass.
- `npm test`: 194/194 pass, including `test/core.purity.test.js`.
- `npm run build`: OK.

## Deviations from Plan

None. The plan was executed as written. Two small choices the contract did not cover are listed under decisions in the frontmatter: an ok gate with null anchors counts as no-pose, and drift is checked before the hold time.

## Requirements

CAPT-03, CAPT-04, CAPT-05 and CAPT-06 are **not ticked yet**. This plan only delivers the pure logic. Each one still needs the live wiring (04-04, 04-07) and a check on a real device before it can be marked complete.

## TDD Gate Compliance

RED (5a467b3, failed because the module was missing) and then GREEN (ba59e19). Both are in git log in that order.

## Self-Check: PASSED

- FOUND: src/core/autoLock.js
- FOUND: test/core/autoLock.test.js
- FOUND: 5a467b3
- FOUND: ba59e19
