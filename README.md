# Size Fit Scanner (working title)

A browser app for online shoppers who cannot try clothes on. The user scans their body from the front and the side with a phone or laptop camera, and the app estimates body measurements and says whether a chosen garment size fits.

## Run it

1. `npm install`
2. `npm run dev`
3. On the phone, open the `https://<LAN-IP>:5173/` address printed by Vite and accept the self-signed certificate warning once.

The dev server refuses to serve `validation/` and `.planning/`.

Laptop-only alternative: `python3 -m http.server 8000 --bind 127.0.0.1`, then open `http://localhost:8000/`. Keep the `--bind 127.0.0.1`: a plain `http://` LAN address has no camera access, and a plain server bound to the network would expose every file in the folder.

## Tests

`npm test`

## Privacy

Camera images are processed on the device and are never saved or uploaded. The body detection files are self-hosted under `vendor/mediapipe/` at a pinned version; `npm run vendor:check` verifies their hashes.

## Demo

Runbook for showing the app on real devices:

1. `npm install`
2. `npm run vendor:check` (verifies the self-hosted body detection files).
3. `npm run demo` (builds into `dist/`, copies the detection files and serves them over HTTPS on the network).
4. Open the printed `https://<LAN-IP>:4173/` address on each device and accept the self-signed certificate once.
5. Start on the laptop first, then the phone. The phone and laptop must be on the same network.
6. If the phone cannot reach the laptop, turn on the laptop's own hotspot and join the phone to it, then use the new address.
7. If the camera fails, use "Enter measurements by hand".
8. If everything fails, play the fallback recording described in `validation/DEMO-RECORDING.md`.

The page shows a startup message when the connection is not secure, the camera API is missing or WebAssembly is missing. Being offline is fine: every file is served from the same address.

## Scan again

"Scan again" appears in the body section once at least one measurement is saved. It runs the same guided scan and review. Saving the review replaces all five saved measurements; an optional value left empty (waist, arm) is cleared. Past fit checks in the history are kept. The fit result on screen is cleared and you run the check again.

## Accuracy study

The study compares the app against a tape measure on team members. Follow `validation/STUDY-PROTOCOL.md`, type the rows into `validation/study-readings.csv` (anonymous subject IDs only, no photos or videos anywhere in the repo), then run:

`node validation/study.mjs --write`

This regenerates `validation/STUDY-RESULTS.md`; never edit that file by hand. The outcome is GO, CONDITIONAL, NO-GO or INSUFFICIENT DATA (fewer than 2 subjects in a device class). Current outcome: INSUFFICIENT DATA, because the session has not been run.

## Outstanding human steps

Everything that needs people, tape and real devices is listed in order in `HUMAN-TODO.md`.

## Validation

Tape-measure comparison data and pass criteria live in `validation/`. Three scripts read three CSV files: `report.mjs` (Phase 1, `readings.csv`), `calibrate.mjs` (Phase 3, `phase3-readings.csv`) and `study.mjs` (Phase 5, `study-readings.csv`).

## Debug view

Open the address with `?debug=1`. Optional parameters: `model=heavy` (larger pose model), `camera=rear` (back camera) and `delegate=gpu` (GPU instead of CPU).

The live panel shows the shoulder width, the silhouette extent at the bust level (both in cm, scaled from the height you typed), the `bust row` fraction and `cm/px`. On the picture, the dashed lines are the edges of the bust band (22% to 36% of the way from the shoulders to the hips), the solid line is the chosen bust row (the widest torso row in the band) and the other two lines are the top of the head and the soles. The `bust row` fraction goes into the `ff=` and `sf=` notes tokens. An `fps` line in the engine info shows the measured frame rate.

Capture front and Capture side each wait 5 seconds and then take 15 frames; the Captured panel keeps medians, a spread and a bust circumference once both views exist. Only numbers are kept, in memory, until Clear readings or a reload. Read the values off the screen into `validation/readings.csv` following `validation/PROTOCOL.md`.

Readings are everyday-clothes readings with no calibration. They are not a fitted-clothing result.
