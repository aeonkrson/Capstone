# Stack Research

**Domain:** On-device (browser-only) body measurement estimation from a front and a side photo, plus clothing size-fit recommendation
**Researched:** 2026-10-02
**Confidence:** MEDIUM-HIGH for tooling and APIs (verified against npm registry, package typings and official docs); LOW-MEDIUM for achievable measurement accuracy (no source verifies 2-3 cm from two phone/webcam photos; it must be proven by the project's own tape-measure validation)

## Headline Recommendations

1. **Use `@mediapipe/tasks-vision` 1.0.1 `PoseLandmarker` with `outputSegmentationMasks: true`.** One model gives the 33 landmarks and a person silhouette from a single pass, which is what the existing prototype is missing. Drop the legacy `@mediapipe/pose` CDN script.
2. **Run it in `IMAGE` mode on a captured still frame, not on the live video stream.** Live video is for guidance only (is the body in frame, is the pose valid). Measurement happens once per view, on a high-resolution frame, ideally the median or average of several stable frames.
3. **Pin and self-host everything** (JS, WASM and `.task` model). Copy the WASM from the pinned npm package, commit the model file with a checksum.
4. **Add Vite 8 and Vitest 5.** Two dev dependencies, no framework. The build gives ES modules, a lockfile, a deployable `dist/` and an HTTPS dev server for phone testing. Vitest covers the pure measurement and size-matching math, which is the product's core value.
5. **Store the profile, measurements and history in `localStorage`** (versioned JSON, try/catch). Never store images. Skip IndexedDB.
6. **Write a ~40-line i18n module** (two JSON dictionaries, `data-i18n` attributes, `Intl` for numbers). Do not add i18next.

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `@mediapipe/tasks-vision` | **1.0.1** (exact pin, no caret; published 2026-07-31) | `PoseLandmarker`: 33 landmarks, metric world landmarks, optional person segmentation mask | Current, maintained Google API. The legacy `@mediapipe/pose` solution has had support ended since 2023-03-01 (its last npm release is 0.5.1675469404, Feb 2023) and is read-only. Tasks Vision ships `PoseLandmarker` with `outputSegmentationMasks`, `detect()` for still images, and a `FilesetResolver` that accepts a local base path for self-hosting. API surface verified in the 1.0.1 package typings (`vision.d.ts`). | HIGH (API), MEDIUM (mask quality) |
| `pose_landmarker_full.task` (float16) | Google-hosted "float16/1", 9,398,198 bytes. Vendored copy only. | Pose + segmentation model bundle | Best size/accuracy trade-off for a still-image capture. `lite` (5.8 MB) is too coarse for measurement. `heavy` (30.7 MB) is the upgrade path if the validation spike shows landmark error is the bottleneck. Model files date from 2023 and are immutable, so vendoring is stable. | HIGH (sizes verified by HTTP HEAD), MEDIUM (full vs heavy choice needs the spike) |
| Vite | **8.3.2** (needs Node `^20.19 \|\| >=22.12`) | Dev server, ES-module bundling, `dist/` for static hosting, `public/` for model assets | Zero-framework vanilla JS is a first-class Vite use case. Fixes the "global scripts in fixed order" and monolith problems in CONCERNS.md. `base: './'` makes `dist/` deployable anywhere. `public/` files are copied as-is, which is the right home for WASM and model files. | HIGH |
| Vitest | **5.0.3** (needs Node `^22.12 \|\| ^24 \|\| >=26`; peer `vite ^6.4 \|\| ^7 \|\| ^8`) | Unit tests for scale conversion, silhouette-width math, ellipse circumference, size matching, storage, i18n key parity | Shares Vite config, runs plain ESM with no setup, and the logic that matters is pure functions. Run in the default `node` environment, no `jsdom` needed. | HIGH |
| Vanilla JavaScript, ES modules | ES2022 | App code | Matches the existing prototype and a one-developer, 1-3 month timeline. No framework: the UI is a linear wizard (profile, front, side, result, catalog, verdict) that does not justify React or Vue. | HIGH |

### Storage

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `localStorage` (native) | n/a | Profile (height, fit preference, language), saved measurements, fit-check history | The data is a few KB of JSON. It is synchronous, already used by the prototype, and needs no dependency. Wrap in `try/catch`, version the key (`sizefit:v1`), and validate on read (CONCERNS.md flags the unguarded `JSON.parse`). | HIGH |
| `navigator.storage.persist()` (native) | n/a | Ask the browser not to evict data | Safari's ITP deletes script-writable storage (localStorage and IndexedDB equally) after 7 days of browser use without interaction on the site, unless installed to the Home Screen. Request persistence after the first save and tell the user data is device-local. | MEDIUM (WebKit tracking-prevention behaviour, secondary sources; detail may have changed) |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `@vitejs/plugin-basic-ssl` | 2.3.0 (peer `vite ^6 \|\| ^7 \|\| ^8`) | Self-signed HTTPS for the dev server | Needed to test the camera from a phone on the LAN: `getUserMedia` requires a secure context, and `http://192.168.x.x` is not one. Pair with `server.host: true`. Expect a one-time certificate warning on the phone. |
| `scripts/vendor-mediapipe.mjs` (about 15 lines, your own) | n/a | Copies `node_modules/@mediapipe/tasks-vision/wasm/{vision_wasm_internal.*,vision_wasm_nosimd_internal.*}` into `public/vendor/mediapipe/wasm/` on `postinstall` | Preferred over `vite-plugin-static-copy` 4.1.1 (needs Node 22+, extra moving part). Skip the `*_module_internal` files unless you call `forVisionTasks(path, true)`. The WASM binaries are about 11 MB each, so gitignore the copies and rely on the lockfile integrity hash. |
| Static host with HTTPS (GitHub Pages, Netlify or Cloudflare Pages) | n/a | Demo deployment | Camera needs HTTPS. Vite's official GitHub Pages workflow (checkout, `npm ci`, `npm run build`, upload `dist`) works as is. Keep `base: './'`. |
| Node | 22.12+ LTS (24 is fine) | Required by Vitest 5 | The dev machine currently reports Node v25.8.1, which satisfies both Vite 8 and Vitest 5. |

### Supporting Libraries

None are required. Add only if the need appears.

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `idb` | 8.0.3 | Promise wrapper for IndexedDB | Only if you later decide to persist capture thumbnails or large blobs. Recommended: never persist images. |
| `i18next` | 26.4.2 | Full i18n framework | Only if you need plurals, interpolation formatting or a third language. For two languages it is overhead. |
| `@playwright/test` | 1.63.0 | Browser end-to-end tests with a fake camera (`--use-fake-device-for-media-stream`) | Optional, only if you have time left. Do not start here. A manual device checklist on one iPhone, one Android and one laptop gives more value in 1-3 months. |
| `onnxruntime-web` | 1.30.0 | Run a different segmentation model (for example a matting model) if MediaPipe masks prove too coarse | Contingency only. Adds 10+ MB of runtime plus model, and a new integration. Decide from the Phase 1 accuracy spike, not up front. |

## How the Measurement Pipeline Maps onto the Stack

This is the part the roadmap needs to treat as research-grade, not plumbing.

| Step | Mechanism | Notes |
|------|-----------|-------|
| Capture | `getUserMedia` with `{ video: { facingMode: "user" \| "environment", width: {ideal: 1920}, height: {ideal: 1080} } }`. Read the real `videoWidth` and `videoHeight`. Grab a still via `canvas.drawImage(video)` or `ImageCapture.grabFrame()`. | Phone rear camera has better optics and less distortion but the user cannot see the screen, so design for a self-timer (countdown and beep) instead of live feedback. Laptop webcams are wide-angle with distortion at frame edges, so keep the body centred and away from the edges. |
| Detect | `PoseLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath, delegate }, runningMode: "IMAGE", outputSegmentationMasks: true, numPoses: 1 })`, then `detect(canvas)`. `numPoses: 1` rejects bystanders poorly, so check the person count in guidance. | Result has `landmarks` (normalised image coordinates, with `visibility`), `worldLandmarks` (metric, hip-centred) and `segmentationMasks` (`MPMask`). Read with `getAsFloat32Array()` or `getAsUint8Array()`. **Call `result.close()` or copy the data**, because masks are only valid inside the callback or until closed. Use the synchronous `detect()` that returns a copy, which is fine at one call per capture. |
| Scale | `cmPerPixel = typedHeightCm / (headTopY - soleY)`, with head top and soles taken from the mask extent (landmarks give only nose and heel or foot points, not the crown or ground). | Typed height should be barefoot height. Both views need their own scale because the user's distance from the camera can differ between photos. |
| Widths and depths | Front mask width at a landmark-defined height (shoulder, chest, waist), side mask depth at the same relative height. | Landmarks locate where to measure. The mask gives the actual body edge. Joint-centre landmarks alone cannot give circumferences (CONCERNS.md). |
| Circumference | Ellipse perimeter (Ramanujan) from front width and side depth, followed by a **per-measurement linear correction fitted on the team's tape-measure data**. | Clothing, hair and arm position bias silhouettes. A fitted correction is a legitimate calibration step and is how published silhouette approaches reach usable error. |
| Result | Plain-object measurements in cm plus a confidence flag per value; user can edit each. | Editing is already a project requirement and is the safety net for estimation error. |

### Landmark indices (BlazePose 33-point topology, MEDIUM confidence: from docs and training knowledge)

Shoulders 11/12, elbows 13/14, wrists 15/16, hips 23/24, knees 25/26, ankles 27/28, heels 29/30, foot index 31/32. Left and right are the person's own sides in unmirrored image space. Do all math on unmirrored coordinates and treat mirroring as display-only.

## Segmentation Options Compared

| Option | Verdict | Reason |
|--------|---------|--------|
| **Tasks Vision `PoseLandmarker` + `outputSegmentationMasks`** | **Use** | Landmarks and mask in one model, one package, one asset. Mask is the "likelihood of each pixel belonging to a detected person" (official docs). |
| Tasks Vision `ImageSegmenter` with `selfie_multiclass_256x256` (16.4 MB; classes: background, hair, body-skin, face-skin, clothes, accessories) | **Contingency / refinement** | The separate clothes versus skin classes could help correct for loose clothing and hair, and is the one thing the pose mask cannot do. Input is 256 x 256 for the whole frame, so run it on a crop around the pose bounding box. Evaluate in the Phase 1 spike only if pose-mask edges prove poor. |
| Tasks Vision `ImageSegmenter` with `selfie_segmenter` (about 250 KB) | Avoid for measurement | Cheap and fast, but built for background blur, not body edges. |
| Legacy `@mediapipe/pose` (`enableSegmentation`) | **Do not use** | End of support 2023-03-01, no new release since Feb 2023, CDN-only loading pattern, and the exact unpinned-CDN fragility CONCERNS.md describes. |
| TensorFlow.js `@tensorflow-models/body-segmentation` 1.0.2 and `pose-detection` 2.1.3 (BlazePose, MoveNet) | **Do not use** | Both last published 2023-10-17. They pull in `@tensorflow/tfjs` 4.22.0 (last publish 2025-01), several backend packages and, for the MediaPipe runtime, the very legacy `@mediapipe/pose ~0.5.0`. Large dependency tree for no capability gain. MoveNet has 17 keypoints with no heel, foot or body mask, which makes it a worse fit. |
| Bigger models (SAM-class, ONNX matting, SMPL fitting) | Out of scope for this timeline | Heavy downloads, long integration, mobile memory risk. Revisit only if the accuracy spike fails. |

## Installation

```bash
# Core (pin exactly: no caret, no tilde)
npm install --save-exact @mediapipe/tasks-vision@1.0.1

# Dev tooling
npm install -D --save-exact vite@8.3.2 vitest@5.0.3 @vitejs/plugin-basic-ssl@2.3.0
```

`package.json` additions:

```json
{
  "type": "module",
  "scripts": {
    "postinstall": "node scripts/vendor-mediapipe.mjs",
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview --host",
    "test": "vitest run"
  }
}
```

Fetch the model once and record its checksum (commit both the file and the checksum):

```bash
mkdir -p "public/vendor/mediapipe/models"
curl -L -o public/vendor/mediapipe/models/pose_landmarker_full.task \
  https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task
shasum -a 256 public/vendor/mediapipe/models/pose_landmarker_full.task > public/vendor/mediapipe/models/SHA256SUMS
```

Load it at runtime with base-relative URLs so it works under any host path:

```js
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
const base = import.meta.env.BASE_URL;                    // "./" with base: "./"
const fileset = await FilesetResolver.forVisionTasks(`${base}vendor/mediapipe/wasm`);
const landmarker = await PoseLandmarker.createFromOptions(fileset, {
  baseOptions: { modelAssetPath: `${base}vendor/mediapipe/models/pose_landmarker_full.task`, delegate: "CPU" },
  runningMode: "IMAGE",
  numPoses: 1,
  outputSegmentationMasks: true,
});
```

Await `createFromOptions` before enabling the capture button and show real download progress. Today's UI hides the loading overlay before the model is fetched (CONCERNS.md).

`vite.config.js` essentials:

```js
import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
export default defineConfig({
  base: "./",
  plugins: [basicSsl()],          // dev only matters; harmless in build
  server: { host: true },
});
```

## Storage Design

- One key, e.g. `sizefit:v1`, holding `{ schema: 1, profile: { heightCm, fitPref, lang }, measurements: { shoulderCm, chestCm, waistCm, torsoCm, armCm, capturedAt, source: "scan" | "edited" }, history: [{ garmentId, size, verdict, at }] }`.
- Validate on read and fall back to defaults. Provide "Delete my data" (clears the key and stops any camera stream). Privacy note and consent screen before camera start (UU PDP context in CONCERNS.md).
- Never write frames, canvases or masks to storage. Release them (`result.close()`, drop canvas references) after computing measurements.
- Migrating the old `greenwear_history` key: ignore and delete it. It has no schema and the content is obsolete.

## i18n Design (English + Indonesian)

- `src/i18n/en.json` and `src/i18n/id.json` flat key-value, `t(key, vars)` with `{name}` substitution, `document.documentElement.lang` set on switch, `data-i18n` and `data-i18n-attr` attributes in HTML, language stored in the profile.
- Default from `navigator.language` (`id*` gives Indonesian, else English), user-switchable.
- Use `Intl.NumberFormat(lang)` for cm values because Indonesian uses a decimal comma (`72,5 cm`).
- Add a Vitest test that both files have identical key sets, and the only plural-sensitive strings (if any) are written plural-neutral.
- Existing Indonesian copy in `index.html` and `js/ar.js` becomes the seed for `id.json`. Indonesian garment-fit wording should be reviewed by a native speaker.

## What to Test with Vitest (and What Not To)

| Test | Why |
|------|-----|
| Scale: pixels to cm from synthetic mask or landmark fixtures | Core of accuracy and trivially regressible |
| Width-at-height and ellipse perimeter against known shapes | Catches off-by-one and orientation errors |
| Left/right and mirror handling (unmirrored math) | Called out in CONCERNS.md |
| Size matching: measurement plus garment size chart plus cut plus fit preference gives verdict and recommended size, including boundary values | The product's answer. Make it table-driven so a size chart can be added without code changes |
| Storage versioning and corrupt-JSON recovery | Documented crash in CONCERNS.md |
| i18n key parity | Cheap and prevents missing strings |
| Do NOT unit-test MediaPipe itself or camera access | Not meaningfully testable in Node. Verify on devices with a manual checklist |

Keep a `validation/` dataset (CSV: subject, tape cm, estimate cm, error) and a script that prints mean and max absolute error per measurement. That is the acceptance evidence for the 2-3 cm claim, and it should be a first-class deliverable, not an afterthought.

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Vite 8 + ES modules | Stay on no-build, CDN `<script type="module">` + import map | If the roadmap forbids any Node tooling. Works for `tasks-vision` (it ships `vision_bundle.mjs`) but you lose the lockfile, tests, the HTTPS dev server and the deployable `dist/`. Not worth it given the project already needs tests for the math. |
| Vitest | Node's built-in `node:test` | Zero-dependency alternative if you decide against Vite. Fine for pure functions, but you give up Vite integration. |
| `localStorage` | IndexedDB via `idb` 8.0.3 or `idb-keyval` 6.3.0 | If you decide to store images or many large records. Not recommended for this app's privacy posture. |
| Custom i18n module | `i18next` 26.4.2 | Third language, pluralisation or translation tooling needs. |
| `full` model | `heavy` (30.7 MB) | If the spike shows landmark error dominates. Costs three times the download and noticeably slower mobile inference. |
| CPU delegate for the segmentation path | GPU delegate | After verifying masks are non-blank on target phones (see Pitfalls). One still frame per view means CPU latency is acceptable. |
| Vite `public/` + postinstall copy | `vite-plugin-static-copy` 4.1.1 | If you prefer config over a script. Requires Node 22+. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@mediapipe/pose` and `@mediapipe/camera_utils` from jsDelivr, unpinned | Unsupported since 2023, unpinned (a CDN update can silently change measurements), no SRI, camera page runs third-party scripts, fails offline | `@mediapipe/tasks-vision` 1.0.1, self-hosted |
| `@mediapipe/tasks-vision@latest` in the CDN WASM path (as shown in Google's docs sample) | Same unpinned-CDN problem. Also the JS version and the WASM version must match | Exact version in `package.json`, WASM copied from that same package |
| The nightly `1.1.0-rc.*` builds | Release candidates published daily, no stability guarantee | `1.0.1` |
| TF.js `body-segmentation` or `pose-detection` | Not updated since Oct 2023, heavier, depends on legacy MediaPipe for one runtime | Tasks Vision |
| MoveNet | 17 keypoints, no mask, no heel or foot points, so no ground contact for scale | BlazePose via `PoseLandmarker` |
| Live-video `VIDEO` mode with smoothing for the measurement itself | Temporal smoothing is tuned for display; measurement wants a deliberate still frame | `IMAGE` mode on captured frames, with median over a few stable frames |
| `poseWorldLandmarks` as the primary metric source | They are model-inferred 3D in a hip-centred frame, not measured. They do not remove the need for the height scale | Use as a cross-check for limb length, scaled to the typed height |
| Storing captured images or masks | Biometric data. Contradicts the privacy decision | Keep derived measurements only |
| A UI framework (React and so on) | More build and state complexity than the linear wizard needs | Vanilla modules plus a small `setState` and `render` state machine (CONCERNS.md's fix approach) |

## Stack Patterns by Variant

**If the Phase 1 spike shows silhouette error under 2 cm at the shoulder/chest/waist heights:**
- Stay with `PoseLandmarker` mask plus ellipse model plus fitted correction. No extra model.

**If mask edges are fuzzy or clothing dominates (loose tee, hair, arms near the torso):**
- Add `ImageSegmenter` `selfie_multiclass_256x256` on a pose-bbox crop to separate clothes from skin, and require fitted clothing in the capture guidance. Tell users to wear form-fitting clothing, which is the single largest lever on accuracy.

**If iOS Safari returns blank masks or is too slow:**
- Force `delegate: "CPU"`, lower the working resolution (crop to the pose bounding box before inference), and fall back to the manual-entry path (fields already editable).

**If testing on a phone over LAN:**
- Use `vite --host` with `@vitejs/plugin-basic-ssl`, or deploy a preview to a free HTTPS static host.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@mediapipe/tasks-vision@1.0.1` | Its own `wasm/` directory only | JS bundle and WASM must come from the same version. Never mix a CDN JS with a self-hosted WASM or the reverse. |
| `vite@8.3.2` | Node `^20.19.0 \|\| >=22.12.0` | |
| `vitest@5.0.3` | `vite ^6.4 \|\| ^7 \|\| ^8`, Node `^22.12 \|\| ^24 \|\| >=26` | Stricter Node floor than Vite itself. Install Node 22.12 or newer. |
| `@vitejs/plugin-basic-ssl@2.3.0` | `vite ^6 \|\| ^7 \|\| ^8`, Node 18+ | |
| `vite-plugin-static-copy@4.1.1` (optional) | `vite ^6 \|\| ^7 \|\| ^8`, Node `^22 \|\| >=24` | |
| `@tensorflow-models/pose-detection@2.1.3` | `@mediapipe/pose ~0.5.0` (peer) | Reason to avoid: ties you back to the legacy package. |

## Confidence Notes and Open Questions

| Claim | Confidence | Basis |
|-------|------------|-------|
| `tasks-vision` 1.0.1 is the current stable (latest dist-tag), nightlies are 1.1.0-rc.* | HIGH | npm registry, 2026-10-02 |
| `PoseLandmarkerOptions.outputSegmentationMasks`, `MPMask.getAsFloat32Array/getAsUint8Array`, `forVisionTasks(basePath)`, `delegate: "CPU" \| "GPU"` exist in 1.0.1 | HIGH | Read from the package's `vision.d.ts`, Context7 docs from the MediaPipe repo |
| Legacy solutions unsupported since 2023-03-01 | HIGH | MediaPipe README |
| Model sizes: lite 5.78 MB, full 9.40 MB, heavy 30.66 MB, multiclass selfie 16.37 MB | HIGH | HTTP HEAD on storage.googleapis.com |
| Pose mask is coarse relative to a 1080p frame (the model works on a 256 x 256 region of interest per person) | MEDIUM-LOW | Model input shape from official docs; the "coarse mask" consequence is inference, not measured. The spike must verify. |
| GPU delegate returned blank segmentation masks in JS | MEDIUM | GitHub issue #4757, reported on tasks-vision 0.10.4 (Sept 2023); no fix version found. Unknown whether 1.0.1 is affected. Test on target devices, default to CPU. |
| Silhouette-plus-ellipse circumference estimates typically land at roughly 2-6 cm error, worse for loose clothing | LOW | Third-party projects and one arXiv preprint summary (2601.01639); not independently verified. A project doc cites ANSUR-II-based chest and waist ratios of 3.658 and 2.879 times front width for men, which suggests population-ratio shortcuts are what circumference estimates rest on. Treat 2-3 cm as an aspiration to be proven with the team validation set, not an assumption. |
| Safari ITP 7-day cap applies to localStorage and IndexedDB, with a Home Screen exemption | MEDIUM | WebKit tracking-prevention page and secondary sources |
| Vitest 5 requires Node 22.12+ | HIGH | npm `engines` |

**Gaps for phase-specific research:**
- Whether iOS Safari (both browsers on iOS use WebKit) runs `tasks-vision` 1.0.1 with masks acceptably on the team's actual phones. Needs a device spike early, not in the last month.
- Whether `full` or `heavy` is needed. A one-evening benchmark on 3-5 team members will settle it.
- Landmark definitions versus tape-measure definitions (for example landmark 11/12 are shoulder joint centres, not the shoulder tips a tape uses; "torso length" and "arm length" need exact start and end points). Define these before coding and fit correction factors.
- Camera lens distortion and tilt: no easy correction in the browser. Mitigate with guidance (camera at chest height, level, 2-3 m away, body centred) and use the rear camera on phones where possible.

## Sources

- npm registry (queried 2026-10-02): `@mediapipe/tasks-vision` (1.0.1, dist-tags, 1.0.0 published 2026-07-28), `@mediapipe/pose` (0.5.1675469404, Feb 2023), `@tensorflow-models/body-segmentation` 1.0.2 and `pose-detection` 2.1.3 (both 2023-10-17), `vite` 8.3.2, `vitest` 5.0.3, `@vitejs/plugin-basic-ssl` 2.3.0, `vite-plugin-static-copy` 4.1.1, `i18next` 26.4.2, `idb` 8.0.3, `idb-keyval` 6.3.0, `onnxruntime-web` 1.30.0, `@playwright/test` 1.63.0. HIGH.
- Context7 `/google-ai-edge/mediapipe` (PoseLandmarker options and result types, `detect`/`detectForVideo` mask lifetime). HIGH.
- Context7 `/vitejs/vite` (`public/` handling, `base: './'`, dev server options, GitHub Pages workflow). HIGH.
- Package typings `@mediapipe/tasks-vision@1.0.1` `vision.d.ts` and `package.json` (read locally). HIGH.
- https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js (setup, options, segmentation output). HIGH.
- https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker (model bundles, 256 x 256 landmarker input, 33 landmarks, world landmarks). HIGH.
- https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter (segmenter models and classes). HIGH.
- https://github.com/google-ai-edge/mediapipe (legacy solutions end of support notice). HIGH.
- https://github.com/google/mediapipe/issues/4757 (GPU delegate blank segmentation, workaround CPU). MEDIUM.
- https://webkit.org/tracking-prevention/ (ITP storage cap) with secondary articles. MEDIUM.
- https://github.com/raman365/tapeline (browser-only MediaPipe body-measurement project: height-based scale, front width and side depth to ellipse, self-declared estimate accuracy). LOW (single project).
- https://arxiv.org/pdf/2601.01639 (monocular body measurement under weak calibration; error ranges and clothing effects were read through an automated summary). LOW.

---
*Stack research for: browser-based body measurement estimation and size-fit recommendation*
*Researched: 2026-10-02*
