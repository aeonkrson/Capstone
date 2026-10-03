# Phase 1: Foundation and Accuracy Spike - Pattern Map

**Mapped:** 2026-10-02
**Files analyzed:** 47 (new, rewritten or removed; grouped where one pattern covers several)
**Analogs found:** 12 usable analogs / 47. Most new files have no code analog, because D-15 removes the GreenWear code and the research sets a new pattern (ES modules, pure core). The old code is a source of knowledge only. Where it would teach the wrong thing, this document says so.

## How to read this document

The repo has one app (`js/ar.js`, 574 lines, one closure, classic script globals) and it is being deleted. The planner should treat analogs in three classes:

| Class | Meaning | Where used |
|-------|---------|------------|
| **KNOWLEDGE** | Behaviour to re-implement in a new module. Copy the idea, not the code. | Camera start, permission-denied panel, frame-loop throttle, mirror and skeleton toggles |
| **STYLE** | Copy literally: formatting, naming, CSS, data annotation habits | `CLAUDE.md` conventions, `css/style.css` camera panel, `js/products.js` unit comments |
| **NEW PATTERN** | No analog. Follow `.planning/research/ARCHITECTURE.md` (functional core, imperative shell) | `src/core/*`, `src/platform/*`, tests, validation docs |

### Tooling reconciliation (read first, affects every new file)

STACK.md (Vite + Vitest, `import.meta.env`, bare `@mediapipe/tasks-vision` import) and ARCHITECTURE.md (no bundler, `node --test`, root `vendor/`) disagree. `.planning/research/SUMMARY.md` lines 68-81 resolves it. Phase 1 must follow the SUMMARY resolution:

- Tests: `node --test`, files `test/**/*.test.js`, explicit `.js` extensions on every relative import. No Vitest.
- Vite 8.3.2 + `@vitejs/plugin-basic-ssl` 2.3.0 are a **dev convenience only** (HTTPS on the LAN for the phone).
- Guardrail so the app also runs on `python3 -m http.server`: plain ES modules, relative imports only, **no `import.meta.env`, no bare-specifier imports in `src/`**. This means the STACK.md snippet (`import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision"` and `import.meta.env.BASE_URL`) must NOT be copied. Import the vendored `vision_bundle.mjs` by relative path from `src/platform/pose.js` and build the WASM and model URLs relative to the page (`./vendor/mediapipe/...`). SUMMARY line 78 says to verify in Phase 1 that `vision_bundle.mjs` imports cleanly unbundled and under Vite.
- Open detail for the planner: root `vendor/` (ARCHITECTURE, works with both servers) versus `public/vendor/` (STACK, Vite only). Recommend root `vendor/` so the plain static server path keeps working. Note that Vite does not copy root `vendor/` into `dist/`, so the deploy step is a later concern (Phase 5), not Phase 1.
- Whether `.task` and WASM are committed or copied by a postinstall script is a Phase 1 detail. Record SHA-256 either way.

## File Classification

Files are grouped by area. "Analog" names the closest existing file; "Class" is from the table above.

### A. Removal and repo hygiene

| File | Role | Data Flow | Closest Analog | Class |
|------|------|-----------|----------------|-------|
| `js/ar.js`, `js/api.js`, `js/products.js`, `js/main.js` (delete) | controller/service/data | n/a | n/a | removal (D-15) |
| `assets/cotton_tee_*.png`, `assets/linen_shirt_*.png` (delete) | static asset | n/a | n/a | removal (3 MB of GreenWear overlays) |
| `FILES.md`, `README.md` (rewrite) | doc | n/a | `FILES.md` (wrong after removal) | rewrite |
| `.gitignore` (modify) | config | n/a | `.gitignore` (4 lines) | extend |
| `css/style.css` (commit or discard the 2-line deletion first, then trim) | style | n/a | `css/style.css` lines 1-200 | STYLE |

### B. Tooling and vendored model

| File | Role | Data Flow | Closest Analog | Class |
|------|------|-----------|----------------|-------|
| `package.json` | config | n/a | none | NEW PATTERN (STACK.md lines 93-106 with SUMMARY edits) |
| `vite.config.js` | config | n/a | none | NEW PATTERN (STACK.md lines 133-143) |
| `scripts/vendor-mediapipe.mjs` (optional, if copying instead of committing) | utility | file-I/O | none | NEW PATTERN |
| `vendor/mediapipe/{vision_bundle.mjs, wasm/*, models/pose_landmarker_full.task, models/SHA256SUMS}` | vendored asset | file-I/O | none | NEW PATTERN |

### C. Pure core (`src/core/`, no DOM, no browser globals)

| File | Role | Data Flow | Closest Analog | Class |
|------|------|-----------|----------------|-------|
| `src/core/landmarks.js` | utility (index constants) | transform | `js/ar.js` 436-439, 505 (hard-coded 11/12/23/24) | KNOWLEDGE (name the constants instead of magic numbers) |
| `src/core/geometry.js` (dist, median, mad, ellipse perimeter) | utility | transform | none | NEW PATTERN |
| `src/core/mask.js` (bbox, row runs, torso run at row) | utility | transform | none | NEW PATTERN |
| `src/core/scale.js` (cm per px from typed height) | utility | transform | none | NEW PATTERN |
| `src/core/measure.js` (first shoulder and chest readings, spec registry) | service | transform | `js/ar.js` 435-452 (shoulder distance in pixels) | KNOWLEDGE + NEW PATTERN |
| `src/core/height.js` (validate typed height, CAPT-01) | utility | request-response (validate) | none | NEW PATTERN (reason codes) |
| `src/core/sizeFromTape.js` (D-12 tape bust to size rule on plain tee chart) | utility | transform | none | NEW PATTERN |

