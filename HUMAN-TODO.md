# Human to-do list

Nothing in this file has been done by an agent. No readings, device results or verdicts were invented. Every item is `Status: not done` until you do it and record it in the file named in that item. Use anonymous subject IDs (S1 to S9) only. No photos or videos go into the repo.

Requirements are not ticked in `.planning/REQUIREMENTS.md`; tick them only after the real data exists.

## 1. Phase 1 plan 01-07: device run, garment check, first readings

1. Run `npm run dev`, open the printed `https://<LAN-IP>:5173/` address on a real iPhone, an Android phone and a laptop, and accept the certificate.
2. Fill in every cell of [validation/DEVICE-CHECKLIST.md](validation/DEVICE-CHECKLIST.md) (camera lifecycle, landmarks, network panel, iOS Safari with Tasks Vision 1.0.1, Indonesian wording read by a native speaker).
3. Measure one physical plain white tee and fill in [validation/GARMENT-CHECK.md](validation/GARMENT-CHECK.md).
4. Ask ColourBox for the boxy size chart and note the answer in [validation/GO-NO-GO.md](validation/GO-NO-GO.md) under "Boxy chart status".
5. Type the first tape and scan rows into [validation/readings.csv](validation/readings.csv) following [validation/PROTOCOL.md](validation/PROTOCOL.md).

Command after: `node validation/report.mjs`
Unblocks: ACC-03 (evidence), MEAS-01, MEAS-02, CAPT-07 (device evidence); PRIV-02 network check evidence.
Status: not done

## 2. Phase 1 plan 01-08: evidence and go/no-go decision

1. Run `node validation/report.mjs` and read the "What the written criteria say" output against [validation/PASS-CRITERIA.md](validation/PASS-CRITERIA.md).
2. Record the evidence and decisions in [validation/GO-NO-GO.md](validation/GO-NO-GO.md): waist (keep as estimate, manual-entry only, or defer), model variant (`full` or `heavy`), final accuracy targets.
3. If a target changes, add a dated line there and change the constant in code; never edit a results file.

Command: `node validation/report.mjs`
Unblocks: MEAS-03 decision, final targets for ACC-01 and ACC-02.
Status: not done

## 3. Phase 3 plan 03-05 Task 2: tape and repeatability session

1. Do the bad-capture checks and good captures, two tape readings per subject, and 3 front+side scans per device.
2. Type the rows into [validation/phase3-readings.csv](validation/phase3-readings.csv).
3. Run `node validation/calibrate.mjs validation/phase3-readings.csv`.
4. Apply the fitted offsets by hand in `src/core/calibration.js` (set `source: "fitted"`); adjust any misbehaving `QUALITY` value; update `test/scan.test.js` and `test/scan.e2e.test.js` if they assert changed calibration values.
5. Replace the "not measured" entries in [validation/PHASE3-RESULTS.md](validation/PHASE3-RESULTS.md).
6. Run `npm test`.

Unblocks: MEAS-01, MEAS-02, MEAS-03, MEAS-04, MEAS-05.
Status: not done

## 4. Phase 4 plan 04-07: real-device guided scan check

1. Run `npm run dev`. On a laptop webcam: decline consent once (manual entry message, camera stays off), then accept; check the outline, live hints, hold cue, front lock with no button, turn cue, side lock, review with five values, edit one value, Save.
2. On an upright phone (iPhone Safari, and Android Chrome if available): same scan; check sound (the iOS silent switch mutes it, note it), tilt prompt and frame rate.
3. Deny the camera in browser settings: the error shows and the page routes to manual entry.
4. Record results and any `QUALITY` / `AUTO_LOCK` tuning needs in [validation/DEVICE-CHECKLIST.md](validation/DEVICE-CHECKLIST.md) problems section (and the full-flow rows in item 5).

Unblocks: PRIV-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06, CAPT-07, CAPT-08, MEAS-06.
Status: not done

## 5. Phase 5: full-flow run on three devices

1. Run `npm run vendor:check` then `npm run demo`.
2. On iPhone Safari, Android Chrome and the laptop, open the printed `https://<LAN-IP>:4173/` address and go through every row of [validation/FLOW-CHECKLIST.md](validation/FLOW-CHECKLIST.md), including Scan again, the manual entry path, language switch and the network and storage check.
3. Replace each `not run` with `pass`, `fail` or `partial` and a note, only after doing the check.

Unblocks: MEAS-09, MEAS-08, CAT-03, PRIV-01 (flow evidence), PRIV-02 network check.
Status: not done

## 6. Phase 5: accuracy study

1. Follow [validation/STUDY-PROTOCOL.md](validation/STUDY-PROTOCOL.md): at least 2 subjects per device class (phone, laptop), two tape readings and the review-screen scan value per measurement.
2. Type rows into [validation/study-readings.csv](validation/study-readings.csv).
3. Run `node validation/study.mjs --write`. Do not edit [validation/STUDY-RESULTS.md](validation/STUDY-RESULTS.md) by hand.

Unblocks: ACC-01, ACC-02, ACC-03.
Status: not done

## 7. Phase 5: fallback demo recording

1. Follow [validation/DEMO-RECORDING.md](validation/DEMO-RECORDING.md): 2 to 3 minutes, a consenting team member in everyday clothes, shot list in order.
2. Save the video in `recordings/` (gitignored) or on a USB drive and a cloud drive. Never commit it.
3. Check it plays offline on the demo laptop, then change the `Status:` line in the file.

Unblocks: demo hardening (no requirement ID).
Status: not done

## 8. Native-speaker review of Indonesian strings

1. Have a native speaker read every Indonesian string in `src/i18n/id.js` as it appears on screen (switch language on every screen).
2. List corrections in [validation/DEVICE-CHECKLIST.md](validation/DEVICE-CHECKLIST.md) under "Indonesian wording", then apply them in `src/i18n/id.js` and run `npm test`.

Unblocks: I18N-01 wording quality (already ticked; this only confirms copy).
Status: not done

## Can be combined

Items 1, 3 and 6 can share one day, the same subjects and the same tape readings, but each record stays in its own file. Items 4 and 5 can share one device session; record the guided-scan notes and the flow rows in their own files.

## Checklist

- [ ] 1. Phase 1 01-07: device run, garment check, readings
- [ ] 2. Phase 1 01-08: report and go/no-go
- [ ] 3. Phase 3 03-05: tape session and calibration
- [ ] 4. Phase 4 04-07: guided scan device check
- [ ] 5. Phase 5: full-flow run (FLOW-CHECKLIST)
- [ ] 6. Phase 5: accuracy study (STUDY-PROTOCOL)
- [ ] 7. Phase 5: fallback demo recording (DEMO-RECORDING)
- [ ] 8. Native-speaker review of Indonesian strings
