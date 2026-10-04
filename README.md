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
