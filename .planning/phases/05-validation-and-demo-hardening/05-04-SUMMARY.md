---
phase: 05-validation-and-demo-hardening
plan: 04
subsystem: demo-hardening
tags: [preflight, fps, debug, i18n]
requires: ["05-01"]
provides:
  - "src/core/preflight.js preflightIssues, PREFLIGHT_CODES"
  - "src/core/frameRate.js frameRateFps"
  - "#preflight-status startup line"
  - "fps key in debug engine info"
affects: [src/main.js, index.html, src/i18n/en.js, src/i18n/id.js]
tech-stack:
  added: []
  patterns: ["pure core helper fed by browser booleans read in main.js"]
key-files:
  created:
    - src/core/preflight.js
    - src/core/frameRate.js
    - test/core/preflight.test.js
    - test/core/frameRate.test.js
  modified:
    - src/main.js
    - index.html
    - src/i18n/en.js
    - src/i18n/id.js
    - test/i18n.parity.test.js
decisions:
  - "Preflight line is informational only; consent, camera start and the camera insecure-context error path are unchanged"
  - "Preflight re-translation uses its own top-level language-select listener so it works even when camera markup is missing"
metrics:
  duration: "3 min"
  completed: "2026-10-13"
  tasks: 2
  files: 9
---

# Phase 5 Plan 04: Startup Preflight and Debug FPS Summary

At startup the app checks for a secure address, the camera API and WebAssembly using a pure `preflightIssues` helper. If any is missing, an en/id line at the top of the scan area says why and points the user to manual entry. `?debug=1` now shows a live `fps` value in the engine info list, worked out from the last 30 frame timestamps.

## Tasks

| Task | Name | Commits | Files |
| ---- | ---- | ------- | ----- |
| 1 | Pure preflight and frame-rate helpers (TDD) | 704bb20 (RED), ce9e0be (GREEN) | src/core/preflight.js, src/core/frameRate.js, test/core/preflight.test.js, test/core/frameRate.test.js |
| 2 | Startup status line and debug fps readout | 2a44ac2 | src/main.js, index.html, src/i18n/en.js, src/i18n/id.js, test/i18n.parity.test.js |

## Verification

- `npm test`: 275/275 pass (purity, privacy, parity included)
- `npm run build`: green, vendor files copied
- `#preflight-status` appears once in index.html and once in main.js; css/ untouched
- Static check: every relative import in src/main.js resolves, and every `getElementById` id exists in index.html

## Deviations from Plan

- Small wiring choice: the plan asked for re-translation inside the existing language-select listener. It was added as a separate top-level listener instead. That listener is registered after initFitApp, whose settings listener switches the locale, so it still runs after the switch, and it keeps working if the required camera markup is missing. Behaviour is the same.

Otherwise the plan was followed as written.

## TDD Gate Compliance

RED `test(05-04)` 704bb20 came before GREEN `feat(05-04)` ce9e0be. No refactor was needed.

## Not Verified

- The preflight messages and the fps readout were not seen on a real device or a real browser. Only the unit tests, static checks and the build were run. Opening the plain http LAN address, using an old browser, and reading fps with masks on every frame are still checks for the device checklist.
- ACC-03 is not ticked, because it needs real device runs.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: src/core/preflight.js, src/core/frameRate.js, test/core/preflight.test.js, test/core/frameRate.test.js
- FOUND commits: 704bb20, ce9e0be, 2a44ac2
