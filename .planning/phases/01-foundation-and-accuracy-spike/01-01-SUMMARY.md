---
phase: 01-foundation-and-accuracy-spike
plan: 01
subsystem: infra
tags: [csp, privacy, cleanup, docs]
requires: []
provides:
  - Script-free page shell with strict Content-Security-Policy
  - Trimmed stylesheet (canvas#view-canvas, [hidden], hud-btn.active)
  - README and FILES for the new layout
affects: [01-03, 01-05]
tech-stack:
  added: []
  patterns: [CSP meta tag, same-origin only, no inline style or script]
key-files:
  created: []
  modified: [index.html, css/style.css, README.md, FILES.md]
  removed: [js/ar.js, js/api.js, js/products.js, js/main.js, assets/*.png]
key-decisions:
  - "D-15: GreenWear code removed outright, no legacy folder"
requirements-completed: [PRIV-02]
duration: 10min
completed: 2026-10-04
---

# Phase 1 Plan 01: Clean Shell Summary

Removed the GreenWear prototype and replaced it with a script-free page shell guarded by a CSP (same-origin plus WebAssembly only), a trimmed stylesheet, and new README and FILES.

## Commits
- 6a9dd89: pending style.css header removal (own commit)
- 44b73f6: remove GreenWear code and assets (D-15)
- b4763ba: clean shell, CSP, trimmed CSS, README, FILES

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
None. `<main id="app">` is intentionally empty; plan 01-03 fills it.

## Self-Check: PASSED
