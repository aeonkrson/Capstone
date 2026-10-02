# Codebase Concerns

**Analysis Date:** 2026-10-02

Context: static prototype (`index.html`, `css/style.css`, `js/products.js`, `js/api.js`, `js/ar.js`, `js/main.js`, `assets/`). No `package.json`, no build, no tests. The project is pivoting from simulated tag scanning plus sustainability info to front and side body scanning for measurement estimation (target about 2-3 cm vs tape measure) and clothing size recommendation. Items are ordered by relevance to that pivot.

## Pivot-Critical Concerns

**2D landmarks, joint centers only, cannot yield circumferences:**
- Issue: `js/ar.js` uses only `results.poseLandmarks` (normalized x/y, ignoring `z` and `visibility`) and only indices 11, 12, 23, 24 (`drawGarmentOverlay`, `drawSkeleton`). BlazePose landmarks are joint centers, not body surface points. Shoulder width, torso length, and so on are approximations. Chest, waist, and hip circumference cannot be derived from joint points.
- Files: `js/ar.js` (lines 389-433, 435-531)
- Impact: 2-3 cm accuracy is not achievable with the current approach. Distances in pixels have no real-world unit.
- Fix approach: Add a metric scale source (user-entered height, or a reference object such as a card). Enable `enableSegmentation` (or move to the Tasks Vision `PoseLandmarker` with segmentation masks) to get a silhouette. Take front width and side depth from the silhouette at landmark-defined heights and approximate circumference with an ellipse model. Evaluate `results.poseWorldLandmarks` (metric, hip-centered, currently unused). Build a validation protocol against tape-measure ground truth before promising accuracy.

**Legacy MediaPipe Pose solution, unpinned CDN, no SRI:**
- Issue: `index.html` loads `https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js` and `camera_utils.js` with no version pin and no integrity hash. `startMediaPipe` uses `locateFile` to the same unpinned CDN for the WASM and model files. `camera_utils` is loaded but never used. The legacy `@mediapipe/pose` solution is the older API. Newer MediaPipe work targets Tasks Vision (`PoseLandmarker`).
- Files: `index.html` (lines 10-11), `js/ar.js` (lines 360-362)
- Impact: A CDN update can silently change landmark behavior mid-project, which is fatal for measurement reproducibility. Supply-chain risk on a page that handles camera frames. Fully offline use is impossible. A CDN failure leaves `Pose` undefined and `startMediaPipe` throws an uncaught ReferenceError inside the `loadedmetadata` handler.
- Fix approach: Pin exact versions, add SRI or self-host the model assets under `assets/` or `vendor/`, remove the unused `camera_utils`, and wrap initialization in try/catch with a visible error state.

**Capture settings are too weak for measurement:**
- Issue: The camera requests `{ width: {ideal: 640}, height: {ideal: 480}, facingMode: "user" }`. These are only ideal hints, so the real resolution can differ. `modelComplexity: 1` is used. `smoothLandmarks: true` is a temporal filter meant for live display, not a static measurement. `minDetectionConfidence` and `minTrackingConfidence` are 0.5. `landmark.visibility` is never checked, so a body partly out of frame still counts as "Tracking Aktif" because `results.poseLandmarks` is truthy.
- Files: `js/ar.js` (lines 295-302, 364-369, 403-415)
- Impact: Low resolution adds several centimeters of error. No pose-quality gating (full body in frame, upright, arms away from body, feet visible, camera level, distance) means bad captures are accepted. Lens distortion and camera tilt are not handled.
- Fix approach: Request higher resolution, read the actual `videoWidth` and `videoHeight`, and use `modelComplexity: 2` for capture. Gate capture on landmark visibility and pose checks. Average landmarks over N stable frames instead of a single frame. Add posture and distance guidance. Only `facingMode: "user"` is offered, with no `deviceId` selection or rear camera. Body scanning usually needs the user standing 2-3 m away, so a rear camera or a device on a stand matters.

**Mirroring and canvas/display geometry:**
- Issue: The mirror is applied in two places. The hidden `video#webcam` has CSS `transform: scaleX(-1)` (`css/style.css` line 65), and `onResults` flips the canvas with `translate(width,0); scale(-1,1)`, toggled by `isMirrored`. Landmarks are in unmirrored image space, so anything drawn inside the flipped context is mirrored, including `fillText` of the product name in the fallback overlay (reversed text). The canvas internal size is set once at `loadedmetadata` to the video's native size. The panel is forced to `aspect-ratio: 4/3` with `object-fit: cover` on the canvas, so a non-4:3 stream (portrait on mobile, 16:9) is cropped on screen. Any on-screen guide or ruler would no longer line up with the data the model saw. Canvas size is not updated on orientation change.
- Files: `js/ar.js` (lines 306-309, 389-400, 495-499), `css/style.css` (lines 41-75)
- Impact: Left/right confusion (landmark 11 is the person's left, which appears on the viewer's right unmirrored). Side-view capture needs to know which side faces the camera. Misaligned guides lead to bad measurements.
- Fix approach: Run measurement math on raw unmirrored landmarks in image pixel space. Treat mirroring as a display-only concern (CSS or draw-time). Do not draw text inside the flipped context. Use `object-fit: contain` or match the canvas aspect ratio to the stream. Re-measure on `resize` and orientation change.

