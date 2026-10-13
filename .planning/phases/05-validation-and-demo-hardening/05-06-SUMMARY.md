---
phase: 05-validation-and-demo-hardening
plan: 06
subsystem: docs
tags: [codebase-map, claude-md, project-memory]
requires: [05-01, 05-03, 05-04]
provides:
  - codebase map that matches the current src/ layout
  - regenerated CLAUDE.md stack, conventions and architecture sections
affects: [ACC-03]
tech-stack:
  added: []
  patterns: [gsd-tools generate-claude-md from .planning/codebase]
key-files:
  created: []
  modified:
    - .planning/codebase/STACK.md
    - .planning/codebase/ARCHITECTURE.md
    - .planning/codebase/CONVENTIONS.md
    - .planning/codebase/STRUCTURE.md
    - .planning/codebase/TESTING.md
    - .planning/codebase/INTEGRATIONS.md
    - .planning/codebase/CONCERNS.md
    - CLAUDE.md
key-decisions:
  - "ARCHITECTURE System Overview written as bullets, because the CLAUDE.md generator keeps only fence lines and would leave an empty code block"
  - "ACC-03 not ticked: it needs real study results, and this plan only changed docs"
metrics:
  duration: 5 min
  completed: 2026-10-13
---

# Phase 5 Plan 06: Codebase Docs and CLAUDE.md Refresh Summary

The seven `.planning/codebase` files were rewritten from the code as it is now: ES modules, Vite 8.3.2 with basic-ssl 2.3.0, self-hosted tasks-vision 1.0.1, a strict CSP, and the src/core/platform/app/ui/data/i18n layers. They also cover the rescan, preflight and demo build added in this phase. CLAUDE.md was regenerated from these files, and its GreenWear code guidance is gone.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | Rewrite STACK, ARCHITECTURE, CONVENTIONS | 8b92529 |
| 2 | Rewrite STRUCTURE, TESTING, INTEGRATIONS, CONCERNS; regenerate CLAUDE.md | 7e35959 |

## What Changed

- STACK: languages, secure-context rule and preflight codes, exact-pinned tooling table, npm scripts, pose engine vendoring and SHA256SUMS, CSP, URL flags table, where the tunable constants live, LAN HTTPS and `npm run demo`.
- ARCHITECTURE: layer table with import rules, the `src/main.js` entry order, the data flow from height through consent, guided scan, burst, combine, review and `applyRescan` to fit check and history, startup preflight, storage keys, privacy guards, validation scripts, and a "Removed" line for GreenWear.
- CONVENTIONS: naming, code style, module purity, DOM rules (`textContent`, `hidden` attribute, no innerHTML), i18n parity, error handling, tests, and a note that the CSS has no custom properties.
- STRUCTURE: annotated tree of tracked files and where to add new code.
- TESTING: test files grouped (core, platform, flow, e2e, guards, validation scripts), how to run one file, and what only a real device can verify.
- INTEGRATIONS: nothing at runtime. At build time only the npm registry and the one-time model download in `scripts/vendor-mediapipe.mjs`.
- CONCERNS: accuracy not yet validated, calibration offsets are still priors, thresholds are assumed, the back-length chart value is a placeholder and the cut is assumed, real-device behaviour is not checked, the Indonesian copy has not been reviewed by a native speaker, the demo uses a self-signed certificate, and `main.js` is large.
- CLAUDE.md: the project, stack, conventions, architecture and workflow sections were regenerated. The Project section is unchanged. The profile section is kept. The workflow section has the same meaning, but the generator now writes the commands as `/gsd:quick`, `/gsd:debug` and `/gsd:execute-phase`. GreenWear now appears only in the Project intro and in the one "Removed" line.

## Verification

- Grep gates pass. In the three Task 1 files there are no `js/ar.js`, `js/api.js`, `PRODUCTS`, `jsdelivr` or `greenwear_history` matches. CLAUDE.md has no listed GreenWear identifiers, `tasks-vision` appears twice, and `GSD:architecture-start` is present.
- `npm test`: 277 pass, 0 fail.
- `npm run build`: built, 6 vendor files copied to dist.

## Deviations from Plan

**1. [Rule 1 - Bug] Empty code block in generated architecture section**
- **Found during:** Task 2
- **Issue:** The generator kept only the fence lines of the System Overview diagram, which left an empty code block in CLAUDE.md.
- **Fix:** Replaced the diagram in ARCHITECTURE.md with four bullets and regenerated.
- **Commit:** 7e35959

**2. [Rule 1 - Bug] Core import rule corrected**
- **Found during:** Task 2 review
- **Issue:** The first draft said core may import data. The code has no such import; charts are passed in as arguments.
- **Fix:** The layer table and overview now say this.
- **Commit:** 7e35959

## Known Stubs

None. Docs only.

## Self-Check: PASSED

- All seven codebase files and CLAUDE.md exist and are modified in commits 8b92529 and 7e35959.
