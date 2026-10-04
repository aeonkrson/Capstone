# Pass criteria

Frozen before data collection. Any change after the first data row in readings.csv must be listed in GO-NO-GO.md as a post-hoc change.
Frozen with it, under the same rule: validation/DEFINITIONS.md, validation/PROTOCOL.md, src/core/sizeFromTape.js, the bust row selection in src/core/mask.js and the bust band constants BUST_BAND_MIN_FRAC = 0.22 and BUST_BAND_MAX_FRAC = 0.36 in src/core/measure.js.

## Reference values

Tape value is the mean of the two tape readings, not rounded. Scan value is the median of the repeats for that subject, device and model. Error is scan minus tape. If the two tape readings differ by more than 2.0 cm, the row is noted as `tape-disagree` and the mean is still used.

## Shoulder width

D-13. Per device, default model.

- PASS: mean absolute error across subjects at most 2.5 cm and no single absolute error above 4.0 cm.
- PASS-WITH-OFFSET: the criterion fails, every signed error has the same sign, and the mean absolute error after subtracting the mean signed error is at most 2.5 cm. A bias is suspected and must be fitted and checked in Phase 3. It is not a validated result and does not meet D-13's 2.5 cm, so it can give at most a CONDITIONAL overall outcome, never GO (user decision at plan approval, 2026-10-03).
- Otherwise FAIL.

## Bust

D-12. Decided by size agreement, not by cm error.

Sizes step by 2 cm of flat chest, which is 4 cm of circumference (D-07). The charts are assumed to be flat widths, doubled to a circumference in one function (D-04). The rule: the size is the smallest plain-tee size whose garment bust circumference (flat chest x 2) is at least the bust value plus `MIN_EASE_CM = 8`.

| Bust (cm) | Size |
|---|---|
| 82.0 or less | below-XS |
| above 82.0 up to 86.0 | XS |
| above 86.0 up to 90.0 | S |
| above 90.0 up to 94.0 | M |
| above 94.0 up to 98.0 | L |
| above 98.0 up to 102.0 | XL |
| above 102.0 | above-XL |

A value within `BORDERLINE_BAND_CM = 1.0` of a boundary (82, 86, 90, 94, 98, 102) is borderline, and its neighbour is the size on the other side of that boundary.

Agreement between tape size and scan size:

- `same`: both land on the same size.
- `adjacent-borderline`: one size apart, the scan value is borderline, and its neighbour is the tape size.
- `disagree`: anything else.

Per device: PASS when more than half of the subjects are `same` or `adjacent-borderline`. The cm error is logged for every subject and does not decide.

The tape bust is taken over a bra or thin fitted layer (user-confirmed rule) while the scan is in everyday clothes (D-11), so every scan-versus-tape gap includes the everyday-clothing effect. The scan's bust row is the widest torso row in the 22% to 36% band (DEFINITIONS.md), so the bust verdict tests that row rule and the scan together and cannot tell a badly placed row from an infeasible scan.

## Overall outcome

- GO: bust passes on phone and laptop, and shoulder is PASS (not PASS-WITH-OFFSET) on phone and laptop.
- CONDITIONAL: bust passes on at least one device but the result is not GO. Every shortfall (a device where bust fails, a shoulder PASS-WITH-OFFSET, a shoulder FAIL) is recorded as a known limit for Phase 3, and a shoulder PASS-WITH-OFFSET must be confirmed by Phase 3.
- NO-GO for scan-driven bust: bust passes on neither device. Bust then becomes "estimate, then confirm or correct".
- INSUFFICIENT DATA: fewer than two subjects.

A device with no rows counts as not passing.

## Known limits

Written before any data.

- Loose everyday clothing can put the widest row on a fold or hem and push the bust reading high (user decision at plan approval).
- The widest front row may sit near the armpits rather than at the fullest point.
- Arms touching the torso inflate the width.
- The ellipse reads low on rectangular torsos.
- The bust verdict depends on the row rule as well as on feasibility.

## Model variant

`heavy` replaces `full` only if, on the subjects scanned with both, it lowers the mean absolute shoulder error by at least 0.5 cm or turns a bust `disagree` into agreement, and its inference time on the phone stays at or below 1000 ms per frame. Otherwise `full`.

## Repeatability

The range (largest minus smallest) over the three repeats is reported per subject, device and measurement. It is reported, not a pass condition, in this phase.

## How results are labelled

D-11. Every result line says: everyday clothes, N subjects (by ID), team members only. No fitted-clothing accuracy is claimed. No percentage accuracy is claimed.

## Not decided by this data

Waist is not scanned (D-06). Torso length and arm length are not measured in this phase.