### D. Data (`src/data/`)

| File | Role | Data Flow | Closest Analog | Class |
|------|------|-----------|----------------|-------|
| `src/data/colourboxCharts.js` (plain, fitted, boxy-unconfirmed) | model/data | static | `js/products.js` lines 1-20 | STYLE (plain object literals, inline unit comments) |

### E. Platform adapters (`src/platform/`)

| File | Role | Data Flow | Closest Analog | Class |
|------|------|-----------|----------------|-------|
| `src/platform/camera.js` | adapter | streaming | `js/ar.js` 289-325 | KNOWLEDGE (and fix its bugs) |
| `src/platform/frameLoop.js` | adapter | streaming | `js/ar.js` 373-386 | KNOWLEDGE |
| `src/platform/pose.js` | adapter | request-response | `js/ar.js` 357-371 | KNOWLEDGE (library and pattern differ) |

### F. UI, i18n, entry

| File | Role | Data Flow | Closest Analog | Class |
|------|------|-----------|----------------|-------|
| `index.html` (rewrite) | page shell | n/a | `index.html` lines 27-80 (camera panel, cover, loading, fallback) | STYLE for markup conventions; drop script tags |
| `src/main.js` | bootstrap | event-driven | `js/ar.js` 534-570 (hook up buttons) | KNOWLEDGE |
| `src/ui/heightForm.js` | component | request-response | none | NEW PATTERN |
| `src/ui/debugView.js` (landmarks, silhouette, readings, mirror and skeleton toggles, optional export) | component | streaming render | `js/ar.js` 389-433, 503-531, 550-564 | KNOWLEDGE |
| `src/i18n/en.js`, `src/i18n/id.js`, `src/i18n/index.js` | utility/data | transform | `index.html` and `js/ar.js` Indonesian strings (seed only) | NEW PATTERN |

### G. Tests

| File | Role | Data Flow | Closest Analog | Class |
|------|------|-----------|----------------|-------|
| `test/core/*.test.js` (height, geometry, mask, scale, measure, sizeFromTape) | test | transform | none (no tests exist) | NEW PATTERN |
| `test/i18n.parity.test.js` | test | transform | none | NEW PATTERN |
| `test/data/colourboxCharts.test.js` (optional: monotonic sizes, 4 cm step) | test | transform | none | NEW PATTERN |

### H. Validation and decision documents (not code)

| File | Role | Data Flow | Closest Analog |
|------|------|-----------|----------------|
| `validation/PROTOCOL.md` (tape protocol, each value taken twice, D-10) | doc | n/a | none |
| `validation/DEFINITIONS.md` (shoulder and bust definitions, tape level, D-08) | doc | n/a | none |
| `validation/PASS-CRITERIA.md` (written before data, includes tape-to-size rule and 4 cm per size step) | doc | n/a | none |
| `validation/readings.csv` (anonymous IDs S1-S3, tape x2, scan, device, clothing label) | data | batch | none (schema in STACK.md line 172) |
| `validation/report.mjs` (mean and max abs error per measurement) | utility | batch | none |
| `validation/GO-NO-GO.md` (measurement set, model variant, targets, waist decision, debug view choice) | doc | n/a | none |
| `validation/DEVICE-CHECKLIST.md` (iPhone, Android, laptop over HTTPS, network-inspector check for PRIV-02) | doc | n/a | none |

## Pattern Assignments

### `src/platform/camera.js` (adapter, streaming)

**Analog:** `js/ar.js` lines 289-325 (KNOWLEDGE only). The old function is a good map of what the camera step must do and a good list of what not to do.

**What to carry over** (`js/ar.js` 289-325): request video with `facingMode`, attach to `<video>`, wait for metadata then size the canvas to the real video size, show a permission-denied panel with a retry action, log only the caught error.

```javascript
// js/ar.js 295-324 (reference, do not copy)
navigator.mediaDevices.getUserMedia({
  video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
  audio: false
})
.then((stream) => {
  activeStream = stream;
  webcamElement.srcObject = stream;
  webcamElement.addEventListener("loadedmetadata", () => {      // BUG: stacks a listener on every retry
    canvasElement.width = webcamElement.videoWidth;
    canvasElement.height = webcamElement.videoHeight;
    ...
  });
})
.catch((err) => {
  console.error("Camera access denied or error:", err);          // keep: log only caught errors
  fallbackUI.style.display = "flex";                             // keep the idea: visible fallback panel
});
```

