---
phase: 02-manual-entry-fit-check
plan: 03
subsystem: ui
tags: [profile, manual-entry, i18n, delete-all, unstyled-html]
requires:
  - phase: 02-manual-entry-fit-check
    provides: validateBodyMeasurement, profileState, storage, setLocale
provides:
  - initFitApp shell (state owner, persist on change, render)
  - profileView (name form, three-measurement form, source markers)
  - settingsView (language select, delete all)
  - 31 new i18n keys in English and Indonesian
affects: [02-04]
tech-stack:
  added: []
  patterns: [view factory with injected doc and callbacks, textContent-only rendering, all-or-nothing form save]
key-files:
  created:
    - src/app/fitApp.js
    - src/ui/profileView.js
    - src/ui/settingsView.js
  modified:
    - index.html
    - src/main.js
    - src/i18n/en.js
    - src/i18n/id.js
    - test/i18n.parity.test.js
key-decisions:
  - "Existing height/camera/debug sections wrapped in details#scan-area; scan code untouched"
  - "Unchanged measurement values keep their source; changed values become edited"
  - "Delete all resets state and forms in place, no page reload"
metrics:
  duration: 12min
  completed: 2026-10-08
---

# Phase 2 Plan 03: Profile, Manual Entry, Language and Delete Summary

Unstyled HTML profile (name only, no account), typed chest/shoulder/torso entry with typed/edited markers, persistence on every change, runtime English/Indonesian switch that survives reload, and a confirmed Delete all.

## Tasks

| Task | Commit | Files |
|------|--------|-------|
| 1. Page structure, i18n keys, profile view | 2fe64f6 | index.html, src/ui/profileView.js, src/i18n/en.js, src/i18n/id.js, test/i18n.parity.test.js |
| 2. Settings, fitApp shell, main bootstrap | 8c6fc22 | src/ui/settingsView.js, src/app/fitApp.js, src/main.js |

Task 1 depends on fitApp being present only at runtime, so fitApp.js landed in the Task 2 commit.

## Verification

`npm test`: 121 pass, 0 fail. `npm run build`: passes. Manual browser run not done.

## Deviations from Plan

- storage.js has named exports, not a default export as the plan interface said; main.js uses `import * as storage`, which gives the same API.
- No tests added for the UI modules (browser DOM, none available in node:test setup); i18n parity test covers new keys.
- Number inputs are re-filled with formatNumber (one decimal, e.g. "96.0" or "96,0"); validation accepts both separators.
- STATE.md: state.advance-plan not run, per instruction.

## Requirements

The UI delivers PROF-01, PROF-02, MEAS-07, MEAS-08, I18N-01, I18N-02, PRIV-03 in code, but not browser-verified; REQUIREMENTS.md left unticked per instruction pending a manual run.

## Known Stubs

None. Plan 02-04 adds catalog and fit sections below #body-section.

## Threat Flags

None. T-02-07 (textContent only, privacy test passes), T-02-08 (validated, all-or-nothing), T-02-09 (clearAll plus confirm) mitigated.

## Self-Check: PASSED
