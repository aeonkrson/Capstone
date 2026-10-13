---
phase: 04-live-ar-guided-capture
plan: 04
subsystem: app
tags: [guided-scan, controller, auto-lock, tdd]
requires:
  - src/core/autoLock.js (initialLock, stepLock, bodyAnchors, lockMessageKey)
  - src/core/quality.js (checkFrame)
provides:
  - src/app/guidedScan.js (createGuidedScan)
  - test/helpers/bodyFixtures.js (W, H, HEIGHT, front, side, farFront, obsFrom)
affects:
  - 04-07 (main.js wiring)
tech-stack:
  added: []
  patterns: [injected capture/cue/onChange/now, generation counter for stale async results]
key-files:
  created:
    - src/app/guidedScan.js
    - test/helpers/bodyFixtures.js
    - test/guidedScan.flow.test.js
  modified: []
decisions:
  - "04-04: the gate passed to stepLock is a copy { ok, code }, so no checkFrame output (which might reference obs) is kept"
  - "04-04: start() also bumps the generation, so a capture still pending from an earlier run is dropped"
  - "04-04: a synchronous throw from capture() is handled like a rejection (logged, capture-done ok false, reason null)"
metrics:
  duration: 2min
  completed: 2026-10-13
  tasks: 2
  files: 3
---

# Phase 4 Plan 04: Guided Scan Controller Summary

`createGuidedScan({ capture, cue, onChange, now })` gates each live frame with the Phase 3 `checkFrame`, feeds `stepLock`, plays cues, starts the injected burst capture without awaiting it, and feeds the result back as `capture-done`. A generation counter drops results that arrive after `stop()` or `restart()`.

## What was built

- `test/helpers/bodyFixtures.js`: the front/side bodies copied verbatim from `test/scan.flow.test.js`, plus `farFront()` (all coordinates halved around the frame centre). Checked: `checkFrame` gives `true true too-far`, and `side()` on the front view gives `wrong-side`.
- `test/guidedScan.flow.test.js`: 11 tests on a fake clock, a manually resolved fake capture and a cue spy. They cover every behavior bullet, plus a rejected capture and the first onChange status.
- `src/app/guidedScan.js`: the controller, built to the contract. It imports only `../core/autoLock.js` and `../core/quality.js`. `obs` is used only inside `onFrame` and never stored (T-04-07).

## Commits

| Gate | Commit | Message |
|------|--------|---------|
| Task 1 | c0fa53b | test(04-04): shared synthetic body fixtures |
| RED | 0c28c65 | test(04-04): add failing tests for guided scan controller |
| GREEN | 5eb070d | feat(04-04): guided scan controller |

No refactor commit was needed.

## Verification

- `node --test test/guidedScan.flow.test.js`: 11/11 pass.
- `npm test`: 233/233 pass. This includes the purity and privacy static tests.
- `npm run build`: OK.
- `git diff --stat test/scan.flow.test.js`: empty.

## Deviations from Plan

None. The plan was executed as written. The decisions in the frontmatter fill small gaps the contract did not cover.

## Requirements

CAPT-03, CAPT-04, CAPT-05 and CAPT-06 are **not ticked**. They still need the main.js wiring (04-07) and a check on a real device.

## TDD Gate Compliance

RED (0c28c65) failed because the module was missing. GREEN (5eb070d) came after it. Both are in git log in that order.

## Self-Check: PASSED

- FOUND: src/app/guidedScan.js
- FOUND: test/helpers/bodyFixtures.js
- FOUND: test/guidedScan.flow.test.js
- FOUND: c0fa53b, 0c28c65, 5eb070d
