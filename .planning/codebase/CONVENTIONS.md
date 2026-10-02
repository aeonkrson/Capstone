# Coding Conventions

**Analysis Date:** 2026-10-02

Scope: static browser prototype made of `index.html`, `css/style.css`, `js/products.js`, `js/api.js`, `js/ar.js` and `js/main.js`. There is no build step, package manager, linter or formatter. Every convention below is observed by hand in the source, not enforced by tooling.

## Naming Patterns

**Files:**
- Lowercase, single-word or snake_case names: `js/products.js`, `js/api.js`, `js/ar.js`, `css/style.css`.
- Asset files are `snake_case` with a role suffix: `assets/linen_shirt_card.png` (catalog card image) and `assets/linen_shirt_overlay.png` (AR overlay image). Follow `<garment>_card.png` and `<garment>_overlay.png` for new products.

**Functions:**
- camelCase verbs: `getHistory`, `saveToHistory`, `renderWardrobe`, `selectProduct`, `triggerScanAndLoad`, `loadProductDirect`, `updateDashboardDetails`, `drawGarmentOverlay` (`js/ar.js`).
- API methods are camelCase on the `api` object: `fetchProductById`, `recommendOutfit` (`js/api.js`).

**Variables:**
- camelCase for mutable state and DOM references: `activeProduct`, `hasBypassed`, `poseInstance`.
- DOM element variables end in a role suffix: `webcamElement`, `canvasElement`, `startCameraBtn`, `skipCameraFallbackBtn`, `trackingStatusBadge`, `cameraHud`.
- State-machine constants are UPPER_SNAKE with a `STATE_` prefix: `STATE_IDLE`, `STATE_SCANNING`, `STATE_LOADING`, `STATE_TRACKING` (`js/ar.js`).
- The global product list is the UPPER_SNAKE constant `PRODUCTS` (`js/products.js`).

**Types / Data identifiers:**
- Product `id` values are kebab-case strings: `"ecovero-linen-shirt"`, `"hemp-canvas-pants"`.
- `category` is one of `"Top"`, `"Bottom"`, `"Dress"`, `"Outer"` (capitalised string). Do not introduce other spellings, because `compatibleCategories` and the icon mapping compare against these exact strings.
- Colours are lowercase 6-digit hex strings (`"#4f772d"`), with the colour name in `colorName`.
- HTML ids and classes are kebab-case. Buttons use a `btn-` prefix (`btn-start-camera`, `btn-clear-history`). Dashboard fields use an `eco-` prefix (`eco-name`, `eco-rating`). Recommendation fields use `mix-`.
- `localStorage` key is `greenwear_history` (snake_case, app-prefixed).

## Code Style

**Formatting (not tool-enforced; match existing files):**
- 2-space indentation.
- Double quotes for strings, backticks for interpolation.
- Semicolons always.
- `const` / `let` only, never `var`.
- Arrow functions for callbacks, `function` declarations for named helpers inside `ar.js`.
- Trailing whitespace exists in places (blank indented lines in `js/ar.js`); it is not significant.

**Linting:**
- Not detected. No `.eslintrc*`, `biome.json` or `.prettierrc`.

## Script Loading and Module Design

- Plain classic `<script>` tags at the end of `<body>` in `index.html`, in dependency order:
  ```html
  <script src="js/products.js"></script>
  <script src="js/api.js"></script>
  <script src="js/ar.js"></script>
  ```
- The MediaPipe libraries (`camera_utils.js`, `pose.js`) load from jsDelivr in `<head>` and provide the global `Pose`.
- No ES modules, `import` or `export`. Shared values are globals: `PRODUCTS` (top-level `const`) and `window.api` (`js/api.js` ends with `window.api = api;`).
- New data modules must be added to `index.html` before `js/ar.js`.
- `js/main.js` contains only a comment and is not referenced by `index.html`. Do not rely on it.
- All application logic in `js/ar.js` lives inside a single `document.addEventListener("DOMContentLoaded", () => { ... })` closure. State is shared mutable `let` variables at the top of that closure (`activeProduct`, `showSkeleton`, `isMirrored`, `trackingActive`, `activeStream`, `hasBypassed`, `poseInstance`, `currentState`).
- Sections inside the closure are marked with numbered comments: `// 1. Render Catalog Selector Grid`, `// 2. Camera Access Control & Bypass`, `// 3. MediaPipe Pose tracking`, `// 4. Hook up Buttons`. Keep that order when adding code.

## Async Patterns

- Simulated backend latency uses `new Promise` plus `setTimeout` (`js/api.js`): `fetchProductById` waits 1000 ms, `recommendOutfit` waits 500 ms. `triggerScanAndLoad` in `js/ar.js` waits 2200 ms to simulate a tag scan.
- Consumers use `.then()` / `.catch()` chains. `async`/`await` is not used.
- `fetchProductById` returns a deep copy (`JSON.parse(JSON.stringify(product))`) so callers cannot mutate `PRODUCTS`.
- Guard against stale async results by comparing the active product after every delay:
  ```js
  setTimeout(() => {
    if (activeProduct.id !== product.id) return; // Prevent race conditions
    ...
  }, 2200);
  ```
  Repeat this guard in each `.then` of a chain that follows a selection change.
- Camera and MediaPipe use `navigator.mediaDevices.getUserMedia(...).then(...).catch(...)` and `requestAnimationFrame` loops throttled to 30 fps.

## Error Handling

