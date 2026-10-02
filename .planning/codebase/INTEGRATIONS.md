# External Integrations

**Analysis Date:** 2026-10-02

## APIs & External Services

**CDN / ML runtime:**
- jsDelivr (`https://cdn.jsdelivr.net`) - serves MediaPipe scripts and Pose model/WASM assets
  - SDK/Client: `@mediapipe/pose` (global `Pose`) and `@mediapipe/camera_utils`, loaded by `<script>` tags in `index.html` (lines 10-11)
  - Runtime asset loading: `locateFile` in `js/ar.js` (line 361) points to `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  - Auth: none
  - Versions are unpinned and there is no SRI hash, so a CDN change can alter behavior.

**Product / recommendation API (simulated):**
- No real HTTP backend. `js/api.js` exposes `window.api` with:
  - `fetchProductById(id)` - resolves a deep copy of a `PRODUCTS` entry after a 1000 ms `setTimeout`
  - `recommendOutfit(currentProduct, historyIds)` - rules engine (category and color compatibility, wardrobe first, then catalog) after a 500 ms `setTimeout`
- The function shapes are Promise-based so they can be swapped for `fetch()` calls to a real server later. No `fetch`, `XMLHttpRequest`, or WebSocket usage exists anywhere in `js/`.

**Browser device APIs:**
- Webcam via `navigator.mediaDevices.getUserMedia` in `js/ar.js` (line 295), `audio: false`. Permission denial shows the fallback UI (`#webcam-fallback-ui`).

## Data Storage

**Databases:**
- None. Product catalog is the in-memory `PRODUCTS` array in `js/products.js` (mock database).

**Client storage:**
- `localStorage` key `greenwear_history` in `js/ar.js` (read line 51, write line 59, remove line 65) - JSON array of scanned product IDs ("Lemari Saya" wardrobe history). Cleared by the "Hapus Riwayat" button (`#btn-clear-history`).

**File Storage:**
- Local filesystem only. Static images in `assets/` (garment card and overlay PNGs), referenced by `image` and `overlayImage` fields in `js/products.js`.

**Caching:**
- None (relies on normal browser HTTP cache for CDN files).

## Authentication & Identity

**Auth Provider:**
- None. No user accounts, sessions, or tokens. Wardrobe history is per-browser via `localStorage`.

## Monitoring & Observability

**Error Tracking:**
- None.

**Logs:**
- `console.error` only (camera errors and MediaPipe frame errors in `js/ar.js`).

**Analytics:**
- None detected.

## CI/CD & Deployment

**Hosting:**
- Not detected. Static files only; any static HTTPS host works.

**CI Pipeline:**
- None. No workflow or pipeline config files.

## Environment Configuration

**Required env vars:**
- None.

**Secrets location:**
- Not applicable. No secrets, API keys, or `.env` files are present.

## Webhooks & Callbacks

**Incoming:**
- None.

**Outgoing:**
- None. The only outbound network traffic is the browser fetching jsDelivr scripts and MediaPipe model files.

## Project Documentation Assets

- `FILES.md` describes file roles in the repo.
- `GreenWear (1).pdf` is an implementation plan document (schedule, flows, database design). It is reference material only and is not consumed by the app. Its contents are not reproduced here.

---

*Integration audit: 2026-10-02*