**Front and side flow does not exist, and the state machine is product-centric:**
- Issue: States are `STATE_IDLE`, `SCANNING`, `LOADING`, `TRACKING` (`js/ar.js` lines 33-37). They model "scan a clothing tag, fetch product", and are mixed with the booleans `trackingActive`, `hasBypassed`, `showSkeleton`, `isMirrored`, and with `activeStream`. `STATE_IDLE` is only the initial value and is never re-entered. `STATE_SCANNING` means "tag scan", which will collide with "body scan". There is no step model (front capture, side capture, compute, result), no per-view data store, and no retake path.
- Files: `js/ar.js` (lines 25-37, 160-209, 401-430)
- Impact: The pivot needs a different state model. Reusing these names and flags invites bugs.
- Fix approach: Replace with an explicit state machine (for example `idle`, `permission`, `positioning`, `capturing_front`, `capturing_side`, `computing`, `result`, `error`) with a single `setState()` and one place for UI updates. Remove `activeProduct`-based guards.

## Simulated vs Real

**Everything about "scanning" and "server" is simulated:**
- Tag scan: `setTimeout(..., 2200)` in `triggerScanAndLoad` (`js/ar.js` line 178). No tag or QR detection exists. The banner text "Memindai Tag" is cosmetic. The default banner in `index.html` ("Tag tidak terdeteksi...") is left over from a flowchart step.
- Backend: `api.fetchProductById` waits 1000 ms then looks up the static array (`js/api.js` lines 7-18). `api.recommendOutfit` waits 500 ms then applies category/color rules (`js/api.js` lines 27-82). Both are exposed as `window.api`. There is no network, auth, or error behavior to test against.
- Garment overlay: `drawGarmentOverlay` stretches a static PNG using shoulder-width x 1.8 and hip-derived height x 1.5, a pure heuristic. It does not model fit (`js/ar.js` lines 435-501).
- Recommendation: colour/category matching only. Products have no size, measurement, or size-chart fields (`js/products.js`).
- Impact: A size-recommendation feature has no data model to attach to. Nothing real can be reused except the camera and pose plumbing.
- Fix approach: Add a size chart schema (garment measurements per size, ease, stretch) to product data. Keep the API as a thin async interface so a real backend can replace it. Remove the artificial delays or make them configurable.

**Sustainability data is hard-coded and partly mislabeled:**
- Files: `js/products.js`, `js/ar.js` (lines 241-249, 260)
- Issue: `waterUsage` is documented as "liters used (vs 2700 standard)" but is shown as `Hemat ${waterUsage}L air` ("saves X L"). `carbonFootprint` is the product's footprint but is shown as `Kurang ${carbonFootprint}kg CO₂` ("reduces by"). `updateCirclePercent` ignores its `maxValue` argument, and `maxWaterSaved` and `maxCarbonSaved` are dead. Savings percentages and baselines have no cited source.
- Impact: Misleading claims in a product that markets sustainability. If the sustainability panel is dropped in the pivot, this is dead weight. If kept, fix before demos.

## Camera Permission and Lifecycle Bugs

**Stream never stopped, and stale listeners accumulate:**
- Files: `js/ar.js` (lines 289-337)
- Issue: `activeStream` tracks are never stopped and `activeStream` is never reset. `bypassCamera()` after the camera is running only sets `hasBypassed = true`, so the stream and camera indicator stay on. `webcamElement.addEventListener("loadedmetadata", ...)` is added inside every `initCamera()` call without `{ once: true }`. Each retry adds another handler, so `triggerScanAndLoad` and `startMediaPipe` can run multiple times per load.
- Impact: Camera light stays on after "skip". Duplicate handlers cause repeated scans and, once capture exists, repeated captures. Privacy-sensitive for a body-scanning app.
- Fix approach: Stop all tracks on bypass, retake, and `pagehide`. Use `{ once: true }` or one-time setup. Reset `activeStream` and the video `srcObject`.

