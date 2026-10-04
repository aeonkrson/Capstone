# Go / no-go record

Status: not decided

## Decisions already recorded

- Vendor folder at the repository root and committed; the heavy model is ignored until chosen.
- Debug view is `?debug=1` in the real app.
- Readings are typed from the screen into `validation/readings.csv`; there is no export button.
- Height range is 120 to 220 cm, decimal comma accepted.
- Tape-to-size rule: smallest plain-tee size whose garment bust (flat chest x 2) is at least bust + 8 cm; borderline band 1.0 cm.
- Bust row is the widest torso row in the 22% to 36% band, measured as the run containing the body midline; each view uses its own row (user decision at plan approval, 2026-10-03).
- Tape bust is taken over a bra or thin fitted layer (user-confirmed at plan approval).
- A shoulder PASS-WITH-OFFSET gives at most CONDITIONAL, never GO (user decision at plan approval).
- Reading notes carry the typed height and both bust row fractions.
- The dev server denies `validation/` and `.planning/`.
- `vision_bundle.mjs` has no bare imports.
- Waist is dropped from the scan (D-06) subject to confirmation below.

## Known limits

Written before any data.

- Loose everyday clothing can put the widest row on a fold or hem and push the bust reading high (user decision at plan approval).
- The bust verdict depends on the row rule as well as on feasibility, so a NO-GO may mean a badly placed row rather than an infeasible scan.
- The widest front row may sit near the armpits.
- Arms touching the torso inflate the width.
- Scan-versus-tape gaps include the everyday-clothing effect because the tape is over a bra or thin layer.

Added after data:

## Evidence

### Devices

### Report output

### Garment check

### Boxy chart status

### Subjects measured and any shortfall

### Post-hoc changes to the pass criteria

## Decisions

- Outcome: 
- Measurement set, including whether waist is dropped (D-06): 
- Torso length and arm length: 
- Model variant: 
- Silhouette source (PoseLandmarker mask, or the ImageSegmenter or matting-model contingency named in research SUMMARY.md): 
- Running mode and delegate: 
- Accuracy targets going forward: 
- Known limits handed to Phase 3: 

## Follow-ups for planning documents

