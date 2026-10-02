<!-- refreshed: 2026-10-02 -->
# Architecture

**Analysis Date:** 2026-10-02

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                  Presentation (static DOM)                   │
├──────────────────┬──────────────────┬───────────────────────┤
│  Camera panel    │  Catalog/Wardrobe│   Eco dashboard       │
│  `index.html`    │  drawers         │   `index.html`        │
│  `css/style.css` │  `index.html`    │   `css/style.css`     │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│     Controller / Lifecycle (single closure, shared state)    │
│     `js/ar.js` (DOMContentLoaded)                            │
│     state machine: idle → scanning → loading → tracking      │
└────────┬───────────────────────┬────────────────────────────┘
         │                       │
         ▼                       ▼
┌──────────────────────┐  ┌──────────────────────────────────┐
│ Mock service         │  │ External runtime (CDN)           │
│ `js/api.js`          │  │ MediaPipe Pose + camera_utils    │
│ fetch + recommender  │  │ loaded in `index.html` <head>    │
└────────┬─────────────┘  └──────────────────────────────────┘
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Data: `js/products.js` (global PRODUCTS)                    │
│  Persistence: localStorage key "greenwear_history"           │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Page shell | DOM skeleton, Indonesian UI strings, CDN script tags, local script load order | `index.html` |
| Styles | Layout grid, camera overlays, HUD, SVG stat rings, cards, badges | `css/style.css` |
| Product database | Global `PRODUCTS` array of 10 garments with eco metrics and compatibility rules | `js/products.js` |
| Mock API | `api.fetchProductById` (1000 ms delay) and `api.recommendOutfit` (500 ms delay) | `js/api.js` |
| Controller | Camera access, scan state machine, MediaPipe loop, canvas drawing, dashboard rendering, wardrobe history | `js/ar.js` |
| Placeholder | One-line comment; not loaded by the page | `js/main.js` |
| Image assets | Product card and overlay PNGs | `assets/` |

## Pattern Overview

**Overall:** Static, build-less, single-page browser prototype. Classic `<script>` tags share globals (no ES modules, no bundler). One controller closure owns all UI state and drives plain DOM manipulation.

**Key Characteristics:**
- Script order in `index.html` is a hard dependency: `js/products.js` (defines `PRODUCTS`), then `js/api.js` (defines `api` and `window.api`), then `js/ar.js` (consumes both).
- All backend behavior is simulated with `setTimeout` promises; `js/api.js` is shaped so it can be swapped for real `fetch` calls.
- Rendering is imperative: `innerHTML` templates for card grids, `textContent` for dashboard fields, `canvas` 2D for AR.
- Two operating modes: camera mode (scan simulation plus pose tracking) and bypass mode (`hasBypassed`, direct data view, placeholder canvas).

## Layers

**Presentation:**
- Purpose: Static markup and styling; all dynamic regions are filled by `js/ar.js`.
- Location: `index.html`, `css/style.css`
- Contains: Camera panel (`#camera-viewport`, `#webcam`, `#ar-canvas`, `#camera-hud`, cover/loading/fallback overlays), `#catalog-drawer`, `#wardrobe-drawer`, `#dashboard-details`.
- Depends on: Nothing at runtime except CDN scripts.
- Used by: `js/ar.js` via `document.getElementById`.

**Controller:**
- Purpose: Orchestrate lifecycle, state, rendering and tracking.
- Location: `js/ar.js`
- Contains: Closure-scoped state (`activeProduct`, `showSkeleton`, `isMirrored`, `trackingActive`, `activeStream`, `hasBypassed`, `poseInstance`, `currentState`), render helpers, MediaPipe setup, canvas drawing, event hooks.
- Depends on: Globals `PRODUCTS`, `api`, `Pose`; browser APIs `navigator.mediaDevices`, `localStorage`, `requestAnimationFrame`.
- Used by: Loaded last from `index.html`.

**Mock service:**
- Purpose: Simulate server lookup and outfit recommendation.
- Location: `js/api.js`
- Contains: `fetchProductById(id)` returns a JSON deep copy or rejects with `Product not found`. `recommendOutfit(currentProduct, historyIds)` resolves a garment plus `inWardrobe` flag.
- Depends on: Global `PRODUCTS`.
- Used by: `js/ar.js` (`triggerScanAndLoad`, `loadProductDirect`, `clearHistory`).

