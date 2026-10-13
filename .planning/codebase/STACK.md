# Technology Stack

**Analysis Date:** 2026-10-13

## Languages
- JavaScript ES modules (`"type": "module"` in `package.json`), no TypeScript, no transpilation beyond the Vite build.
- HTML5: one page, `index.html`. `<html lang>` is set at runtime by `initLocale` in `src/main.js`.
- CSS3: one stylesheet, `css/style.css`. No preprocessor, no CSS custom properties.
- Node.js scripts (`.mjs`) for tooling: `scripts/` and `validation/`.

## Runtime
- Client-side only, in a modern phone or laptop browser. No backend, no server runtime.
- Browser APIs used: `getUserMedia`, Canvas 2D, WebAssembly, `localStorage` (only through `src/platform/storage.js`), `requestVideoFrameCallback` (falls back to `requestAnimationFrame`), Web Audio, `DeviceOrientationEvent`.
- Secure context required for the camera: `https://` or `http://localhost`. `src/core/preflight.js` reports `insecure-context`, `no-camera-api` and `no-webassembly` at startup; manual entry still works.

## Tooling
- Node `>=22.12.0` (`engines` in `package.json`).
- devDependencies, exact-pinned (no `^` or `~`, guarded by `test/vendor.test.js`):

| Package | Version | Role |
|---------|---------|------|
| `vite` | 8.3.2 | dev server and production build (`base: "./"`) |
| `@vitejs/plugin-basic-ssl` | 2.3.0 | self-signed HTTPS so phones on the LAN get camera access |
| `@mediapipe/tasks-vision` | 1.0.1 | source of the vendored pose files |

- No runtime dependencies. No install-time scripts (guarded by `test/vendor.test.js`).
- No linter, formatter or bundler config beyond `vite.config.js`.

## Scripts (`package.json`)
- `dev`: `vite --host` (HTTPS on the LAN).
- `build`: `vite build && node scripts/copy-vendor-to-dist.mjs` (copies wasm and models into `dist/` and re-checks SHA-256).
- `demo`: `npm run build && vite preview --host`.
- `preview`: `vite preview --host`.
- `test`: `node --test "test/**/*.test.js"`.
- `vendor`: `node scripts/vendor-mediapipe.mjs` (copy from `node_modules`, download models, write hashes).
- `vendor:check`: `node scripts/vendor-mediapipe.mjs --check` (verify `vendor/mediapipe/SHA256SUMS`).

## Pose Engine
- MediaPipe `PoseLandmarker` from `@mediapipe/tasks-vision` 1.0.1, self-hosted in `vendor/mediapipe/`.
- `vendor/mediapipe/vision_bundle.mjs` is imported by `src/platform/pose.js` and bundled by Vite.
- `vendor/mediapipe/wasm/` and `vendor/mediapipe/models/` are loaded at runtime from page-relative URLs (`new URL(..., document.baseURI)`).
- `vendor/mediapipe/SHA256SUMS` lists the bundle, four wasm files and both models; `vendor:check` and the build verify them.
- Model `pose_landmarker_full.task` by default and tracked in git; `pose_landmarker_heavy.task` is optional (`?model=heavy`), downloaded with `--heavy` and git-ignored.
- Options: `numPoses: 1`, `outputSegmentationMasks: true`, running mode `VIDEO`, delegate `CPU` (or `GPU` by flag).

## Content Security Policy
- Meta CSP in `index.html`: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`.
- No third-party origins, no CDN, no inline scripts or styles.

## Configuration
- No environment variables, no `.env` files (`import.meta.env` is forbidden in `src/` by `test/privacy.static.test.js`).
- URL flags, read once in `src/main.js`:

| Flag | Values | Effect |
|------|--------|--------|
| `debug` | `1` | shows the debug section, skeleton, mask, live readings and fps |
| `model` | `heavy` | loads the heavy model instead of full |
| `camera` | `rear` | rear camera (`environment`), no mirroring |
| `delegate` | `gpu` | GPU delegate instead of CPU |

- Tunable constants live in pure modules: `QUALITY` in `src/core/quality.js`, `AUTO_LOCK` in `src/core/autoLock.js`, `CALIBRATION` in `src/core/calibration.js`, ease and diff windows in `src/core/fit.js`, burst sizes in `src/app/burst.js`, frame rate (`targetFps = 12`) in `src/platform/frameLoop.js`.
- `vite.config.js`: `base: "./"`, `basicSsl()`, `server.host: true`, `server.ws: false`, `server.fs.deny` adds `**/validation/**` and `**/.planning/**`.

## Platform Requirements
- Development: `npm install`, then `npm run dev`; open the printed `https://<lan-ip>:5173` on the phone and accept the self-signed certificate.
- Demo: `npm run demo` builds `dist/` and serves it with `vite preview --host` over HTTPS.
- `dist/` also runs from any plain static server over HTTPS or localhost; all paths are relative.
- No internet needed at runtime once installed; the model download happens only in `npm run vendor`.

---

*Stack analysis: 2026-10-13*
