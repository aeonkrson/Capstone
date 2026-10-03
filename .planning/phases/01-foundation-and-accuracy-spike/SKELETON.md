# Walking Skeleton — Size Fit Scanner (working title)

**Phase:** 1
**Generated:** 2026-10-02

## Capability Proven End-to-End

A team member opens the app over HTTPS on a real phone or a laptop, types their height, and sees their own live landmarks, silhouette, and a first shoulder width and bust circumference in cm, all computed on the device from self-hosted, version-pinned files.

This project has no backend and no database by constraint (all body data stays on the device). The "full stack" here is: typed height, browser camera, on-device pose and segmentation, pure measurement maths, and a reading on screen. Nothing is written to storage in Phase 1, and that is the correct behaviour (PRIV-02), not a gap.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | None. Vanilla ES2022 modules loaded by one `<script type="module" src="src/main.js">` | A linear single-page flow does not need a framework; the same files import unchanged in Node for tests |
| Structure | Functional core, imperative shell: `src/core/` (pure, no browser globals), `src/platform/` (camera, pose, frame loop adapters), `src/app/` (orchestration), `src/ui/` (DOM and canvas), `src/data/` (static data), `src/i18n/` (strings) | Everything that produces a number is testable in Node without a camera |
| Import rule | Relative imports with explicit `.js` or `.mjs` extensions only. No bare specifiers, no `import.meta.env`, no aliases in `src/` | The app must run unchanged on Vite and on `python3 -m http.server` |
| Body detection | `@mediapipe/tasks-vision` 1.0.1 `PoseLandmarker`, `outputSegmentationMasks: true`, `numPoses: 1`, CPU delegate by default | Decided in PROJECT.md; 33 landmarks plus a person mask in one pass |
| Model variant | `pose_landmarker_full.task` by default; `pose_landmarker_heavy.task` selectable with `?model=heavy` | The go/no-go (plan 01-08) fixes the variant from benchmark numbers |
| Running mode | `VIDEO` for the live view, `IMAGE` for the captured burst (switched with `setOptions`) | Research default: no temporal smoothing in a measurement |
| Vendor location | `vendor/mediapipe/` at the repository root (not `public/vendor/`) | Works with both Vite dev and a plain static server |
| Vendored files | Committed to git: `vision_bundle.mjs`, the four `wasm/` files, `models/pose_landmarker_full.task`, `SHA256SUMS`. Not committed: `models/pose_landmarker_heavy.task` (gitignored until the go/no-go picks it; its hash is still in `SHA256SUMS`) | A bare clone runs with no install step, the demo works offline, and the exact bytes are pinned in history. Cost is about 32 MB of repository size |
| How vendor files are produced | `npm run vendor` (explicit command, `scripts/vendor-mediapipe.mjs`), verified by `npm run vendor:check` and `test/vendor.test.js`. No `postinstall` script | No code runs at install time; the pin is checked by hash |
| Data layer | None in Phase 1. Height, frames, masks, landmarks and readings live in memory only. `localStorage` arrives in Phase 2 behind `src/platform/storage.js` and never holds images | PRIV-02 |
| Auth | None. No accounts, no backend | Project constraint |
| Privacy enforcement | CSP meta tag (`connect-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`, no inline script or style), `test/privacy.static.test.js` forbidding network and storage APIs in `src/`, Vite WebSocket disabled | Makes "nothing is uploaded or saved" checkable by a test and by the network inspector |
| Contracts | `FrameObservation` (raw unmirrored image pixels, copied 0/1 mask with its own resolution) defined in `src/core/types.js`; core returns reason codes, never display text | The seam between adapters and maths; mirroring is display-only |
| Tests | Node built-in runner: `node --test "test/**/*.test.js"`. No Vitest, no browser tests | Resolved in research SUMMARY.md |
| Dev server | Vite 8.3.2 with `@vitejs/plugin-basic-ssl` 2.3.0, `vite --host`, dev convenience only; `server.fs.deny` adds `**/validation/**` and `**/.planning/**` to Vite's defaults | HTTPS on the LAN so a phone can use the camera, without exposing readings or planning notes to the network |
| Deployment target | Documented local run: `npm run dev` then `https://<LAN-IP>:5173/?debug=1` on the phone, or `python3 -m http.server 8000 --bind 127.0.0.1` then `http://localhost:8000/?debug=1` on the laptop. Hosted HTTPS deployment is Phase 5 | A phone on the same network is the real target device for the spike |
| Debug view | Part of the real app, shown when the URL has `?debug=1` | No throwaway page; Phases 3 and 4 build on the same seam |
| Reading log | Numbers are read off the "Captured" panel and typed into `validation/readings.csv`. No export button | 2-3 subjects and two devices is a few dozen numbers; no export code to keep image-free |
| Strings | Two flat dictionaries (`src/i18n/en.js`, `src/i18n/id.js`), `t(key, params)`, locale from `navigator.language`. No switcher and no stored choice in Phase 1 | D-16; Phase 2 adds `setLocale` and storage on top |
| Height input | Accepted range 120 to 220 cm inclusive; decimal comma or dot; reason codes `empty`, `not-a-number`, `too-low`, `too-high` | CAPT-01 |
| Tape-to-size rule | Smallest plain-tee size whose garment bust (flat chest x 2) is at least bust + 8 cm; boundaries at 82, 86, 90, 94, 98, 102 cm; borderline within 1.0 cm of a boundary | D-12, written in `validation/PASS-CRITERIA.md` before any data |
| Scan bust row | Per view, the widest torso row of the silhouette inside the band from 22% to 36% of the shoulder-midpoint-to-hip-midpoint distance (`BUST_BAND_MIN_FRAC`, `BUST_BAND_MAX_FRAC` in `src/core/measure.js`; row selection by `widestTorsoRun` in `src/core/mask.js`); torso width is the contiguous mask run containing the body midline; front stance is an A-pose; ties keep the highest row; band and chosen row drawn in the debug view, row fraction logged in reading notes | User decision at plan approval (2026-10-03), replacing a fixed 28% level, to match D-08's "fullest point"; constants and row selection frozen with the pass criteria before any reading |
| Camera controls | Exactly one of Start camera and Stop camera is visible; the camera never restarts by itself; a capture aborts when the camera stops, the tab is hidden or the height changes | A locked phone screen or hidden tab must not force height re-entry or hang a capture |
| Directory layout | `index.html`, `css/style.css`, `src/{core,platform,app,ui,data,i18n}/`, `vendor/mediapipe/`, `scripts/`, `test/`, `validation/` | Follows research ARCHITECTURE.md |

