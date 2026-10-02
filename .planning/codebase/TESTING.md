# Testing Patterns

**Analysis Date:** 2026-10-02

## Current State: No Automated Tests

There are no automated tests in this repository.

- No test runner or config: no `package.json`, `jest.config.*`, `vitest.config.*`, `playwright.config.*`.
- No `*.test.*` or `*.spec.*` files anywhere.
- No test directories, fixtures, mocks, or CI configuration.
- No coverage tooling and no coverage requirement.
- No linter or type checker that acts as a safety net (`.eslintrc*`, `tsconfig.json` are absent).

Verification today is manual: open `index.html` in a browser and exercise the flows below. Do not assume a framework exists. If tests are added, introduce the tooling explicitly as its own task.

## Test Framework

**Runner:** None.

**Assertion Library:** None.

**Run Commands:**
```bash
# No test commands exist.
# Manual run: serve the folder and open it in a browser. Camera access requires
# https or localhost, so use a local static server rather than file://
python3 -m http.server 8000     # then open http://localhost:8000/index.html
```

## Test File Organization

Not applicable. There is no test location or naming pattern. If tests are introduced later, place them in a new top-level `tests/` directory so they stay separate from the files served to the browser (`index.html`, `css/`, `js/`, `assets/`).

## Manual Smoke-Test Checklist

Run these in a desktop browser (Chrome recommended for MediaPipe) after any change to `js/*.js`, `index.html` or `css/style.css`. Also check the DevTools console for errors.

**Page load**
- Page renders with the camera cover (`#camera-disabled-cover`) visible and the dashboard, catalog and wardrobe hidden except the wardrobe drawer (shown by `renderWardrobe()` on startup).
- Wardrobe drawer shows `Belum ada pakaian yang dipindai.` when `greenwear_history` is empty.
- No 404s for `css/style.css` and `js/*.js` in the Network tab. Known 404s: asset files referenced by `js/products.js` but absent from `assets/` (`hemp_jacket_*`, `denim_dress_*`, `wrap_dress_*`); the overlay preloader requests them for products with a non-empty `overlayImage`.

**Skip-camera path (`bypassCamera`)**
- Click "Lewati ke Detail Produk". The cover disappears, the catalog drawer shows, the dashboard fills after about 1 s (`fetchProductById` delay) and the recommendation fills after about 0.5 s more.
- The canvas shows the bypass screen text from `drawBypassScreen()`.
- Selecting each catalog card updates name, category, material, rating, care guide, water and carbon rings and the Mix & Match card.
- The selected card gets the `active` class and previously selected cards lose it.

**Camera path (`initCamera`)**
- Click "Aktifkan Kamera AR" and allow the camera. Loading overlay appears, then the HUD, catalog, scan banner (about 2.2 s), then the dashboard; badge reads `Tracking Aktif` once a body is detected.
- Garment overlay follows the shoulders and rotates with them for products with an overlay image (`recycled-cotton-tee`, `ecovero-linen-shirt`). Products with an empty `overlayImage` show the green placeholder block with the product name.
- Skeleton toggle (`#btn-toggle-skeleton`) draws and hides shoulder-hip lines. Mirror toggle (`#btn-mirror`) flips the canvas.
- Leaving the frame shows `Tubuh tidak terdeteksi...` and the badge changes to `Mencari Tubuh...`.
- Deny the camera permission: the fallback panel appears with the badge `Kamera Ditolak`. "Coba Lagi" retries, and the skip button switches to the bypass path.
- Rapid product switching during the scan delay does not leave a stale product on the dashboard (race guard `activeProduct.id !== product.id`).

**Wardrobe history (`localStorage` key `greenwear_history`)**
- After selecting a product, its id appears once in the stored JSON array (check DevTools, Application, Local Storage). Re-selecting does not duplicate it.
- Wardrobe cards render with the right emoji per category, and clicking one selects that product.
- "Hapus Riwayat" empties the array, shows the empty message and re-runs the recommendation.

**Recommendation rules (`api.recommendOutfit` in `js/api.js`)**
- Priority is: compatible item in wardrobe (badge `In Wardrobe`, class `owned`), then compatible catalog item by category and colour (`Catalog Suggestion`), then category-only match, then first non-current product.
- Check a product with `compatibleCategories` that matches nothing coloured; check a one-item wardrobe containing only the current product (it must be filtered out).

**Responsive**
- At widths below 768 px the two panels stack (`@media (max-width: 768px)`).

## Testable Logic (if automated tests are added later)

These are suggestions, not existing setup. The following code is pure or near-pure and would be the cheapest to cover:

- `api.recommendOutfit` and `api.fetchProductById` in `js/api.js`: depend only on the global `PRODUCTS` and `setTimeout`. Fake timers would avoid the 500 ms and 1000 ms waits. Cases: found and not-found id, copy-not-reference return, each of the four fallback tiers.
- Data integrity of `PRODUCTS` in `js/products.js`: unique `id`, `category` in `{Top, Bottom, Dress, Outer}`, hex colours, every `compatibleCategories` entry is a valid category, and every non-empty `image` / `overlayImage` path exists under `assets/`. The last check would currently fail for missing assets.
- `getHistory` / `saveToHistory` / `clearHistory` and the `updateCirclePercent` offset maths in `js/ar.js` are trapped inside the `DOMContentLoaded` closure. They would need extracting to a module-level script, or a DOM environment, before they can be unit tested.
- Camera, MediaPipe and canvas drawing (`startMediaPipe`, `onResults`, `drawGarmentOverlay`) require a real browser with a camera, or heavy mocking of `navigator.mediaDevices`, `Pose` and the 2D context. Prefer browser-level end-to-end testing for those.

Because the app uses classic scripts with globals and no module system, any runner would need to load `js/products.js` and `js/api.js` into a shared global scope (for example a browser-mode runner or `vm` context).

## Mocking

**Framework:** None. The only mock-like code in the app is the intentional simulated backend, `api` in `js/api.js`, backed by the static `PRODUCTS` array. It is application code, not test infrastructure.

## Fixtures and Factories

- None. `PRODUCTS` in `js/products.js` serves as the de facto fixture set (10 items: 3 Top, 2 Dress, 3 Bottom, 2 Outer). Only the first five have overlay images; the other five use `overlayImage: ""`.

## Coverage

**Requirements:** None enforced. Coverage is effectively 0% automated.

## Test Types

**Unit Tests:** Not used.

**Integration Tests:** Not used.

**E2E Tests:** Not used. Manual checklist above is the only verification.

---

*Testing analysis: 2026-10-02*
