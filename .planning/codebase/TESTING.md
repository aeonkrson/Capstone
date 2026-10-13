# Testing Patterns

**Analysis Date:** 2026-10-13

## Runner
- Node built-in `node:test` with `node:assert/strict`; no extra test dependency.
- Run all: `npm test` (`node --test "test/**/*.test.js"`).
- Run one file: `node --test test/core/quality.test.js`.
- Tests run in plain Node with fakes for DOM, storage, audio and orientation; no browser runner.

## Test Files

| Group | Files |
|-------|-------|
| Core unit | `test/core/*.test.js` (autoLock, frameRate, geometry, height, mask, measure, poseGuide, preflight, quality, review, scale, scan, sizeFromTape), `test/bodyMeasurements.test.js`, `test/fit.test.js`, `test/profileState.test.js`, `test/data/colourboxCharts.test.js` |
| Platform | `test/storage.test.js`, `test/sound.test.js`, `test/tilt.test.js` |
| Flow | `test/scan.flow.test.js`, `test/guidedScan.flow.test.js`, `test/review.flow.test.js`, `test/fit.flow.test.js` |
| End to end (synthetic) | `test/scan.e2e.test.js`, `test/pipeline.e2e.test.js` (fixtures in `test/helpers/bodyFixtures.js`) |
| Guard: purity | `test/core.purity.test.js` |
| Guard: privacy static | `test/privacy.static.test.js` (no storage outside storage.js, no network, export or HTML-injection APIs) |
| Guard: privacy repo | `test/privacy.repo.test.js` (no tracked image or video, `.gitignore` rules) |
| Guard: i18n parity | `test/i18n.parity.test.js` |
| Guard: vendor | `test/vendor.test.js` (exact versions, no install scripts, SHA256SUMS, bundle API, vite config, full model tracked) |
| Guard: build dist | `test/build.dist.test.js` (copy-vendor-to-dist and build/demo scripts) |
| Validation scripts | `test/validation.report.test.js`, `test/validation.calibrate.test.js`, `test/validation.study.test.js` |

## Patterns
- Core features are TDD: a failing `test(...)` commit, then the implementation commit.
- Pure functions are tested with literal inputs and synthetic observations; no recorded frames or images.
- Adapters take injected globals (`target`, `OrientationEvent`, `AudioContextCtor`, `storageObj`) so tests pass fakes.
- Guard tests read source files and strip comments before matching forbidden words.

## Limits
- Camera, pose detection speed, mask frame rate, iOS Web Audio unlock and tilt permission are verified only on real devices (`validation/DEVICE-CHECKLIST.md`, `validation/FLOW-CHECKLIST.md`).
- Accuracy is measured only by the tape study (`validation/STUDY-PROTOCOL.md`, `node validation/study.mjs`), not by unit tests.

---

*Testing analysis: 2026-10-13*
