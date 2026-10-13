<!-- GSD:project-start source:PROJECT.md -->

## Project

**Size Fit Scanner (working title)**

A browser app for online shoppers who cannot try clothes on. The user scans their body from the front and the side with a phone or laptop camera, the system estimates their body measurements, and then — for a garment and size the user picks from a built-in catalog — it says whether that size fits and, if it does not, which size would.

It replaces the earlier GreenWear direction (AR tag scanning, sustainability info, Mix & Match) in the same repository. It is a university capstone project built by one developer.

**Core Value:** A shopper who picks a size gets a fit answer they can trust — because the body measurements behind it are close to what a tape measure would give.

### Constraints

- **Timeline**: Demo-ready in 1 to 3 months — capstone schedule
- **Team**: One developer (Jordan) builds everything — no handoff or parallel work to plan for
- **Platform**: Runs in the browser on both phone and laptop — no native app
- **Data**: All body images and measurements stay on the device — no backend, no server accounts
- **Camera**: Browser camera access needs HTTPS or localhost — affects how the app is served and demoed
- **Scope**: Tops only, starting with one plain white T-shirt — keeps the first version narrow
- **Accuracy**: Per-measurement targets against tape (shoulder about 2.5 cm, chest about 3.5 cm plus size agreement) — this is the bar for "done", validated on team members; a blanket 2-3 cm for every measurement is not realistic for this pipeline
- **Language**: English and Indonesian UI — existing strings are Indonesian

<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->

## Technology Stack

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

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

## Naming Patterns

- Files: camelCase `.js` modules named after their export (`autoLock.js`, `guidedScan.js`, `reviewView.js`); tooling scripts are kebab-case `.mjs` (`vendor-mediapipe.mjs`).
- Functions: camelCase verbs (`measureView`, `checkFrame`, `stepLock`, `applyRescan`, `preflightIssues`).
- Factories: `createX` returning an object of functions (`createCamera`, `createPose`, `createGuidedScan`, `createReviewView`).
- Constants and tunable tables: UPPER_SNAKE, frozen where shared (`QUALITY`, `AUTO_LOCK`, `CALIBRATION`, `PREFLIGHT_CODES`, `CATALOG`).
- Measurement keys end in the unit: `shoulderCm`, `chestCm`, `waistCm`, `torsoCm`, `armCm`, `heightCm`, `inferenceMs`.
- Reason and error codes are kebab-case strings (`not-full-body`, `insecure-context`, `no-camera`).
- HTML ids and classes are kebab-case; buttons use a `btn-` prefix (`btn-rescan`, `btn-camera-start`).
- Storage keys are `sfs.`-prefixed (`sfs.state.v1`, `sfs.locale`).
- Garment ids are kebab-case (`colourbox-plain-white-tee`).

## Code Style

- 2-space indentation, double quotes, semicolons always, `const` / `let` only.
- Named exports only; no default exports except the i18n dictionaries (`en.js`, `id.js`).
- `async` / `await` in platform and app code; core code is synchronous.
- Short `//` comments state intent and cite decision ids (`P4-D16`, `D-09`, `PRIV-02`).
- JSDoc (`@param`, `@returns`) on core exports and platform factories.
- Assumed numbers carry an inline note: `// starting value (ASSUMED), confirm on real captures`.

## Module Rules

- Relative imports only; no bare imports in `src/` (the vendored bundle is imported by relative path).
- `src/core/` is pure: no browser globals, no clock, no outer-layer imports (`test/core.purity.test.js`).
- Browser access goes through `src/platform/` adapters with injectable dependencies (`createTiltSensor({ target, OrientationEvent })`, `createSound({ AudioContextCtor })`, `createStorage(storageObj)`).
- UI factories take their dependencies as one object: `createXView({ doc, t, formatNumber, onX })`.
- Only `src/platform/storage.js` touches `localStorage` (`test/privacy.static.test.js`).
- No network APIs, no `import.meta.env`, no hard-coded `http://` or `https://` in `src/`.

## DOM Rules

