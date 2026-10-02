<!-- GSD:project-start source:PROJECT.md -->
## Project

**Size Fit Scanner (working title)**

A browser app for online shoppers who cannot try clothes on. The user scans their body from the front and the side with a phone or laptop camera, the system estimates their body measurements, and then — for a garment and size the user picks from a built-in catalog — it says whether that size fits and, if it does not, which size would.

It replaces the earlier GreenWear direction (AR tag scanning, sustainability info, Mix & Match) in the same repository. It is a university capstone project built by one developer.

**Core Value:** A shopper who picks a size gets a fit answer they can trust — because the body measurements behind it are close to what a tape measure would give.

### Constraints

- **Timeline**: Demo-ready in 1 to 3 months — capstone schedule
- **Team**: One developer (Jordan) builds everything — no handoff or parallel work to plan for
- **Platform**: Runs in the browser on both phone and laptop — no native app
- **Data**: All body images and measurements stay on the device — no backend, no server accounts
- **Camera**: Browser camera access needs HTTPS or localhost — affects how the app is served and demoed
- **Scope**: Tops only, starting with one plain white T-shirt — keeps the first version narrow
- **Accuracy**: Per-measurement targets against tape (shoulder about 2.5 cm, chest about 3.5 cm plus size agreement) — this is the bar for "done", validated on team members; a blanket 2-3 cm for every measurement is not realistic for this pipeline
- **Language**: English and Indonesian UI — existing strings are Indonesian
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- JavaScript (vanilla, ES2015+ syntax, no modules, no transpilation) - all application logic in `js/ar.js`, `js/api.js`, `js/products.js`
- HTML5 - single page `index.html` (`<html lang="id">`, UI copy is in Indonesian)
- CSS3 - single stylesheet `css/style.css` (501 lines)
- None. `js/main.js` is a one-line comment placeholder and is not loaded by `index.html`.
## Runtime
- Modern desktop/mobile browser (client-side only). No Node.js, no server runtime.
- Requires `navigator.mediaDevices.getUserMedia` (webcam), Canvas 2D, `localStorage`, `requestAnimationFrame`, and WebAssembly/WebGL (needed by MediaPipe Pose).
- Camera access requires a secure context: `https://` or `http://localhost`. Opening `index.html` via `file://` may block camera access depending on the browser.
- None. No `package.json`, no lockfile, no `node_modules`.
- Dependencies are loaded by `<script>` tags from a CDN.
## Frameworks
- No application framework. Plain DOM manipulation (`document.getElementById`, `style.display` toggling) in `js/ar.js`.
- MediaPipe Pose (`@mediapipe/pose`, version unpinned, latest on jsDelivr) - body landmark detection used to place garment overlay images. Instantiated in `startMediaPipe()` in `js/ar.js` with `modelComplexity: 1`, `smoothLandmarks: true`, `minDetectionConfidence: 0.5`, `minTrackingConfidence: 0.5`.
- MediaPipe `camera_utils` (version unpinned) - loaded in `index.html` but the `Camera` helper is not used. `js/ar.js` drives frames itself with a `requestAnimationFrame` loop throttled to 30 fps that calls `poseInstance.send({ image: webcamElement })`.
- Not detected. No test runner, test files, or test config.
- None. No bundler, linter, formatter, or dev server config. Files are served as-is.
## Key Dependencies
- `@mediapipe/pose` via `https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js` (`index.html` line 11) - pose tracking. The app cannot do AR overlay if the CDN is unreachable.
- Pose model and WASM files fetched at runtime via `locateFile` from `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` (`js/ar.js` line 361).
- `@mediapipe/camera_utils` via `https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js` (`index.html` line 10) - loaded but unused.
- Both CDN `<script>` tags use `crossorigin="anonymous"`. No Subresource Integrity hashes and no version pins.
## Configuration
- No environment variables, no `.env` files, no runtime config files.
- Tunable constants are hard-coded in source: MediaPipe options and 30 fps throttle in `js/ar.js`; webcam constraints (ideal 640x480, `facingMode: "user"`, `audio: false`) in `js/ar.js`; simulated latencies in `js/api.js` (1000 ms product fetch, 500 ms recommendation) and `js/ar.js` (2200 ms scan delay).
- Product data lives in the `PRODUCTS` global array in `js/products.js`.
- Script load order in `index.html` matters because there are no modules: `js/products.js`, then `js/api.js`, then `js/ar.js`.
- None. Static assets: `css/style.css`, `assets/*.png` (`cotton_tee_card.png`, `cotton_tee_overlay.png`, `linen_shirt_card.png`, `linen_shirt_overlay.png`).
- CSS uses a system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica...`). No web fonts, no CSS custom properties, one `@media (max-width: 768px)` breakpoint, `@keyframes spin` and `pulse`.
- `.gitignore` ignores `.DS_Store`, `.gemini/`, `.agents/`.
## Platform Requirements
- Any static file server (for example `python3 -m http.server` or an editor live-server) serving the project root on `localhost`. Internet access is needed to load MediaPipe from jsDelivr.
- A webcam for the AR flow. Without one, the "skip" path (`bypassCamera()` in `js/ar.js`) still shows product data.
- Deployment target not detected. Any static host over HTTPS would work. No server-side component exists.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Lowercase, single-word or snake_case names: `js/products.js`, `js/api.js`, `js/ar.js`, `css/style.css`.
- Asset files are `snake_case` with a role suffix: `assets/linen_shirt_card.png` (catalog card image) and `assets/linen_shirt_overlay.png` (AR overlay image). Follow `<garment>_card.png` and `<garment>_overlay.png` for new products.
- camelCase verbs: `getHistory`, `saveToHistory`, `renderWardrobe`, `selectProduct`, `triggerScanAndLoad`, `loadProductDirect`, `updateDashboardDetails`, `drawGarmentOverlay` (`js/ar.js`).
- API methods are camelCase on the `api` object: `fetchProductById`, `recommendOutfit` (`js/api.js`).
- camelCase for mutable state and DOM references: `activeProduct`, `hasBypassed`, `poseInstance`.
- DOM element variables end in a role suffix: `webcamElement`, `canvasElement`, `startCameraBtn`, `skipCameraFallbackBtn`, `trackingStatusBadge`, `cameraHud`.
- State-machine constants are UPPER_SNAKE with a `STATE_` prefix: `STATE_IDLE`, `STATE_SCANNING`, `STATE_LOADING`, `STATE_TRACKING` (`js/ar.js`).
- The global product list is the UPPER_SNAKE constant `PRODUCTS` (`js/products.js`).
- Product `id` values are kebab-case strings: `"ecovero-linen-shirt"`, `"hemp-canvas-pants"`.
- `category` is one of `"Top"`, `"Bottom"`, `"Dress"`, `"Outer"` (capitalised string). Do not introduce other spellings, because `compatibleCategories` and the icon mapping compare against these exact strings.
- Colours are lowercase 6-digit hex strings (`"#4f772d"`), with the colour name in `colorName`.
- HTML ids and classes are kebab-case. Buttons use a `btn-` prefix (`btn-start-camera`, `btn-clear-history`). Dashboard fields use an `eco-` prefix (`eco-name`, `eco-rating`). Recommendation fields use `mix-`.
- `localStorage` key is `greenwear_history` (snake_case, app-prefixed).
## Code Style
- 2-space indentation.
- Double quotes for strings, backticks for interpolation.
- Semicolons always.
- `const` / `let` only, never `var`.
- Arrow functions for callbacks, `function` declarations for named helpers inside `ar.js`.
- Trailing whitespace exists in places (blank indented lines in `js/ar.js`); it is not significant.
- Not detected. No `.eslintrc*`, `biome.json` or `.prettierrc`.
## Script Loading and Module Design
- Plain classic `<script>` tags at the end of `<body>` in `index.html`, in dependency order:
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
- Camera and MediaPipe use `navigator.mediaDevices.getUserMedia(...).then(...).catch(...)` and `requestAnimationFrame` loops throttled to 30 fps.
## Error Handling
- Promise rejections are created with `new Error(\`Product not found: ${id}\`)` in `js/api.js`.
- Consumers log with `console.error("<context>:", err)` and, where there is a visible banner, set a user-facing message: `scanFeedback.textContent = "⚠️ Gagal mengambil data produk.";` (`js/ar.js`).
- Camera permission failure shows the fallback panel (`fallbackUI.style.display = "flex"`) and sets the status badge to `"Kamera Ditolak"`.
- Defensive DOM checks are used for optional elements: `if (!drawer) return;`, `if (grid) ...`, `if (!circle || !text) return;`.
- `recommendOutfit` never rejects. It falls back in order: wardrobe match, catalog match by category and colour, catalog match by category only, first non-current product.
## Logging
- Log only caught errors. No debug or info logging.
## Comments
- Short `//` comments describe intent for blocks and rules (`// Rule helper to check...`, `// 1. Primary: Search in scanned history (Wardrobe)`).
- Data files annotate units and meaning inline: `waterUsage: 120, // Liters used (vs 2700 standard)`, `waterSavings: 95, // % savings`, `carbonFootprint: 1.2, // kg CO2`. Keep those annotations on new products.
- HTML uses `<!-- ... -->` comments to label every major block, including the flowchart reference (`<!-- Scan feedback banner (Flowchart Step 5a) -->`).
- Used only on the `api` methods in `js/api.js` with `@param {type} name - description` and `@returns {Promise<Object>}`. Add JSDoc to any new `api` method; `js/ar.js` internal helpers are undocumented.
## Function Design
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
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## System Overview
```text
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
- Script order in `index.html` is a hard dependency: `js/products.js` (defines `PRODUCTS`), then `js/api.js` (defines `api` and `window.api`), then `js/ar.js` (consumes both).
- All backend behavior is simulated with `setTimeout` promises; `js/api.js` is shaped so it can be swapped for real `fetch` calls.
- Rendering is imperative: `innerHTML` templates for card grids, `textContent` for dashboard fields, `canvas` 2D for AR.
- Two operating modes: camera mode (scan simulation plus pose tracking) and bypass mode (`hasBypassed`, direct data view, placeholder canvas).
## Layers
- Purpose: Static markup and styling; all dynamic regions are filled by `js/ar.js`.
- Location: `index.html`, `css/style.css`
- Contains: Camera panel (`#camera-viewport`, `#webcam`, `#ar-canvas`, `#camera-hud`, cover/loading/fallback overlays), `#catalog-drawer`, `#wardrobe-drawer`, `#dashboard-details`.
- Depends on: Nothing at runtime except CDN scripts.
- Used by: `js/ar.js` via `document.getElementById`.
- Purpose: Orchestrate lifecycle, state, rendering and tracking.
- Location: `js/ar.js`
- Contains: Closure-scoped state (`activeProduct`, `showSkeleton`, `isMirrored`, `trackingActive`, `activeStream`, `hasBypassed`, `poseInstance`, `currentState`), render helpers, MediaPipe setup, canvas drawing, event hooks.
- Depends on: Globals `PRODUCTS`, `api`, `Pose`; browser APIs `navigator.mediaDevices`, `localStorage`, `requestAnimationFrame`.
- Used by: Loaded last from `index.html`.
- Purpose: Simulate server lookup and outfit recommendation.
- Location: `js/api.js`
- Contains: `fetchProductById(id)` returns a JSON deep copy or rejects with `Product not found`. `recommendOutfit(currentProduct, historyIds)` resolves a garment plus `inWardrobe` flag.
- Depends on: Global `PRODUCTS`.
- Used by: `js/ar.js` (`triggerScanAndLoad`, `loadProductDirect`, `clearHistory`).
- Purpose: Product records and scan history.
- Location: `js/products.js`; `localStorage` key `greenwear_history` (JSON array of product ids).
- Contains: Product fields `id`, `name`, `category` (Top/Bottom/Dress/Outer), `description`, `image`, `overlayImage`, `material`, `waterUsage`, `waterSavings`, `carbonFootprint`, `carbonSavings`, `ecoRating`, `careGuide`, `color` (hex), `colorName`, `compatibleCategories`, `compatibleColors`.
- Used by: `js/api.js`, `js/ar.js`.
## Data Flow
### Primary Request Path (camera mode)
### Product selection and bypass flow
### Recommendation rules (`js/api.js:27`)
- Scan state machine constants `STATE_IDLE`, `STATE_SCANNING`, `STATE_LOADING`, `STATE_TRACKING` (`js/ar.js:33-37`); `currentState` starts `idle`.
- Race guard: async steps abort when `activeProduct.id !== product.id`.
- Wardrobe history persists in `localStorage`; everything else is in-memory closure variables.
- `clearHistory` removes the key, re-renders, and re-runs recommendation for the active product.
## Key Abstractions
- Purpose: Single source of truth for garment data and matching rules.
- Examples: `js/products.js`
- Pattern: Plain object literals in a global array; ids are kebab-case strings.
- Purpose: Gate overlay drawing so garments render only after "scan" and data load complete.
- Examples: `js/ar.js` (`triggerScanAndLoad`, `onResults`)
- Pattern: String constants plus a mutable `currentState`.
- Purpose: Map pose landmarks to a rotated, scaled image on the canvas.
- Examples: `js/ar.js` `drawGarmentOverlay`
- Pattern: Landmarks 11/12 (shoulders) set anchor, width and rotation; 23/24 (hips) set height; `Dress` category uses larger factors (2.1x width, 2.1x height ratio). Falls back to a translucent green block labelled with the product name when `overlayImage` is empty or not loaded.
- Purpose: Async boundary mimicking a server.
- Examples: `js/api.js`
- Pattern: Promise-returning methods on a global `api` object with simulated latency.
## Entry Points
- Location: `index.html`
- Triggers: Browser load (must be served from localhost or HTTPS for camera access).
- Responsibilities: Declares DOM, loads CDN and local scripts.
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
### Stacking listeners and no stream teardown
### Product data referencing missing assets
### Logic coupled to global script order
## Error Handling
- Camera denial: `.catch` in `initCamera` shows `#webcam-fallback-ui` and sets the badge to "Kamera Ditolak" (`js/ar.js:318`).
- API failure during scan: banner text "Gagal mengambil data produk." (`js/ar.js:204`); during direct load, only `console.error` (`js/ar.js:227`).
- MediaPipe frame errors: `console.error` in the `send` catch (`js/ar.js:381`).
- No body detected: banner "Tubuh tidak terdeteksi" shown from `onResults`.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
