---
phase: 04-live-ar-guided-capture
plan: 07
subsystem: capture-ui
tags: [consent, guided-scan, sound, review, manual-entry, wiring]
requires: [04-03, 04-04, 04-05, 04-06]
provides:
  - "createGuideView({ canvasEl, hintEl, t }) -> { draw, setMessage, clear, currentKey }"
  - "main.js: consent gating, guided scan wiring, sound cues, review, manual-entry routing"
affects: [src/main.js]
tech-stack:
  added: []
  patterns: ["consent guard at top of startCamera", "guided controller fed from frame loop", "capture() returns burst result"]
key-files:
  created: [src/ui/guideView.js]
  modified: [src/main.js]
decisions:
  - "maybeOpenReview plays the final 'captured' cue itself, because stopCamera drops the guided late result"
  - "Restart button bumps captureToken so a running countdown or burst is aborted before session.clear"
  - "guideView exposes currentKey() so the language switch can re-translate the hint with force"
metrics:
  duration: "~12 min"
  completed: 2026-10-13
  tasks: 2
  files: 2
---

# Phase 4 Plan 07: Live guided capture wiring Summary

The page now runs consent, then the camera, a live pose guide outline with a hint line, hands-free front lock, turn, side lock with sound cues, and then the review screen and fit check. Camera problems and a declined consent go to manual entry.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Guide overlay view | d869914 | src/ui/guideView.js |
| 2 | Wire consent, guided scan, sound, review, manual routing | 7718136 | src/main.js |

## What was built

- `src/ui/guideView.js`: strokes `guideFigure(view, w, h)` on the view canvas after debugView.render. White outline while the gate fails, green (#7CFC00) on gateOk or hold/capturing, dashed during turn, line width max(3, round(h/200)). It draws no text on the canvas and keeps nothing from the frame. `setMessage(key, { force })` writes the hint only when the key changes.
- `src/main.js`:
  - `consented` is held in memory only. The `if (!consented)` guard at the top of startCamera covers height submit, Start and Try again (T-04-14).
  - The Accept click runs sound.unlock() and startTilt() and then starts the camera.
  - Decline calls `showManualEntry("manual.declined")`.
  - Camera errors, engine load failure and `#btn-manual-entry` call `showManualEntry("manual.routed")`.
  - `capture(view, { countdown })` returns the burst result, with `aborted` on every early exit, and calls maybeOpenReview after recording.
  - Guided scan: the frame loop detects with `wantMask: flags.debug || guided.status().active` and feeds `guided.onFrame(obs, ts, tilt.pitchDeg())`. On each frame the guide is drawn and the hint is set.
  - Each successful camera start does clearCaptured, reviewView.hide and guided.start. stopCamera calls guided.stop and guideView.clear.
  - The manual Capture buttons call guided.stop, show the hint `guide.manual-mode`, and run the capture with the countdown.
  - The language switch also refreshes the review and re-translates the hint.
  - `scanView.showUseResult` / `onUse` were removed (grep count 0).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The final "captured" cue was lost on the side lock**
- **Found during:** Task 2 static review
- **Issue:** maybeOpenReview runs inside capture() before the guided controller sees the burst result. stopCamera then calls guided.stop(), which drops the late result, so the reducer's `captured` cue for the side view never played.
- **Fix:** maybeOpenReview plays `sound.play("captured")` when the guided scan was active.
- **Commit:** 7718136

**2. [Rule 2 - Correctness] Restart aborts any capture still running**
- **Issue:** If Restart was pressed during a countdown or burst, that capture's result could be recorded into the session it had just cleared.
- **Fix:** The `#btn-guide-restart` handler bumps `captureToken` before clearCaptured.
- **Commit:** 7718136

## Verification

### Checked without a camera (done)
- `npm test`: 235/235 pass, including the privacy static test (no toDataURL, toBlob, MediaRecorder or storage of frames).
- `npm run build`: green. `node --check src/main.js`: OK.
- Wiring grep count is 8 (at least 5 needed). `showUseResult` count is 0.
- Every `getElementById` id in main.js (32 ids) exists in index.html.
- Every import path in main.js exists. Every named import used by the new wiring is exported by its module (checked with a Node dynamic import).
- Every gate hint code from quality.checkFrame, plus `moving`, has a `scan.reason.*` key in en and id. `guide.*` and `manual.*` keys exist.
- TDZ check: `guided` is declared after the functions that use it (frameLoop onFrame, stopCamera, maybeOpenReview). All of them run only from events or after the camera starts, never during setup.
- `git diff --stat css/ index.html src/core`: empty.

### Needs Jordan's real-device run (not verified)
I could not run a camera, so nothing below has been seen working: the outline position and colour on real video, the live hint changes, the auto-lock timing, the sound cues (audible, not overlapping), the review opening after the side lock, the error routing on a real denial, iOS motion permission timing, and the frame rate with a mask on every frame.

## Outstanding: real-device check

Non-blocking real-device check (not a gate). Jordan runs `npm run dev` and opens the HTTPS URL on:
1. A laptop webcam: decline consent once (manual entry message appears, camera stays off), then accept; stand back, confirm the outline, live hints (too close, too far, arms against body, wrong side, moving), hold cue, front lock with no button, captured + turn cues, side lock, review with five values and markers, edit one value (marker turns edited), Save goes to the fit check.
2. A phone (iPhone Safari and an Android Chrome if available), propped upright: same scan; check sound plays (iOS silent switch mutes WebAudio, note it), tilt prompt, frame rate with masks on every frame is usable.
3. Camera denied in browser settings: error shows and the page routes to manual entry.

Record the results and any QUALITY / AUTO_LOCK tuning needs for Phase 5.

**Requirements pending the device check (NOT ticked in REQUIREMENTS.md):** PRIV-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06, CAPT-07, CAPT-08, MEAS-06.

## Known Stubs

None.

## Threat Flags

None. T-04-14 to T-04-17 mitigations are in place as planned.

## Self-Check: PASSED
- FOUND: src/ui/guideView.js
- FOUND: d869914, 7718136