**Bypass then re-enable camera leaves tracking frozen:**
- Files: `js/ar.js` (lines 357-387, 289-325, 327-337)
- Issue: `renderLoop` exits when `hasBypassed` is true. `startMediaPipe` returns early when `poseInstance` already exists ("Prevent multiple instances"), so after a bypass followed by `initCamera()`, the render loop is never restarted. Also, after bypass the cover is hidden and no UI offers a way back to the camera (the retry button only appears in the permission-denied fallback).
- Impact: The camera cannot be re-enabled reliably in one session.
- Fix approach: Separate "create the model" from "start the frame loop". Make the loop start and stop idempotent. Add a visible "enable camera" control in bypass mode.

**Error handling for getUserMedia is coarse:**
- Files: `js/ar.js` (lines 295-324)
- Issue: `navigator.mediaDevices` is undefined on insecure origins (plain HTTP on a non-localhost host). `navigator.mediaDevices.getUserMedia` then throws synchronously, outside the `.catch`, and the UI stays on the loading overlay forever. Every rejection (`NotAllowedError`, `NotFoundError`, `NotReadableError`, `OverconstrainedError`) shows the same "Akses Kamera Ditolak" message and the badge text "Kamera Ditolak".
- Impact: Users with no camera, a camera in use by another app, or an HTTP-hosted page get a wrong or no message. Hosting requires HTTPS or localhost, and this is undocumented (no README, and no run instructions in `FILES.md`).
- Fix approach: Guard `navigator.mediaDevices?.getUserMedia`, branch on `err.name`, and show specific messages (permission, no device, busy, insecure context). Document how to serve the app locally (for example `python3 -m http.server`).

**Model download is not reflected in the UI:**
- Files: `js/ar.js` (lines 306-316, 376-386), `index.html` (lines 66-70)
- Issue: The "Mengunduh Detektor AR..." overlay is hidden at `loadedmetadata`, before the first `poseInstance.send` triggers the WASM/model download. The badge reads "Menunggu Model..." until the first landmarks arrive. No `await pose.initialize()`.
- Impact: Users see a blank or unresponsive feed during the first load and cannot tell failure from slowness.

## Tech Debt

**Frame loop has no back-pressure:**
- Files: `js/ar.js` (lines 373-386)
- Issue: `requestAnimationFrame` calls `poseInstance.send(...)` every 33 ms without waiting for the previous promise. Slow devices queue overlapping inferences. The loop is rAF-driven, so it is throttled in background tabs. The webcam `<video>` is `display: none`, which some browsers (notably Safari/iOS) may pause or throttle.
- Fix approach: Add an in-flight flag (`await send` before the next frame), or use `video.requestVideoFrameCallback`. Keep the video in the layout (for example visually hidden but not `display:none`).

**`ar.js` is a 574-line monolith inside one `DOMContentLoaded` closure:**
- Files: `js/ar.js`, `js/main.js` (a one-line placeholder comment, not even included in `index.html`)
- Issue: Camera, pose, drawing, product catalog UI, wardrobe storage, dashboard rendering, and state are all closure-private, so nothing is unit-testable. Globals (`PRODUCTS`, `api`) are coupled by script order in `index.html`. No ES modules.
- Fix approach: Split into modules (camera, pose, measurement, ui, state, storage) using ES modules. Delete or use `js/main.js`. Keep pure measurement math in a separate dependency-free file that can be tested in Node.

**`clearHistory` immediately re-adds the active product:**
- Files: `js/ar.js` (lines 64-74)
- Issue: In bypass mode it calls `loadProductDirect(activeProduct)`, which calls `saveToHistory`, so "Hapus Riwayat" leaves one item behind.

**Unguarded localStorage:**
- Files: `js/ar.js` (lines 50-53)
- Issue: `JSON.parse(localStorage.getItem("greenwear_history"))` is not in a try/catch. Corrupt data or disabled storage (private mode) throws during startup. The key has no schema version.
- Fix approach: Wrap in try/catch with a safe default and version the stored schema.

**Race handling in scan flow is partial:**
- Files: `js/ar.js` (lines 168-209)
- Issue: Timeouts are never cleared. Switching A to B to A within 2.2 s runs both A timers (the guard compares ids, and both match). On an API error, `currentState` stays `STATE_LOADING` forever with an error banner and no retry. An unknown id in `selectProduct` makes `activeProduct` undefined and crashes later.

**Mixed languages and UI strings:**
- Files: `index.html`, `js/ar.js`
- Issue: Indonesian UI strings mixed with English ("Scanning Tag...", "In Wardrobe", "Catalog Suggestion"). Strings are inline with no i18n layer.

