# Codebase Structure

**Analysis Date:** 2026-10-02

## Directory Layout

```
Prototype Capstone/
├── index.html           # Single page; CDN + local script tags; all DOM regions
├── css/
│   └── style.css        # All styles (single stylesheet)
├── js/
│   ├── products.js      # Global PRODUCTS mock database
│   ├── api.js           # Global api: mock async fetch + recommender
│   ├── ar.js            # Controller: camera, state machine, MediaPipe, canvas, UI rendering, localStorage
│   └── main.js          # Placeholder comment only (not loaded)
├── assets/              # Product card and overlay PNGs
├── docs/
│   └── plans/           # Empty
├── FILES.md             # Hand-maintained file descriptions
├── GreenWear (1).pdf    # Implementation plan reference document
├── .gitignore           # Ignores .DS_Store, .gemini/, .agents/
└── .planning/
    └── codebase/        # Generated codebase maps
```

## Directory Purposes

**`css/`:**
- Purpose: Styling.
- Contains: `style.css` (flat rule blocks by component: body/header/main, `.workspace-grid`, `.camera-panel`, `.camera-hud`, `.garment-card`, `.dashboard-card`, `.stat-circle`, badges).
- Key files: `css/style.css`

**`js/`:**
- Purpose: All application logic, loaded as classic scripts.
- Contains: Data (`products.js`), mock service (`api.js`), controller (`ar.js`), unused placeholder (`main.js`).
- Key files: `js/ar.js`, `js/api.js`, `js/products.js`

**`assets/`:**
- Purpose: Garment images referenced by `image` and `overlayImage` in `js/products.js`.
- Contains: `cotton_tee_card.png`, `cotton_tee_overlay.png`, `linen_shirt_card.png`, `linen_shirt_overlay.png`.
- Note: `hemp_jacket_*`, `denim_dress_*` and `wrap_dress_*` PNGs are referenced by `js/products.js` but absent.

**`docs/plans/`:**
- Purpose: Reserved for plan documents; currently empty.

## Key File Locations

**Entry Points:**
- `index.html`: Page entry; script order `products.js`, `api.js`, `ar.js`.
- `js/ar.js`: Runtime bootstrap via `DOMContentLoaded` handler.

**Configuration:**
- None. No `package.json`, no bundler or build config, no linter config.
- `.gitignore`: Ignored paths only.

**Core Logic:**
- `js/ar.js`: Lifecycle, state machine (`STATE_*`), `initCamera`, `startMediaPipe`, `onResults`, `drawGarmentOverlay`, `drawSkeleton`, `renderWardrobe`, history helpers.
- `js/api.js`: `fetchProductById`, `recommendOutfit`.
- `js/products.js`: `PRODUCTS` data.

**Testing:**
- Not detected. No test files or test runner.

**Documentation:**
- `FILES.md`: File-by-file descriptions (keep in sync when adding files).

## Naming Conventions

**Files:**
- Lowercase, single word, by role: `js/products.js`, `js/api.js`, `css/style.css`.
- Assets: `<slug>_card.png` and `<slug>_overlay.png` (underscore-separated), for example `assets/linen_shirt_card.png`.

**Directories:**
- Lowercase, short: `css/`, `js/`, `assets/`, `docs/`.

**Code identifiers:**
- Product ids: kebab-case (`ecovero-linen-shirt`).
- DOM ids and CSS classes: kebab-case (`#btn-start-camera`, `.garment-card`, `.hud-status`).
- JS variables and functions: camelCase (`activeProduct`, `triggerScanAndLoad`).
- JS constants: UPPER_SNAKE (`PRODUCTS`, `STATE_TRACKING`).
- Button ids use `btn-` prefix; HUD/feedback elements use descriptive names (`scan-feedback-banner`, `tracking-status-badge`).
- Colors in product data are lowercase hex strings from the palette `#4f772d`, `#f5ebe0`, `#6b705c`, `#2a6f97`, `#bc6c25`.

## Where to Add New Code

**New product:**
- Append an object to `PRODUCTS` in `js/products.js` with all existing fields.
- Add `assets/<slug>_card.png` and `assets/<slug>_overlay.png` (or leave `overlayImage: ""` for the color-block fallback).
- Use `category` of `Top`, `Bottom`, `Dress` or `Outer`; the catalog grid and overlay preload pick it up automatically.
- A new category also needs icon handling in `js/ar.js` (three places) and possibly special sizing in `drawGarmentOverlay`.

**New recommendation rule or API method:**
- Implementation: `js/api.js`, returning a Promise with simulated latency.
- Call from `js/ar.js`.

**New UI region:**
- Markup: `index.html` (inside `.dashboard-panel` or `.camera-panel`).
- Styles: `css/style.css`.
- Render and event wiring: inside the `DOMContentLoaded` closure in `js/ar.js`, next to related helpers (render helpers near `updateDashboardDetails`, listeners in the "Hook up Buttons" block at the end).

**New script file:**
- Add a `<script>` tag in `index.html` after `js/products.js` and `js/api.js` if it uses their globals; place it before `js/ar.js` only if `ar.js` depends on it.
- `js/main.js` exists as an unloaded placeholder; add its tag before using it.

**Utilities:**
- No shared utility module exists; define helpers inside the `js/ar.js` closure or create a new global script loaded before it.

**Running locally:**
- Serve the folder over `http://localhost` (for example `python3 -m http.server`); opening `index.html` via `file://` may block camera access. Internet access is required for the MediaPipe CDN.

## Special Directories

**`.planning/codebase/`:**
- Purpose: Generated codebase map documents.
- Generated: Yes.
- Committed: Not determined (the project root is not currently a git repository).

**`docs/plans/`:**
- Purpose: Plan documents.
- Generated: No.
- Committed: Not applicable (empty).

**`.gemini/`, `.agents/`:**
- Purpose: Tool directories excluded via `.gitignore`.
- Generated: Yes.
- Committed: No.

---

*Structure analysis: 2026-10-02*
