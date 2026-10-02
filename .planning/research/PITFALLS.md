# Pitfalls Research

**Domain:** Browser-based body measurement (front + side image, pose landmarks + segmentation, typed height) and top-size recommendation
**Researched:** 2026-10-02
**Confidence:** MEDIUM overall. Accuracy-feasibility verdicts are HIGH-confidence in direction (consistent across several sources) but LOW-MEDIUM in exact numbers (few published figures for this exact hand-built pipeline; some figures were obtained via summarised page fetches and should be re-checked in the original papers before being quoted in the capstone report).

---

## 0. Headline: is 2-3 cm realistic?

**Short answer: partly. Only for some measurements, and only under controlled capture. Not as a blanket promise.**

### What published work says (anchors)

| Source | Setup | Reported error | Relevance |
|--------|-------|----------------|-----------|
| Amazon, "Estimation of 3D Body Shape and Clothing Measurements from Frontal- and Side-view Images" (arXiv 2205.14347) | Trained CNN, front + side silhouettes | Real 3D-scan data (NOMO): bust 29-30 mm, waist 28-34 mm, hip 24-25 mm MAE. Real photos of 10 volunteers: **average 2.92 cm**. Synthetic data: 2-5 mm (not meaningful, not real) | Best-case ML trained on thousands of bodies, still ~3 cm on real images |
| MeasureNet, Nature Digital Medicine 2023 (PMC10495406) | Trained CNN, **3 views** (front/side/back) + height, weight, sex; 1200+ people; ground truth from trained technicians | Human Solutions set: waist MAE **16-22 mm**, hip ~14 mm. Self-measured tape WHR error was ~2x the app's | State of the art in minimal clothing is ~1.5-2 cm MAE, i.e. 2-3 cm is already the edge of what a trained model achieves. Authors state loose clothing is NOT modelled |
| Empirical study of monocular body measurement under weak calibration (arXiv 2601.01639), the closest match to this project's approach (landmarks + height + ellipse from front/side) | Landmark geometry / pose regression / object-calibrated silhouettes | Shoulder width 0.5-1.3 cm (best method); **waist errors from 0.2 cm up to 18-25 cm across methods/subjects**; torso height 2.6-7.3 cm; loose clothing inflated waist by up to ~20 cm | Closest published analogue. Small study; numbers via summarised fetch, MEDIUM-LOW |
| Smartphone photogrammetric 3D scan vs Fit3D depth scanner (arXiv 2608.12827), 141 pregnant women | Walk-around video to a 3D model, NOT two images | Waist MAE 1.0 cm, hip 1.4 cm vs depth scanner (not vs tape) | A much richer capture than two photos, and it still lands ~1-1.5 cm from another scanner |
| Search-snippet summary of a 3D smartphone scan vs tape study (source not independently opened) | 3D smartphone scan | Waist MAE 3.4 +/- 2.6 cm, hip 1.7 +/- 1.3 cm | LOW confidence; shows waist is consistently the worst |
| Comparisons of 3D scanning phone apps (snippet) | Commercial apps | Bust, waist, hip discrepancies "exceeding ANSUR allowable errors"; some apps agree on WHR but not individual circumferences | LOW-MEDIUM |
| ISO 20685 / ANSUR | Reference standards | Allowable scanner-vs-tape error ~9 mm for large circumferences; ANSUR inter-observer allowable error ~7 mm for circumferences (trained measurers) | The tape itself is only ~0.7-1 cm repeatable when trained. Untrained team members will be worse (~1-2 cm) |
| Commercial claims: 3DLook ("sub-1 cm vs a human tailor", "96-97% accuracy", "90% accuracy" in one customer case study); MTailor ("20% more accurate than a professional tailor" = 20% closer to the mean of tailors than tailors are to each other) | Proprietary ML on large private datasets, 2 photos, 80+ measurements, guided capture | Marketing, no independent validation found | Do not use as a benchmark. MTailor's claim is relative to tailor disagreement, not absolute truth |

Also relevant: BlazePose landmarks are joint-centre estimates with 3D errors of roughly 36-45 mm depending on model variant (secondary source), and one comparison found BlazePose keypoints deviate from anatomical joint centres more than OpenPose. Self-reported height is over-reported by ~0.9-1.2 cm on average.

### Per-measurement verdict for THIS pipeline (single front + single side, MediaPipe landmarks + mask, typed height, no trained shape model)

