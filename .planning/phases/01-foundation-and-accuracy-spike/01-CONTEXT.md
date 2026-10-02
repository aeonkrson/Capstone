# Phase 1: Foundation and Accuracy Spike - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning

<domain>
## Phase Boundary

A team member can open the app on a real phone and a laptop over HTTPS, enter their height, and see live body landmarks and a silhouette computed entirely on the device, with first shoulder and chest (bust) readings in cm. Alongside the code, the phase produces a tape-measure protocol, a measurement definitions sheet, pass criteria written before any data is collected, the first tape and scan readings from team members, the collected ColourBox size chart, and a recorded go/no-go that fixes the measurement set, the model variant and the accuracy targets.

Requirements: CAPT-01 (height entry with validation), PRIV-02 (images processed on the device, never saved or uploaded).

Not in this phase: the fit engine, catalog UI, profile, language switcher (Phase 2); calibrated measurements and quality gates (Phase 3); guided auto-lock capture and consent screen (Phase 4).

</domain>

<decisions>
## Implementation Decisions

### ColourBox size charts (collected)

All three garments are **women's** tees. Values are in cm, taken from the ColourBox product page.

- **D-01:** The plain white tee's columns are **Chest x Bottom x Shoulder x Sleeve Length x Armhole x Back Length**.

  | Size | Chest | Bottom | Shoulder | Sleeve length | Armhole | Back length |
  |------|-------|--------|----------|---------------|---------|-------------|
  | XS | 47 | 50 | 37 | 12 | 20 | 54-58 |
  | S | 49 | 52 | 39 | 13 | 21 | 56-60 |
  | M | 51 | 54 | 41 | 14 | 22 | 58-62 |
  | L | 53 | 56 | 43 | 15 | 23 | 60-64 |
  | XL | 55 | 58 | 45 | 16 | 24 | 62-66 |

- **D-02:** The fitted tee's columns are **Chest x Bottom x Shoulder x Armhole x Sleeve Length x Body Length**. Note that armhole and sleeve length are in the opposite order to the plain tee.

  | Size | Chest | Bottom | Shoulder | Armhole | Sleeve length | Body length |
  |------|-------|--------|----------|---------|---------------|-------------|
  | XS | 33 | 31.5 | 31 | 18 | 14 | 41 |
  | S | 35 | 33.5 | 32 | 19 | 15 | 42 |
  | M | 37 | 35.5 | 33 | 20 | 16 | 43 |
  | L | 39 | 37.5 | 34 | 21 | 17 | 44 |
  | XL | 41 | 39.5 | 35 | 22 | 18 | 45 |

- **D-03:** The boxy tee's chart is **unconfirmed**. Jordan said it uses the fitted tee's column order, but the numbers supplied are identical to the plain tee's in every size (47 x 50 x 37 x 12 x 20 x 54-58 for XS, and so on). Read in the boxy column order they give a 12 cm armhole, which points to a paste of the plain chart. Do not use these values. Confirming the boxy chart with ColourBox is a Phase 1 task.
- **D-04:** The product page does not say how the widths are measured. Treat chest, bottom and shoulder as **flat widths** (chest 47 means about 94 cm around) and mark that as an assumption. Measuring one physical plain tee to confirm is a Phase 1 task and must finish before the go/no-go.
- **D-05:** The plain tee's back length is a range the page does not explain. Record both numbers and use the **midpoint** (56 for XS) as a clearly marked placeholder until the physical shirt is measured.
- **D-06:** No tee has a waist column. **Waist is dropped from the scan**, to be confirmed at the go/no-go. This follows the research recommendation and resolves the MEAS-03 concern in STATE.md, subject to that confirmation.
- **D-07:** Sizes step by 2 cm of flat chest, which is **4 cm of circumference per size**. The pass criteria and the go/no-go must be written with that step in mind.
- **D-08:** Because the garments are women's, "chest" means **bust**. The definitions sheet and the scan must use the same bust definition (fullest point, tape level).

### Test subjects and tape protocol

- **D-09:** Subjects for the spike are the **women on the team only**. The roadmap asks for the first 2-3 team members; if fewer women are available, record the shortfall instead of adding other subjects.
- **D-10:** **Each woman measures herself or picks who measures her.** Because self-measurement is less repeatable, every tape value is taken twice and both readings are logged.
- **D-11:** Subjects are scanned in **everyday clothes only**. No fitted-clothing scans in this phase. The results must be labelled as everyday-clothes results, and no fitted-clothing accuracy may be claimed from them.
- **D-12:** The bust go/no-go is decided by **size agreement, not cm error**. It is a go when the scan lands on the same size as the tape, or one size away and flagged borderline, for most subjects. The cm error is logged for every subject but does not decide.
- **D-13:** Shoulder width keeps its starting target of about 2.5 cm against tape (carried from PROJECT.md).
- **D-14:** Tape and scan numbers live **in the repo under anonymous IDs** (S1, S2, S3). The list of who is which ID stays outside the repo. No photos or images are committed.

### Spike page and old code

