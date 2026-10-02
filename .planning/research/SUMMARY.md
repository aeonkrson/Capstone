# Project Research Summary

**Project:** Size Fit Scanner (working title; formerly GreenWear)
**Domain:** On-device, browser-based body measurement from a front and a side photo, plus clothing size-fit recommendation (tops, ColourBox, EN + ID)
**Researched:** 2026-10-02
**Confidence:** MEDIUM (tooling and APIs HIGH; achievable measurement accuracy LOW-MEDIUM until the team's own tape-measure data exists)

## Accuracy Feasibility Verdict (read first)

**The stated target of "about 2-3 cm against tape for all measurements" is not supported by the research as a blanket target.** With this pipeline it is plausible for one measurement, borderline for another, and unrealistic for the rest. The pipeline is a single front image and a single side image, MediaPipe landmarks plus a mask, typed height, and no trained shape model.

| Measurement | Within 2-3 cm of tape? | Evidence and reason | Role in v1 |
|---|---|---|---|
| Shoulder width | Likely (best published method 0.5-1.3 cm) | Linear distance in the frontal plane, no circumference model. Caveat: BlazePose points 11/12 are joint centres, not the shoulder points a tape uses (1-3 cm offset). Define the tape and the code on the same rule | Accuracy-claimed |
| Chest circumference | Unreliable. Expect about 3-5 cm typical, occasional 6+ cm | Best trained ML on real images is about 2.9-3 cm. A hand-built ellipse is biased low on rectangular torsos (about 6 cm in a worked example). Clothing and arms bias it high | Primary fit driver, shown with an error band, judged by size agreement |
| Arm length | About 50/50 | Linear, but joint-centre offsets and elbow bend. No published browser-pose figure | Editable estimate, low verdict weight |
| Torso length | No, unless redefined | Tape points (C7, hem) are not BlazePose outputs. Published error 2.6-7.3 cm | Editable estimate, low verdict weight |
| Waist | No (published 6-25 cm spread; trained models about 1.6-2.2 cm in minimal clothing) | Soft tissue, no landmark, clothing drapes loosely | Drop from v1 |

Two facts make this matter for the product, not just the report.
- Adjacent T-shirt sizes differ by about 4-6 cm in chest circumference. The Erigo data in FEATURES.md gives about 4 cm per step. A 3 cm chest error is therefore roughly half a size, and the recommendation will flip near size boundaries.
- The tape reference is only about 0.7-1 cm repeatable for trained measurers and about 1-2 cm for untrained teammates. A "2-3 cm" claim therefore has an uncertainty floor built in.

**Recommended replacement for the requirement.** Fix it in Phase 1, before any data is collected. Use per-measurement pass criteria instead of one blanket number. Suggested starting points:
- Shoulder width: mean absolute error at or below about 2.5 cm, with no single miss above about 4 cm.
- Chest: mean absolute error at or below about 3.5 cm, judged mainly by whether the recommended size matches the tape-derived size or is flagged borderline against it.
- Other measurements: reported as ranges.

Report error per measurement and per device, with fitted and ordinary clothing separate. State that the result applies to N team members identified by ID.

Roadmap implication: make editing and manual entry a first-class path, and show borderline verdicts. That keeps the Core Value ("a fit answer they can trust") true when chest is off by 3-4 cm.

## Executive Summary

This is a client-side computer-vision product with a thin recommendation layer on top. The closest published and open-source analogues build it this way:
- a guided two-view capture (front and side, tight clothing, A-pose, plain background)
- a person silhouette plus landmarks from a pose model
- pixel-to-cm scale from the user's typed height
- widths and depths read from the silhouette at landmark-defined heights
- a circumference model fitted to tape data
- a fit engine that compares body measurements to the garment's own measurements and the user's preferred ease

Research strongly recommends `@mediapipe/tasks-vision` 1.0.1 `PoseLandmarker` with segmentation masks. The legacy `@mediapipe/pose` has been unsupported since 2023. Pin and self-host it. Use vanilla ES modules with no framework, a versioned `localStorage` profile that never holds images, and a home-grown two-language i18n module. Replace the existing GreenWear code rather than refactoring it. Only the camera and pose-setup knowledge carries over.

The recommended approach is "functional core, imperative shell". Everything that matters is a pure function, testable in Node and replayable from recorded sessions: scale, widths, circumference, aggregation, fit verdicts and the capture state machine. Camera, MediaPipe, canvas, storage and DOM are thin adapters.

The fit engine scores against the garment's actual measurements (garment chest = 2 x flat width). It treats user preference as a target ease band. The garment cut label is display and fallback metadata, not an additive term. Verdicts must account for uncertainty: fits, borderline, too tight or too loose, with a recommended size and per-area reasons. The UI never shows false precision.

The main risks are about accuracy and capture conditions:
- promising 2-3 cm for everything
- code and tape using different definitions
- loose clothing (scan in fitted clothes, even though the product is a T-shirt)
- scale errors from distance, tilt and lens distortion
- a biased ellipse model
- coarse masks (a white shirt on a white wall)
- single-frame jitter
- iOS Safari camera behaviour

The mitigation is structural:
- Run an accuracy and device spike in the first two weeks as a go/no-go gate, and fix the measurement set from its result.
- Build the manual-entry and fit slice early, so a demoable product exists whatever the scan accuracy turns out to be.
- Keep tape-measure validation running from week 1, not the last month.

## Where the Researchers Disagreed (and what to do)

Each conflict below has a recommendation and the reason for it.

### 1. Tooling: Vite + Vitest (STACK) vs native ES modules + `node --test` (ARCHITECTURE)

These are two separable decisions.

- **Test runner: use `node --test`, not Vitest.** The logic under test is pure and imports unchanged in Node. Vitest 5 adds a dependency and a stricter Node floor (22.12+) for no capability the project needs. Tests are `test/**/*.test.js` with explicit `.js` import extensions.
- **Dev server and delivery: adopt Vite as a dev/build convenience only, with `@vitejs/plugin-basic-ssl`. It is not an architectural dependency.**
  - The deciding factor is Pitfall 11. `getUserMedia` needs a secure context, phone testing must start in week 1, and `vite --host` with basic-ssl is the cheapest way to get HTTPS on a LAN phone.
  - It also gives a lockfile for the exact MediaPipe pin and a deployable `dist/`.
- **Guardrail that keeps both approaches workable:**
  - Write source as plain ES modules with relative imports. No `import.meta.env`, and no bare-specifier imports in `core/` or `app/`.
  - Load the vendored `vision_bundle.mjs` by relative path from `platform/pose.js`. STACK says the package ships it. Verify in Phase 1.
  - The app then also runs on `python3 -m http.server` or any static host. Vite can be dropped without code changes if it costs more than it saves in week 1.
- Dropped from STACK: Vitest and `vite-plugin-static-copy`.
- Kept: pin and self-host the JS, WASM and `.task` model (both researchers agree). Whether to copy via a postinstall script or commit `vendor/` is a Phase 1 detail. Record checksums either way.

### 2. Measurement set: FEATURES vs ARCHITECTURE vs PITFALLS

- FEATURES: chest, shoulder, torso length, arm length; skip waist.
- ARCHITECTURE: chest, waist, shoulder, torso length; defer sleeve.
- PITFALLS: only shoulder width is likely to meet 2-3 cm; chest 3-5 cm; waist and torso length will not.

**Recommendation: the v1 measured set is chest, shoulder width, torso (body) length and arm (sleeve) length. No waist.**
- Waist is the worst measurement in every source, and a plain T-shirt chart does not need it. FEATURES and PITFALLS agree. ARCHITECTURE listed it only as a starting guess and said the chart decides.
- Keep the measurement spec registry (ARCHITECTURE Pattern 3), so adding waist later is a one-entry change.

Tier the measurements by honesty, not by wishful targets:
- (a) Accuracy-claimed: shoulder width.
- (b) Primary but uncertain, shown with a band and judged by size agreement: chest.
- (c) Editable estimates shown as ranges, with low verdict weight and wide tolerance (garment length and sleeve are style-tolerant on a tee): torso length and arm length.

If the Phase 1 spike shows torso or arm error above about 5 cm, demote them to manual-entry-only. The final set is also gated on the actual ColourBox chart columns. Collect the chart in Phase 1. If the chart lists only chest width and length, shoulder and sleeve stay display-only.

### 3. Phase order: ARCHITECTURE (fit engine second) vs PITFALLS (capture + measurement second, fit third)

Both agree Phase 1 is foundation plus an accuracy spike.

**Recommendation: use ARCHITECTURE's order.** The fit engine and manual-entry slice come second, time-boxed to about two weeks. Measurement-engine work comes third. Reasons:
1. The Phase 1 spike already front-loads the measurement risk. It produces the error numbers the fit engine's uncertainty band needs.
2. The fit engine is pure and camera-independent. It defines which measurements, and what precision, the scan must deliver.
3. The ColourBox chart is an external dependency that needs lead time and blocks fit calibration. Starting that phase early de-risks it.
4. It guarantees a demoable manual-entry product if scan accuracy disappoints. PITFALLS' own scope rule asks for this (vertical slice by the first third, fallback demo).

PITFALLS' concern is that measurement tuning could be starved of time. It is handled three ways: the hard time-box, validation data collection running in parallel from Phase 1, and giving the measurement engine its own phase right after.

One adjustment taken from PITFALLS: the pure capture-quality gates (distance, tilt, arms clear, orientation, stillness) go in the measurement-engine phase, because they determine accuracy. Only the capture state machine, overlay and UX go in the capture-flow phase.

### Smaller disagreements (decide in the Phase 1 spike; defaults given)

- **Running mode.** STACK and PITFALLS prefer `IMAGE` mode on captured still(s). ARCHITECTURE uses `VIDEO` mode with throttling.
  - Default: `VIDEO` (or a light model, no mask, low rate) for live guidance only.
  - Measurement runs `IMAGE` mode on a burst of about 5-15 stable captured frames, aggregated by median plus spread.
  - Do not use MediaPipe's temporal smoothing for measurement.
- **Model variant.** STACK says `full` (9.4 MB) and upgrade to `heavy` (30.7 MB, verified by HTTP HEAD) if landmark error dominates. ARCHITECTURE says `heavy` (quoted at about 27 MB, a secondary figure).
  - Default: benchmark `full` vs `heavy` on 3-5 people in the spike. Use `heavy` for the captured burst only if it measurably helps.
- **Circumference model.** ARCHITECTURE cites the ellipse as the best simple shape model. PITFALLS shows it is biased low on rectangular chests. Both agree on the fix.
  - Use the ellipse (Ramanujan) as a baseline.
  - Add a per-measurement correction or superellipse shape factor fitted on tape data and checked leave-one-person-out.
  - The correction is data, not code.
- **GPU vs CPU delegate.** Default to CPU. It is one still per view. A GPU blank-mask bug was reported on 0.10.4, and its status on 1.0.1 is unknown. Test GPU only if CPU is too slow on target phones.

## Key Findings

### Recommended Stack

The stack is vanilla ES2022 modules and one real dependency: `@mediapipe/tasks-vision` 1.0.1, exact pin. `PoseLandmarker` runs with `outputSegmentationMasks: true`. That gives 33 landmarks, metric world landmarks (cross-check only) and a person mask in one pass. Everything (JS, WASM, model) is self-hosted and pinned. The JS and WASM must come from the same version. See `STACK.md` for versions and install and config snippets.

**Core technologies:**
- `@mediapipe/tasks-vision` 1.0.1 + `pose_landmarker_full.task` (heavy as upgrade path): landmarks plus silhouette. It is the maintained successor to the unsupported legacy `@mediapipe/pose`. Avoid the TF.js wrappers and MoveNet (stale, no mask, no foot points) and the `1.1.0-rc.*` nightlies.
- Vite 8.3.2 + `@vitejs/plugin-basic-ssl` 2.3.0 (dev convenience only, see conflict 1): HTTPS dev server for phone camera testing, lockfile, `dist/`.
- `node --test` (built in): unit tests for the pure core. Node 22.12+ recommended; the dev machine has Node 25.8.1.
- `localStorage` (versioned `{v, data}` envelope, try/catch, in-memory fallback, `navigator.storage.persist()`): profile, measurements, history. Never store images, masks or landmarks. Skip IndexedDB.
- Home-grown i18n (about 40-60 lines, two flat dictionaries, `data-i18n` attributes, `Intl.NumberFormat` for the decimal comma): no i18next. Core emits codes; only `ui/` calls `t()`.
- Contingencies only, decided from the spike: `heavy` model, `ImageSegmenter selfie_multiclass_256x256` on a pose-box crop (separates clothes from skin), `onnxruntime-web` matting model.
- Version numbers come from STACK.md's npm query on 2026-10-02. They were not re-verified in this synthesis.

### Expected Features

**Must have (table stakes):**
- Consent screen before camera (EN/ID), an explicit start action, and a "Delete my data" control. This gates everything.
- Height entry with validation (the scale source). No weight, age or gender inputs.
- Guided front-then-side capture:
  - pictogram or overlay
  - clothing, background and distance checklist
  - live quality checks with plain-language hints
  - countdown or hold-still auto-capture
  - per-view retake and review (in memory only)
  - separate phone and laptop guidance
- Estimated measurements in cm with inline edit, an estimated/edited tag, revert-to-scanned and short how-to-measure help. Tape entry is the same UI with `source: tape`.
- Built-in catalog (one garment, the ColourBox white T-shirt, ready for N garments) with a garment-measurement size chart and a visible cut label.
- Fit preference selector (snug / regular / loose / oversize; default regular).
- Verdict: an overall label (not a bare yes/no) with per-area tight/OK/loose and cm differences, a recommended alternative size, and a borderline / between-sizes flag derived from measurement uncertainty.
- Local profile and fit-check history. Full EN/ID from day one via a string table.
- Camera-denied handling that routes to manual entry.

**Should have (differentiators):**
- Fully on-device processing, stated plainly and truthfully. A self-hosted model makes "images are not uploaded" verifiable.
- Transparent per-area cm verdict scored against actual garment measurements, not letter sizes.
- Confidence / margin indicator computed by re-running the verdict across the error band. No fake percentages.
- Preference side-by-side table (S/M/L per preference). It is cheap once the verdict function exists and is a strong demo moment.

**Defer:**
- v1.x: scan-quality score display, "compare with a tee you own" (also an accuracy cross-check), profile export/import, more garments, TTS guidance (check Indonesian voice support first).
- v2+: bottoms and dresses, multiple profiles, feedback loop, multi-retailer charts, AR/avatar.
- Anti-features to hold the line on:
  - statistical height/weight body estimation as a silent fallback
  - "98% accurate" claims
  - server storage
  - stored raw photos
  - 80+ measurements
  - back view
  - body-shape labels

### Architecture Approach

Replace `js/ar.js` entirely. Use native ES modules in layers with a hard purity rule:
- `core/`: pure, no browser globals, Node-testable.
- `platform/`: camera, pose, frame loop and storage adapters that only produce plain data.
- `app/`: store, router, scan and shop controllers. It is the only layer mixing both.
- `ui/`, `data/` (catalog, fit config, calibration coefficients) and `i18n/`.

The seams are plain data contracts: `FrameObservation` (raw unmirrored pixels), `ViewCapture`, `BodyMeasurements` (with spread) and `FitResult` (with reason codes).

The capture flow is one pure reducer, `(state, event) -> {state, effects}`, which also owns the camera lifecycle. That structurally removes the "camera stays on" bug class. The shop flow is profile-centric and never needs the camera, so returning users skip the scan.

**Major components:**
1. `platform/camera` and `platform/pose`: single owner of the MediaStream (generation tokens, orientation-aware, error classification), and the pinned self-hosted PoseLandmarker returning pixel landmarks plus a copied mask.
2. `core/scale`, `mask`, `quality`, `measure`, `aggregate`, `calibrate`:
   - cm/px per view from silhouette height
   - torso-run width and depth at landmark-defined rows
   - ellipse plus a fitted correction
   - median-and-MAD aggregation over stable frames
   - quality gates that return codes
3. `core/scanMachine`: capture state machine with hysteresis, retake, cancel and error branches.
4. `core/sizechart` and `core/fit`: normalise garment charts, and produce a verdict from ease versus preference window. Both are uncertainty-aware and explainable by reason codes. `data/fitConfig` holds the tunable numbers.
5. `platform/storage`, `core/schema`, `i18n`: versioned profile and history with pure migrations, plus two-language dictionaries with key and param parity tests.

Make the pipeline observable and replayable. A `?debug=1` panel shows quality flags, cm/px and per-frame values and exports session JSON. That feeds recorded-session replay tests and the validation CSV.

### Critical Pitfalls

1. **Blanket 2-3 cm promise.** Run the accuracy spike first (weeks 1-2) on 2-3 people and treat it as go/no-go. Fix the measurement set from it. Pre-define pass criteria per measurement before collecting any data.
2. **Definition mismatch between code and tape.**
   - Write a one-page measurement definitions sheet (start and end points, posture, breathing, tape path). Use it for both the tape protocol and the code.
   - Expect to fit a constant per-measurement offset.
   - The same sign of error for every person signals bias, not noise.
3. **Clothing inflation.**
   - A loose-shirt silhouette is not the body. Require fitted clothing for scanning (the opposite of how the tee is worn).
   - Ask what the user is wearing and widen the band for loose clothing.
   - Validate fitted and ordinary clothing separately.
   - Never claim fitted-clothing accuracy from loose-shirt data.
4. **Scale, distance, tilt and lens errors.**
   - Compute cm/px per view, because the user moves between shots.
   - Require barefoot and no hat.
   - Gate on full body in frame, a distance band, a centred subject and a level camera.
   - Use typed height only as a scale, not `poseWorldLandmarks`.
   - Work in pixel space on unmirrored frames.
5. **Biased circumference and weak segmentation.**
   - Use the ellipse plus a per-measurement correction validated leave-one-person-out.
   - Gate on arms-clear poses, check mask quality, and take a median over frames.
   - Test a white tee on a white wall and in dim light.
   - Mask resolution is the leading accuracy risk. It is reported as 256 x 256, roughly 0.6 cm per pixel. Measure it in the spike.
6. **Mobile browser camera and hands-free capture.**
   - Use HTTPS for testing.
   - Keep the video in layout but visually hidden (not `display:none`), with `playsinline muted`.
   - Re-read dimensions on resize and orientation.
   - Use a countdown with audio for rear-camera capture.
   - Stop tracks on every exit path.
   - Test on a real iPhone, a real Android phone and a laptop from week 1.
- Also in play:
  - body-vs-garment chart confusion (store garment dimensions with `chartType`, verify against a physical shirt; the ColourBox chart is a blocking external dependency)
  - hard verdicts that ignore the error band
  - privacy treated as an afterthought (consent, no image persistence, validation photos kept out of git)
  - tiny-sample validation

## Implications for Roadmap

Suggested phases: six. They front-load the accuracy risk and keep a demoable product available early. Timing assumes 8-10 weeks. If the schedule is one month, cut torso/arm length, polish and the preference table.

### Phase 1: Foundation and Accuracy Spike (about weeks 1-2)
**Rationale:** Everything downstream depends on whether silhouette measurement is feasible on the team's phones and laptops, and on what the measurement set and error band really are. PITFALLS and ARCHITECTURE both put this first.
**Delivers:**
- ES-module skeleton and tooling (conflict 1 resolution), with GreenWear logic removed.
- Pinned self-hosted Tasks Vision (JS, WASM, model, checksums).
- Correct `platform/camera` lifecycle (including iOS) and `platform/pose` with masks.
- A debug page showing landmarks, mask, cm/px and a quick chest and shoulder width.
- The one-page measurement definitions sheet and tape-measure protocol.
- Pre-defined per-measurement pass criteria.
- Validation CSV and error-report script, with data collection started on 2-3 people.
- The ColourBox size chart requested and collected.
- A fixed `FrameObservation` contract.
- A decision gate at the end: confirm the measurement set, model variant and silhouette source (or the `getSilhouette` swap), and rewrite the accuracy requirement.

**Addresses:** basic height entry, camera permission handling, privacy groundwork (CSP, no image persistence).
**Avoids:** Pitfalls 1, 2, 5, 11, 12, 15, 16.
**Stack:** `tasks-vision` 1.0.1, Vite dev server (HTTPS), `node --test`.

### Phase 2: Fit Engine, Catalog, Profile, i18n and Manual-Entry Slice (about weeks 2-4, time-boxed to about two weeks)
**Rationale:** It is pure and camera-independent, and it defines what the measurement stage must deliver. It produces a demoable product (type measurements, pick garment and size, get a verdict, recommended size and history) that de-risks the capstone if scan accuracy disappoints.
**Delivers:**
- `core/sizechart` and `core/fit`:
  - garment chest = 2 x flat width
  - preference ease windows
  - cut as display and fallback
  - per-area status
  - borderline from the error band
  - recommended size across all sizes
  - reason codes
- `data/catalog` with the real ColourBox chart. Placeholders are clearly marked until it is collected, and the values are verified against a physical shirt. Includes `validateGarment`.
- Versioned `platform/storage` with migrations, profile, history and delete-my-data.
- The i18n module with an EN/ID parity test, and the string table used from here on.
- Manual-entry and edit UI with `source` tags.
- Verdict UI with per-area chips, an all-sizes row and the preference selector.

**Addresses:** verdict, alternative size, per-area breakdown, fit preference, cut label, local profile, history, EN/ID, edit and tape override.
**Avoids:** Pitfalls 13, 14.

### Phase 3: Measurement Engine (about weeks 3-6)
**Rationale:** This is the research-grade core of the product. Build it on the debug page against recorded sessions before any capture polish. UX built on shifting outputs is wasted effort.
**Delivers:**
- `geometry`, `mask` (torso run, narrowest row) and `scale` (per view).
- `quality` gates (distance, level, arms clear, correct facing, stillness, brightness, single person) returning codes.
- `measure` via the spec registry, `aggregate` (median plus MAD spread) and `calibrate` (fitted corrections as data).
- Phantom-body unit tests and recorded-session replay.
- First calibrated results against tape.
- Repeatability (SD across repeats, target under about 1 cm) measured before bias is tuned.

**Uses:** `PoseLandmarker` IMAGE-mode burst (default from the smaller disagreements), with mask copy-and-close discipline.
**Implements:** the `core/` measurement modules behind the `FrameObservation` seam.
**Avoids:** Pitfalls 4, 5, 6, 7 (gates), 8, 9, 10.

### Phase 4: Guided Capture Flow (about weeks 5-7)
**Rationale:** It needs working quality gates and measurement, and it delivers the user-facing scan.
**Delivers:**
- `core/scanMachine` (tests first) and `scanController`.
- Consent and height screens.
- Front and side overlay or pictogram guides.
- A clothing, background and distance checklist.
- Quality-failure hints (EN/ID).
- Countdown and hold-still auto-capture, and an audio cue for rear-camera hands-free capture.
- Per-view retake and review (memory only).
- Separate phone and laptop guidance.
- Model-loading progress and camera error screens.

**Addresses:** guided capture, quality checks, timer, retake, consent.
**Avoids:** Pitfalls 3, 7, 11 (hands-free and orientation).

### Phase 5: Review, Integration and Polish (about weeks 7-8)
**Rationale:** It connects the scan to the shop flow and finishes the user-facing quality bar.
**Delivers:**
- A review screen with inline correction, "scanned vs your value" and less-certain markers from spread and quality flags.
- The scan -> profile -> verdict flow end to end, and a history view.
- Delete-my-data and the privacy statement, finalised.
- Full Indonesian copy, reviewed by a native speaker.
- An HTTPS demo deployment.
- The preference side-by-side table if time allows.

**Avoids:** Pitfalls 14 (UI side), 15.

### Phase 6: Validation and Hardening (about weeks 8-10; data collection runs from Phase 1)
**Rationale:** It produces the acceptance evidence. Calibration is last in time, but its harness is first in time.
**Delivers:**
- The team tape study per the pre-registered criteria: two measurers, repeated reads, fitted and ordinary clothing, laptop and phone, several lighting setups.
- Leave-one-person-out calibration coefficients frozen in `data/calibration.js`.
- The per-measurement, per-device result table (subject, tape, estimate, error, size agreement).
- A device matrix on a real iPhone, a real Android phone and a laptop over HTTPS.
- A pre-recorded fallback demo for venue failures.
- Validation photos kept out of git, with consent and anonymised IDs.

**Avoids:** Pitfalls 3, 6, 8, 9, 12.

### Phase Ordering Rationale

- Dependencies: scan outputs feed the fit engine, but the fit engine only needs a `BodyMeasurements` contract, so it can precede the real scanner. Capture UX needs working measurement. Calibration needs everything.
- Grouping follows the architecture seams. Pure core work is separated from adapter and UI work, so most of the schedule is testable without a camera.
- Pitfall avoidance: the spike prevents the blanket-accuracy trap, the early manual-entry slice prevents timeline collapse, and the validation harness from week 1 prevents the end-loaded tiny-sample trap.
- Contingencies:
  - If the PoseLandmarker mask is too coarse, the alternative silhouette source goes behind `getSilhouette` inside Phase 3. Phases 2, 4 and 5 are untouched.
  - If chest fails the Phase 1 gate badly (worse than about 4 cm after gates), shift the primary UX to "estimate, then confirm or correct" and keep the scan as a convenience.

### Research Flags

Phases likely needing deeper research during planning (`/gsd:plan-phase --research-phase <N>`):
- **Phase 1:** experiment-driven and device-specific.
  - Tasks Vision 1.0.1 on current iOS Safari: masks, CPU/GPU delegate, orientation.
  - Mask resolution and edge quality, and `full` vs `heavy`.
  - Whether `vision_bundle.mjs` imports cleanly unbundled and under Vite.
- **Phase 3:** the literature gives no direct recipe for chest height, shape factor, torso-run extraction and arm handling. This is tuning against tape data. It is the highest-risk phase.
- **Phase 2 (moderate):** it depends on the actual ColourBox chart, how each dimension is measured, and ease bands for a jersey tee in the Indonesian market. The starting numbers are assumptions to tune on real garments.

Phases with standard patterns (skip research-phase):
- **Phase 4:** the patterns are established (reducer state machine, countdown capture, guidance UI). Thresholds need on-device tuning, which is execution work.
- **Phase 5:** integration, i18n and storage UI are standard.
- **Phase 6:** this is protocol design, not technical research. Define metrics before data.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | API surface and versions verified from npm, package typings and official MediaPipe and Vite docs. Safari storage eviction and the GPU blank-mask issue on 1.0.1 are unverified. Version numbers were not re-checked in this synthesis. |
| Features | MEDIUM | Category patterns are corroborated across several vendor and reference sources. Vendor internals and accuracy claims are marketing. Ease numbers are sewing-reference heuristics to calibrate against the real ColourBox chart. |
| Architecture | MEDIUM | MediaPipe API facts are HIGH. The decomposition is synthesised from standard patterns, with few public reference architectures for this product class. Mask resolution and its effect on accuracy are inference, not measured. |
| Pitfalls | MEDIUM | The direction of the accuracy verdict is consistent across several sources (HIGH). Exact numbers are LOW-MEDIUM and partly come from summarised page fetches. Re-check the original papers before quoting them in the capstone report. |

**Overall confidence:** MEDIUM. Tooling and architecture are solid enough to plan on. The achievable accuracy is unknown until Phase 1 and Phase 6 produce the team's own data.

### Gaps to Address

- **Accuracy on the team's bodies and devices:** unknown by design. Only the Phase 1 spike and the Phase 6 study resolve it. Treat any figure here as a prior, not a result.
- **ColourBox size chart:** which dimensions exist, how each is measured (flat chest width, body length from HPS or other, sleeve from shoulder or neck), stretch and tolerance. It blocks verdict calibration and decides whether shoulder and sleeve are used. Request it in Phase 1 and use clearly marked placeholders until then.
- **Measurement vs tape definitions:** shoulder points, chest row, torso and arm endpoints, posture, breathing. These must exist before coding the engine or collecting data.
- **iOS Safari plus Tasks Vision 1.0.1:** blank masks, delegate choice, orientation handling, and inference speed on the team's actual phones. Run an early device spike, not a last-month check.
- **`full` vs `heavy` and mask coarseness:** a one-evening benchmark on 3-5 people settles it. It also decides whether the `ImageSegmenter` or matting-model contingency is needed.
- **Laptop webcam capture:** there is little vendor precedent. Distance, tilt and lens distortion matter, and OS auto-framing and background effects must be turned off.
- **Ease bands for a jersey cotton tee:** starting values come from sewing references and one retailer data point (Erigo chest 51-59 cm flat, about 12 cm ease on size S for a 90 cm chest). Tune them on real garments and team bodies.
- **Indonesian copy and legal reading:** the EN/ID strings need native-speaker review. The UU PDP treatment of body silhouettes is not legal advice. On-device processing substantially reduces exposure, and the consent wording could be reviewed.
- **Local storage persistence on Safari:** the 7-day ITP cap and the Home Screen exemption are secondary-sourced. If the demo path uses iOS Safari over several days, profile export moves from "nice to have" toward "consider earlier".

## Sources

### Primary (HIGH confidence)
- Context7 `/google-ai-edge/mediapipe`: PoseLandmarker options and result types, mask lifetime, `detect` vs `detectForVideo`
- Context7 `/vitejs/vite`: `public/` handling, `base: './'`, dev server options, GitHub Pages workflow
- `@mediapipe/tasks-vision@1.0.1` package typings (`vision.d.ts`) and `package.json`: option and class surface
- npm registry queried 2026-10-02: versions for `@mediapipe/tasks-vision`, `vite`, `vitest`, `@vitejs/plugin-basic-ssl` and others (per STACK.md)
- https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker and `/web_js`: options, 33 landmarks, world landmarks, segmentation output, model bundles
- https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter: segmenter models and classes
- MediaPipe repository README: legacy solutions end of support 2023-03-01
- HTTP HEAD checks on storage.googleapis.com: model sizes (lite 5.78, full 9.40, heavy 30.66, multiclass selfie 16.37 MB)
- UU PDP text (jdih.komdigi.go.id, Law No. 27 of 2022)

### Secondary (MEDIUM confidence)
- Amazon, 3D body shape and clothing measurements from front and side images (arXiv 2205.14347): real-photo average error 2.92 cm
- MeasureNet, npj Digital Medicine 2023 (PMC10495406): waist MAE 16-22 mm with three views in minimal clothing; loose clothing not modelled
- Smartphone photogrammetric 3D scanning vs Fit3D (arXiv 2608.12827): about 1-1.5 cm vs a depth scanner, with much richer capture
- ISO 20685 and the ANSUR II pilot study: tape and scanner allowable error about 7-9 mm for trained measurers
- Nature smartphone waist and hip circumference estimation (s41746-023-00909-5); MDPI Electronics 10(11):1338 (circle, ellipse and rectangle shape models); PLOS ONE (single-camera multi-view anthropometry)
- Self-reported height bias (PMC4982322, PMC2774635)
- Vendor help pages for capture guidance (SizeStream, ZOZOFIT, Verifyt); Virtusize and Bold Metrics documentation; Indonesian retailer size-chart pages (Blibli/Erigo, Uniqlo ID, Zalora)
- Sewing and pattern ease references (sewguide, dresspatternmaking, mfgmerch): ease ranges by fit, to be calibrated
- WebKit tracking-prevention page and iOS Safari `getUserMedia` reports (webrtchacks, WebKit bug 176843): older reports, re-test on current iOS
- Amazon Made for You coverage (WWD, TechRadar): privacy and consent patterns

### Tertiary (LOW confidence, needs validation)
- arXiv 2601.01639, monocular body measurement under weak calibration. It is the closest analogue (shoulder 0.5-1.3 cm, waist errors up to 18-25 cm, torso 2.6-7.3 cm). It was read through an automated summary, so re-check the original tables before quoting.
- raman365/tapeline: a single browser-only MediaPipe body-measurement project
- GitHub issue google/mediapipe #4757: GPU delegate blank segmentation on 0.10.4, status on 1.0.1 unknown
- BlazePose comparison summaries (alphaxiv, ResearchGate): 36-45 mm 3D error by variant
- Vendor accuracy claims (3DLOOK, MTailor, Sizely 98.1%): marketing, not evidence
- A single design-discussion source for chest-ease comfort ranges (GitHub devmtnaing/shopping-mall #9)
- Reported mask size 256 x 256 and the "about 0.6 cm per mask pixel" consequence: inference, to be measured in Phase 1

Detail and full source lists: `STACK.md`, `FEATURES.md`, `ARCHITECTURE.md`, `PITFALLS.md` in `.planning/research/`.

---
*Research completed: 2026-10-02*
*Ready for roadmap: yes*