| Measurement | Likely within 2-3 cm of tape? | Why | Confidence |
|-------------|-------------------------------|-----|------------|
| **Shoulder width** | **YES, likely**, if you define it as a landmark-to-landmark distance and measure the tape on the same definition | Pure 2D linear distance in the frontal plane; no circumference model. Best published method 0.5-1.3 cm. Risks: BlazePose shoulder = joint centre, not the acromion points a tape uses (offset of 1-3 cm); tape "across the back" follows the curve and reads 2-4 cm longer than a straight line | MEDIUM |
| **Arm length** (shoulder to wrist) | **MAYBE (about 50/50)** | Linear, but needs the arm straight and slightly away from the body; joint-centre vs acromion/wrist-bone offset; elbow bend and foreshortening add error. No published browser-pose figure found | LOW |
| **Chest circumference** | **UNLIKELY to be reliable; achievable only on tight clothing, arms clear, and with a fitted correction.** Expect ~3-5 cm typical error, occasional misses of 6+ cm | Needs front width + side depth + shape assumption. Best trained ML on real images is ~2.9-3 cm. Hand-made ellipse is systematically low for flat-chested/rectangular torsos (see Pitfall 6). Clothing and arms in the side silhouette push the other way | MEDIUM |
| **Waist circumference** | **NO** | Soft tissue, no bony landmark, shape varies most between people, "natural waist" is ill-defined, no BlazePose waist landmark, clothing drapes loosely there, belly depth is hidden by arms/shirt. Published weak-calibration errors reach 6-25 cm. Even trained models are ~1.6-2.2 cm in minimal clothing | MEDIUM-HIGH |
| **Torso length** | **NO unless redefined** | Tape definition (nape/C7 to waist or hem) uses points BlazePose does not output (no neck-base, no waist). Shoulder-midpoint to hip-midpoint is a different quantity with a different offset per body. Published error 2.6-7.3 cm | MEDIUM |

**Honest recommendation for the requirement:** state the target as "shoulder width and chest within ~3 cm (and the recommended *size* matching the tape-based size) on the team's bodies in fitted clothing; arm length, waist and torso length shown as editable estimates with a range". For a plain T-shirt the size-deciding measurements are chest (primary), shoulder width, and optionally body length. Waist and arm length barely change a T-shirt verdict, so dropping them from the "must hit 2-3 cm" set costs little and removes the two worst failure sources.

**Why +/-3 cm still matters for sizing:** adjacent T-shirt sizes typically differ by about 4-6 cm in chest (standard ~2 inch steps, MEDIUM). A 3 cm chest error is therefore roughly half a size, so near a size boundary the recommendation will flip roughly half the time. The product must expose borderline results rather than a hard fits / does-not-fit.

---

## Critical Pitfalls

### Pitfall 1: Promising 2-3 cm for every measurement (accuracy claim set as pass/fail without a feasibility spike)

**What goes wrong:** The roadmap commits to five measurements within 2-3 cm; waist/torso/arm miss by 5+ cm; the whole milestone appears failed or, worse, results get tuned until the 5 team members pass.
**Why it happens:** Joint-centre landmarks feel like they should give "distances"; commercial marketing implies two photos are enough. Published evidence (above) says only linear frontal measurements get there.
**How to avoid:** Run an accuracy spike FIRST (week 1-2) on 2-3 team members: capture, compute all five, compare to tape. Use the result as a go/no-go and to fix the real measurement set. Report error per measurement, not an average across them.
**Warning signs:** Waist or torso errors vary by more than 3 cm between repeat scans of the same person; results "need a fudge factor per person".
**Phase to address:** Phase 1 (measurement feasibility spike) before requirements are locked.

### Pitfall 2: Measuring with a different definition than the tape (landmark/definition mismatch)

**What goes wrong:** Software "shoulder width" = distance between BlazePose joint centres 11-12; the tape reading is across the back to the shoulder points; "torso length" = shoulder-mid to hip-mid vs a tape from C7. The "error" is really a definitional bias of 2-6 cm that looks like noise.
**Why it happens:** BlazePose has no acromion, C7, bust, natural-waist or wrist-crease landmarks; the existing code only uses indices 11, 12, 23, 24.
**How to avoid:** Write a one-page measurement definition sheet (where each measurement starts/ends, posture, breathing, tape path) used by BOTH the tape protocol and the code. Derive points from the mask at landmark-defined heights (e.g. chest height = fixed fraction of shoulder-to-hip distance) and validate that fraction against the tape protocol. Expect and correct a constant per-measurement offset, fitted on held-out people (Pitfall 12).
**Warning signs:** Error has the same sign for every person (bias, not noise).
**Phase to address:** Phase 1 (definitions) and Phase 2 (measurement engine).

### Pitfall 3: Clothing worn during the scan (the plain white T-shirt problem)

**What goes wrong:** The silhouette contains fabric, not body. A T-shirt adds ease around the chest (regular-fit ~10-15 cm circumference, oversize 20+ cm per retail size guides); hoodies and baggy trousers add more. The weak-calibration study saw loose clothing overestimate waist by up to ~20 cm. MeasureNet authors explicitly say their pipeline cannot model loose clothing. The user then gets a fit verdict based on a shirt-inflated body, and the app recommends a size too large.
**Why it happens:** Users scan in whatever they are wearing; the model assumes skin-tight silhouette. Tight-clothing guidance is ignored in practice. Segmentation cannot tell cloth from body.
**How to avoid:** (a) Require fitted/tight clothing in the capture instructions with an example; (b) ask "what are you wearing?" (fitted / regular / loose) and widen the uncertainty band or warn for loose; (c) estimate nothing smarter than that: there is no reliable way to subtract fabric from a 2D silhouette; (d) validate in two conditions (fitted and a normal T-shirt) and report both; (e) never validate in a loose shirt and claim the result for fitted clothing.
**Warning signs:** Chest estimate shrinks 4+ cm when the same person scans in a tighter top; estimates cluster above tape for everyone.
**Phase to address:** Phase 2 (capture guidance, clothing question) and Phase 5 (validation protocol with both conditions).

