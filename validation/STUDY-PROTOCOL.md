# Phase 5 tape study protocol

This is the full session guide for the accuracy study (ACC-01, ACC-02, ACC-03). Tape method details are in `validation/DEFINITIONS.md` and `validation/PROTOCOL.md`. This file holds no results.

## Who

- Team members only. Ask for consent verbally before starting.
- Assign anonymous IDs S1 to S9 on paper. Keep the ID-to-name list on paper, outside the repo. Never type names into the repo.
- At least 2 subjects per device class (phone, laptop). More is better.

## Bring

- A soft tape measure.
- The three devices: an iPhone, an Android phone, a laptop.
- A phone stand or tripod.

## Setup

1. On the laptop run `npm run demo`.
2. Open the HTTPS address it prints on each phone and on the laptop.
3. Accept the certificate warning (self-signed, expected).
4. Never take or keep photos or video of subjects. Do not save any media into the repo folder.

## Per subject

1. Tape shoulder and chest twice each, following `validation/DEFINITIONS.md`. Tape goes over a bra or a thin fitted layer.
2. Dress the subject in everyday clothes for the scans.
3. On each device, run 3 full guided scans (repeat 1, 2, 3).
4. After each scan, type the values from the review screen, before any edit, as rows in `validation/study-readings.csv`.
5. Waist, torso and arm rows are optional. Mark them as estimates in `notes`.
6. Record the browser (safari, chrome, firefox, edge, other).

CSV header: `subject,device,browser,measurement,repeat,tape1_cm,tape2_cm,scan_cm,notes`

- device: iphone, android or laptop.
- measurement: shoulder, chest, waist, torso or arm.
- notes: no commas, 80 characters or fewer, no media file names.

## Targets

Per device class (phone, laptop):

- Shoulder mean absolute error: 2.5 cm or less (ACC-01).
- Chest mean absolute error: 3.5 cm or less (ACC-02).
- Size agreement: for every subject the recommended size from the scan chest equals the one from the tape chest, or the scan is borderline with the tape size as its neighbour (ACC-02).

A revised target needs a dated line in `validation/GO-NO-GO.md` before the data is analysed. Never edit the results file by hand.

## Closing steps

1. `node validation/study.mjs --check`
2. `node validation/study.mjs --write`
3. Commit `validation/study-readings.csv` and `validation/STUDY-RESULTS.md`. Check `git status` first: no photos, no videos, no names.

## Reading the outcome

- INSUFFICIENT DATA: a device class has fewer than 2 subjects. Collect more.
- NO-GO: targets are not met on either class.
- CONDITIONAL: all three targets are met on one class only.
- GO: all three targets are met on both classes.

Report CONDITIONAL or NO-GO as it is. Do not adjust data or targets to get a better label.
