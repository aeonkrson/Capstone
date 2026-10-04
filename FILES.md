# Project File Documentation

The GreenWear prototype was removed on 2026-10 and remains in git history. This document describes the Size Fit Scanner layout.

- `index.html` - page shell with a strict Content-Security-Policy and no third-party scripts.
- `css/style.css` - styles for the shell, camera panel and HUD.
- `src/main.js` - entry module loaded by the page.
- `src/core/` - pure measurement and fit logic, no browser globals, testable in Node.
- `src/platform/` - adapters for camera, pose detection and the frame loop.
- `src/app/` - orchestration between platform adapters and core logic.
- `src/ui/` - DOM and canvas rendering.
- `src/data/` - static data such as garment size charts.
- `src/i18n/` - English and Indonesian string dictionaries.
- `vendor/mediapipe/` - self-hosted, version-pinned body detection files and their hashes.
- `scripts/` - maintenance scripts, for example vendoring the detection files.
- `test/` - Node built-in test runner tests.
- `validation/` - tape-measure study protocol, pass criteria and readings.
- `.planning/` - project planning notes (not served by the dev server).