**Data and persistence:**
- Purpose: Product records and scan history.
- Location: `js/products.js`; `localStorage` key `greenwear_history` (JSON array of product ids).
- Contains: Product fields `id`, `name`, `category` (Top/Bottom/Dress/Outer), `description`, `image`, `overlayImage`, `material`, `waterUsage`, `waterSavings`, `carbonFootprint`, `carbonSavings`, `ecoRating`, `careGuide`, `color` (hex), `colorName`, `compatibleCategories`, `compatibleColors`.
- Used by: `js/api.js`, `js/ar.js`.

## Data Flow

### Primary Request Path (camera mode)

1. User clicks `#btn-start-camera`, which calls `initCamera` (`js/ar.js:289`). `getUserMedia` requests 640x480 front camera, no audio.
2. On `loadedmetadata` the canvas is sized to the video, HUD and catalog drawer are shown, then `triggerScanAndLoad(activeProduct)` (`js/ar.js:168`) and `startMediaPipe()` (`js/ar.js:357`) run.
3. `triggerScanAndLoad` sets state `scanning`, shows the banner, waits 2200 ms, sets `loading`, calls `api.fetchProductById`, then `saveToHistory`, `updateDashboardDetails`, and `api.recommendOutfit(fetchedProduct, getHistory())`.
4. `updateRecommendationDetails` fills the Mix & Match card, hides the banner, shows the dashboard, sets state `tracking`.
5. `startMediaPipe` runs a `requestAnimationFrame` loop throttled to 30 fps calling `poseInstance.send({ image: webcamElement })`. `onResults` (`js/ar.js:389`) draws the frame (mirrored when `isMirrored`) and, only in `tracking`, calls `drawGarmentOverlay` (`js/ar.js:435`) and optionally `drawSkeleton` (`js/ar.js:503`).

### Product selection and bypass flow

1. Click on a `.garment-card` (catalog or wardrobe) calls `selectProduct(productId)` (`js/ar.js:148`).
2. With an active stream and not bypassed, it re-runs `triggerScanAndLoad`; otherwise `loadProductDirect` (`js/ar.js:212`) fetches and renders immediately.
3. Bypass: `#btn-skip-camera` or `#btn-skip-camera-fallback` calls `bypassCamera` (`js/ar.js:327`), sets `hasBypassed = true`, shows the catalog, then `loadProductDirect`, which calls `drawBypassScreen` (`js/ar.js:339`).

### Recommendation rules (`js/api.js:27`)

1. Candidate from wardrobe history (excluding current) matching both `compatibleCategories` and `compatibleColors`: `inWardrobe: true`.
2. Any catalog product matching category and color: `inWardrobe: false`.
3. Any catalog product matching category only.
4. First product that is not the current one.

**State Management:**
- Scan state machine constants `STATE_IDLE`, `STATE_SCANNING`, `STATE_LOADING`, `STATE_TRACKING` (`js/ar.js:33-37`); `currentState` starts `idle`.
- Race guard: async steps abort when `activeProduct.id !== product.id`.
- Wardrobe history persists in `localStorage`; everything else is in-memory closure variables.
- `clearHistory` removes the key, re-renders, and re-runs recommendation for the active product.

## Key Abstractions

**Product record:**
- Purpose: Single source of truth for garment data and matching rules.
- Examples: `js/products.js`
- Pattern: Plain object literals in a global array; ids are kebab-case strings.

**Scan state machine:**
- Purpose: Gate overlay drawing so garments render only after "scan" and data load complete.
- Examples: `js/ar.js` (`triggerScanAndLoad`, `onResults`)
- Pattern: String constants plus a mutable `currentState`.

**Garment overlay transform:**
- Purpose: Map pose landmarks to a rotated, scaled image on the canvas.
- Examples: `js/ar.js` `drawGarmentOverlay`
- Pattern: Landmarks 11/12 (shoulders) set anchor, width and rotation; 23/24 (hips) set height; `Dress` category uses larger factors (2.1x width, 2.1x height ratio). Falls back to a translucent green block labelled with the product name when `overlayImage` is empty or not loaded.

**Mock API:**
- Purpose: Async boundary mimicking a server.
- Examples: `js/api.js`
- Pattern: Promise-returning methods on a global `api` object with simulated latency.

