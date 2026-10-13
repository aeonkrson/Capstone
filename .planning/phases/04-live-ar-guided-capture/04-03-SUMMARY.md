---
phase: 04-live-ar-guided-capture
plan: 03
subsystem: capture
tags: [webaudio, geometry, tdd]
requires: []
provides:
  - "src/platform/sound.js: CUES, createSound({ AudioContextCtor }) -> { unlock, play, close }"
  - "src/core/poseGuide.js: guideFigure(view, width, height)"
affects: [04-07]
tech-stack:
  added: []
  patterns: ["injectable global constructor (as createTiltSensor)", "audio scheduled on AudioContext clock, no setTimeout"]
key-files:
  created:
    - src/platform/sound.js
    - src/core/poseGuide.js
    - test/sound.test.js
    - test/core/poseGuide.test.js
  modified: []
key-decisions:
  - "Cue queue starts at max(currentTime, previous end + 0.15 s); queueEnd starts at -Infinity so the first cue plays immediately"
  - "Front arms 20 degrees out, side figure arms straight down; sizes derived from H = 0.84 * height"
requirements-completed: []
duration: 6min
completed: 2026-10-13
---

# Phase 4 Plan 03: Sound cues and pose guide geometry Summary

Synthesized WebAudio cue player (hold, captured, turn; silent failure) plus pure stick-figure geometry for front and side pose guides.

## Tasks

| Task | Commits |
|------|---------|
| 1 WebAudio cue player | 636529e (test), 363f42e (feat) |
| 2 Pose guide figure geometry | b1b0b6e (test), 57ecb16 (feat) |

## Deviations from Plan

None - plan executed exactly as written. (Test file for task 2 was written alongside the implementation, then committed test first.)

## Verification

npm test 222 pass, npm run build ok, no getUserMedia in sound.js.

## Requirements

CAPT-02 and CAPT-06 are NOT ticked in REQUIREMENTS.md. Both need the 04-07 UI wiring and a real-device check (audible cues on iOS/Chrome, guide overlay on camera). Pending.

## Known Stubs

None.

## Self-Check: PASSED
