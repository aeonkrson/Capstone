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

## Validation

Tape-measure comparison data and pass criteria live in `validation/`.

## Debug view

Open the address with `?debug=1`. Optional parameters: `model=heavy` (larger pose model), `camera=rear` (back camera) and `delegate=gpu` (GPU instead of CPU).

The live panel shows the shoulder width, the silhouette extent at the bust level (both in cm, scaled from the height you typed), the `bust row` fraction and `cm/px`. On the picture, the dashed lines are the edges of the bust band (22% to 36% of the way from the shoulders to the hips), the solid line is the chosen bust row (the widest torso row in the band) and the other two lines are the top of the head and the soles. The `bust row` fraction goes into the `ff=` and `sf=` notes tokens.

Capture front and Capture side each wait 5 seconds and then take 15 frames; the Captured panel keeps medians, a spread and a bust circumference once both views exist. Only numbers are kept, in memory, until Clear readings or a reload. Read the values off the screen into `validation/readings.csv` following `validation/PROTOCOL.md`.

Readings are everyday-clothes readings with no calibration. They are not a fitted-clothing result.
