# Coding Conventions

**Analysis Date:** 2026-10-13

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

---

*Convention analysis: 2026-10-13*