### Pitfall 4: Scale errors from typed height, camera distance, tilt and perspective

**What goes wrong:** Pixel-to-cm conversion from height is only exact for features in the same plane as the height measurement and for an untilted camera. Chest/belly surface is ~10 cm closer to the camera than the body midline; at 2.5 m that alone inflates chest-level width ~4% (about 1.3-1.6 cm on a 32-40 cm width, my arithmetic); at 1.5 m (typical laptop) ~7%. Camera pitched 10 degrees (phone leaned on a shelf, laptop screen tilted) makes the head larger than the feet and skews the vertical scale. Front-camera wide-angle lenses stretch edge content.
Height-specific errors: typed height is over-reported ~1 cm on average (~0.6% scale), shoes/hair/slouching add 1-3 cm; BlazePose has no head-top landmark, so the head-top comes from the mask (hair, hats) and the soles from heel/foot-index landmarks (shoes).
**Why it happens:** Treating pixels/cm as one constant for the whole image and both views. The user steps closer between front and side shots.
**How to avoid:** Compute the scale **per image** from head-top-to-sole extent of the mask. Require barefoot/socks and no hat. Gate capture on: full body inside frame with margin, feet visible, camera pitch near zero (use `DeviceOrientationEvent` on phones; on laptop show a level-guide using shoulder/hip symmetry and head/feet extent), subject distance within a band (e.g. body height 60-85% of frame height), subject centred (lens distortion lowest at centre). Apply a documented first-order correction for chest-plane depth only if it demonstrably helps on held-out people. Do not use `poseWorldLandmarks` as an absolute scale (hip-centred and model-estimated; the BlazePose 3D error is 3.6-4.5 cm per joint).
**Warning signs:** Widths differ between front and side captures of the same subject taken at different distances; shoulder width changes more than 1 cm when the person moves 30 cm closer.
**Phase to address:** Phase 2 (capture gating and scale) with distance/tilt tests in Phase 5.

### Pitfall 5: Mixing normalised coordinates, canvas crops and mirroring in the maths

**What goes wrong:** Landmarks are normalised 0-1 per axis; distances computed in normalised space mix x and y scales on non-square frames. The existing app also crops via `object-fit: cover` and mirrors in two places, so on-screen guides do not match the data the model saw, and left/right labels flip.
**Why it happens:** The prototype's draw path doubles as its measurement path.
**How to avoid:** Convert to pixel space with the real `videoWidth`/`videoHeight` first; run all measurement maths on unmirrored frames; treat mirroring as display-only; capture a still frame (canvas `drawImage` of the video) at capture time and run the model on that exact still so the mask, landmarks and pixels are guaranteed aligned. Keep the pure maths in a dependency-free file with Node unit tests using fixtures.
**Warning signs:** Measurement changes when you toggle mirror or resize the window; portrait vs landscape give different cm.
**Phase to address:** Phase 1/2 (foundation: pure measurement module + tests).

### Pitfall 6: Ellipse circumference assumption (systematic bias, not noise)

**What goes wrong:** Circumference = ellipse from front width (a) and side depth (b). Real chests and waists are closer to rounded rectangles/superellipses. Example (my arithmetic): chest of about 98 cm with width 34 cm and depth 24 cm gives an ellipse (Ramanujan) of about 92 cm, i.e. ~6 cm too low. Abdominal waists are closer to ellipses. So the error depends on body type and the same fixed formula cannot be right for everyone.
**Why it happens:** Two silhouettes provide only two extents; everything between is assumed.
**How to avoid:** Use a superellipse/shape factor or a per-measurement multiplicative correction, fitted by regression on tape data and checked with leave-one-person-out (Pitfall 12); expose the formula and its bias in the report; do not pretend it is physical. Measure width/depth at the right height (armpit-level chest, not the widest row of the mask including arms).
**Warning signs:** Chest estimates are low for muscular/rectangular torsos and about right for rounder ones; residual correlates with the depth/width ratio.
**Phase to address:** Phase 2 (engine) and Phase 5 (calibration/validation).

### Pitfall 7: Pose errors, arms in the silhouette and side-view not truly side-on

**What goes wrong:** Arms against the torso merge with the body mask: in the front view the width at chest/waist includes the arms (+10-15 cm); in the side view the near arm adds its thickness to the "depth" (+8-10 cm). A person turned 20-30 degrees instead of 90 degrees makes the depth wrong; BlazePose hallucinates the far-side limbs when occluded, and left/right landmarks may swap in side view. A chest-puffed or slouched posture changes the numbers by centimetres.
**Why it happens:** Users cannot see themselves from 2-3 m, do not know the pose, and stand naturally.
**How to avoid:** Define the exact poses: front = A-pose with arms ~30-45 degrees out; side = arms raised forward/overhead or tucked consistently, chosen after trying in the spike. Auto-check from landmarks: front shoulders/hips level and symmetric (left/right depth z and visibility); gap between wrist and hip landmark above a threshold; side = shoulder landmarks nearly overlapping in x, only the near-side landmarks have high visibility. Reject and say why instead of capturing. Pick the near side by visibility, never by an assumed side.
**Warning signs:** Visibility of one shoulder far below the other in the front view (turned); shoulder-to-shoulder pixel distance in side view above ~25% of the front value.
**Phase to address:** Phase 2 (pose validation, capture guidance).

