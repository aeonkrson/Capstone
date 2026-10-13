---
phase: 05-validation-and-demo-hardening
plan: 05
subsystem: validation
tags: [study-protocol, checklist, privacy, gitignore]
requires: [05-02, 05-03]
provides:
  - ready-to-run tape study protocol
  - full-flow device checklist (all cells not run)
  - fallback demo recording script
  - repo privacy test blocking tracked media
affects: [ACC-01, ACC-02, ACC-03]
tech-stack:
  added: []
  patterns: [node:test repo guard]
key-files:
  created:
    - validation/STUDY-PROTOCOL.md
    - validation/FLOW-CHECKLIST.md
    - validation/DEMO-RECORDING.md
    - test/privacy.repo.test.js
  modified:
    - .gitignore
key-decisions:
  - "No results invented: every result cell reads not run"
metrics:
  duration: 4 min
  completed: 2026-10-13
---

# Phase 5 Plan 05: Human-session documents and media lockout Summary

Ready-to-run study protocol, device flow checklist and demo recording script (all results `not run`), plus a git-level test and .gitignore patterns that keep photos and videos out of the repo.

## Tasks

| Task | Commit |
|------|--------|
| 1. Study protocol, flow checklist, demo recording | c16d222 |
| 2. RED: privacy.repo test | 1f50de9 |
| 2. GREEN: .gitignore patterns | 663f933 |

## Deviations from Plan

None. `npm test` (277 pass, 0 fail) and `npm run build` pass.

## Outstanding human sessions

1. Tape study per `validation/STUDY-PROTOCOL.md`, then `node validation/study.mjs --write` (ACC-01..03 stay pending).
2. Full-flow device run per `validation/FLOW-CHECKLIST.md` on iPhone, Android and laptop (MEAS-09 stays pending).
3. Fallback demo recording per `validation/DEMO-RECORDING.md` (Recorded: not yet).

## Known Stubs

None. `not run` cells are intentional placeholders for human results.

## Self-Check: PASSED
