# External Integrations

**Analysis Date:** 2026-10-13

## Runtime
- None. The app makes no network calls, has no backend, no accounts, no analytics and no third-party scripts.
- Everything loads same-origin: page, bundle, `vendor/mediapipe/wasm/` and `vendor/mediapipe/models/`.
- The meta CSP (`connect-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`) blocks any other origin.
- `test/privacy.static.test.js` forbids `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource` and literal `http://` / `https://` in `src/`.

## Browser Capabilities
- Camera via `getUserMedia` (`src/platform/camera.js`), after in-app consent.
- `localStorage` via `src/platform/storage.js` only: numbers, preference, history and locale; never images.
- Web Audio for synthesized cues (`src/platform/sound.js`), no audio files.
- `DeviceOrientationEvent` for phone tilt (`src/platform/tilt.js`), with iOS permission request on a click.

## Build Time Only
- npm registry: `vite`, `@vitejs/plugin-basic-ssl`, `@mediapipe/tasks-vision` (exact pins, `package-lock.json`).
- `scripts/vendor-mediapipe.mjs` copies the bundle and wasm from `node_modules/@mediapipe/tasks-vision` and downloads the pose models once from `https://storage.googleapis.com/mediapipe-models/pose_landmarker`; results are pinned in `vendor/mediapipe/SHA256SUMS`.

## Removed
- The earlier jsDelivr-hosted MediaPipe Pose scripts were removed with the GreenWear prototype.

---

*Integration audit: 2026-10-13*
