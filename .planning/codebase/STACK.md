# Technology Stack

**Analysis Date:** 2026-10-02

## Languages

**Primary:**
- JavaScript (vanilla, ES2015+ syntax, no modules, no transpilation) - all application logic in `js/ar.js`, `js/api.js`, `js/products.js`
- HTML5 - single page `index.html` (`<html lang="id">`, UI copy is in Indonesian)
- CSS3 - single stylesheet `css/style.css` (501 lines)

**Secondary:**
- None. `js/main.js` is a one-line comment placeholder and is not loaded by `index.html`.

## Runtime

**Environment:**
- Modern desktop/mobile browser (client-side only). No Node.js, no server runtime.
- Requires `navigator.mediaDevices.getUserMedia` (webcam), Canvas 2D, `localStorage`, `requestAnimationFrame`, and WebAssembly/WebGL (needed by MediaPipe Pose).
- Camera access requires a secure context: `https://` or `http://localhost`. Opening `index.html` via `file://` may block camera access depending on the browser.

**Package Manager:**
- None. No `package.json`, no lockfile, no `node_modules`.
- Dependencies are loaded by `<script>` tags from a CDN.

## Frameworks

**Core:**
- No application framework. Plain DOM manipulation (`document.getElementById`, `style.display` toggling) in `js/ar.js`.
- MediaPipe Pose (`@mediapipe/pose`, version unpinned, latest on jsDelivr) - body landmark detection used to place garment overlay images. Instantiated in `startMediaPipe()` in `js/ar.js` with `modelComplexity: 1`, `smoothLandmarks: true`, `minDetectionConfidence: 0.5`, `minTrackingConfidence: 0.5`.
- MediaPipe `camera_utils` (version unpinned) - loaded in `index.html` but the `Camera` helper is not used. `js/ar.js` drives frames itself with a `requestAnimationFrame` loop throttled to 30 fps that calls `poseInstance.send({ image: webcamElement })`.

**Testing:**
- Not detected. No test runner, test files, or test config.

**Build/Dev:**
- None. No bundler, linter, formatter, or dev server config. Files are served as-is.

## Key Dependencies

**Critical:**
- `@mediapipe/pose` via `https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js` (`index.html` line 11) - pose tracking. The app cannot do AR overlay if the CDN is unreachable.
- Pose model and WASM files fetched at runtime via `locateFile` from `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` (`js/ar.js` line 361).

**Infrastructure:**
- `@mediapipe/camera_utils` via `https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js` (`index.html` line 10) - loaded but unused.
- Both CDN `<script>` tags use `crossorigin="anonymous"`. No Subresource Integrity hashes and no version pins.

## Configuration

**Environment:**
- No environment variables, no `.env` files, no runtime config files.
- Tunable constants are hard-coded in source: MediaPipe options and 30 fps throttle in `js/ar.js`; webcam constraints (ideal 640x480, `facingMode: "user"`, `audio: false`) in `js/ar.js`; simulated latencies in `js/api.js` (1000 ms product fetch, 500 ms recommendation) and `js/ar.js` (2200 ms scan delay).
- Product data lives in the `PRODUCTS` global array in `js/products.js`.
- Script load order in `index.html` matters because there are no modules: `js/products.js`, then `js/api.js`, then `js/ar.js`.

**Build:**
- None. Static assets: `css/style.css`, `assets/*.png` (`cotton_tee_card.png`, `cotton_tee_overlay.png`, `linen_shirt_card.png`, `linen_shirt_overlay.png`).
- CSS uses a system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica...`). No web fonts, no CSS custom properties, one `@media (max-width: 768px)` breakpoint, `@keyframes spin` and `pulse`.
- `.gitignore` ignores `.DS_Store`, `.gemini/`, `.agents/`.

## Platform Requirements

**Development:**
- Any static file server (for example `python3 -m http.server` or an editor live-server) serving the project root on `localhost`. Internet access is needed to load MediaPipe from jsDelivr.
- A webcam for the AR flow. Without one, the "skip" path (`bypassCamera()` in `js/ar.js`) still shows product data.

**Production:**
- Deployment target not detected. Any static host over HTTPS would work. No server-side component exists.

---

*Stack analysis: 2026-10-02*