### Pitfall 8: Segmentation fragility (background, lighting, white shirt on white wall)

**What goes wrong:** The mask is a soft probability map from a small model; threshold choice alone moves the width by 1-2 cm. A white T-shirt against a white wall, backlit windows, shadows, low-light webcam noise, auto-exposure/focus hunting, other people or furniture in frame, and hair/loose strands all corrupt the mask edge. Mask resolution is far below the webcam frame (the pose model's internal segmentation is low-resolution and upsampled; verify in the Tasks Vision docs), so each mask pixel at 2.5 m may correspond to several tenths of a cm up to ~0.5-0.7 cm.
**Why it happens:** Demo lighting differs from the dev room; the first garment is white.
**How to avoid:** Capture checks: mask area/shape sanity, mask edge sharpness, brightness and contrast histogram, background-uniformity hint ("stand 1 m from a plain wall, light in front of you"). Use the confidence mask with a fixed, validated threshold; take a median over N frames; do the mask post-processing (largest connected component, small morphological open/close) and report mask quality as a confidence input. Validate in at least two lighting/background setups. Consider a darker or coloured top for the scan and a separate "garment" colour in the catalog.
**Warning signs:** Width at the chest row jumps more than 1 cm across frames; the mask has holes at the arms or merges with the wall; different results between bright and dim rooms.
**Phase to address:** Phase 2 (segmentation + quality gates), Phase 5 (multi-condition validation).

### Pitfall 9: Low-resolution webcams and effective pixel size

**What goes wrong:** At 640x480 and 2-2.5 m the body is ~350-450 px tall, i.e. ~0.4-0.5 cm per pixel; 1 px edge error each side on a chest width = ~1 cm, and then a circumference formula multiplies width error by ~pi/2 or more (roughly 1.6-2x the width/depth error). The current code asks for 640x480 as an *ideal* constraint and uses `smoothLandmarks`. Laptop webcams are also sensor-poor in low light, and OS camera effects (Apple Center Stage, Windows Studio Effects auto-framing, background blur, auto zoom) change framing and geometry between frames or hide the body edges.
**Why it happens:** Defaults of getUserMedia and "it works on my laptop".
**How to avoid:** Request the highest resolution (e.g. ideal 1920x1080, or 1280x720 minimum) and read the actual `videoWidth/Height` and `track.getSettings()`; reject streams below a threshold with a clear message; capture from a still of the current frame at full resolution; use the heavy pose model in IMAGE mode for the captured still; instruct users to disable auto-framing/background effects (and warn if the settings show a digital zoom or frame-size change). Report effective cm per pixel per capture in the debug panel.
**Warning signs:** `getSettings()` returns 640x480; cm/pixel above ~0.5; measurement spread across repeats larger than 1 cm.
**Phase to address:** Phase 2 (camera pipeline), Phase 5 (laptop validation).

### Pitfall 10: Landmark jitter and single-frame capture

**What goes wrong:** One frame's landmarks jump by several pixels (about 1-2 cm), and the legacy `smoothLandmarks` filter adds lag so the "smoothed" value after a movement is stale. Taking a measurement from whichever frame the user tapped means a repeat scan can differ by 2-3 cm by chance alone.
**Why it happens:** Live-preview defaults reused for measurement.
**How to avoid:** Auto-capture after a short countdown once the pose gate has been satisfied for N consecutive frames; collect 15-30 frames (<1-2 s), reject outliers, use the median of per-frame measurements (or median landmarks + median mask); disable temporal smoothing for the capture burst (or discard the warm-up frames); record the spread and refuse or lower confidence when the spread is high. Measure test-retest repeatability (SD of repeat scans) before judging accuracy: precision should be below ~1 cm SD before bias is worth fixing.
**Warning signs:** Same pose, same person, two consecutive captures differ by 2+ cm.
**Phase to address:** Phase 2 (burst capture) and Phase 5 (repeatability metric).

### Pitfall 11: Mobile browser camera problems (iOS Safari especially) and the hands-free problem

**What goes wrong:**
- `getUserMedia` needs HTTPS (or localhost); on an HTTP LAN IP, `navigator.mediaDevices` is undefined and the current code throws synchronously.
- iOS Safari needs `playsinline` (+ `muted`/`autoplay`); a `display:none` video can stop updating/pause on Safari, which is how the current hidden `video#webcam` is built; throttled in background tabs.
- Orientation changes: `videoWidth/videoHeight` may swap, report 0 in portrait at start, or the picture can vanish after rotation (known WebKit/Apple forum reports). The current canvas size is set once at `loadedmetadata`.
- Front vs rear camera: the rear camera has higher resolution and less distortion but the user cannot see the screen; the front camera shows the screen but is a lower-resolution, often wide-angle lens, and on phones the person must prop the phone ~2 m away so they cannot tap "capture".
- Safari/iOS camera permission prompts are per-page-load unless installed; stopping the stream matters for the camera indicator.
- MediaPipe WASM/GPU delegate memory limits and slower inference on mid-range Android phones; masks from Tasks Vision must be released (`close()`) to avoid leaks (verify in docs).
- Camera constraints are hints only (`ideal`), so a 4:3 vs 16:9 vs portrait stream can arrive unexpectedly.
**How to avoid:** Serve over HTTPS for testing (e.g. a tunnel or local certificate), keep the video in layout but visually hidden (not `display:none`), `playsInline muted autoplay`, re-read dimensions on `loadedmetadata` AND `resize`/orientation events; lock the app to portrait on phones and instruct to prop the phone vertically; countdown timer (10 s) plus audio beeps/spoken cues for hands-free capture; offer both cameras with an explicit choice; request tracks stop on retake/bypass/`pagehide`; branch on `err.name`; `await` model init with visible progress; run inference with back-pressure (await each frame or `requestVideoFrameCallback`) and heavy inference only on the captured burst. Pick a short list of demo devices (one iPhone Safari, one Android Chrome, one laptop) and test on them from the start rather than at the end.
**Warning signs:** Black video on iPhone; capture works on desktop but frame width is 0 on phone; UI stuck on loading overlay.
**Phase to address:** Phase 1 (foundation: camera lifecycle, HTTPS, state machine), Phase 2 (hands-free capture), Phase 5 (device matrix).

### Pitfall 12: Validating on a tiny, convenient sample (and tuning on it)

**What goes wrong:** With 3-6 team members, one lucky or unlucky person sets the average; fitting a correction factor on the same people then "validating" on them is circular; team members are similar (age, build, ethnicity) so the result does not generalise; the tape reference itself is uncertain (trained anthropometrists agree to ~0.7 cm; untrained teammates to ~1-2 cm; the self-measurement WHR error in MeasureNet was twice that of the trained technician). "Within 2-3 cm" is undefined (mean? max? 95%?), and an average of 5 people with 3 cm mean error can still contain 6 cm misses.
**How to avoid:** Pre-define the pass criterion (e.g. per measurement: mean absolute error <= 2.5 cm AND no single error above 4 cm AND the same size as tape-derived size in X of N cases) before collecting data. Tape protocol: same definitions, two measurers, repeat each measurement 2-3 times, average, relaxed breathing, same clothes; record tape-to-tape disagreement as the floor. Capture each person 3 times per device (laptop webcam + phone), on different days or lighting. Use leave-one-person-out for any fitted constant. Report bias, SD, max error and size-agreement per measurement and per device, in a table (subject, tape, estimate, error), and say plainly that results apply to these N people. Add the number of people to the claim ("on 5 team members"), do not generalise to the population.
**Warning signs:** A single correction constant is tweaked until all five fall within 3 cm; error differs by 3+ cm between devices.
**Phase to address:** Phase 5 (validation), definitions earlier in Phase 1.

### Pitfall 13: Fit logic confuses body measurements with garment measurements

**What goes wrong:** Comparing the body chest circumference directly against a size chart that lists flat garment widths (garment chest width x 2 = garment circumference) or "body" ranges is a unit-of-meaning error. A medium T-shirt at 50.8 cm flat width is a 101.6 cm garment, fitted to a ~96-102 cm body in regular cut; the difference is ease. Mixing the two yields recommendations one or two sizes off.
**Why it happens:** Size charts are inconsistent: some list body ranges, some garment dimensions, some do not say; the ColourBox chart still has to be collected.
**How to avoid:** Data model with explicit fields per size: `garmentChest` (circumference, i.e. 2 x flat width), `garmentLength`, `shoulder`, `sleeve`, plus `chartType: 'body' | 'garment'`; verify against a physical T-shirt with a tape. Compute `ease = garmentChest - bodyChest` and compare to a target ease band per cut (e.g. regular ~8-15 cm, loose ~15-20, oversize 20+, with the bands being documented assumptions, not facts) and per user preference. Account for fabric stretch (cotton jersey) only as a stated allowance; include knit vs woven field. Never infer the garment's measurements from the size label across brands: sizes differ between brands (vanity sizing), so only use ColourBox's own chart.
**Warning signs:** The same body reports "fits" in every size of a loose garment; recommendation is inconsistent with the physical shirt.
**Phase to address:** Phase 3 (size-chart data model and fit engine).

### Pitfall 14: Hard verdicts that ignore measurement uncertainty

**What goes wrong:** A 3 cm chest error is half a size; showing "fits / does not fit" and one recommended size gives false confidence near boundaries. Users who disagree with the app (e.g. "I always wear L") lose trust.
**How to avoid:** Propagate an error band (e.g. +/- 3 cm for chest) through the fit logic; show fits / borderline / too small / too large, give the neighbouring size when within the band, and use the editable measurement field as a first-class path ("correct if you know your chest from a tape"). Show which measurements drove the verdict (for T-shirts, chest and shoulder; ignore waist/arm for a regular tee). Display a one-line confidence from capture quality (pose gate, lighting, spread).
**Warning signs:** The recommended size flips between repeat scans of the same person.
**Phase to address:** Phase 3 (fit engine) and Phase 4 (UI).

### Pitfall 15: Privacy treated as an afterthought

**What goes wrong:** Body images and measurements are sensitive, and Indonesia's personal data protection law (UU PDP 27/2022) treats biometric data as specific personal data (flagged in CONCERNS.md; not independently re-verified here). The existing code keeps plaintext history in `localStorage`, has no consent, the camera stays on after "skip", unpinned CDN scripts run on a page holding the camera stream, and the repository contains a project PDF and a `.git` directory (risk of committing validation photos).
**How to avoid:** Consent screen before camera start stating images never leave the device; process everything in the browser; do not persist raw frames (hold the burst in memory, release canvases/masks after computing); persist only the derived measurements with a schema version and a visible "delete my data" button; self-host and pin MediaPipe WASM/model files and add a CSP restricting `script-src`/`connect-src` (this also makes "no uploads" verifiable); stop all camera tracks on retake/bypass/pagehide; never log images to the console; for the team's validation data keep photos and measurements out of git (separate folder in `.gitignore`), with written consent from each teammate, and anonymise IDs.
**Warning signs:** Network tab shows any request carrying image data; camera indicator remains on after leaving the scan screen.
**Phase to address:** Phase 1 (consent/CSP/lifecycle), Phase 4 (profile + delete), Phase 5 (validation data handling).

### Pitfall 16: Scope explosion for a solo developer in 1-3 months

**What goes wrong:** Time disappears into training or integrating a statistical body model (SMPL), pursuing the 5th measurement, perfecting i18n, building a garment overlay, handling every device, while the camera lifecycle bugs, the "simulated" parts and the monolithic `ar.js` are still in place.
**How to avoid:** Hard rules: (1) No ML training, no 3D reconstruction; the measurement engine is landmarks + mask + calibration constants. (2) Fix the foundation first: pinned/self-hosted Tasks Vision `PoseLandmarker`, a clean state machine (idle, permission, positioning, capturing_front, capturing_side, computing, result, error), camera lifecycle fixes, pure measurement module with Node tests. (3) Time-box the accuracy spike and treat it as a decision point (week 2); if chest is worse than ~4 cm after the gates, move to "estimate + prompt to confirm/correct" as the primary UX, keeping the scan as a convenience. (4) Collect the real ColourBox size chart early (it blocks Phase 3 and cannot be invented). (5) Keep i18n minimal (two string files, no framework). (6) Plan a fallback demo: a recorded/pre-computed scan set for the demo day in case a venue's lighting or webcam fails.
**Warning signs:** Week 4 and still no end-to-end path from capture to verdict; features added before the validation protocol exists.
**Phase to address:** Roadmap-level; Phase 1 sets the rules, every phase keeps a vertical slice.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Keep the legacy `@mediapipe/pose` from an unpinned CDN | Zero migration | Behaviour can silently change mid-project; no reproducible measurements; offline impossible; legacy API | Never for measurement. Pin and self-host Tasks Vision `PoseLandmarker` |
| Reuse the live preview loop and `smoothLandmarks` for capture | No new code | Lag, jitter, stale landmarks, mirrored geometry | Only for the preview; capture must be a separate burst on a still |
| Do measurement maths inside `ar.js` closure | Fast to write | Untestable, mirror/crop bugs leak into numbers | Never; extract a pure module with Node tests |
| One global scale constant for both views | Simple | Wrong whenever the user moves between captures | Never; scale per image |
| Hard-code a "fudge factor" fitted on the team | Passes the demo | Overfit; fails for anyone else | Only as a documented, leave-one-out-validated calibration constant |
| Skip the validation protocol until the end | More dev time | No evidence for the accuracy claim; late surprise | Never; write the protocol in Phase 1 |
| Hard-code size charts in the product object | Quick | Chart type confusion (body vs garment) | OK for 1 garment if fields are explicit (`chartType`, garment circumference) |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| MediaPipe Tasks Vision `PoseLandmarker` | Using VIDEO mode live outputs for measurements; not enabling `outputSegmentationMasks`; calling detect synchronously on the main thread; not releasing masks | IMAGE mode on the captured still with the heavy model; enable segmentation masks; free masks/results; run in a worker or at least not per-frame; check `visibility` of each used landmark |
| `getUserMedia` | Treating `ideal` as guaranteed; one generic error message; not stopping tracks | Read `track.getSettings()`; branch on `err.name`; stop tracks; handle `OverconstrainedError`, `NotReadableError`, insecure context |
| HTML video on iOS Safari | `display:none`, no `playsinline`, orientation not re-read | Hidden-in-layout video, `playsInline muted`, listen to `resize`/orientation |
| `localStorage` | Unversioned plaintext history; throws in private mode | Versioned schema, try/catch, minimal data, delete action |
| Size chart source (ColourBox) | Assuming chart values are body ranges | Verify with a physical garment; store garment dimensions with `chartType` |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Heavy pose model + segmentation per frame at 30 fps | Phone heats, frames queue, UI freezes | Light model for guidance (or lower rate), heavy model only on the captured burst; await each inference | Mid-range Android, iPhone with a background tab |
| Overlapping `send()` calls with no back-pressure | Growing latency, stale landmarks | In-flight flag or `requestVideoFrameCallback` | Any slow device |
| Full-resolution frames on canvas every frame | Memory growth, jank | Draw overlay only; capture full frames only during the burst; release canvases/masks | 1080p on phones |
| First-load model/WASM download not surfaced | Looks broken for 5-20 s on mobile data | Progress UI, `await` model init, cache the files (self-hosted) | First visit, poor network |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Third-party scripts without SRI/CSP on a camera page | Supply-chain code sees the camera stream | Self-host, pin, CSP |
| Raw frames saved or logged | Biometric leakage via storage/console/devtools sharing | Process in memory only; never persist images |
| Validation photos committed to the repo | Public exposure of team members' bodies | Separate folder in `.gitignore`, consent, anonymised IDs |
| `innerHTML` with catalog/user data | XSS once data is dynamic | `textContent` / escaped templates |
| Camera stays on after skip/retake | Privacy breach, user distrust | Stop all tracks on every exit path |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No guidance for distance, pose, clothing, lighting | Rejected or wrong scans, frustration | Step-by-step positioning with live pass/fail checklist (full body, distance, level, arms out, lighting) |
| Needs a tap while standing 2.5 m away | Cannot capture | Auto-capture with a countdown and audio cues |
| Silent acceptance of bad frames | Wrong numbers with no warning | Reject with a specific reason and a retake path |
| Showing exact numbers ("97.3 cm") | False precision | Round to 0.5-1 cm and show a range for noisier measurements |
| Hard fits/does-not-fit | Distrust near boundaries | Fits / borderline / neighbouring-size message |
| Mirrored preview with unmirrored measurement not explained | "Left" and "right" confusion in guidance | Mirror the preview only; label sides unambiguously in prompts |
| Indonesian/English mixed strings | Looks unfinished | Two string tables, one language switch, one pass of review |

## "Looks Done But Isn't" Checklist

- [ ] **Scale:** often missing per-image calibration and a check that the feet/head are in frame, so verify measurements change by <1 cm when the user stands 30 cm closer.
- [ ] **Segmentation:** often validated only in the dev room, so verify in dim light and against a white wall with a white shirt.
- [ ] **Side view:** often accepted when the person is 30 degrees turned or arms merged with the torso, so verify the gate rejects both.
- [ ] **Repeatability:** often unmeasured, so verify SD across 3 repeat scans of the same person is below ~1 cm per measurement.
- [ ] **Tape ground truth:** often a single tape pass by the person being measured, so verify two measurers, repeated reads, and defined landmarks.
- [ ] **Devices:** often tested only on a laptop, so verify iPhone Safari and an Android phone including portrait/landscape rotation and HTTPS.
- [ ] **Camera lifecycle:** often leaves the stream running, so verify the camera indicator goes off on retake, skip, tab hide.
- [ ] **Size chart:** often copied without knowing body vs garment, so verify against a physical shirt.
- [ ] **Fit verdict:** often ignores error and ease, so verify borderline cases show a band, and each cut (regular/loose/oversize) changes the recommendation sensibly.
- [ ] **Privacy:** often claims "on device" without proof, so verify no network request carries images and that the delete action clears storage.
- [ ] **Validation data:** often lives in the repo, so verify it is git-ignored.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Accuracy short on chest/waist | MEDIUM | Narrow the accuracy claim to shoulder and chest, show waist/arm/torso as ranges, make editing and tape-entry the primary path, report size-agreement instead of cm |
| Systematic bias (ellipse/definition) | LOW | Fit a per-measurement correction with leave-one-person-out; document it |
| Clothing inflation | LOW | Ask clothing type, add a looser band, push fitted-clothing guidance, validate in both conditions |
| iOS Safari camera failures | MEDIUM | Visible hidden-video pattern, `playsInline`, re-read dimensions on rotation, test on a real device early |
| Segmentation failures in venue lighting | MEDIUM | Quality gate and "move to plain wall" prompt; keep a pre-recorded fallback demo |
| Unclear size chart semantics | LOW | Measure a physical shirt, record `chartType`, recompute |
| Timeline slip | HIGH | Cut waist/arm/torso, cut overlays/extras, keep one garment and one capture path |

## Pitfall-to-Phase Mapping

Suggested phase names (the roadmap may rename them); numbers correspond to the pitfalls above.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 Promising 2-3 cm for all | Phase 1: foundation + accuracy spike | Per-measurement spike table with tape on 2-3 people; measurement set fixed |
| 2 Definition mismatch | Phase 1 definitions, Phase 2 engine | One-page definitions sheet used by tape and code |
| 3 Clothing | Phase 2 capture guidance, Phase 5 | Validation in fitted and regular clothing reported separately |
| 4 Scale, distance, tilt, height | Phase 2 | Move-30-cm test changes widths <1 cm; tilt/distance gates reject bad frames |
| 5 Coordinates/mirroring | Phase 1/2 | Node unit tests on pure module; toggling mirror/rotation does not change cm |
| 6 Ellipse | Phase 2, Phase 5 | Residual vs depth/width ratio plot; leave-one-out corrected error |
| 7 Pose gating | Phase 2 | Gates reject turned/arms-merged captures in test clips |
| 8 Segmentation | Phase 2, Phase 5 | Two lighting/background setups validated; mask quality metric |
| 9 Low-res webcams | Phase 2, Phase 5 | `getSettings()` logged; cm/pixel reported; laptop results separate |
| 10 Jitter/single frame | Phase 2 | SD across repeats < ~1 cm |
| 11 Mobile browser | Phase 1, Phase 2, Phase 5 | Real iPhone and Android pass the full flow, with rotation, over HTTPS |
| 12 Tiny sample | Phase 1 (protocol), Phase 5 | Pre-defined pass criteria; table of subject/tape/estimate/error |
| 13 Body vs garment measures | Phase 3 | Schema has `chartType`; checked against a physical shirt |
| 14 Uncertainty in verdicts | Phase 3, Phase 4 | Borderline cases shown as bands; recommendation stable across repeats |
| 15 Privacy | Phase 1, Phase 4, Phase 5 | Network tab clean; delete works; no photos in git |
| 16 Scope | Roadmap-wide | Vertical slice by end of the first third of the schedule |

### Phase-specific research flags

| Phase Topic | Likely Pitfall | Needs deeper research? |
|-------------|---------------|-----------------------|
| Accuracy spike (width/depth extraction, chest height, shape factor) | 1, 2, 6 | Yes: experiment-driven; the literature has no direct recipe |
| Capture gating and burst capture | 4, 7, 9, 10 | Moderate: standard patterns, but thresholds need tuning on devices |
| iOS Safari camera + MediaPipe Tasks Vision on mobile | 11 | Yes: verify current Safari behaviour and Tasks Vision GPU/CPU delegate on target devices |
| Size chart and ease model | 13, 14 | Moderate: depends on the actual ColourBox chart; ease bands are assumptions to justify |
| Validation protocol | 12 | Moderate: define metrics before data; low technical risk |
| i18n, history, profile storage | n/a | No: standard patterns |

## Sources

- Estimation of 3D Body Shape and Clothing Measurements from Frontal- and Side-view Images (Amazon): https://arxiv.org/abs/2205.14347 (results table via https://arxiv.org/html/2205.14347) , MEDIUM
- MeasureNet, Development and validation of an accurate smartphone application for measuring waist-to-hip circumference ratio (npj Digital Medicine, 2023): https://pmc.ncbi.nlm.nih.gov/articles/PMC10495406/ , MEDIUM-HIGH (waist MAE 16-22 mm on Human Solutions data; the cm-labelled WHR figures in the page are ratios, not cm)
- An Empirical Study of Monocular Human Body Measurement Under Weak Calibration: https://arxiv.org/abs/2601.01639 (numbers via https://arxiv.org/html/2601.01639), MEDIUM-LOW (summarised extraction, re-check original tables)
- Validation of Smartphone-Based Photogrammetric 3D Body Scanning vs Fit3D: https://arxiv.org/html/2608.12827v1 , MEDIUM
- BodyM dataset (frontal and lateral silhouettes, 14 tape measurements; no benchmark numbers found on the page): https://registry.opendata.aws/bodym/ and https://adversarialbodysim.github.io/ , MEDIUM for dataset description
- ISO 20685 (3D scanning anthropometry): https://www.iso.org/standard/63261.html ; ANSUR II pilot study: https://apps.dtic.mil/sti/tr/pdf/ADA498172.pdf ; allowable-error values via search summary, MEDIUM
- 3DLook: https://3dlook.ai/mobile-tailor/for-made-to-measure/ ; MTailor: https://www.mtailor.com/how-it-works ; slø case study https://getsized.co/3d-look (vendor marketing, LOW as accuracy evidence)
- MediaPipe Pose Landmarker (web): https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js , HIGH for options/outputs (segmentation masks optional; normalised vs world landmarks; hip-midpoint origin; synchronous main-thread caveat)
- BlazePose comparisons (3D error 36-45 mm by variant; deviation from anatomical joint centres vs OpenPose): https://www.alphaxiv.org/overview/2206.11678v1 and https://www.researchgate.net/publication/358017174_Comparing_the_Quality_of_Human_Pose_Estimation_with_BlazePose_or_OpenPose , LOW-MEDIUM (secondary)
- Self-reported height bias: https://pmc.ncbi.nlm.nih.gov/articles/PMC4982322/ , https://pmc.ncbi.nlm.nih.gov/articles/PMC2774635/ , MEDIUM-HIGH
- iOS Safari getUserMedia issues (playsinline, orientation/size 0 reports): https://webrtchacks.com/autoplay-restrictions-and-webrtc/ , https://github.com/webrtc/samples/issues/929 , https://bugs.webkit.org/show_bug.cgi?id=176843 , MEDIUM (older reports; re-test on a current iOS version)
- T-shirt ease and garment vs body measurement: https://www.blankclothing.com.au/chest-measurement-sizes-guide/ , https://intotheam.com/blogs/news/mens-t-shirt-sizing-guide , LOW-MEDIUM (retail guides, not standards)
- Size/fit returns and vanity sizing: https://arxiv.org/pdf/1907.09844 , https://arxiv.org/pdf/2106.03532 , MEDIUM
- Existing code concerns: `/Users/jordan/UIB/Prototype Capstone/.planning/codebase/CONCERNS.md`

---
*Pitfalls research for: browser-based body measurement and clothing size recommendation*
*Researched: 2026-10-02*