**Patterns:**
- Promise rejections are created with `new Error(\`Product not found: ${id}\`)` in `js/api.js`.
- Consumers log with `console.error("<context>:", err)` and, where there is a visible banner, set a user-facing message: `scanFeedback.textContent = "⚠️ Gagal mengambil data produk.";` (`js/ar.js`).
- Camera permission failure shows the fallback panel (`fallbackUI.style.display = "flex"`) and sets the status badge to `"Kamera Ditolak"`.
- Defensive DOM checks are used for optional elements: `if (!drawer) return;`, `if (grid) ...`, `if (!circle || !text) return;`.
- `recommendOutfit` never rejects. It falls back in order: wardrobe match, catalog match by category and colour, catalog match by category only, first non-current product.

## Logging

**Framework:** `console` only (`console.error` is the sole level used; roughly 4 call sites, all in `js/ar.js`).

**Patterns:**
- Log only caught errors. No debug or info logging.

## Comments

**When to Comment:**
- Short `//` comments describe intent for blocks and rules (`// Rule helper to check...`, `// 1. Primary: Search in scanned history (Wardrobe)`).
- Data files annotate units and meaning inline: `waterUsage: 120, // Liters used (vs 2700 standard)`, `waterSavings: 95, // % savings`, `carbonFootprint: 1.2, // kg CO2`. Keep those annotations on new products.
- HTML uses `<!-- ... -->` comments to label every major block, including the flowchart reference (`<!-- Scan feedback banner (Flowchart Step 5a) -->`).

**JSDoc:**
- Used only on the `api` methods in `js/api.js` with `@param {type} name - description` and `@returns {Promise<Object>}`. Add JSDoc to any new `api` method; `js/ar.js` internal helpers are undocumented.

## Function Design

**Size:** Helpers are small and single-purpose (5 to 40 lines). The exception is the closure in `js/ar.js`, which is about 570 lines in one scope.

**Parameters:** Plain positional parameters; default values for optional arrays (`historyIds = []`). Destructuring is used only in `connections.forEach(([i1, i2]) => ...)`.

**Return Values:** `api` methods return Promises. UI helpers return nothing and mutate the DOM directly. Recommendation results are `{ ...product, inWardrobe: boolean }`.

## DOM and Rendering

- Elements are fetched with `document.getElementById(...)`. Lists are rendered by assigning `innerHTML` from `map(...).join("")` template strings (`renderWardrobe`, catalog grid render in `js/ar.js`), then event listeners are re-attached with `querySelectorAll(...).forEach(...)` and `e.currentTarget.getAttribute("data-id")`.
- Visibility is toggled by assigning `element.style.display` to `"none"`, `"block"` or `"flex"`. Initial hidden state is set inline in `index.html` (`style="display: none;"`).
- Status badge state uses `className` replacement: `trackingStatusBadge.className = "hud-status active";`.
- Use `textContent` for plain text. Product data is interpolated unescaped into `innerHTML` templates, which is acceptable only because `PRODUCTS` is static local data. Do not feed user-supplied strings into those templates.

## CSS Conventions (`css/style.css`)

- Plain CSS, no preprocessor, no custom properties (`var(--...)` is not used). Colours are hardcoded hex values or `rgba(...)`.
- Class names are kebab-case and component-prefixed: `.camera-panel`, `.camera-bracket`, `.hud-btn`, `.garment-card`, `.dashboard-card`, `.mix-match-card`, `.badge-ownership`.
- State modifiers are chained classes: `.hud-status.active`, `.garment-card.active`, `.badge-ownership.owned` / `.suggestion`.
- The only id-based selectors are `video#webcam` and `canvas#ar-canvas`.
- Layout uses flexbox, `gap`, `inset`, `aspect-ratio`; spacing and font sizes are in `rem`; borders in `px`.
- The file is divided into sections with `/* Section title */` comments, in page order (header, camera panel, HUD, covers, dashboard, catalog, stats, details, mix and match, buttons, wardrobe, badges).
- Animations: `@keyframes spin` and `@keyframes pulse`. One responsive breakpoint: `@media (max-width: 768px)`.

## Language and Copy

- `index.html` declares `<html lang="id">`. User-facing text is Bahasa Indonesia (`"Aktifkan Kamera AR"`, `"Lemari Saya (Scanned)"`).
- Code identifiers, comments and product data (`name`, `description`, `careGuide`) are English.
- Emoji are used as icons (`📷`, `⚠️`, `👕`, `👖`, `👗`, `🧥`).

## Known Inconsistencies (do not copy these)

- Category-to-emoji mapping is duplicated three times in `js/ar.js` (`renderWardrobe`, catalog render block, `updateRecommendationDetails`). Prefer a single lookup helper.
- Some UI strings are English inside otherwise Indonesian copy: `"Scanning Tag..."`, `"Tracking Aktif"` (mixed), `"In Wardrobe"`, `"Catalog Suggestion"` in `js/ar.js` and `index.html`.
- Inline `style="..."` attributes appear 15 times in `index.html` and inside JS-generated markup (`scanned-color-dot`). Prefer classes in `css/style.css`.
- `updateCirclePercent(circleId, textId, percentValue, maxValue)` in `js/ar.js` ignores `maxValue`; `maxWaterSaved` and `maxCarbonSaved` are passed but unused.
- `scanFeedback.innerHTML` is assigned a static string in `onResults` where `textContent` is used everywhere else.
- `products.js` references image files that are not in `assets/`: `hemp_jacket_*`, `denim_dress_*`, `wrap_dress_*`. Only `cotton_tee_*` and `linen_shirt_*` exist. Several products reuse another product's card image as a placeholder, and products with `overlayImage: ""` render a green placeholder block in `drawGarmentOverlay`.

---

*Convention analysis: 2026-10-02*