**Do not copy (documented bugs, `.planning/codebase/CONCERNS.md` lines 54-66):**
- `activeStream` tracks are never stopped. New module: one owner of the stream, `stop()` stops every track and clears `srcObject`; call on `pagehide`, `visibilitychange` (hidden), and before every new `start()`.
- `loadedmetadata` listener added on every call. Use `{ once: true }` or `await video.play()`.
- No stale-start protection. Use a generation counter so a late `getUserMedia` result from an old call stops its own tracks (ARCHITECTURE.md lines 214-216).
- 640x480 ideal is too small for a measurement spike. Ask `ideal` 1280x720 (try 1920x1080), then read the real size from `videoWidth`/`videoHeight` or `track.getSettings()`.
- Every error collapses into "Kamera Ditolak". Branch on `err.name` and return a **reason code** (`denied`, `no-camera`, `busy`, `overconstrained`, `insecure-context`), plus guard `navigator.mediaDevices?.getUserMedia` (ARCHITECTURE.md line 220). The UI maps the code to an i18n key. This also matters because the page may be opened over plain HTTP on a LAN address and fail silently.
- Hidden `<video>` with `display: none` can be paused by iOS Safari (ARCHITECTURE.md line 221). Keep it in layout, visually hidden, with `playsinline muted`. The old CSS `video#webcam { display: none }` (`css/style.css` 61-67) is the wrong pattern for iOS.

**Module shape** (ARCHITECTURE.md line 58): factory returning `{ start, stop, ... }`; imports nothing from `app/` or `ui/`.

---

### `src/platform/frameLoop.js` (adapter, streaming)

**Analog:** `js/ar.js` lines 373-386 (KNOWLEDGE).

```javascript
// js/ar.js 373-386
const fps = 30;
let lastTime = 0;

function renderLoop(time) {
  if (!activeStream || hasBypassed) return;      // BUG: exits permanently; see CONCERNS.md 62-66
  if (time - lastTime >= 1000 / fps) {
    poseInstance.send({ image: webcamElement })
      .catch(err => console.error("Error sending frame to MediaPipe:", err));
    lastTime = time;
  }
  requestAnimationFrame(renderLoop);
}
requestAnimationFrame(renderLoop);
```

**Keep:** rAF-driven loop with a time-based throttle; `console.error("<context>:", err)` on failure.
**Change:**
- Add an in-flight guard: skip a tick if the previous inference has not finished (inference is synchronous in `detectForVideo`, but the guard still protects against re-entrancy).
- Make start and stop explicit and re-entrant (`start()` / `stop()` returning nothing, owning its own `rafId`). Separate "create the model" (once) from "run the loop" (many times). The old `if (poseInstance) return;` at `js/ar.js` 358 is what froze tracking after a bypass and re-enable.
- Prefer `requestVideoFrameCallback` where available, fall back to rAF (ARCHITECTURE.md line 59). Target 10-15 fps during the spike, not 30.

---

### `src/platform/pose.js` (adapter, request-response)

**Analog:** `js/ar.js` lines 357-371 (KNOWLEDGE). Library, API and loading all differ.

