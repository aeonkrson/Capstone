# Codebase Concerns

**Analysis Date:** 2026-10-13

## Accuracy Not Yet Validated
- Issue: no tape-measure readings exist; the accuracy targets (shoulder about 2.5 cm, chest about 3.5 cm, size agreement) are unproven.
- Pointers: `validation/phase3-readings.csv` and `validation/study-readings.csv` are header only; `validation/PHASE3-RESULTS.md` says NOT MEASURED; `validation/STUDY-RESULTS.md` shows 0 subjects; `validation/GO-NO-GO.md` status "not decided".
- Fix: run the study in `validation/STUDY-PROTOCOL.md`, then `node validation/study.mjs --write`.

## Calibration Offsets Are Priors
- Issue: every `CALIBRATION` entry has `source: "prior"` (shoulder +2.0 cm, others identity).
- Pointer: `src/core/calibration.js`; fit with `node validation/calibrate.mjs` after the Phase 3 session.

## Assumed Thresholds
- Issue: every `QUALITY` gate value and every `AUTO_LOCK` timing is marked ASSUMED and has not been tuned on real captures.
- Pointers: `src/core/quality.js` (`QUALITY`), `src/core/autoLock.js` (`AUTO_LOCK`), burst sizes in `src/app/burst.js`.

## Size Chart Data Partly Placeholder
- Issue: chart widths are assumed flat widths (D-04); `backLength` uses a placeholder midpoint of a published range, so the length verdict in `checkFit` is not trustworthy.
- Pointers: `src/data/colourboxCharts.js` (`placeholder: true`), `src/core/fit.js` (`size.backLength.midpoint`), `validation/GARMENT-CHECK.md`.
- Issue: the catalog `cut: "regular"` is assumed from the product name (`src/data/catalog.js`).

## Real-Device Behaviour Unverified
- Issue: iOS Web Audio unlock, iOS motion permission for tilt, mask frame rate on mid-range phones and GPU delegate stability are not confirmed on hardware.
- Pointers: `src/platform/sound.js`, `src/platform/tilt.js`, `src/platform/pose.js`, `validation/DEVICE-CHECKLIST.md`, `validation/FLOW-CHECKLIST.md`.

## Indonesian Copy Not Native-Reviewed
- Issue: `src/i18n/id.js` matches English keys and params (parity test) but wording has not been reviewed by a native speaker.

## Demo Certificate
- Issue: `@vitejs/plugin-basic-ssl` serves a self-signed certificate; each demo phone must accept a browser warning once.
- Pointers: `vite.config.js`, `README.md`, `validation/DEMO-RECORDING.md`.

## Single Large Entry Module
- Issue: `src/main.js` (about 520 lines) wires camera, pose, guided scan, manual capture, review and rescan in one scope; changes there need the flow checklist re-run.
- Pointer: `src/main.js`; flow tests cover the app modules, not `main.js` itself.

---

*Concerns audit: 2026-10-13*