- **D-15:** The GreenWear code (tag scan, sustainability dashboard, Mix & Match, wardrobe) is **removed and work starts clean**. Git history keeps the old version. There is no legacy folder.
- **D-16:** Phase 1 strings (height entry, validation messages, camera messages) are written in **English and Indonesian from the start**. The language switcher and the remembered choice (I18N-01, I18N-02) stay in Phase 2.

### Claude's Discretion

- **Debug view form:** whether the landmarks, silhouette and readings view is part of the real app behind a debug switch (for example `?debug=1`) or a separate test page. Pick whichever gets phone results soonest without creating rework, and record the choice.
- **How readings are logged:** an export button that downloads numbers only (no image), or reading values off the screen into a sheet. Choose by build cost against the number of readings needed.
- **Devices and HTTPS:** not discussed. Follow the research default: a local HTTPS dev server for phone testing, with source that also runs on a plain static server.
- **Tape-based size rule:** D-12 needs a written rule for turning a tape bust value into a size on the plain tee chart. That rule must be part of the pass criteria and fixed before any data is collected.
- **How the Phase 1 strings hold two languages** (D-16): keep it small and shaped so Phase 2's language module can absorb it.
- Tooling, file layout, model variant benchmark and CPU or GPU choice follow the research defaults unless the spike shows otherwise.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and requirements
- `.planning/ROADMAP.md` §Phase 1 — goal and the five success criteria this phase must meet
- `.planning/REQUIREMENTS.md` — CAPT-01 and PRIV-02 wording; MEAS-03 (waist) status
- `.planning/PROJECT.md` — constraints, key decisions (PoseLandmarker, typed height, per-measurement accuracy)
- `.planning/STATE.md` §Blockers/Concerns — open Phase 1 items (size chart, waist, iOS Safari)

### Research
- `.planning/research/SUMMARY.md` — accuracy feasibility verdict, resolved tooling and measurement-set conflicts, Phase 1 deliverables, research flags
- `.planning/research/PITFALLS.md` — definition mismatch, clothing inflation, scale and tilt errors, mobile camera behaviour
- `.planning/research/STACK.md` — `@mediapipe/tasks-vision` pin, self-hosting, HTTPS dev server
- `.planning/research/ARCHITECTURE.md` — layer rules and the `FrameObservation` contract
- `.planning/research/FEATURES.md` §5 and §6 — ease model and size chart data model (garment measurements as source of truth, `measured_how`, flat widths doubled in one place)

### Existing code
- `.planning/codebase/CONCERNS.md` — camera lifecycle bugs and pivot-critical gaps in the code being removed

No external specs beyond these. The ColourBox size chart exists only as the tables in the decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Camera start and permission-denied handling in `js/ar.js` (`initCamera`, fallback panel): the knowledge carries over, the code does not (D-15).
- The `requestAnimationFrame` loop throttled to 30 fps that feeds frames to the pose model: same idea applies to the new pose adapter.
- Mirror and skeleton toggles on the canvas: useful reference for the debug view.

### Established Patterns
- The current code is one closure in `js/ar.js` loaded by classic `<script>` tags, with no modules, no build step and no tests. Research recommends ES modules with a pure core, so Phase 1 sets the new pattern instead of following the old one.
- The legacy `@mediapipe/pose` loads unpinned from jsDelivr. Phase 1 replaces it with self-hosted, version-pinned files.
- Existing UI strings are Indonesian; D-16 adds English beside them for the new screens.

### Integration Points
- `index.html` is the entry point and is rewritten for height entry and the camera view.
- `css/style.css` has an uncommitted two-line deletion in the working tree. Commit or discard it before the old code is removed, so it is not lost silently.
- `GreenWear (1).pdf` and `FILES.md` describe the old direction. `FILES.md` becomes wrong once the code is removed.

</code_context>

<specifics>
## Specific Ideas

- The size chart numbers and column orders above come directly from Jordan and are the only source for the ColourBox chart. Copy them exactly, including the differing column order between the plain tee and the other two.
- Jordan chose everyday clothes knowing it will likely push bust error past 3.5 cm, and chose size agreement as the deciding test for that reason. Plans should not quietly reintroduce a fitted-clothing requirement.
- Only the plain white tee is needed for Phase 1's tape-based size and for the first catalog. The fitted and boxy charts are recorded now so they are not lost.

</specifics>

<deferred>
## Deferred Ideas

- **Boxy and fitted tees in the catalog.** The roadmap puts only the plain white tee in the first catalog; more garments is CAT-04 (v2). Whether these two appear earlier is a Phase 2 decision.
- **Stretch handling for the fitted tee.** Its chest is 33 cm flat on XS, about 66 cm around, so it relies on stretch. The fit rules in Phase 2 need a way to handle that before the fitted tee can be checked.
- **Fitted-clothing scans.** Left out of the spike by choice. Comparing fitted and everyday clothing belongs to the Phase 5 tape study if it is wanted.

</deferred>

---

*Phase: 1-Foundation and Accuracy Spike*
*Context gathered: 2026-10-02*