```javascript
// js/ar.js 360-371 (legacy, WRONG pattern for the new file)
poseInstance = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`   // unpinned CDN
});
poseInstance.setOptions({ modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
poseInstance.onResults(onResults);                                               // callback style
```

**New pattern** (ARCHITECTURE.md lines 233-245, adjusted by the SUMMARY guardrail):
- Import the vendored bundle by relative path: `import { FilesetResolver, PoseLandmarker } from "../../vendor/mediapipe/vision_bundle.mjs";`
- `FilesetResolver.forVisionTasks("./vendor/mediapipe/wasm")` with a page-relative URL. No CDN, no `import.meta.env`, no `@latest`.
- `PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath, delegate: "CPU" }, runningMode: ..., numPoses: 1, outputSegmentationMasks: true })`.
- Public surface: `createPose({ modelUrl, wasmBaseUrl, variant })` returning `{ detect(videoEl, tsMs, { wantMask }), close() }`.
- `detect` returns a plain **`FrameObservation`**, defined in ARCHITECTURE.md lines 132-140: `{ t, image: {w,h}, lm: [{x,y,z,v}]*33 in PIXELS, world, mask: {w,h,data: Uint8Array} }`. Convert normalised landmarks to pixels (`x * w`, `y * h`) inside the adapter. The old code did the multiplication at draw time (`js/ar.js` 443-447), which is fine for drawing but is the trap for measurement (ARCHITECTURE Anti-Pattern 1).
- Copy the mask out to your own `Uint8Array` (threshold to 0/1) before returning, then call `result.close()` or equivalent. Masks are only valid inside the callback or until closed (STACK.md line 62).
- `await createFromOptions` before enabling the camera or capture UI, and show real loading state. The old UI hid the loading overlay before the model loaded (`js/ar.js` 310 versus 357). Model variant (`full` default; benchmark `heavy`) is passed in, not hard-coded, so the spike can compare.
- Do not enable MediaPipe temporal smoothing for measurement (SUMMARY line 119). `smoothLandmarks: true` in the old options is display-only thinking.
- Running mode: SUMMARY lines 116-119. For the spike, `VIDEO` for live debug view, `IMAGE` for a captured burst. Keep `runningMode` an option.
- Mirroring: the adapter and everything in `core/` see raw, unmirrored image coordinates. Mirroring is draw-time only (see `debugView.js`).

---

### `src/ui/debugView.js` (component, streaming render)

**Analog:** `js/ar.js` lines 389-433 (`onResults`), 503-531 (`drawSkeleton`), 550-564 (toggles). KNOWLEDGE for behaviour, partly STYLE.

**Mirror at draw time (the one worth keeping)** (`js/ar.js` 392-399):

```javascript
canvasCtx.save();
canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
if (isMirrored) {
  canvasCtx.translate(canvasElement.width, 0);
  canvasCtx.scale(-1, 1);
}
canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
// ... draw ...
canvasCtx.restore();
```

**Skeleton drawing (reuse the idea, widen to the landmarks the spike needs)** (`js/ar.js` 503-531): a connection list, `lineWidth = 3`, `arc` joints, null-guard each point. The old list only has `[11,12],[11,23],[12,24],[23,24]`. The spike also needs ankles/heels (27-32) and nose to show how scale is derived.

**Toggle buttons** (`js/ar.js` 550-564): button flips a boolean and restyles itself. Keep as UX, but do not copy the inline `style.borderColor` writes; toggle an `active` class instead (CLAUDE.md "Known Inconsistencies": inline styles).

**Do not copy:**
- Mirror applied twice: the `<video>` has CSS `transform: scaleX(-1)` (`css/style.css` 65) AND the canvas context is flipped (`js/ar.js` 395-398). CONCERNS.md line 28 flags this. Choose one place (canvas only) and keep text and numeric readouts out of the flipped context, drawing them in DOM instead.
- `scanFeedback.innerHTML = "..."` (`js/ar.js` 425). Use `textContent` and a translated string.
- Status via `className = "hud-status active"` per frame (`js/ar.js` 407). Only write to the DOM when the value changes (CONCERNS.md line 145).
- Mutating shared closure flags (`trackingActive`, `hasBypassed`). Pass state in; keep the debug view a function of the latest observation plus two toggles.

**New content for this phase** (no analog): draw the silhouette (mask) as a translucent overlay, print shoulder cm, chest cm, cm per pixel, model variant, inference ms, and delegate. Silhouette and numbers are the evidence the go/no-go needs.

**Debug view form (Claude's discretion, D-discretion item 1).** ARCHITECTURE.md line 361 already describes a `?debug=1` panel in the real app. Recommend that: it avoids a throwaway page and a rewrite, and matches the planned Phase 3-4 seam. Record the choice in `validation/GO-NO-GO.md`.

---

### `src/main.js` (bootstrap, event-driven)

**Analog:** `js/ar.js` lines 534-570 (button wiring), 1-30 (element lookups). STYLE only.

```javascript
// js/ar.js 534-536, 556-557 : naming, double quotes, semicolons, arrow callbacks
startCameraBtn.addEventListener("click", () => {
  initCamera();
});
mirrorBtn.addEventListener("click", () => {
  isMirrored = !isMirrored;
```

**Keep:** `document.getElementById(...)` lookups, DOM variables with a role suffix (`startCameraBtn`, `webcamElement`, `canvasElement`), `if (!el) return;` defensive checks for optional elements.
**Change:** a module (`<script type="module" src="src/main.js">`), no `DOMContentLoaded` wrapper needed (module scripts are deferred), no single closure holding everything. Wiring only: height form, then camera, then pose, then frame loop, then debug view. It is the only file that knows all adapters (ARCHITECTURE `scanController` role, collapsed for Phase 1). Flow order is fixed by CAPT-01: **height must validate before the camera starts**.

---

### `src/core/height.js` (utility, validation)

**Analog:** none in the repo. The old code has no input validation at all (`js/api.js` only checks product existence).

**Pattern to follow:** ARCHITECTURE Pattern 4 (reason codes, not strings) and the error style in `js/api.js` line 14 (explicit failure instead of silent fallback).

```javascript
// Shape to implement (not existing code)
export function validateHeightCm(input) {
  // returns { ok: true, cm } or { ok: false, code: "empty" | "not-a-number" | "too-low" | "too-high" }
}
```

- Success criterion 1 in ROADMAP: reject values like 20 and 400 with a clear message. The planner must set the accepted range explicitly in the plan (for adults a defensible range is roughly 120-220 cm; the range itself is a plan decision, write it down and test the boundaries).
- Accept a decimal comma (`172,5`) because Indonesian input uses it (STACK.md i18n note). Normalise before `Number()`.
- Return a **code**; `src/ui/heightForm.js` maps the code to an i18n key. The core never returns display text (ARCHITECTURE Anti-Pattern 4).
- Test table-driven in `test/core/height.test.js`: empty, whitespace, `abc`, 20, 119.9, 120, 220, 220.1, 400, `172,5`, `172.5`.

---

### `src/ui/heightForm.js` (component, request-response)

**Analog:** none for forms. For markup and class conventions use `index.html` lines 27-80 (STYLE): HTML comments labelling each block, kebab-case ids and classes, `btn btn-primary` buttons, hidden-by-default panels.

```html
<!-- index.html 72-80 : panel structure to imitate -->
<div class="camera-fallback" id="webcam-fallback-ui" style="display: none;">
  <div class="fallback-icon">⚠️</div>
  <h3>Akses Kamera Ditolak</h3>
  <p>Izin kamera diblokir. ...</p>
  <div class="cover-actions">
    <button class="btn btn-primary" id="btn-retry-webcam">Coba Lagi</button>
```

**Change:** no inline `style="display: none;"` (15 of these exist and are listed as a known inconsistency in CLAUDE.md). Use a `hidden` attribute or a `.is-hidden` class. Use `<input type="text" inputmode="decimal">` rather than `type="number"` so the decimal comma works, with a visible `<label>`. Error text goes in an element with `role="alert"` via `textContent`. Strings come from `t()`, not literals.

---

### `src/i18n/en.js`, `src/i18n/id.js`, `src/i18n/index.js` (utility/data, transform)

**Analog:** none for the module. The existing Indonesian copy is a seed for `id.js` (STACK.md line 158). Source strings:

- `index.html` 68-69: `Mengunduh Detektor AR...`, `MediaPipe Pose sedang diinisialisasi`
- `index.html` 75-79: `Akses Kamera Ditolak`, `Izin kamera diblokir. ...`, `Coba Lagi`
- `js/ar.js` 425: `Tubuh tidak terdeteksi. Posisikan badan di tengah.`
- `js/ar.js` 420: `Mencari Tubuh...`

**Pattern (D-16, ARCHITECTURE lines 333-343, STACK lines 152-158):** two flat key dictionaries, `t(key, params)` with `{name}` interpolation, fallback `locale -> en -> key`, locale from `navigator.language` starting with `id`, else `en`. Phase 1 has no switcher and no stored choice (I18N-01/02 are Phase 2). Shape it so Phase 2 only adds a `setLocale` and storage. Set `document.documentElement.lang`.

```javascript
// Shape to implement (flat, dotted keys, param names identical in both files)
export default {
  "height.label": "Your height (cm)",
  "height.error.too-low": "Enter a height of at least {min} cm.",
  "camera.error.denied": "Camera access was blocked. Allow it in your browser settings, then try again."
};
```

- Keep the mixed-language drift out: CLAUDE.md "Known Inconsistencies" lists English strings inside Indonesian screens. Every user-facing string, including the new debug labels, goes through `t()`. Debug-only developer labels (for example `delegate: CPU`) may stay English, but say so in a comment so it is deliberate.
- Numbers shown to the user use `Intl.NumberFormat(locale)` (`72,5 cm`).
- `test/i18n.parity.test.js`: identical key sets, identical `{param}` names per key.
- The old file `index.html` keeps `<html lang="id">`; the new page should set `lang` from the resolved locale at startup.
- Indonesian wording for camera and height messages should be reviewed by a native speaker (STACK.md line 158). Flag as a checklist item.

---

### `src/core/measure.js`, `scale.js`, `mask.js`, `geometry.js`, `landmarks.js` (pure core, transform)

**Analog:** none; only `js/ar.js` 443-452 touches the same maths and shows what to improve.

```javascript
// js/ar.js 443-452 (shoulder distance in canvas pixels)
const scaleX = canvasElement.width;
const scaleY = canvasElement.height;
const dx = (rShoulder.x - lShoulder.x) * scaleX;
const dy = (rShoulder.y - lShoulder.y) * scaleY;
const shoulderDist = Math.sqrt(dx * dx + dy * dy);
```

**Keep:** multiply normalised x and y by the real frame width and height separately before taking distances. This is the one correct habit in the old code, and ARCHITECTURE Anti-Pattern 1 requires it everywhere. In the new code it happens once, in `platform/pose.js`, so `core/` only ever sees pixels.
**Name the constants:** `LM.LEFT_SHOULDER = 11`, `RIGHT_SHOULDER = 12`, `LEFT_HIP = 23`, `RIGHT_HIP = 24`, ankles 27/28, heels 29/30, foot index 31/32 (STACK.md line 70). The old code uses bare indices.
**Purity rule (hard, ARCHITECTURE line 123):** no `document`, `window`, `navigator`, `localStorage`, no `Date.now()`. Enforce with a one-line grep in the test script.
**Scale (STACK.md line 63, ARCHITECTURE line 273):** `cmPerPx = heightCm / (soleY - headTopY)` with head top and sole from the **mask extent**, not from landmarks (BlazePose has no crown point). One scale per view.
**Phase 1 scope for `measure.js`:** only shoulder width and chest (bust) width and depth-to-circumference as a quick, honest baseline (Ramanujan ellipse). Waist is out per D-06. Use the spec registry shape (ARCHITECTURE Pattern 3, lines 381-387) with just two entries so adding waist later is one entry. Shoulder: landmarks 11/12 are joint centres, not the tape's shoulder points; DEFINITIONS.md must say what the scan measures and what the tape measures, and the code must follow the sheet (PITFALLS "definition mismatch").
**Phase 1 does not do** calibration, quality gates or aggregation beyond what the spike needs (Phase 3). If a burst median is used for the spike, put it in `src/core/geometry.js` as `median` and keep it tiny.
**Phantom tests first** (ARCHITECTURE line 350): draw a filled ellipse or rectangle of known size into a `Uint8Array`, assert width and scale to within 0.5 cm.

---

### `src/core/sizeFromTape.js` (utility, transform)

**Analog:** none. Anti-Pattern 6 in ARCHITECTURE.md is the guard: no `if (chest > 98) return "L"` literals.

**Pattern:** a pure function that takes a bust circumference and a chart (data) and returns a size label or `"below-XS"` / `"above-XL"`, so the same function scores both the tape value and the scan value for D-12. The rule itself (nearest size? smallest size whose garment chest is at least bust plus some ease?) is **a Claude's-discretion item that must be written in `validation/PASS-CRITERIA.md` before any data**; code implements the written rule, tests include the boundary values.

Plain tee chart arithmetic to keep in mind (D-01, D-04, D-07): flat chest 47/49/51/53/55 means garment circumference 94/98/102/106/110 cm (flat widths doubled **in one place**, per FEATURES section 6). Each size is 4 cm of circumference apart, so a cm error above about 2 cm can already cross a boundary. Write the rule and the "borderline" band with that step in mind.

---

### `src/data/colourboxCharts.js` (data, static)

**Analog:** `js/products.js` lines 1-20 (STYLE).

```javascript
// js/products.js 10-12 : inline unit and meaning annotations (CLAUDE.md: "Keep those annotations")
waterUsage: 120, // Liters used (vs 2700 standard)
waterSavings: 95, // % savings
```

**Keep:** plain object literals, 2-space indent, double quotes, kebab-case ids, a `// unit and meaning` comment on every numeric field.
**Change:** an ES module with `export const`, not a global `const`.
**Content rules (copy exactly from CONTEXT D-01 and D-02; do not reorder):**
- Plain tee columns: Chest, Bottom, Shoulder, Sleeve length, Armhole, Back length. Fitted tee columns: Chest, Bottom, Shoulder, **Armhole, Sleeve length**, Body length. Use named fields (`armhole`, `sleeveLength`), never positional arrays, so the swapped order cannot be misread.
- Each chart carries `convention: "flat"` and `measuredHow: "assumed flat width, unconfirmed"` (D-04), plus `unit: "cm"` and `audience: "women"`.
- Plain tee `backLength` is a range: store `{ min, max, midpoint, placeholder: true }` (D-05); XS = 54-58, midpoint 56.
- Boxy chart: store the supplied numbers under `status: "unconfirmed"` with a comment that they duplicate the plain chart (D-03) and **must not be used**. Safer still: do not export boxy values as usable data, only as a clearly named `UNCONFIRMED_BOXY` constant that tests assert is not wired into any function.
- No waist field anywhere (D-06).
- Ranges and step: a test asserts chest rises by exactly 2 cm flat per size on plain and fitted (D-07).

---

### `index.html` (page shell, rewrite)

**Analog:** current `index.html` (STYLE only).

**Keep:** `<meta viewport>`, `<link rel="stylesheet" href="css/style.css">`, HTML `<!-- ... -->` comment above each block, `playsinline` on the video, a `video-wrapper` containing `<video id="webcam">` and `<canvas>`, loading and fallback panels.
**Remove (lines 9-11, 109-111):** both jsDelivr `<script>` tags (unpinned, unsupported, `camera_utils` was never used) and the three classic `<script src="js/...">` tags. Replace with one `<script type="module" src="src/main.js"></script>`.
**Remove:** header "GreenWear", catalog drawer, wardrobe drawer, dashboard, scan feedback banner text ("Tag tidak terdeteksi").
**Add:** height form before the camera cover; a debug region shown for `?debug=1`; `data-i18n` attributes (ARCHITECTURE line 343) or text filled from `t()`; `<html lang>` set at startup. Both camera panels stay in layout rather than `display: none` for the video (see camera section).

---

### `css/style.css` (style, trim and extend)

**Analog:** `css/style.css` lines 1-200 (STYLE, literal copy allowed).

**Keep as-is (reusable):** `.camera-panel` (42-53), `.video-wrapper` (55-59), `.camera-bracket` and corner modifiers (77-89), `.camera-hud` / `.hud-status` / `.hud-status.active` / `.hud-btn` (92-130), the shared cover/fallback/loading block (133-173), `.spinner` plus `@keyframes spin`, `.scan-feedback-banner` (187-199, rename if reused as a hint banner).

```css
/* css/style.css 133-146 : the panel overlay pattern to keep */
.camera-disabled-cover,
.camera-fallback,
.camera-loading {
  position: absolute;
  inset: 0;
  background-color: #dddddd;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  z-index: 40;
}
```

**Remove:** dashboard, catalog grid, stat rings, Mix & Match, wardrobe, badges sections (from line 202 on), and the `.workspace-grid` two-column layout assumption if the debug view is below the camera on phones.
**Fix when copying:**
- `video#webcam { display: none; transform: scaleX(-1); }` (61-67): drop the CSS mirror (mirror at canvas draw time only) and use a visually hidden, in-layout video for iOS.
- `.camera-panel { aspect-ratio: 4/3 }` (46): the stream is not always 4:3 and phones are often portrait. Size the canvas from the real stream and use `object-fit: contain` (ARCHITECTURE line 217).
- `canvas#ar-canvas` uses `object-fit: cover` (72): on a canvas this crops edges, which hides exactly the head and feet the scale needs. Use `contain`.
**Conventions to keep (CLAUDE.md):** plain CSS, no custom properties, kebab-case component-prefixed classes, `rem` spacing, one `/* Section */` comment per block in page order, one `@media (max-width: 768px)` breakpoint. New state modifiers chain classes (`.hud-btn.active`).
**Pending change in the working tree:** two deleted comment lines (`git diff css/style.css`). Commit or discard before the rewrite, per CONTEXT "Integration Points".

---

### `package.json`, `vite.config.js`, `.gitignore`

**Analog:** `.gitignore` for format (STYLE); everything else NEW.

```
# .gitignore (existing, 4 entries)
.DS_Store
.gemini/
.agents/
GreenWear*.pdf
```

**Add:** `node_modules/`, `dist/`, and the decision on `vendor/mediapipe/wasm/` (about 11 MB per binary, STACK.md line 40: gitignore the copies if a postinstall script produces them, or commit them if the plain static server path must work after a bare `git clone`). Note the PRIV-02 rule: also add a pattern that keeps any exported session or image files out of git (D-14: numbers only, no images).
**`package.json`:** `"type": "module"`, scripts `dev` (`vite --host`), `build`, `preview`, `test` (`node --test`), optionally `postinstall`; exact pins, no carets (`--save-exact`, STACK.md lines 87-91). Drop `vitest` from the STACK snippet. Node 22.12+ is fine on the dev machine (25.8.1).
**`vite.config.js`:** from STACK.md lines 133-143 (`base: "./"`, `basicSsl()`, `server.host: true`). Keep it free of aliases and `import.meta.env` use so the app does not depend on it.

---

### Tests (`test/**/*.test.js`)

**Analog:** none; the repo has no tests (`.planning/codebase/TESTING.md` exists but describes absence). Use Node's built-in runner.

```javascript
// Shape to follow (node:test, explicit .js extension, no framework)
import { test } from "node:test";
import assert from "node:assert/strict";
import { validateHeightCm } from "../../src/core/height.js";

test("rejects 20 cm", () => {
  assert.deepEqual(validateHeightCm("20"), { ok: false, code: "too-low" });
});
```

Style: 2-space indent, double quotes, semicolons. Table-driven cases for boundaries. Core imports must be Node-importable, so no browser globals at import time. Do not test MediaPipe or the camera (STACK.md line 170); cover those with `validation/DEVICE-CHECKLIST.md`.

---

### Validation and decision documents (`validation/*`)

**Analog:** none for docs. Use these as the spine, in this order (D-12 and success criterion 4 require pass criteria **before any data**):

1. `DEFINITIONS.md`: shoulder (what the tape measures, what the scan measures, offset), bust (fullest point, tape level, D-08), stance, breathing state, clothing label "everyday" (D-11).
2. `PROTOCOL.md`: women on the team only (D-09), each value taken twice, self or helper (D-10), barefoot height, camera height and distance, device, anonymous IDs S1-S3 (D-14), no images committed.
3. `PASS-CRITERIA.md`: shoulder about 2.5 cm mean absolute error, no single miss above about 4 cm (D-13, SUMMARY line 25); bust decided by **size agreement** with the written tape-to-size rule (D-12); cm error logged but not deciding; 4 cm per size step stated; result labelled "everyday clothes, N subjects by ID"; no fitted-clothing claims (D-11).
4. `readings.csv` header from STACK.md line 172 extended: `subject, device, clothing, measurement, tape1_cm, tape2_cm, scan_cm, model_variant, delegate, notes`. IDs only.
5. `report.mjs`: prints mean and max absolute error per measurement per device. Plain Node, no dependencies.
6. `GO-NO-GO.md`: measurement set (waist drop confirmation, D-06), model variant (`full` versus `heavy`), accuracy targets, debug-view choice, readings-log method, physical plain-tee measurements (D-04, D-05), boxy chart confirmation status (D-03), iOS Safari result.

Reading-log method (discretion item 2): ARCHITECTURE line 361 already sketches an "export session JSON" button. For 2-3 subjects times a few readings, reading numbers off the screen into `readings.csv` is cheaper than building an export. If an export is built, it must write **numbers only** (no landmarks array, no mask) to respect PRIV-02 and D-14.

---

## Shared Patterns

### Code style (all new JS)
**Source:** `CLAUDE.md` Conventions, confirmed in `js/ar.js` and `js/api.js`.
**Apply to:** every new `.js`/`.mjs` file.
- 2-space indent, double quotes (backticks for interpolation), semicolons, `const`/`let` only.
- camelCase functions and variables, DOM variables with a role suffix, kebab-case ids and classes, `btn-` prefix for buttons.
- Short `//` comments describing intent. JSDoc with `@param` and `@returns` on exported functions, as `js/api.js` 2-6 does:

```javascript
// js/api.js 2-6
/**
 * Simulates fetching product data from a remote server with a 1-second delay.
 * @param {string} id - The product ID to fetch.
 * @returns {Promise<Object>} The product object.
 */
```
New code: add JSDoc to `FrameObservation` consumers and to every exported function in `src/core/` and `src/platform/`. ARCHITECTURE.md line 126 relies on JSDoc typedefs instead of TypeScript.
- Use `.then()/.catch()` or `async/await`? The old code uses `.then()` only. The new code uses `async/await`, which the research assumes for `createFromOptions` and `getUserMedia`. This is a deliberate departure; do not carry the `.then()` chain style forward.

### Error handling
**Source:** `js/api.js` line 14 and `js/ar.js` 318-324, 381.
**Apply to:** `camera.js`, `pose.js`, `frameLoop.js`, `main.js`.

```javascript
// js/api.js 14 : create real Error objects with context
reject(new Error(`Product not found: ${id}`));
// js/ar.js 319 : log only caught errors, with a context prefix
console.error("Camera access denied or error:", err);
```
Keep: log only caught errors, with a context prefix. No debug or info logging (CLAUDE.md). Add: adapters return **reason codes** to the app layer, which maps them to `t()` keys. Core returns codes and numbers only, never strings.

### Defensive DOM checks
**Source:** CLAUDE.md "Error Handling" (`if (!drawer) return;`, `if (grid) ...`).
**Apply to:** `src/ui/*`, `src/main.js`. Optional elements (debug region, toggles) are checked before use. Use `textContent`, never `innerHTML`, for anything derived from input or measurements (`js/ar.js` 425 is the counter-example).

### Privacy (PRIV-02)
**Source:** ROADMAP success criterion 3, STACK.md lines 149-150, ARCHITECTURE Anti-Pattern 7.
**Apply to:** `pose.js`, `debugView.js`, `main.js`, any export.
- Frames, canvases, masks and landmark arrays are never written to `localStorage`, IndexedDB, files, or the network. Drop references after use and call `close()` on results.
- Nothing is uploaded. The only network requests are same-origin static files. Verify with the browser network inspector and record it in the device checklist.
- `validation/readings.csv` holds numbers under S1-S3 only; no photos in the repo (D-14).

### Camera lifecycle
**Source:** CONCERNS.md lines 54-66 (what the old code got wrong).
**Apply to:** `camera.js`, `frameLoop.js`, `main.js`. Stream stopped on `pagehide`, `visibilitychange`, retry, and error; listeners registered once; frame loop re-startable; model created once and independent of loop start.

### Unmirrored maths, mirrored display
**Source:** ARCHITECTURE.md lines 162-165, CONCERNS.md line 28.
**Apply to:** `pose.js` (raw pixels out), `core/*` (raw pixels in), `debugView.js` (flip only at draw time, text never drawn in a flipped context).

### Strings
**Source:** D-16, ARCHITECTURE lines 333-343.
**Apply to:** every user-visible string in `index.html`, `heightForm.js`, `debugView.js`, camera messages. All via `t()`, both languages present from the first commit.

## No Analog Found

Planner should use ARCHITECTURE.md, STACK.md and SUMMARY.md patterns for these.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/core/geometry.js`, `mask.js`, `scale.js`, `measure.js`, `height.js`, `sizeFromTape.js` | pure core | transform | No pure, testable code exists in the repo |
| `src/platform/pose.js` (new API) | adapter | request-response | Legacy `@mediapipe/pose` is a different API and an unpinned CDN; only the setup flow carries over |
| `src/i18n/*` | utility | transform | Old strings are hard-coded inline; only the Indonesian wording is reusable |
| `src/ui/heightForm.js` | component | request-response | No forms or validation exist |
| `package.json`, `vite.config.js`, `scripts/*`, `vendor/*` | tooling | file-I/O | No build, package or vendor setup exists |
| `test/**` | test | transform | No tests exist |
| `validation/*` | docs/data | batch | No validation material exists; schema from STACK.md line 172 |

## Anti-patterns in the existing code (do not propagate)

| Old pattern | Where | Why it is wrong for Phase 1 | Replacement |
|-------------|-------|------------------------------|-------------|
| One `DOMContentLoaded` closure holding all state | `js/ar.js` 1-574 | Untestable, the cause of the stale-flag bugs | Small modules, pure core, state passed in |
| Classic `<script>` globals and fixed load order (`PRODUCTS`, `window.api`) | `index.html` 109-111, `js/api.js` end | Coupling to script order, no tests | ES modules with explicit imports |
| Unpinned jsDelivr `@mediapipe/pose` and `camera_utils` | `index.html` 10-11, `js/ar.js` 361 | Unsupported since 2023, silent version drift, no SRI | Self-hosted `@mediapipe/tasks-vision` 1.0.1 |
| Booleans plus state constants (`hasBypassed`, `trackingActive`, `STATE_*`) | `js/ar.js` 26-37 | They drift out of sync (ARCHITECTURE Anti-Pattern 5) | Camera lifecycle derived from one value; Phase 4 adds the real reducer |
| Stream never stopped, listener stacking | `js/ar.js` 304-316 | Camera light stays on, repeated handlers | One stream owner with `stop()`, `{ once: true }` |
| Mirror in CSS and on canvas | `css/style.css` 65, `js/ar.js` 395 | Double flip, left-right confusion | Mirror at canvas draw time only |
| `innerHTML` and inline `style="..."` | `js/ar.js` 425, `index.html` (15 places) | Not translatable, hard to maintain | `textContent`, CSS classes |
| Simulated latency in a mock API | `js/api.js` | Not needed in this phase | Delete |
| Hard-coded landmark indices | `js/ar.js` 436-439, 505 | Unreadable | Named constants in `core/landmarks.js` |

## Open decisions the planner must resolve (not decided by research)

1. `vendor/` at repo root versus `public/vendor/` (see Tooling reconciliation). Recommended: root.
2. Commit WASM and model or copy on `postinstall`. Either way record SHA-256.
3. Debug view as `?debug=1` in the real app versus a separate page. Recommended: `?debug=1`.
4. Reading-log method: screen-to-CSV versus numbers-only export button. Recommended: screen-to-CSV unless the reading count is high.
5. Accepted height range and decimal-comma handling (CAPT-01).
6. The written tape-bust-to-size rule (D-12) and the borderline band. Must be in `PASS-CRITERIA.md` before the first reading.
7. Whether `vision_bundle.mjs` imports cleanly unbundled and under Vite (SUMMARY lines 78, 353). Verify first; it determines the `pose.js` import line.

## Metadata

**Analog search scope:** `js/`, `css/`, `index.html`, `assets/`, `.gitignore`, `FILES.md`, `.planning/research/{STACK,ARCHITECTURE,SUMMARY}.md`, `.planning/codebase/CONCERNS.md`, `.planning/ROADMAP.md`
**Files scanned:** 14 (read: `js/ar.js` 285-574, `js/api.js` 1-26, `js/products.js` 1-28, `index.html` 1-80, `css/style.css` 1-200, plus the planning documents). No `test/`, `validation/`, `src/` or `scripts/` directories exist yet.
**Pattern extraction date:** 2026-10-02
