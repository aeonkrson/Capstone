# Size Fit Scanner (working title)

> Working title only. The project is being renamed away from "GreenWear"; Jordan will choose the final name later.

## What This Is

A browser app for online shoppers who cannot try clothes on. The user scans their body from the front and the side with a phone or laptop camera, the system estimates their body measurements, and then — for a garment and size the user picks from a built-in catalog — it says whether that size fits and, if it does not, which size would.

It replaces the earlier GreenWear direction (AR tag scanning, sustainability info, Mix & Match) in the same repository. It is a university capstone project built by one developer.

## Core Value

A shopper who picks a size gets a fit answer they can trust — because the body measurements behind it are close to what a tape measure would give.

## Requirements

### Validated

<!-- Inferred from the existing GreenWear prototype code. These work today and can be built on. -->

- ✓ Camera access in the browser with a permission-denied fallback and a skip option — existing
- ✓ Live body pose tracking on the camera feed (MediaPipe Pose; shoulders and hips used) — existing
- ✓ Camera frame rendered to a canvas with mirror and skeleton toggles — existing
- ✓ Product catalog served from local mock data through an async API-shaped interface — existing
- ✓ History persisted on the device in `localStorage` — existing

### Active

<!-- Hypotheses until shipped and validated. -->

- [ ] User enters their height before scanning, used to convert image pixels to centimetres
- [ ] User is guided through a front capture and a side capture
- [ ] Scanning works in a phone browser and on a laptop webcam
- [ ] System estimates the upper-body measurements needed to fit tops (exact set — e.g. shoulder width, chest, waist, torso length, arm length — to be settled by research)
- [ ] User sees the estimated measurements in cm and can correct any of them
- [ ] Built-in catalog of ColourBox tops, each with its own size chart and a cut label (regular, loose or oversize); first garment is a plain white T-shirt
- [ ] User picks a garment and a size and gets a verdict: fits or does not fit
- [ ] When the chosen size does not fit, the system recommends the size that would
- [ ] User can state how they like tops to fit (regular, loose, oversize) and the recommendation accounts for it, alongside the garment's own cut
- [ ] Local profile on the device (no server account)
- [ ] Measurements are saved so later fit checks do not require a rescan
- [ ] History of past fit checks (garment, size, verdict)
- [ ] Interface available in English and Indonesian
- [ ] Estimated measurements land within about 2-3 cm of tape measurements, checked on the project team's own bodies

### Out of Scope

- Clothing tag scanning — the project pivoted away from the GreenWear tag-scan flow
- Sustainability information (material, water, carbon, care guide) — dropped; this is a pure size-fit tool
- Mix & Match outfit recommendations — part of the old direction
- Garment overlay drawn on the user's body (AR try-on) — not selected for the first version; the verdict is what matters
- Bottoms, dresses and other non-top garments — first version covers tops only
- Server-side accounts or any backend — profile is local so body data never leaves the device
- User-entered size charts — catalog is built in
- Reference-object or fully automatic scale calibration — user-typed height was chosen as the scale source
- Accuracy testing on people outside the team — validation is on team members only
- Revising the capstone proposal document to match the pivot — Jordan asked to leave this out for now

## Context

**Origin.** The repository holds the GreenWear capstone prototype. The approved proposal (`GreenWear (1).pdf`) describes an AR platform for sustainable fashion: scan a clothing tag, show sustainability data, recommend outfit combinations. That document does not mention body scanning or size fit. Jordan has decided to pivot; whether the proposal gets revised is deliberately not part of this project's scope yet.

**Existing code.** Static site: `index.html`, `css/style.css`, `js/products.js`, `js/api.js`, `js/ar.js`. No `package.json`, no build step, no tests. MediaPipe Pose and its model files load from an unpinned CDN. `js/ar.js` is one 574-line closure that mixes camera, pose, drawing, catalog UI and storage. The tag scan and the "server" are simulated with timers. Full detail in `.planning/codebase/`.

**What carries over and what does not.** Camera and pose plumbing is reusable. The measurement approach is not: the current code reads only four 2D joint-centre landmarks in normalised pixel space, with no real-world scale and no body outline. Joint centres cannot give a chest or waist circumference. Reaching tape-measure accuracy needs, at minimum, a scale reference (the user's height), a body silhouette (segmentation) for widths and depths from the front and side views, and capture-quality checks. See `.planning/codebase/CONCERNS.md` for the full list, including camera lifecycle bugs and the product-centric state machine that the scan flow should replace.

**Catalog source.** Garments come from ColourBox. The first item is a plain white T-shirt. The actual size chart values still have to be collected.

**Fit model.** Fit depends on two things that both use the words regular / loose / oversize: the garment's intended cut, and how the user likes to wear tops. Both feed the recommendation.

**Privacy.** Body images and measurements are sensitive personal data. The decision to keep everything on the device (local profile, no backend) follows from that.

**Biggest open question.** Whether 2-3 cm accuracy is realistic from front and side images in a browser, on both a phone and a laptop webcam. This is the main thing for research to answer before requirements are fixed.

## Constraints

- **Timeline**: Demo-ready in 1 to 3 months — capstone schedule
- **Team**: One developer (Jordan) builds everything — no handoff or parallel work to plan for
- **Platform**: Runs in the browser on both phone and laptop — no native app
- **Data**: All body images and measurements stay on the device — no backend, no server accounts
- **Camera**: Browser camera access needs HTTPS or localhost — affects how the app is served and demoed
- **Scope**: Tops only, starting with one plain white T-shirt — keeps the first version narrow
- **Accuracy**: About 2-3 cm against tape measure — this is the bar for "done", validated on team members
- **Language**: English and Indonesian UI — existing strings are Indonesian

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Body scan + size fit replaces the GreenWear tag scan / Mix & Match direction | Jordan's choice for the capstone | — Pending |
| Drop the sustainability angle entirely | Project is a pure size-fit tool | — Pending |
| Output is a verdict on the chosen size plus a better size when it does not fit | More useful than a bare yes/no | — Pending |
| Scale comes from user-typed height | Simplest reliable way to turn pixels into cm | — Pending |
| Users can see and correct measurements | Scan estimates will sometimes be off; correction keeps the fit answer trustworthy | — Pending |
| Built-in catalog of ColourBox tops; first garment a plain white T-shirt | Narrow, concrete starting point with real size charts | — Pending |
| Tops only in the first version | Limits measurements to the upper body | — Pending |
| Fit accounts for both garment cut and user preference (regular / loose / oversize) | Same body can want different sizes | — Pending |
| Local profile, no backend | Body data stays on the device; no server to build | — Pending |
| Must work on phone browser and laptop webcam | Online shoppers use both; laptop is easiest for demos | — Pending |
| Accuracy validated on team members only, target about 2-3 cm | Practical within the capstone | — Pending |
| No garment overlay / AR try-on in the first version | Not selected; verdict is the core value | — Pending |
| New project name to be chosen later | "GreenWear" no longer fits | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-10-02 after initialization*