- Elements are found with `getElementById` and checked before use.
- Text is set with `textContent` only; `innerHTML`, `outerHTML`, `insertAdjacentHTML` and `document.write` are forbidden in `src/`.
- Lists are built with `createElement` and `append`.
- Visibility is toggled with the `hidden` attribute (`setAttribute("hidden", "")` / `removeAttribute("hidden")`); state classes use `classList.toggle`.
- No inline styles from JS; no canvas `toDataURL` / `toBlob`.

## i18n Rules

- Every user-facing string is a key in both `src/i18n/en.js` and `src/i18n/id.js`.
- `test/i18n.parity.test.js` checks identical key sets, matching `{param}` names and no empty values.
- Static markup uses `data-i18n` and `data-i18n-placeholder`; `applyTranslations(document)` fills them.
- Views re-render on the `#language-select` change so dynamic text follows the language.
- Numbers go through `formatNumber` (locale `en-US` or `id-ID`).
- Debug labels (engine info keys such as `inference ms`, `fps`) stay untranslated English.

## Error Handling

- Log caught errors with context: `console.error("Pose engine load failed:", err)`.
- Show users a translated message by key (`camera.error.<code>`, `scan.reason.<code>`), never a raw error.
- Pure functions return result objects (`{ ok: true }` / `{ ok: false, code }`) instead of throwing for expected failures; throw only for programmer errors (`Unknown calibration key`).
- Storage read and write errors fall back silently to empty state or memory.

## Tests

- `node:test` with `node:assert/strict`; files in `test/` named `*.test.js`, core unit tests in `test/core/`.
- Core logic is written test-first (RED commit, then GREEN commit).
- Static guard tests protect purity, privacy, vendoring, i18n parity and the build.
- Camera, sound, tilt and mask behaviour on phones is verified only on real devices (`validation/DEVICE-CHECKLIST.md`).

## CSS

- `css/style.css` uses hardcoded colours and no CSS custom properties; do not assume `var(--...)` tokens exist.
- No inline `style` attributes (CSP `style-src 'self'`).

<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

## System Overview

- `index.html` (CSP, markup, `data-i18n` keys) loads `src/main.js`.
- `src/main.js` wires flags, preflight, camera, pose, guided scan, review and rescan, and calls `initFitApp`.
- `src/app/fitApp.js` owns profile, catalog, fit check, history and settings; `guidedScan.js`, `burst.js`, `scanSession.js` run the scan.
- `src/platform/*` wraps browser APIs; `src/ui/*` renders with `textContent`; `src/core/*` holds pure maths and state (charts from `src/data/*` are passed in as arguments); `src/i18n/*` holds en and id strings.

## Layers

| Layer | Location | Contains | May import |
|-------|----------|----------|------------|
| Core | `src/core/` | pure measurement, quality gate, auto-lock reducer, calibration, fit, profile state, preflight, review parsing | `src/core/` only (charts arrive as arguments) |
| Data | `src/data/` | `colourboxCharts.js` (ColourBox size charts), `catalog.js` (`CATALOG`, `CUTS`) | `src/data/` |
| Platform | `src/platform/` | `camera.js`, `pose.js`, `frameLoop.js`, `sound.js`, `storage.js`, `tilt.js` browser adapters | `src/core/`, `vendor/` |
| App | `src/app/` | `fitApp.js`, `guidedScan.js`, `burst.js`, `scanSession.js` orchestration | core, data, platform, ui, i18n |
| UI | `src/ui/` | `createXView` factories: catalog, consent, debug, fit, guide, height form, profile, review, scan, settings | core, i18n (via injected `t`) |
| i18n | `src/i18n/` | `en.js`, `id.js`, `index.js` (`t`, `formatNumber`, `initLocale`, `setLocale`, `applyTranslations`) | own files |
| Entry | `src/main.js` | wiring of everything above | all |

- `src/core/` purity is enforced by `test/core.purity.test.js`: no `document`, `window`, `navigator`, `localStorage`, `performance`, `Date.now`, and no imports from platform, ui, app or i18n.
- Time enters core only as a `t` argument on events (`stepLock`), never from a clock.

## Entry Point

- `index.html` loads `src/main.js` as a module; Vite bundles it.
- `src/main.js` order: `initLocale(storage.loadLocale() ?? navigator.language)`, `applyTranslations`, `initFitApp`, read URL flags, `preflightIssues`, then wire camera, pose, frame loop, guided scan, review and buttons.
- Missing required markup logs `console.error("Page markup is missing a required element.")` and skips the scan wiring.