## Entry Points

**Page:**
- Location: `index.html`
- Triggers: Browser load (must be served from localhost or HTTPS for camera access).
- Responsibilities: Declares DOM, loads CDN and local scripts.

**Controller bootstrap:**
- Location: `js/ar.js:1` (`DOMContentLoaded` handler)
- Triggers: DOM ready.
- Responsibilities: Caches elements, preloads overlay images into `garmentImages`, renders catalog grid, wires buttons (`js/ar.js:534-570`), calls `renderWardrobe()` (`js/ar.js:573`).

## Architectural Constraints

- **Threading:** Single-threaded main thread using `setTimeout` and `requestAnimationFrame`. MediaPipe manages its own internal workers/WASM.
- **Global state:** `PRODUCTS` (`js/products.js`), `api` / `window.api` (`js/api.js`), `localStorage["greenwear_history"]`. All other state is closure-scoped in `js/ar.js`.
- **Circular imports:** None; there are no modules.
- **Load order:** `js/products.js`, `js/api.js`, `js/ar.js` must stay in this order in `index.html`.
- **Secure context:** `getUserMedia` requires `localhost` or HTTPS.
- **Network dependency:** MediaPipe code and model files come from `https://cdn.jsdelivr.net/npm/@mediapipe/` (`js/ar.js:361`, `index.html`).
- **Language:** UI strings are Indonesian (`<html lang="id">`).

## Anti-Patterns

### Duplicated category icon mapping

**What happens:** The category-to-emoji `if` chain is repeated in `renderWardrobe` (`js/ar.js:96-99`), the catalog render (`js/ar.js:125-128`) and `updateRecommendationDetails` (`js/ar.js:253-256`).
**Why it's wrong:** Adding a category requires three edits and the default icons differ.
**Do this instead:** Extract one lookup helper (for example a `CATEGORY_ICONS` map) inside `js/ar.js` and use it in all three places.

### Stacking listeners and no stream teardown

**What happens:** `initCamera` adds a new `loadedmetadata` listener on each call (`js/ar.js:306`), so Retry stacks listeners. Stream tracks in `activeStream` are never stopped, and `renderLoop` exits permanently once `hasBypassed` is true.
**Why it's wrong:** Duplicate scan/MediaPipe triggers on retry; camera stays on; tracking cannot resume after bypass without a new `initCamera`.
**Do this instead:** Register the listener with `{ once: true }` and add a `stopCamera` that stops tracks and resets `activeStream`.

### Product data referencing missing assets

**What happens:** `js/products.js` references `assets/hemp_jacket_card.png`, `hemp_jacket_overlay.png`, `denim_dress_card.png`, `denim_dress_overlay.png`, `wrap_dress_card.png` and `wrap_dress_overlay.png`, which are absent from `assets/`. Six products have `overlayImage: ""`.
**Why it's wrong:** Missing images fail silently and those garments render as color blocks.
**Do this instead:** Add the PNGs to `assets/` or point to existing files; keep `overlayImage` empty only where the block fallback is intended.

### Logic coupled to global script order

**What happens:** `js/ar.js` and `js/api.js` read `PRODUCTS` and `api` as implicit globals.
**Why it's wrong:** Reordering script tags breaks the app with no error at the tag.
**Do this instead:** Keep the order in `index.html` fixed, or migrate to ES modules (`type="module"`) with explicit imports.

## Error Handling

**Strategy:** Promise `.catch` with `console.error` plus an on-screen message where relevant.

**Patterns:**
- Camera denial: `.catch` in `initCamera` shows `#webcam-fallback-ui` and sets the badge to "Kamera Ditolak" (`js/ar.js:318`).
- API failure during scan: banner text "Gagal mengambil data produk." (`js/ar.js:204`); during direct load, only `console.error` (`js/ar.js:227`).
- MediaPipe frame errors: `console.error` in the `send` catch (`js/ar.js:381`).
- No body detected: banner "Tubuh tidak terdeteksi" shown from `onResults`.

## Cross-Cutting Concerns

**Logging:** `console.error` only.
**Validation:** `fetchProductById` rejects unknown ids; DOM elements for optional regions are null-checked (`renderWardrobe`, `updateCirclePercent`, `clearHistoryBtn`).
**Authentication:** Not applicable.

---

*Architecture analysis: 2026-10-02*
