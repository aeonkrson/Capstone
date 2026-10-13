# Codebase Structure

**Analysis Date:** 2026-10-13

## Directory Layout
```text
.
├── index.html                 page shell, meta CSP, markup with data-i18n keys
├── css/style.css              all styles
├── src/
│   ├── main.js                entry: flags, preflight, camera, pose, guided scan, review, rescan
│   ├── core/                  pure logic (no browser globals, no clock)
│   │   ├── landmarks.js       landmark indices and skeleton connections
│   │   ├── geometry.js        dist, median, MAD, summarise, ellipse perimeter
│   │   ├── mask.js            segmentation mask bbox and torso runs
│   │   ├── scale.js           cm per pixel from height and mask
│   │   ├── height.js          height validation (120 to 220 cm)
│   │   ├── measure.js         per-view measurements and bust circumference
│   │   ├── scan.js            per-frame reading, burst summary, front+side combine
│   │   ├── calibration.js     CALIBRATION table (prior offsets)
│   │   ├── quality.js         QUALITY thresholds, frame and stability gates, camera pitch
│   │   ├── autoLock.js        AUTO_LOCK timings, hands-free lock reducer
│   │   ├── poseGuide.js       guide outline figure
│   │   ├── frameRate.js       fps from frame timestamps
│   │   ├── preflight.js       startup capability codes
│   │   ├── review.js          review rows and input parsing
│   │   ├── bodyMeasurements.js body field ranges and validation
│   │   ├── profileState.js    saved state shape, applyScan/applyReview/applyRescan, history, sanitise
│   │   ├── fit.js             size recommendation and fit check
│   │   ├── sizeFromTape.js    tape bust to size (validation reference)
│   │   └── types.js           JSDoc typedefs
│   ├── data/
│   │   ├── colourboxCharts.js ColourBox tee size charts
│   │   └── catalog.js         CATALOG shown to the user
│   ├── platform/              browser adapters: camera, pose, frameLoop, sound, storage, tilt
│   ├── app/                   fitApp, guidedScan, burst, scanSession
│   ├── ui/                    view factories: catalog, consent, debug, fit, guide, heightForm, profile, review, scan, settings
│   └── i18n/                  en.js, id.js, index.js
├── vendor/mediapipe/          vision_bundle.mjs, wasm/, models/pose_landmarker_full.task, SHA256SUMS
├── scripts/
│   ├── vendor-mediapipe.mjs   vendor, download models, write or check hashes
│   └── copy-vendor-to-dist.mjs copy and hash-check wasm and models into dist/
├── test/                      node:test files (*.test.js), test/core/, test/data/, test/helpers/
├── validation/                protocols, checklists, readings CSVs, report/calibrate/study scripts, results
├── vite.config.js             basic-ssl, ws off, fs.deny for validation and .planning
├── package.json               exact-pinned devDependencies and scripts
├── README.md                  run on the LAN, debug flags
└── FILES.md                   short file map
```

## Where to Add New Code
- New pure calculation or rule: `src/core/<name>.js` with a test in `test/core/<name>.test.js` written first.
- New browser API use: a `createX` adapter in `src/platform/` with injectable globals and a test with fakes.
- New screen or panel: `src/ui/<name>View.js` factory plus markup in `index.html` with `data-i18n` keys.
- New user-facing string: the same key in `src/i18n/en.js` and `src/i18n/id.js`, plus the expected-key list in `test/i18n.parity.test.js`.
- New garment: chart in `src/data/colourboxCharts.js` (named fields), entry in `src/data/catalog.js`.
- New tunable threshold: the existing frozen table (`QUALITY`, `AUTO_LOCK`, `CALIBRATION`) with an ASSUMED note.
- New validation analysis: `validation/<name>.mjs` importing pure core modules, with `test/validation.<name>.test.js`.

## Not Tracked
- `node_modules/`, `dist/`, the heavy model, `validation/private/`, `*.session.json`, photos and videos (`.gitignore`).

---

*Structure analysis: 2026-10-13*
