# Architecture Research

**Domain:** On-device, browser-based body measurement and clothing size-fit (tops), static site, no backend
**Researched:** 2026-10-02
**Confidence:** MEDIUM (MediaPipe API facts verified in Context7 and official docs: HIGH. Overall decomposition is synthesized from the domain literature and standard patterns. Public reference architectures for this exact product class are scarce. Accuracy-related claims are LOW until validated on the team's own bodies.)

## Verdict on the Existing Code: Replace, Do Not Refactor

`js/ar.js` is a product-centric controller (tag scan, fetch product, overlay garment, eco dashboard). Nothing in its state model (`idle/scanning/loading/tracking`), data model (`PRODUCTS` with eco fields) or rendering (garment overlay) maps onto body scan to measurement to fit. What carries over is knowledge, not code:

| Keep (as reference, rewrite into new modules) | Drop |
|---|---|
| `getUserMedia` request + denial fallback UI idea | Tag-scan simulation, `api.fetchProductById`, `recommendOutfit` |
| MediaPipe pose setup, skeleton drawing (debug overlay) | `PRODUCTS` eco fields, wardrobe, Mix & Match, dashboard rings |
| Async catalog interface shape (`getCatalog()` returning a Promise; delete the artificial delays) | `drawGarmentOverlay`, `js/main.js`, unused `camera_utils`, 3 MB overlay PNGs |
| `localStorage` as persistence (now behind a versioned adapter) | Global `PRODUCTS` / `window.api` / script-order coupling |

Migrate to native ES modules (`<script type="module">`). This needs no bundler, works on any static server, and the same pure files import unchanged in Node for tests. This single decision fixes the "nothing is testable" concern in CONCERNS.md.

## Standard Architecture

### System Overview

Guiding principle: **functional core, imperative shell.** All numbers that matter (scale, widths, circumferences, aggregation, fit verdicts, state transitions) live in pure functions. Browser APIs (camera, MediaPipe, canvas, localStorage, DOM) are thin adapters at the edge that produce plain data for the core.

```
┌──────────────────────────────────────────────────────────────────────┐
│ UI / Views (DOM, canvas)                          src/ui/            │
│ consent | height | capture(+overlay) | review | catalog | result |   │
│ history | settings(language, delete data)                            │
└───────────────▲──────────────────────────────┬───────────────────────┘
                │ subscribe(state)             │ dispatch(event)
┌───────────────┴──────────────────────────────▼───────────────────────┐
│ App layer (orchestration, owns side effects)      src/app/           │
│  store (observable)   router (hash)   scanController   shopController│
└──────┬─────────────────────┬─────────────────────────┬───────────────┘
       │ uses                │ uses                    │ uses
┌──────▼──────────────┐ ┌────▼──────────────────────┐ ┌▼──────────────┐
│ Platform adapters   │ │ PURE CORE (no DOM, no     │ │ Data          │
│ src/platform/       │ │ browser globals)          │ │ src/data/     │
│  camera.js          │ │ src/core/                 │ │  catalog.js   │
│  pose.js (MediaPipe)│ │  scanMachine  quality     │ │  fitConfig.js │
│  frameLoop.js       │ │  geometry mask scale      │ │  calibration  │
│  storage.js         │ │  measure aggregate        │ │  .js          │
│                     │ │  sizechart fit units      │ │ src/i18n/     │
│                     │ │  schema/migrate i18nCore  │ │  en.js id.js  │
└─────────────────────┘ └───────────────────────────┘ └───────────────┘
   Platform adapters import NOTHING from app/ui. Core imports NOTHING
   from platform/ui/app. Data modules are plain exported objects.
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation | Pure? |
|-----------|----------------|------------------------|-------|
| `core/scanMachine` | Capture flow: `(state, event) -> {state, effects}` | Transition table; events carry timestamps (no `Date.now()` inside) | YES |
| `platform/camera` | Device list, front/rear, resolution request, start/stop, single owner of the `MediaStream`, error classification | Factory returning `{start, stop, switchTo, devices, settings}`; generation token to cancel stale starts | no |
| `platform/pose` | Load pinned self-hosted MediaPipe Tasks Vision, run `PoseLandmarker`, return `FrameObservation` | One instance, `VIDEO` mode, `outputSegmentationMasks`, copies masks out inside the callback | no |
| `platform/frameLoop` | Back-pressured per-frame driver | `requestVideoFrameCallback` (fallback rAF); skip frame if previous inference still running; throttle to ~10-15 fps in capture | no |
| `core/quality` | Per-frame gates: full body in frame, distance, upright, arms away (front), orientation correct (front vs side), stillness | `(obs, viewKind, thresholds) -> {ok, failures[]}`; failures are codes, not text | YES |
| `core/mask` | Silhouette primitives on `{w,h,data}` masks: bbox, row runs, width at row, central run containing the torso, narrowest row in a band | Typed-array loops | YES |
| `core/scale` | cm-per-pixel from typed height and silhouette pixel height (head top to sole) | One scale per view (distance differs between views) | YES |
| `core/measure` | `FrameObservation + view + scale -> raw per-frame measurements` using a registry of measurement specs | See Pattern 3 | YES |
| `core/aggregate` | Many frames -> one value with spread: reject outliers, median, MAD | `median`, `trimmedMean`, `mad` | YES |
| `data/calibration` + `core/calibrate` | Apply per-measurement linear correction (`k*raw + b`) fitted on team tape data | Coefficients are data, application is pure | YES (apply) |
| `core/sizechart` | Normalise a garment's chart (garment-measurement or body-range form) into per-size intervals | Pure | YES |
| `core/fit` | Garment + size + body measurements (+ spread) + preference -> verdict, per-dimension reasons, recommended size | Returns codes and numbers only | YES |
| `data/catalog` | ColourBox tops with size charts and cut labels | ES module exporting plain objects, validated by a pure `validateGarment` in tests | data |
| `platform/storage` | Versioned localStorage envelope with try/catch and in-memory fallback | `{v, data}`; migrations are pure | adapter (migrations pure) |
| `core/i18nCore` + `i18n/*` | `t(key, params)`, interpolation, locale resolution, number formatting | Flat key dictionaries; no library | core pure, dictionaries data |
| `app/store` | Single observable app state (profile, scan state, selected garment, locale) | ~40-line pub/sub | no |
| `app/scanController` | Wires camera + pose + frame loop + machine + capture session; executes machine effects | Only place that knows all adapters | no |
| `ui/*` | Render state, dispatch events; canvas guide/skeleton overlay | Plain DOM templates with `textContent` | no |

## Recommended Project Structure

```
index.html
css/style.css
vendor/mediapipe/             # PINNED tasks-vision bundle + wasm + pose_landmarker model (self-hosted)
src/
├── main.js                   # bootstrap: load profile, locale, mount router
├── core/                     # PURE. No document/window/navigator/localStorage. Node-testable.
│   ├── geometry.js           # dist, median, mad, trimmedMean, ellipseCircumference
│   ├── landmarks.js          # BlazePose index constants, key-point picks, level rules
│   ├── mask.js               # silhouette primitives
│   ├── scale.js              # cmPerPx from height
│   ├── quality.js            # capture gates
│   ├── measure.js            # spec registry + per-frame measurement
│   ├── aggregate.js          # multi-frame aggregation
│   ├── calibrate.js          # apply regression correction
│   ├── scanMachine.js        # capture-flow reducer
│   ├── sizechart.js          # normalise chart forms
│   ├── fit.js                # verdict + recommendation
│   ├── units.js              # cm/in conversion, rounding
│   ├── schema.js             # validate garment/profile/history, migrate()
│   └── i18nCore.js           # interpolate, plural, resolveLocale
├── platform/                 # browser adapters (only layer touching browser APIs)
│   ├── camera.js
│   ├── pose.js
│   ├── frameLoop.js
│   └── storage.js
├── app/
│   ├── store.js
│   ├── router.js
│   ├── scanController.js
│   └── shopController.js
├── ui/                       # one file per view + overlay.js (canvas drawing only)
├── data/
│   ├── catalog.js
│   ├── fitConfig.js          # ease windows per preference, tolerances, thresholds
│   └── calibration.js        # per-measurement k and b from team tape data
└── i18n/{en.js,id.js,index.js}
test/                         # node --test (built in; zero dependencies)
├── core/*.test.js
├── fixtures/                 # synthetic phantoms + recorded sessions (landmarks + RLE masks)
└── i18n.parity.test.js
validation/                   # tape-measure CSV, script that prints MAE/max error per measurement
```

### Structure Rationale

- **`core/` has a hard purity rule** (no browser globals, no imports from other layers). This is what makes unit tests, replay tests and the accuracy report possible without a camera. Enforce with a one-line grep in the test script.
- **Platform adapters produce plain data** (`FrameObservation`), so the entire measurement pipeline can be driven from recorded JSON in Node.
- **`data/` separates tunable numbers** (ease windows, calibration coefficients, thresholds) from logic, so accuracy and fit tuning never touch algorithm code.
- **No bundler, no framework.** ES modules + `node --test` + JSDoc typedefs are enough for ~2k lines solo. Adding Vite/TypeScript costs setup time with no payoff inside a 1-3 month window. (Vendoring MediaPipe means no npm needed at runtime.)

## Data Contracts (the seams between components)

Define these first; every module is just a function between two of them.

```js
/** From platform/pose. All coordinates in RAW (unmirrored) image PIXELS, not normalised. */
// FrameObservation = {
//   t: number,                       // ms, from video timestamp
//   image: { w: number, h: number }, // actual videoWidth/videoHeight
//   lm:  { x, y, z, v }[33],         // pixels + visibility (v)
//   world: { x, y, z }[33] | null,   // metres, hip-centred (cross-check only)
//   mask: { w, h, data: Uint8Array } // 0/1 person mask, COPIED inside the callback
// }

// ViewCapture = {                    // output of one capture hold (front or side)
//   view: 'front' | 'side',
//   cmPerPx: number, nFrames: number,
//   perFrame: { [measurementId]: number }[],   // raw per-frame values (cm, pre-calibration)
//   qualityFlags: string[], image: {w,h}
// }

// BodyMeasurements = {
//   [id]: { cm: number, spread: number, n: number, source: 'scan'|'manual',
//           scannedCm?: number }     // keep scanned value when user overrides
// }

// FitResult = {
//   verdict: 'fits'|'borderline'|'too_tight'|'too_loose',
//   recommended: { size: string, verdict } | null,
//   perDimension: { dim, bodyCm, garmentCm, easeCm, window:[lo,hi], status }[],
//   reasons: { code: string, params: object }[]    // UI maps code -> i18n key
// }
```

Two rules that prevent the nastiest bugs:

1. **Convert MediaPipe's normalised landmarks to pixels (x*w, y*h) before any distance math.** Normalised x and y have different scales when the frame is not square, so distances in normalised space are silently wrong.
2. **Mirroring is display-only.** The pose adapter and all core code see raw image coordinates. The overlay flips at draw time; text is never drawn in a flipped context.

## Capture Flow State Machine

Pure reducer; side effects are returned as descriptors and executed by `scanController`. Time comes in on events, never read inside.

```
consent -> height -> camera -> front.position -> front.hold -> side.position
   ^                    |           ^   |            |            |
   |   (already         |           |   +-quality lost (hysteresis)|
   |   consented:       v           |                              v
   |   skipped)      error(reason)  +--- RETAKE(front)        side.hold
   |                                                              |
   +---------- CANCEL (from anywhere: stop camera, clear)        v
                                          computing -> review -> done (profile saved)
                                              |          ^  |
                                              v          |  +-- CORRECT(id, cm) (stays in review)
                                         error(compute)  +----- RETAKE(view) -> position
```

- States: `consent`, `height`, `camera`, `front.position`, `front.hold`, `side.position`, `side.hold`, `computing`, `review`, `done`, `error`. Treat `view` as a context field if you prefer 7 states over 11. The behaviour is identical.
- Context: `{ heightCm, units, facing, deviceId, captures: {front?, side?}, measurements?, error?, qualityOkSince? }`.
- `position -> hold` happens when quality gates pass continuously for ~1 s (hysteresis); `hold -> position` if they fail for more than ~0.5 s. `hold` collects N stable frames (15-30) then emits `CAPTURE_DONE`.
- Camera running is a function of state: effects `camera.start` on entering `camera`, `camera.stop` on entering `computing`, `review`, `done`, `error` and on `CANCEL`. This kills the "camera light stays on" class of bug structurally.
- **Consent and the shop flow are separate.** The old design was product-centric. The new design is profile-centric: scan produces `profile.measurements`; the shop flow (catalog, size, verdict) only reads the profile and never needs the camera. Returning users with saved measurements skip the scan entirely.

```js
// core/scanMachine.js (shape, abbreviated)
export function transition(s, e) {
  switch (s.name) {
    case 'front.position':
      if (e.type === 'QUALITY' && e.okForMs >= 1000)
        return { state: { ...s, name: 'front.hold', frames: 0 }, effects: [{ type: 'capture.begin', view: 'front' }] };
      break;
    case 'front.hold':
      if (e.type === 'QUALITY_LOST' && e.lostForMs > 500)
        return { state: { ...s, name: 'front.position' }, effects: [{ type: 'capture.reset' }] };
      if (e.type === 'CAPTURE_DONE')
        return { state: { ...s, name: 'side.position', captures: { ...s.captures, front: e.capture } }, effects: [{ type: 'ui.prompt', key: 'scan.turnSide' }] };
      break;
  }
  return { state: s, effects: [] };   // unknown events are ignored, never thrown
}
```

## Camera Module

| Concern | Decision |
|---------|----------|
| Single owner | One `camera` object owns the stream and the `<video>`. `stop()` stops every track and clears `srcObject`. Called on leaving scan views, on `visibilitychange` (hidden) and `pagehide`. |
| Start idempotency | Each `start()` takes a generation number. A late `getUserMedia` resolution from a stale generation stops its own tracks. Wait for `loadedmetadata` with `{ once: true }` or `await video.play()`. Never stack listeners (current bug). |
| Resolution | Request `ideal` 1280x720 (try 1920x1080 on capable devices). Always read the real size from `track.getSettings()` / `videoWidth/Height`. Pose and masks run on that real size. The scale step uses it. |
| Orientation | Do not assume 4:3 or landscape. Phone portrait streams can arrive rotated or letterboxed. Use `object-fit: contain`, size the overlay canvas to the stream, recompute on `resize`/`orientationchange`. Core receives `image.w/h` with every frame. |
| Front vs rear | Default `facingMode: 'user'` (user can see the guide). Offer "use rear camera" for phone-on-a-stand. In that case guidance must be spoken or beeped and a countdown is mandatory, because the user cannot see the screen. Rear camera may select an ultra-wide lens on some phones, which adds distortion that cannot be corrected here (LOW confidence; test on the devices you will demo). |
| Device selection | `enumerateDevices()` only returns labels after permission is granted. Re-enumerate after the first successful start. Offer a device `<select>` for laptops with multiple cameras (external webcam). Persist `deviceId` in the profile. |
| Errors | Guard `navigator.mediaDevices?.getUserMedia`. Branch on `err.name`: `NotAllowedError` (denied), `NotFoundError` (no camera), `NotReadableError` (busy), `OverconstrainedError` (relax constraints and retry once), insecure context. Return a reason code; UI maps it to an i18n message. |
| Video element | Keep in layout (visually hidden, not `display:none`), `playsinline muted`. iOS Safari can pause hidden or `display:none` video. |
| Manual fallback | If the camera fails or is skipped, the app still works: user types measurements, and the shop flow runs. Not a degraded mode, it is a supported path. |

## Pose + Segmentation Inference Module

Verified against the MediaPipe Tasks Vision source and docs:

- `PoseLandmarker` supports `runningMode` `IMAGE`/`VIDEO`, option `outputSegmentationMasks` (default false), returns `landmarks` (normalised x,y,z + visibility), `worldLandmarks` (metres) and `segmentationMasks` as `MPMask[]` (HIGH; Context7 / official docs).
- **Mask lifetime:** masks are only valid inside the `detectForVideo(frame, ts, callback)` callback, unless copied (`clone()` or copy the typed array out). The no-callback overload copies for you but is slower. Copy to your own `Uint8Array` inside the callback and threshold to 0/1 (HIGH).
- `getAsUint8Array()` / `getAsFloat32Array()` on a GPU-resident mask is an expensive GPU-to-CPU readback (HIGH, per source docstring). Only request masks during `hold`, or throttle the loop, rather than every positioning frame. Whether `setOptions({outputSegmentationMasks})` can be toggled cheaply at runtime is unverified (LOW); test it, otherwise throttle.
- The model's segmentation output is reported as 256x256 (MEDIUM, secondary source; the web docs do not state it). **This is the main accuracy risk:** at 256 effective rows over a ~600 px tall person, one mask pixel is roughly 0.6 cm, so edge blur of one pixel per side can move a chest circumference by around 2 cm (LOW; back-of-envelope, to be measured). Hence the swap seam below.

```js
// platform/pose.js public surface
export async function createPose({ modelUrl, wasmBaseUrl, variant /* 'heavy'|'full'|'lite' */ })
//   -> { detect(videoEl, tsMs, { wantMask }) -> FrameObservation | null, close() }
```

Decisions:

1. **Self-host and pin** `@mediapipe/tasks-vision` (JS bundle, wasm, `.task` model) under `vendor/`. This removes CDN drift, makes the demo work offline, and keeps measurements reproducible. Pose model `heavy` (about 27 MB, float16) for capture. Fall back to `full`/`lite` only on a failed or slow init.
2. **Show model loading honestly:** `await` creation, show a progress state in the `camera` step before positioning begins.
3. **Silhouette behind one function** `getSilhouette(obs) -> mask`. Default is the PoseLandmarker mask. If validation shows the mask edge is too coarse, swap in a different source without touching `core/`: a dedicated segmenter, or an "empty background plate then difference" step in a controlled setting. Do not build the plate step up front; build the seam.
4. **Main thread, throttled.** `detectForVideo` is synchronous. A Web Worker for MediaPipe is awkward (module-worker support in the Tasks bundle is not something to bet a capstone on; LOW). Run at ~10-15 fps during capture, ~5 fps during positioning, with an in-flight guard. This is sufficient for static poses.
5. **Do not rely on MediaPipe smoothing for measurement.** Aggregate raw per-frame values yourself.

## Measurement Pipeline (all pure)

```
FrameObservation (px)             typed height (cm)
        │                               │
        ▼                               ▼
  quality gate ──fail──► (stay in position state, emit failure codes)
        │ pass
        ▼
  silhouette px height  ──►  scale.cmPerPx(heightCm, headTopPx, soleBottomPx)
        │                         (computed PER VIEW; distance differs between views)
        ▼
  levels from landmarks + mask    (rows: chest, waist, shoulder, hem...)
        │
        ├─ FRONT: widthCm(row)  = runLength(mask row, torso run) * cmPerPx
        └─ SIDE : depthCm(row)  = runLength(mask row, torso run) * cmPerPx
        ▼
  ellipse model: C = pi*[3(a+b) - sqrt((3a+b)(a+3b))], a=width/2, b=depth/2
        ▼
  per-frame raw values ──► collect over N stable frames ──► aggregate (median + MAD reject)
        ▼
  calibrate (k*raw + b from team tape data) ──► BodyMeasurements {cm, spread, n}
```

Step notes:

1. **Scale.** `cmPerPx = heightCm / (soleY - headTopY)`, both from the silhouette (top-most and bottom-most mask rows), not from landmarks (BlazePose has no head-top point; heels/ankles are joint centres). Shoes and hair add 1-3 cm. Tell the user to be barefoot or subtract a configurable offset (`data/fitConfig.js`). Typed-height error is small: 2 cm on 172 cm is about 1% (about 0.5 cm on a 50 cm circumference), so posture and clothing dominate, not height (MEDIUM; consistent with the published anthropometry sources below).
2. **Levels from landmarks, refined by the mask.** Shoulder and hip landmarks are joint centres, not surface points. Define levels as fractions of shoulder-to-hip distance. Chest = a fixed fraction just below armpit depth; waist = the **narrowest front-silhouette row within a band** between chest and hip (more robust than a fixed fraction). The side view reuses the same fractions, applied on the side view's own landmarks (the body is rotated, so use shoulder-mid y and hip-mid y). Fractions live in the spec registry and are tunable.
3. **Width extraction picks the torso run, not the whole row.** In the front pose with arms slightly away, a row at chest level crosses `arm | gap | torso | gap | arm`. Take the contiguous run containing the body's centre line (`mask.torsoRunAtRow`). If arms merge with the torso (no gaps), flag low confidence rather than returning an inflated width. In the side view, arms hang along the torso and mostly lie within chest depth, so depth is usually only mildly inflated. This is an assumption to validate (LOW).
4. **Ellipse model.** Published work compares circle, ellipse and rectangle shape models for body circumference from silhouettes and reports the ellipse with the smallest error (MEDIUM; secondary summary of an MDPI paper). Use Ramanujan's first approximation. A real chest/waist is not an ellipse, so apply a **per-measurement linear correction fitted on the team's tape data** (`calibrate`). That correction is the main accuracy lever and is data, not code.
5. **Averaging over stable frames.** Collect per-frame values only for frames that pass the gate. Aggregate with the median, reject frames beyond about 3 MAD, and report spread (MAD or SD) and `n`. Spread feeds the fit engine as uncertainty, so it can answer "borderline" honestly instead of a falsely precise yes/no.
6. **World landmarks** (metres, hip-centred) are a cross-check for segment lengths (shoulder width, torso, arm) and for sanity-failing a capture. They are not the primary source for circumferences.
7. **Measurement set is data-driven** (Pattern 3). Recommended first set for tops: chest and waist circumference (front + side), shoulder width (front), torso length (front). Defer sleeve length and hip circumference unless the ColourBox chart needs them. The final set is decided by the features research and the garment chart columns.

Known accuracy limiters that the architecture must make observable (not fixable in code): loose clothing, posture and breathing, camera tilt (cannot be detected on most laptops), lens distortion on wide rear cameras, and mask edge quality. The pipeline should output the quality flags and spread so the review screen can show "less certain" markers.

## Fit Engine (pure)

Inputs: `BodyMeasurements` (with spread), `Garment` (chart + cut), user preference, `fitConfig`. Output: `FitResult`.

**Two cut-like inputs, two different roles:**

- **User preference** (`regular | loose | oversize`) defines the **desired ease window** per dimension, i.e. how much larger than the body the garment should be. Held in `fitConfig` as `[lo, hi]` cm ranges (starting values to be tuned; they are product decisions, not algorithms).
- **Garment cut** (`regular | loose | oversize`) describes the garment. When the chart lists actual garment measurements (flat chest width, length, shoulder), the cut is already encoded in those numbers and is used only for explanations. When the chart lists only the body range a size is designed for, the cut supplies the assumed built-in ease (a table in `fitConfig`). `sizechart.normalise()` converts both chart forms into the same internal shape.

Algorithm:

```
for each size in chart:
  garmentChestCirc = 2 * flatWidth        (if chart is garment-measurement form)
  easeCm           = garmentChestCirc - body.chest
  status(dim)      = classify(easeCm, window[pref], body.spread)
                       -> 'ok' | 'tight' | 'loose' | 'borderline'
verdict(chosen size)  = worst status over governing dimensions
                        (chest is primary; waist, shoulder, length secondary, lower weight)
recommended           = among sizes where all primary dims are 'ok',
                        the one whose chest ease is closest to the window centre;
                        if none, the nearest size and a reason code
```

- **Uncertainty-aware:** if `ease ± spread` straddles a window edge, the status is `borderline`, not a hard yes or no.
- **Explainable:** `reasons` are `{code, params}` such as `{code:'chest_tight', params:{deltaCm:2.5}}`. The UI turns them into English or Indonesian. The engine never returns display strings.
- **Oversize garment + regular preference** naturally recommends a smaller size, and `reasons` includes `garment_cut_oversize`. No special-casing.
- **Manual overrides** flow through identically (`source:'manual'`, spread 0).

## Catalog Data, Profile, History

**Catalog.** An ES module exporting plain objects (works in browser and Node tests with no JSON import-attribute compatibility worries). A garment:

```js
{ id, name: {en, id}, brand: 'ColourBox', category: 'top', cut: 'regular',
  colors: [...], chart: { form: 'garment', unit: 'cm', convention: 'flat',
    sizes: [{ label:'M', chestWidth:52, length:70, shoulder:46, sleeve:21 }, ...] } }
```

`validateGarment` (pure, in `core/schema.js`) runs in tests over the whole catalog: monotonic sizes, required columns, supported units. Keep a thin async `getCatalog()` / `getGarment(id)` so a backend could replace it later; no fake latency. Real ColourBox chart values must be collected; use clearly marked placeholder numbers until then (see PITFALLS).

**Profile and history (localStorage).**

| Key | Contents | Notes |
|-----|----------|-------|
| `sfs.profile.v1` | `{consentAt, locale, heightCm, units, fitPreference, deviceId?, measurements: BodyMeasurements, measuredAt}` | Keeps both `scannedCm` and corrected `cm` so scan error can be reported for the accuracy study |
| `sfs.history.v1` | `[{ts, garmentId, size, verdict, recommended, measurementsAt}]` | Snapshot reference, not the body data itself |

Rules: versioned envelope `{v, data}`; every read in try/catch with a safe default; `migrate()` is pure and tested; in-memory fallback when storage is disabled (private mode); **never persist frames, masks or landmarks**; a "Delete my data" action clears every `sfs.*` key and stops the camera. This matches the consent and privacy concern (CONCERNS.md).

## i18n

Home-grown, about 60 lines, no library (i18next is overkill for two locales and a static page).

- Flat dictionaries `i18n/en.js`, `i18n/id.js`: `{ 'scan.turnSide': 'Turn to your side', 'fit.chest_tight': 'Chest is {deltaCm} cm tight' }`.
- `t(key, params)` with `{name}` interpolation; fallback chain `locale -> en -> key`. Plurals are rarely needed here; add a minimal helper only if a string requires it.
- Locale resolved from the saved profile, else `navigator.language` starting with `id`, else `en`. Set `<html lang>` on change.
- Numbers through `Intl.NumberFormat(locale)` (Indonesian uses a decimal comma), so formatting is a render concern, not stored.
- **Core never emits text.** Quality failures, fit reasons and camera errors are codes; only `ui/` calls `t()`.
- Test: a Node test asserts `en` and `id` have identical key sets and identical `{param}` names per key. This prevents the mixed-language drift currently in `ar.js`/`index.html`.
- Static markup uses `data-i18n="key"` attributes applied by one function; dynamic views call `t()`.

## What Must Be Pure and Unit-Tested

| Module | Why test | How to test |
|--------|----------|-------------|
| `geometry` (median, MAD, ellipse circumference, unit math) | Everything depends on it | Known values (circle `r` -> `2*pi*r`; compare against high-precision ellipse integral) |
| `mask` primitives | Widths are read from here | **Synthetic phantoms**: draw filled rectangles/ellipses/"torso with arm gaps" into a Uint8Array with known dimensions; assert widths, torso run, narrowest row |
| `scale` | Pixel-to-cm | Phantom of known px height; assert cm/px |
| `measure` (end to end on a phantom) | Whole pipeline | Phantom body with known chest 100 cm: assert output within 0.5 cm before calibration |
| `aggregate` | Robustness | Inject outliers; assert median and spread |
| `quality` | Gates | Landmark fixtures for bad cases (feet cut off, too close, side facing in front step) |
| `scanMachine` | Flow correctness incl. retake/cancel/errors | Event sequences -> expected states and effects; no timers needed |
| `sizechart` + `fit` | Core value | Table-driven cases: boundary eases, oversize+regular, spread-induced borderline, smallest/largest size edges |
| `schema`/`migrate` | Storage safety | Corrupt, empty, old-version payloads |
| `i18nCore` + dictionary parity | No missing strings | Key/param parity test |
| Replay | Real-world regression | Recorded `FrameObservation` sequences (RLE masks) from real sessions replayed through `measure`; assert within tolerance of tape values |

Not unit-tested, exercise by hand: `camera`, `pose`, `frameLoop`, `ui/*`. Keep them thin enough that this is safe. A **debug panel** (`?debug=1`) that shows live quality flags, cm/px, per-frame values and an "export session JSON" button feeds the replay fixtures and the validation CSV from real devices.

Run tests with built-in `node --test` (no install). A minimal `package.json` with `"type":"module"` and `"test":"node --test"` is the only tooling.

## Architectural Patterns

### Pattern 1: Functional core, imperative shell
**What:** All logic in pure `core/`; adapters in `platform/`; `app/` is the only layer mixing both.
**When to use:** Always here. It is what makes the 2-3 cm accuracy goal demonstrable and testable.
**Trade-offs:** Slight ceremony in defining data contracts. Pays back the first time a measurement bug is reproduced from a saved session file.

### Pattern 2: Reducer with effect descriptors for the capture flow
**What:** `transition(state, event) -> {state, effects}`; the controller executes effects (`camera.start`, `capture.begin`, `storage.saveProfile`).
**When to use:** Any multi-step flow with retake, cancel, error and permission branches.
**Trade-offs:** More explicit than callbacks; no framework needed.

### Pattern 3: Measurement spec registry
**What:** Each measurement is a data entry the pipeline interprets.
**When to use:** The measurement set is not final, and adding or removing one must be a one-entry change.
**Example:**
```js
export const MEASUREMENTS = {
  chest:    { views: ['front', 'side'], level: { from: 'shoulderMidY', to: 'hipMidY', frac: 0.22 }, model: 'ellipse', calibKey: 'chest' },
  waist:    { views: ['front', 'side'], level: { search: 'narrowestRow', band: [0.45, 0.80] },       model: 'ellipse', calibKey: 'waist' },
  shoulder: { views: ['front'], model: 'landmarkPair', pair: [11, 12], calibKey: 'shoulder' },
};
```
**Trade-offs:** A small interpreter is needed; fractions above are starting guesses to tune against tape data.

### Pattern 4: Reason codes, not strings
**What:** Core returns `{code, params}`; UI localises.
**When to use:** Quality gates, fit reasons, errors. Required for bilingual UI without logic duplication.

### Pattern 5: Replayable sessions
**What:** `FrameObservation` is plain JSON-serialisable data; the debug panel exports it; Node replays it.
**When to use:** Tuning level fractions, thresholds and calibration without re-posing in front of a camera.
**Trade-offs:** Masks are large; store as run-length encoded rows. Fixtures contain body silhouettes: keep them out of any public repo unless the team members consent.

## Data Flow

### Scan flow

```
User input (consent, height)
    ↓
scanController ──start──► camera ──video──► frameLoop ──frame──► pose.detect
    ▲                                                              │
    │                                                    FrameObservation (px, mask)
    │ effects                                                      ▼
scanMachine ◄── events ◄── quality(obs) ── ok? ──► capture session buffers per-frame measure(obs, scale)
    │                                                              │ N stable frames
    ▼                                                              ▼
store.scanState ──► ui/capture (+overlay)           aggregate -> calibrate -> BodyMeasurements
                                                                   ▼
                                           ui/review (user corrects) ──► storage.saveProfile
```

### Shop flow (no camera)

```
profile.measurements + profile.fitPreference ──┐
catalog.getGarment(id) + chosen size ──────────┼─► fit.evaluate(...) ─► FitResult
fitConfig ─────────────────────────────────────┘          │
                                                           ├─► ui/result (t(reason.code, params))
                                                           └─► storage.appendHistory
```

### State management

```
store {profile, scan, selected, locale}
   ↓ subscribe          ↑ dispatch(event) -> reducers (scanMachine, small setters)
 ui/* render           platform/storage persists profile/history on change
```

### Key data flows

1. **Pixels to centimetres:** raw frame -> pixel landmarks + mask -> per-view `cmPerPx` -> widths/depths -> ellipse -> calibrate -> cm with spread. Data only gets "more metric" going down; nothing flows back up except quality feedback.
2. **Correction loop:** review edits write `cm` and keep `scannedCm`. History of the gap between them is also the cheapest ongoing accuracy signal.
3. **Locale:** profile locale -> `i18n.t` -> UI only; core is language-free.

## Scalability Considerations

This is a single-user, on-device app; "scale" means device tiers and data size, not server load.

| Concern | Strong laptop/phone | Low-end phone | Later, if a backend appears |
|---------|--------------------|---------------|-----------------------------|
| Inference cost | `heavy` model, ~10-15 fps capture | Throttle to ~5 fps, use `full`/`lite`, fewer averaging frames | Server inference only with explicit consent change |
| Mask memory | Copy only during `hold`, release buffers after `compute` | Same, plus downsample if needed | n/a |
| Storage | A few KB in localStorage | Same | Move to an account store; the `storage` adapter is the seam |
| Catalog size | A handful of garments in a JS module | Same | Swap `getCatalog()` to `fetch` |

First bottleneck: GPU-to-CPU mask readback and `heavy` model init time on phones. Second: orientation/resolution variability across phone browsers.

## Anti-Patterns

### Anti-Pattern 1: Measuring in normalised coordinates or on mirrored images
**What people do:** Subtract landmark `x`/`y` straight from MediaPipe and scale by one factor; compute on the flipped canvas.
**Why it's wrong:** Non-square frames distort distances; left/right swaps; guides and data disagree.
**Do this instead:** Pixel coordinates from raw frames; mirror only in the view.

### Anti-Pattern 2: Measuring from a single frame
**What people do:** Capture on the first frame that detects a body.
**Why it's wrong:** Landmark and mask jitter alone is centimetres; the first frame is often mid-motion.
**Do this instead:** Gate on stability, collect N frames, median plus spread, show spread to the user.

### Anti-Pattern 3: One scale for both views
**What people do:** Compute cm/px once on the front view and reuse for the side view.
**Why it's wrong:** The user steps and turns; distance changes, so cm/px changes.
**Do this instead:** Compute cm/px per view from that view's own silhouette height and the typed height.

### Anti-Pattern 4: Strings, DOM or storage inside logic
**What people do:** Fit and quality functions return display text, read `localStorage`, or touch `document`.
**Why it's wrong:** Untestable, not bilingual, can't be replayed.
**Do this instead:** Codes and numbers out of core; adapters and UI do the rest.

### Anti-Pattern 5: Keeping the old state names and flags
**What people do:** Add `capturing_front` next to `STATE_SCANNING`, `trackingActive`, `hasBypassed`.
**Why it's wrong:** Booleans and states drift out of sync (already seen in `ar.js`); "scanning" now means two things.
**Do this instead:** One reducer, one state value, camera lifecycle derived from state.

### Anti-Pattern 6: Hard-coding fit rules in the UI or in size chart literals
**What people do:** `if (chest > 98) return 'L'`.
**Why it's wrong:** Not tied to the chart, preference or cut; cannot explain a verdict.
**Do this instead:** Charts as data, ease windows in `fitConfig`, one `fit.evaluate`.

### Anti-Pattern 7: Persisting captured images or masks
**What people do:** Keep frames "for retake" or debugging in localStorage/IndexedDB.
**Why it's wrong:** Sensitive body data; contradicts the on-device privacy promise and consent text.
**Do this instead:** Keep frames in memory only until `computing` completes; store derived centimetres only.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) | Self-hosted, pinned; `FilesetResolver` pointed at `vendor/mediapipe/wasm`, model path local | Replaces the legacy `@mediapipe/pose` CDN script. Do not use `@latest`. |
| Browser camera | `getUserMedia` via `platform/camera` | HTTPS or `localhost` only; plan how the demo is served (document `python3 -m http.server` for local, any static HTTPS host for phones) |
| localStorage | `platform/storage` | Versioned, guarded |
| Server / backend | None | By requirement |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| ui <-> app | `store.subscribe` / `dispatch(event)` | UI never calls adapters directly |
| app <-> core | Direct function calls with plain data | Core never calls back |
| app <-> platform | Adapter methods; adapters return data or reason codes | Adapters never import app/ui |
| core/measure <-> platform/pose | Only through `FrameObservation` | Lets pose/segmentation source be swapped |
| core/fit <-> data/catalog | Garment objects passed as arguments | Fit does not import the catalog |
| ui <-> i18n | `t(key, params)` | Only `ui/` imports i18n |

## Suggested Build Order (solo, 1-3 months)

Dependencies drive the order; accuracy risk is front-loaded, and a working demo exists early.

1. **Foundation and risk spike (about week 1-2).** ES-module skeleton, `package.json` with `node --test`, delete GreenWear logic, vendor-pin MediaPipe Tasks Vision, new `platform/camera` (lifecycle done right) and `platform/pose` (with masks), debug page showing live landmarks, mask, and a quick-and-dirty cm/px plus chest width. Start collecting team tape measurements now. Output: first evidence on whether 2-3 cm is plausible, and a fixed `FrameObservation` contract. *Depends on: nothing.*
2. **Fit engine, catalog, profile, i18n (about week 2-4).** `core/sizechart`, `core/fit`, `data/catalog` (placeholder chart, then real ColourBox values), `platform/storage`, `i18n`, plus a **manual-entry** path: type measurements -> choose garment -> verdict and recommended size -> history. Fully testable without a camera. This is the guaranteed-demoable slice and de-risks the capstone if scanning accuracy disappoints. *Depends on: contracts from step 1 (BodyMeasurements only).*
3. **Measurement pipeline v1 (about week 3-6, overlaps step 2).** `geometry`, `mask`, `scale`, `quality`, `measure`, `aggregate`, `calibrate`, with phantom tests first and recorded-session replay once the debug export exists. Iterate level fractions and thresholds against tape data. *Depends on: step 1 data.*
4. **Capture flow (about week 5-7).** `core/scanMachine` (tests first), `scanController`, capture UI and overlay guides, positioning feedback from quality codes, countdown/voice option for rear camera, consent and height screens, error screens. *Depends on: 3 (quality + measure), 1 (camera, pose).*
5. **Review/correct, integration, polish (about week 7-8).** Review screen with correction and "less certain" markers, save to profile, connect scan -> shop flow, history view, delete-my-data, complete Indonesian strings, i18n parity test. *Depends on: 2 and 4.*
6. **Validation and hardening (about week 8-10).** Team tape-measure study, fit calibration coefficients (`data/calibration.js`), freeze, record MAE/max error per measurement, test on actual demo phone(s) and laptop over HTTPS, performance tuning. *Depends on: 3-5; validation data collection should start in step 1 and continue throughout.*

Ordering rationale:
- The fit engine is independent of the camera, cheap, and defines what the measurement stage must deliver (which measurements, which precision), so it can finish while measurement is still being tuned.
- Capture UI before measurement is correct would polish a flow whose outputs change; build it after measurement works on the debug page.
- Calibration is last in time but its harness (debug export + CSV) is first in time.
- If the spike shows the PoseLandmarker mask is too coarse, the contingency (alternate silhouette source behind `getSilhouette`) inserts into step 3 without changing step 2, 4, or 5.

## Sources

- MediaPipe Tasks Vision source, `pose_landmarker.ts`, `pose_landmarker_result.ts`, `pose_landmarker_options.d.ts`, `core/mask.ts` (via Context7 `/google-ai-edge/mediapipe`): API shape, mask lifetime, `getAsUint8Array` readback cost. HIGH.
- Pose landmarker Web guide: https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js (options, `IMAGE`/`VIDEO` modes, world landmarks in metres, `outputSegmentationMasks`). HIGH.
- Pose landmarker overview (model variants, mask output): https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker. MEDIUM (the 256x256 mask size and `heavy` about 27 MB figures come from secondary search summaries; verify locally).
- Smartphone waist/hip circumference estimation (front, side, back images): https://www.nature.com/articles/s41746-023-00909-5. MEDIUM, context for achievable circumference error.
- Body size measurement using a smartphone, shape-model comparison (circle/ellipse/rectangle): https://www.mdpi.com/2079-9292/10/11/1338. MEDIUM, via search summary.
- Single-camera multi-view anthropometric measurement of height and mid-upper arm circumference: https://journals.plos.org/plosone/article?id=10.1371%2Fjournal.pone.0195600. MEDIUM.
- Project files: `.planning/PROJECT.md`, `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/CONCERNS.md`.

---
*Architecture research for: on-device browser body measurement and size-fit*
*Researched: 2026-10-02*
