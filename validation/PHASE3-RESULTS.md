# Phase 3 results

Status: NOT MEASURED. The team scan and tape session (plan 03-05, Task 2) has not been run. No readings exist in `validation/phase3-readings.csv` (header only). Every accuracy and repeatability number below is "not measured". Nothing here shows that Phase 3 meets its accuracy targets.

## Session

- Devices: not measured (planned: phone and laptop)
- Subject IDs: none (planned: S1..S9, anonymous)
- Clothing label: everyday (planned)

## Repeatability (target: range of scan_cm over repeats <= 1.0 cm)

| Measurement | Phone | Laptop | Target |
|-------------|-------|--------|--------|
| Shoulder | not measured | not measured | <= 1.0 cm |
| Chest | not measured | not measured | <= 1.0 cm |
| Waist (estimate) | not measured | not measured | <= 1.0 cm |
| Torso length (estimate) | not measured | not measured | <= 1.0 cm |
| Arm length (estimate) | not measured | not measured | <= 1.0 cm |

## Accuracy against tape

| Measurement | Result | Target |
|-------------|--------|--------|
| Shoulder mean abs error | not measured | about 2.5 cm |
| Chest mean abs error | not measured | about 3.5 cm |
| Chest size agreement (sizeFromBust) | not measured | agree for more than half the subjects |
| Waist error (estimate) | not measured | none (estimate) |
| Torso length error (estimate) | not measured | none (estimate) |
| Arm length error (estimate) | not measured | none (estimate) |

## Calibration source per key (src/core/calibration.js)

| Key | Offset cm | Source | Note |
|-----|-----------|--------|------|
| shoulderCm | 2.0 | prior | from DEFINITIONS.md joint-centre argument, not fitted |
| chestCm | 0 | prior | identity, no tape data |
| waistCm | 0 | prior | identity, estimate |
| torsoCm | 0 | prior | identity, estimate |
| armCm | 0 | prior | identity, estimate |

No entry is "fitted". Fitting needs at least 2 subjects per measurement (P3-D23).

## Quality threshold changes

None. All `QUALITY` values in `src/core/quality.js` are still the starting values marked ASSUMED. The bad-capture checks (feet out of frame, too close, too far, tilted phone, arms against body, wrong side pose, swaying) have not been tried on real captures, so it is unknown whether any threshold rejects good captures or passes bad ones.

## Shortfalls

- Repeatability of about 1 cm: not measured.
- Shoulder (about 2.5 cm) and chest (about 3.5 cm plus size agreement) against tape: not measured.
- Calibration is entirely prior, not tape-fitted.
- Quality thresholds are unconfirmed on real captures.

## To close this (Jordan)

1. Follow the steps in `03-05-PLAN.md` Task 2: bad-capture check, good capture, tape readings per `validation/PROTOCOL.md` and "Phase 3 additions" in `validation/DEFINITIONS.md`, 3 front+side scans per device, rows into `validation/phase3-readings.csv`.
2. Run `node validation/calibrate.mjs validation/phase3-readings.csv`.
3. Apply suggested offsets by hand into `src/core/calibration.js` with `source: "fitted"`, adjust any misbehaving `QUALITY` value, and replace the "not measured" entries above.
