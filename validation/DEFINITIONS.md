# Definitions: what the tape measures and what the scan measures

Written before any reading. Frozen with PASS-CRITERIA.md.

## Shoulder width

Tape: the straight-line distance between the two acromion points (the bony tip at the outer top of each shoulder). Hold the tape straight and taut across the upper back. Do not follow the curve of the back. Arms relaxed at the sides.

Scan: the straight-line distance between pose landmarks 11 and 12 (shoulder joint centres) in the front view, converted with that view's cm per pixel.

Known difference: joint centres sit inside the acromion points, so the scan is expected to read 1 to 3 cm lower. Phase 1 applies no correction and logs the signed error.

## Bust circumference

Tape: around the fullest point of the bust, tape level all the way round, snug without compressing, at the end of a normal breath out. Stand upright with arms relaxed. Measure over a bra or thin fitted layer, not over the everyday top. The over-a-bra rule is a user-confirmed rule (Jordan, at plan approval, 2026-10-03).

Scan: for each view separately, the bust row is the widest torso row of the silhouette inside the bust band. The band runs from 22% to 36% of the way from the midpoint of the shoulder landmarks (11 and 12) down to the midpoint of the hip landmarks (23 and 24). The torso width of a row is the length of the one contiguous silhouette run that contains the body midline, the straight line from the shoulder midpoint to the hip midpoint. Arms held away from the body form separate runs and are not counted. If rows tie, the higher row is used.

- The front view gives the bust width at its widest row.
- The side view gives the bust depth at its own deepest row in the same band, because the fullest point of the bust shows as depth.
- The circumference is the Ramanujan ellipse perimeter from half the width and half the depth.

The band edges are `BUST_BAND_MIN_FRAC = 0.22` and `BUST_BAND_MAX_FRAC = 0.36`, frozen with the pass criteria.

Known differences:

- The silhouette includes clothing. Loose everyday clothing can put the widest row on a fold or hem and push the reading high.
- The widest front row is often near the armpits, above the fullest point of the bust.
- Arms touching the torso join the torso run and inflate the width (the debug view then shows the arms-merged note).
- An ellipse reads low on rectangular torsos.
- Arms can add depth in the side view.

## Height and scale

Barefoot, standing straight, hair flat with no bun or hat. Typed into the app. cm per pixel is height divided by the silhouette's head-top-to-sole extent, computed separately for each view.

## Stance for scans

Front: face the camera, feet hip-width apart, arms straight and held out from the body at about 30 to 45 degrees (an A-pose), so there is a clear gap between each arm and the torso at chest level.

Side: turn 90 degrees, arms relaxed at the sides, look straight ahead.

Normal breathing in both.

## Clothing label

`everyday` means whatever top the subject normally wears (D-11). No fitted-clothing scans in this phase.

## Not measured in this phase

Waist (D-06, dropped subject to the go/no-go), torso length, arm length.
