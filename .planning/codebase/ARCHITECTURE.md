# Architecture

**Analysis Date:** 2026-10-13

## System Overview
```text
index.html (CSP, markup, data-i18n keys)
  -> src/main.js (entry: flags, preflight, camera, pose, guided scan, review)
       -> src/app/fitApp.js (profile, catalog, fit check, history, settings)
       -> src/app/guidedScan.js, burst.js, scanSession.js (orchestration)
       -> src/platform/* (camera, pose, frameLoop, sound, storage, tilt)
       -> src/ui/* (views, textContent only)
       -> src/core/* (pure maths and state)  <- src/data/* (charts, catalog)
       -> src/i18n/* (en, id)
```

## Layers

| Layer | Location | Contains | May import |
|-------|----------|----------|------------|
| Core | `src/core/` | pure measurement, quality gate, auto-lock reducer, calibration, fit, profile state, preflight, review parsing | `src/core/`, `src/data/` |
| Data | `src/data/` | `colourboxCharts.js` (ColourBox size charts), `catalog.js` (`CATALOG`, `CUTS`) | `src/data/` |
| Platform | `src/platform/` | `camera.js`, `pose.js`, `frameLoop.js`, `sound.js`, `storage.js`, `tilt.js` browser adapters | `src/core/`, `vendor/` |
| App | `src/app/` | `fitApp.js`, `guidedScan.js`, `burst.js`, `scanSession.js` orchestration | core, data, platform, ui, i18n |
| UI | `src/ui/` | `createXView` factories: catalog, consent, debug, fit, guide, height form, profile, review, scan, settings | core, i18n (via injected `t`) |
| i18n | `src/i18n/` | `en.js`, `id.js`, `index.js` (`t`, `formatNumber`, `initLocale`, `setLocale`, `applyTranslations`) | own files |
| Entry | `src/main.js` | wiring of everything above | all |

- `src/core/` purity is enforced by `test/core.purity.test.js`: no `document`, `window`, `navigator`, `localStorage`, `performance`, `Date.now`, and no imports from platform, ui, app or i18n.
- Time enters core only as a `t` argument on events (`stepLock`), never from a clock.

## Entry Point
- `index.html` loads `src/main.js` as a module; Vite bundles it.
- `src/main.js` order: `initLocale(storage.loadLocale() ?? navigator.language)`, `applyTranslations`, `initFitApp`, read URL flags, `preflightIssues`, then wire camera, pose, frame loop, guided scan, review and buttons.
- Missing required markup logs `console.error("Page markup is missing a required element.")` and skips the scan wiring.

## Data Flow: Guided Scan to Fit Check
- Height form (`src/ui/heightForm.js`, `validateHeightCm`, 120 to 220 cm) sets `heightCm` in memory only.
- Consent (`src/ui/consentView.js`) must be accepted once per page load before the camera starts; Accept also unlocks sound and starts tilt (user gesture for iOS). Decline routes to manual entry.
- `ensurePose()` loads `createPose` lazily; failure shows an engine error and routes to manual entry.
- `camera.start({ facingMode })` returns `{ ok }` or an error `code` (`denied`, `no-camera`, `busy`, `overconstrained`, `unknown`); failure routes to manual entry.
- `createFrameLoop` (12 fps) calls `pose.detect` per frame; the mask is requested only in debug or while guiding.
- `guidedScan.onFrame` runs `checkFrame` (quality gate) and `stepLock` (auto-lock) per frame and keeps only reason codes and body anchors.
- On lock, `capture(view)` runs `runBurst` (15 frames, 8 ok minimum) -> `readFrame` per frame -> `summariseBurst` -> `scanSession.record`.
- After front and side, `combineScan` builds the measurements; `maybeOpenReview` stops the camera and opens `reviewView`.
- Review save -> `fitApp.applyReview` -> `applyRescan` (every measurement replaced; source `scanned` or `edited`) -> `storage.saveState` -> `goToFitCheck`.
- Fit check: `checkFit({ chart, sizeLabel, preference, body })` and `recommendAll(chestCm, chart)`; each check is added to history with `addHistoryEntry` (newest first, cap 50).
- Rescan (`#btn-rescan`, `beginRescan`): resets the scan, asks for height when none is set, then restarts the guided scan; saving replaces the old values.
- Manual fallback: debug capture buttons stop the guided scan and use a 5 s countdown burst.

## Startup Preflight
- `preflightIssues({ secureContext, cameraApi, webAssembly })` returns codes in fixed order; `src/main.js` shows them in `#preflight-status` with `preflight.manual`, re-rendered on language change.
- Informational only: consent, camera start and manual entry still work.

## State and Storage
- Saved state (`sfs.state.v1`) holds profile name, preference, five measurements with sources, and fit history; `sfs.locale` holds `en` or `id`.
- Only `src/platform/storage.js` touches `localStorage`; it sanitises on load and save (`sanitiseState`) and falls back to memory when storage is blocked.
- Height, consent, captured readings and scan session are in memory for the page load only.
- Settings "delete all" calls `storage.clearAll()` and resets to `emptyState()`.

## Privacy Constraints
- No image, frame, mask or video is stored, exported or sent; only numbers.
- No network calls at runtime; CSP allows only same-origin resources plus `wasm-unsafe-eval`.
- `test/privacy.static.test.js` forbids storage, network, export and HTML-injection APIs in `src/` (`localStorage` allowed only in `src/platform/storage.js`).
- `test/privacy.repo.test.js` checks git tracks no image or video and `.gitignore` blocks photos and recordings.
- The camera stops on `pagehide` and when the page is hidden, and never restarts by itself.

## Validation Tooling
- `validation/report.mjs` (Phase 1): tape error and size agreement per `validation/PASS-CRITERIA.md`.
- `validation/calibrate.mjs` (Phase 3): repeatability, tape error and suggested calibration offsets from `phase3-readings.csv`.
- `validation/study.mjs` (Phase 5): accuracy study against `TARGETS` (shoulder MAE 2.5 cm, chest MAE 3.5 cm) and size agreement; writes `STUDY-RESULTS.md`.
- Scripts import pure `src/core/` and `src/data/` modules directly in Node.

## Error Handling
- Caught errors are logged with `console.error("<context>:", err)`.
- User-facing failures set translated text by key (`camera.error.<code>`, `engine.error.load-failed`, `scan.reason.<code>`) and route to manual entry where scanning cannot continue.
- Fit check failures hide the result instead of showing a wrong one.

## Removed
- The GreenWear AR prototype was removed in 2026-10 and lives only in git history.

---

*Architecture analysis: 2026-10-13*