**Dead and stale files:**
- `FILES.md` references `GreenWear.pdf` but the file is `GreenWear (1).pdf`, and it omits `docs/`. `docs/plans/` is empty. `.gitignore` excludes `.gemini/`, `.agents/`, `plans/`. `.DS_Store` is present on disk.
- `js/products.js` references image files that do not exist. `assets/` contains only `cotton_tee_card.png`, `cotton_tee_overlay.png`, `linen_shirt_card.png`, `linen_shirt_overlay.png`. Missing: `hemp_jacket_*`, `denim_dress_*`, `wrap_dress_*`. Four products have `overlayImage: ""` and reuse other products' card images. The overlay code falls back to a green rectangle, so nothing crashes. Each existing PNG is 0.7-1 MB, unoptimized and preloaded eagerly. Card images (`image`) are never rendered, since cards use emoji.

## Security and Privacy

**Biometric and body data handling is undefined:**
- Risk: Body scans and measurements are sensitive personal data (Indonesia's UU PDP 27/2022 treats biometric data as specific personal data, and the UI is Indonesian-language). There is no consent step, privacy notice, or statement that frames stay on-device. `localStorage` is plaintext and shared by origin, and the pivot would put measurements in it.
- Files: `js/ar.js` (storage helpers), `index.html`
- Recommendations: Keep all processing client-side and say so in the UI. Add an explicit consent screen before camera start. Never persist raw frames. Persist only the minimum derived measurements, with a clear "delete my data" action. Run a legal review for the target market.

**Third-party scripts with camera access and no CSP:**
- Risk: Unpinned, non-SRI CDN scripts run on the page that holds the camera stream (see the Pivot-Critical section). No Content-Security-Policy.
- Recommendations: Pin and self-host, add a CSP meta tag restricting `script-src` and `connect-src`.

**innerHTML with data values:**
- Files: `js/ar.js` (lines 93-109, 124-136, 425)
- Risk: Product `name` and `color` are interpolated into `innerHTML`. Safe today because data is a static local array, but unsafe once data comes from a real API or user input.
- Recommendations: Build nodes with `textContent` or escape values.

**Personal data in repo:**
- `GreenWear (1).pdf` (about 636 KB, repo root) is the project plan and may contain team members' personal details. Review before publishing or sharing the repository. A `.git` directory is present in the project root, so confirm what has been committed before pushing anywhere public.

## Performance Bottlenecks

**Per-frame work on the main thread:**
- Files: `js/ar.js` (lines 389-433)
- Problem: Each result redraws the full frame to canvas and may draw a large PNG with rotation. Inference at 30 fps with unthrottled queueing (see Tech Debt). `modelComplexity: 2` plus segmentation, which the pivot needs for accuracy, will cost more.
- Improvement path: Throttle capture-mode inference, run heavy analysis only on the captured frames, and use a GPU delegate via Tasks Vision.

**Large unoptimized assets:**
- `assets/*.png` total about 3.1 MB for four files, preloaded at startup (`js/ar.js` lines 39-47). Compress or drop them if the garment overlay is removed.

## Fragile Areas

**`onResults` mixes drawing, state, and DOM updates:**
- Files: `js/ar.js` (lines 389-433)
- Why fragile: Each frame writes `scanFeedback.innerHTML` and badge classes inside the draw path, and relies on the `trackingActive` boolean being kept in sync with `currentState` in several places (lines 170, 404-430). Adding capture states means touching this block and `triggerScanAndLoad` together.
- Safe modification: Extract a render function driven by a single state object. Change the state, then render.

**Global scripts in fixed order:**
- `index.html` loads `products.js`, `api.js`, `ar.js` in that order and depends on globals `PRODUCTS`, `api`, `Pose`. Reordering or deferring breaks the app with no error message.

## Test Coverage Gaps

**No tests, lint, or tooling at all:**
- What's not tested: everything, including pure logic that matters for the pivot (distance math, scale conversion, size matching, `recommendOutfit` rules).
- Files: all of `js/`
- Risk: Measurement regressions are invisible. Accuracy claims cannot be demonstrated.
- Priority: High for measurement and size-matching logic. Put it in pure functions, add a minimal Node test runner, and create a tape-measure validation dataset (subject, true measurements, estimated, error) as the acceptance test for the 2-3 cm target.

## Missing Critical Features (for the pivot)

- Scale calibration (user height or reference object) and unit conversion.
- Body segmentation or silhouette extraction and circumference estimation.
- Pose and capture quality gating (visibility, distance, posture, lighting) and guided UI for front then side capture.
- Size chart data model and size-recommendation logic with confidence or error range and fit preference.
- Consent and privacy flow, and data deletion.
- A documented way to run and serve the app over HTTPS or localhost.

---

*Concerns audit: 2026-10-02*