## Data Flow: Guided Scan to Fit Check

- Height form (`src/ui/heightForm.js`, `validateHeightCm`, 120 to 220 cm) sets `heightCm` in memory only.
- Consent (`src/ui/consentView.js`) must be accepted once per page load before the camera starts; Accept also unlocks sound and starts tilt (user gesture for iOS). Decline routes to manual entry.
- `ensurePose()` loads `createPose` lazily; failure shows an engine error and routes to manual entry.
- `camera.start({ facingMode })` returns `{ ok }` or an error `code` (`denied`, `no-camera`, `busy`, `overconstrained`, `unknown`); failure routes to manual entry.
- `createFrameLoop` (12 fps) calls `pose.detect` per frame; the mask is requested only in debug or while guiding.
- `guidedScan.onFrame` runs `checkFrame` (quality gate) and `stepLock` (auto-lock) per frame and keeps only reason codes and body anchors.
- On lock, `capture(view)` runs `runBurst` (15 frames, 8 ok minimum) -> `readFrame` per frame -> `summariseBurst` -> `scanSession.record`.
- After front and side, `combineScan` builds the measurements; `maybeOpenReview` stops the camera and opens `reviewView`.
- Review save -> `fitApp.applyReview` -> `applyRescan` (every measurement replaced; source `scanned` or `edited`) -> `storage.saveState` -> `goToFitCheck`.
- Fit check: `checkFit({ chart, sizeLabel, preference, body })` and `recommendAll(chestCm, chart)`; each check is added to history with `addHistoryEntry` (newest first, cap 50).
- Rescan (`#btn-rescan`, `beginRescan`): resets the scan, asks for height when none is set, then restarts the guided scan; saving replaces the old values.
- Manual fallback: debug capture buttons stop the guided scan and use a 5 s countdown burst.

## Startup Preflight

- `preflightIssues({ secureContext, cameraApi, webAssembly })` returns codes in fixed order; `src/main.js` shows them in `#preflight-status` with `preflight.manual`, re-rendered on language change.
- Informational only: consent, camera start and manual entry still work.

## State and Storage

- Saved state (`sfs.state.v1`) holds profile name, preference, five measurements with sources, and fit history; `sfs.locale` holds `en` or `id`.
- Only `src/platform/storage.js` touches `localStorage`; it sanitises on load and save (`sanitiseState`) and falls back to memory when storage is blocked.
- Height, consent, captured readings and scan session are in memory for the page load only.
- Settings "delete all" calls `storage.clearAll()` and resets to `emptyState()`.

## Privacy Constraints

- No image, frame, mask or video is stored, exported or sent; only numbers.
- No network calls at runtime; CSP allows only same-origin resources plus `wasm-unsafe-eval`.
- `test/privacy.static.test.js` forbids storage, network, export and HTML-injection APIs in `src/` (`localStorage` allowed only in `src/platform/storage.js`).
- `test/privacy.repo.test.js` checks git tracks no image or video and `.gitignore` blocks photos and recordings.
- The camera stops on `pagehide` and when the page is hidden, and never restarts by itself.

## Validation Tooling

- `validation/report.mjs` (Phase 1): tape error and size agreement per `validation/PASS-CRITERIA.md`.
- `validation/calibrate.mjs` (Phase 3): repeatability, tape error and suggested calibration offsets from `phase3-readings.csv`.
- `validation/study.mjs` (Phase 5): accuracy study against `TARGETS` (shoulder MAE 2.5 cm, chest MAE 3.5 cm) and size agreement; writes `STUDY-RESULTS.md`.
- Scripts import pure `src/core/` and `src/data/` modules directly in Node.

## Error Handling

- Caught errors are logged with `console.error("<context>:", err)`.
- User-facing failures set translated text by key (`camera.error.<code>`, `engine.error.load-failed`, `scan.reason.<code>`) and route to manual entry where scanning cannot continue.
- Fit check failures hide the result instead of showing a wrong one.

## Removed

- The GreenWear AR prototype was removed in 2026-10 and lives only in git history.

<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