## Stack Touched in Phase 1

- [ ] Project scaffold: `package.json` with exact pins, Vite HTTPS dev server, Node test runner, GreenWear code removed (plans 01-01 and 01-02)
- [ ] Routing: one page, one route. The only switch is the `?debug=1` query flag (plan 01-05)
- [ ] Database: none by constraint. Stand-in for "one real read and write": the typed height is read, validated and used as the scale for a reading (plans 01-03 and 01-06)
- [ ] UI: height form wired to validation, camera view, debug view with capture buttons (plans 01-03, 01-05, 01-06)
- [ ] On-device inference: self-hosted pose and silhouette from pinned files (plans 01-02 and 01-05)
- [ ] Deployment: documented local HTTPS run on a real phone and a laptop, recorded in `validation/DEVICE-CHECKLIST.md` (plan 01-07)

## Not Part of the Code Skeleton (but part of Phase 1)

Phase 1 is also an accuracy spike. These are human or document deliverables that sit beside the skeleton:

- Measurement definitions, tape protocol and pass criteria, written before any data (plan 01-04)
- ColourBox charts recorded as data, with the boxy chart marked unconfirmed (plan 01-04)
- Device run, physical plain-tee measurement, boxy chart confirmation request, tape and scan readings for S1 to S3 (plan 01-07)
- The recorded go/no-go (plan 01-08)

## Out of Scope (Deferred to Later Slices)

- Consent screen before the camera (PRIV-01, Phase 4). In Phase 1 the submit button says it starts the camera and a one-line privacy note is shown
- Language switcher and remembered language (I18N-01, I18N-02, Phase 2)
- Fit engine, ease windows, catalog UI, profile, history, delete-my-data, any `localStorage` use (Phase 2)
- Calibration, quality gates, multi-frame aggregation beyond a burst median, waist, torso length, arm length (Phase 3)
- Pose guide overlay, plain-language hints, auto-lock, sound cues, camera-denied route to manual entry (Phase 4)
- Hosted HTTPS deployment, `vite build` output with vendored files, fallback demo recording (Phase 5)
- Fitted-clothing scans, boxy and fitted tees in the catalog, stretch handling (deferred in CONTEXT.md)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: type measurements, pick a ColourBox top and size, get a verdict and recommended size, saved locally in English or Indonesian
- Phase 3: front and side capture become calibrated shoulder, bust, torso and arm measurements with quality gates
- Phase 4: consent, then a hands-free guided scan with auto-lock and sound cues, ending at a measurement review
- Phase 5: team tape study, per-device results table, rescan, and a demo that holds up on real devices
