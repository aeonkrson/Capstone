---
phase: 03-measurement-engine
plan: 04
subsystem: app-ui
tags: [scan-page, quality-gates, burst, i18n, tdd]
requires:
  - src/core/scan.js readFrame, summariseBurst, combineScan (03-01)
  - src/core/quality.js checkFrame, checkStability; src/platform/tilt.js (03-02)
  - fitApp.applyScan, profileState ESTIMATE_KEYS (03-03)
provides:
  - src/app/burst.js runBurst gated per frame and per burst, option getDevicePitchDeg
  - src/app/scanSession.js createScanSession
  - src/ui/scanView.js createScanView
  - always-visible #scan-capture block on the scan page
affects:
  - plan 03-05 (tape validation and calibration fit) runs real scans through this page
tech-stack:
  added: []
  patterns: [gate-then-read per frame, whole-view rejection with one reason code, snapshot-render view]
key-files:
  created:
    - src/app/scanSession.js
    - src/ui/scanView.js
    - test/scan.flow.test.js
  modified:
    - src/app/burst.js
    - src/main.js
    - index.html
    - src/i18n/en.js
    - src/i18n/id.js
    - test/i18n.parity.test.js
decisions:
  - "A rejected view shows one reason: the dominant per-frame code for burst-too-few, or moving for a stability failure (P3-D17)"
  - "Result lines are '{label}: {value}' because the body.*.label strings already carry '(cm)'"
metrics:
  duration: 5min
  completed: 2026-10-13
  tasks: 2 (task 1 TDD, RED + GREEN)
  files: 9
---

# Phase 3 Plan 04: Scan Page Wiring Summary

The normal scan page now has Capture front / Capture side buttons. They run a burst that is gated frame by frame and checked for stability. Each view shows "captured" or a plain-language reason in English or Indonesian. When both views are ok the page lists shoulder, chest, waist, torso length and arm length (the last three marked as estimates). A Use button writes them into the profile through `fitApp.applyScan`.

## What was built

- `runBurst` (src/app/burst.js): for each frame, `checkFrame(obs, view, { devicePitchDeg })`, then `readFrame` only if the gate passes. The observation goes out of scope straight after. After the loop it calls `summariseBurst` (`burst-too-few` + `reason`), then `checkStability` on the ok readings (`moving`). Abort handling, IMAGE/VIDEO switching and the exported constants are unchanged. The output is the `summariseBurst` shape, which already has the fields `debugView.setCaptured` reads.
- `createScanSession` (src/app/scanSession.js): `record`, `clear`, `snapshot`. A new capture replaces only its own view. `combined` comes from `combineScan` only when both views are ok. It imports only `combineScan`.
- `createScanView` (src/ui/scanView.js): per-view status lines, five result rows (estimate rows use `scan.result.line-estimate`, a null value uses `scan.result.unavailable`), the Use button (disabled unless combined is ok), and `showUseResult` (need-profile / used-partial / used). Built with createElement and textContent only.
- index.html: new `section#scan-capture` inside `#camera-section` after `#camera-meta`. The three capture buttons and `#capture-status` moved here from `#debug-section` and kept their ids. No style attributes, no CSS edits, CSP untouched.
- main.js: keeps the `fitApp` handle and adds one session, one scan view and one tilt sensor. The tilt sensor starts on the first capture click and stops (flag reset) in `stopCamera`. Every non-aborted result is recorded and rendered. The failure status text now uses `scan.reason.*`. Clear readings and a height change clear the session.
- i18n: all 30 `scan.*` keys from the interface added in en and id, and to EXPECTED_KEYS.

## Verification

- `node --test test/scan.flow.test.js`: 8/8 pass. Covers ok burst fields, arms-against-body, moving, tilted, abort restoring VIDEO, session record/replace/clear, the ESTIMATE_KEYS guard, and applyScan rejecting the 75 cm fixture torso.
- `npm test`: 170/170 pass (privacy static, i18n parity, core purity included).
- `npm run build` passes. `grep -c 'id="btn-capture-front"' index.html` gives 1, outside `#debug-section`.

## Commits

| Gate | Commit | Message |
|------|--------|---------|
| RED | d9dcd7c | test(03-04): add failing tests for gated burst and scan session |
| GREEN | fe409d3 | feat(03-04): gated burst and scan session |
| Task 2 | 39d1c4d | feat(03-04): scan view, capture block on scan page, wiring and strings |

## TDD Gate Compliance

The task 1 RED commit failed (modules missing) before the GREEN commit. Task 2 is not TDD. No REFACTOR commit.

## Requirements

MEAS-01..05 stay **pending**, not ticked in REQUIREMENTS.md. The flow works on synthetic fixtures and builds, but each requirement needs a real browser and camera scan on team members (plan 03-05).

## Deviations from Plan

1. **[Rule 1 - Bug] Result line strings drop the extra "cm".** The `body.*.label` strings already end in "(cm)", so the plan's example "{label}: {value} cm (estimate)" would print "Chest (cm): 80.7 cm". The lines are now `{label}: {value}` and `{label}: {value} (estimate)` / `(perkiraan)`.
2. **[Rule 2] Neutral `scan.used-partial` wording.** A null arm value is reported by applyScan as rejected, so the wording is "could not be used" rather than "out of range".
3. **[Rule 2] Scan lines re-render on a language switch.** main.js adds a `change` listener on `#language-select`. It runs after fitApp's listener, so the dynamic status and result lines follow the new locale.
4. An aborted capture keeps the previous `captured[view]` debug value and session entry. A rejected one clears `captured[view]`, so the debug panel never shows a stale value next to a rejection. The aborted status now uses `scan.reason.aborted` instead of `camera.status.stopped`.

## Known Stubs

None.

## Threat Flags

None. T-03-10..T-03-12 mitigated as planned: observations are dropped per frame, the session holds summaries only, the view uses textContent, and the Use button is enabled only when the combined result is ok.

## Self-Check: PASSED

- FOUND: src/app/scanSession.js, src/ui/scanView.js, test/scan.flow.test.js
- FOUND: commits d9dcd7c, fe409d3, 39d1c4d
