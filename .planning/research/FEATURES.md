# Feature Research

**Domain:** Body-scan / size-recommendation tools for online clothing shoppers (photo-based body measurement + fit-finder widgets), v1 scoped to tops, one plain white T-shirt from an Indonesian retailer (ColourBox), on-device profile, EN + ID UI.
**Researched:** 2026-10-02
**Confidence:** MEDIUM. Product-category patterns (inputs, capture guidance, verdict shapes, ease ranges) are corroborated by several vendor and reference sources. Vendor internals (confidence scoring, exact verdict UI) are not public, so those parts are inferred. Ease numbers are heuristics to be calibrated against the real ColourBox chart, not constants. Privacy/legal notes are not legal advice.

## How the Domain Splits (read this first)

Two product families exist, and the project sits between them:

1. **Fit-finder widgets** (True Fit, Fit Analytics, Kiwi Sizing, Sizely, Bold Metrics Smart Size Chart): ask 3-6 questions (height, weight, age, gender, fit preference), *estimate* body measurements statistically, then recommend a size. No camera. Returns ~25-35% lower per vendor claims (LOW confidence, vendor marketing). Most rely on purchase-history networks or ML rather than the garment's own measurements. Sizely is a notable exception: it scores against the garment's own measurements and shows "great fit / good fit / between sizes" plus an alternative size.
2. **Photo body-measurement apps** (3DLOOK, Mirrorsize, 3D Measure Me, Choozr, ZOZOFIT, Amazon "Made for You"): two photos (front + side) plus height (and often weight/gender) give measurements, which are mapped to a brand's chart. Typically sold to retailers; end users rarely edit measurements.
3. **Garment-vs-garment comparison** (Virtusize): the user compares the product to a garment they own. It sidesteps body measuring entirely and tells the user the per-dimension cm difference.

This project is family 2 with the transparent, per-area, cm-difference verdict of family 3 and the on-device privacy posture none of the commercial vendors offer. That combination is the differentiator story.

## Feature Landscape

### Table Stakes (Users Expect These)

Missing these = the product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Height entry (cm, with validation; ft/in not needed for Indonesia) | Every photo-scan tool requires it; it is the pixel-to-cm scale source here | LOW | Hard range check (e.g. 120-220 cm), numeric keypad on phone. Required, blocks scan until valid. Also drives sanity checks on estimated measurements (e.g. shoulder/height ratio). |
| Guided front capture, then side capture, as a step-by-step flow | The defining UX of the category ("two photos, front and side") | MEDIUM | Separate screens per view, progress indicator (1/2, 2/2), one clear instruction at a time. Reuses existing camera + MediaPipe plumbing but needs a new state machine, not the product-centric one. |
| Pose instructions with a visual guide | Users do not know the pose; vendors use A-pose-like standing: feet shoulder-width, arms slightly away from the body, facing camera; side view with arms relaxed/forward as the tool requires | MEDIUM | Silhouette overlay or pictogram per view. Live pose landmarks can drive a "pose OK" state (arms away from torso, body upright, facing correct way). |
| Clothing guidance | Vendors consistently say: tight/form-fitting clothes, hair off shoulders, no bulky layers | LOW | Static text + icon before capture. Note the T-shirt-fit reality: users scanning in baggy tees will inflate chest. Show this as a pre-capture checklist, not buried help. |
| Background and lighting guidance | Plain, uncluttered, contrasting background and bright even light; clear others/pets from frame | LOW | Static checklist; pair with automated checks below. |
| Camera placement guidance (distance, height, full body in frame, phone propped upright) | Biggest source of bad scans; vendors say waist-level camera, full head-to-feet in frame | LOW-MEDIUM | Laptop webcam is hard (full body needs distance). Provide a separate "laptop: step back ~2 m, tilt screen" tip. Phone: prop at about waist/chest height, portrait. |
| Self-timer / countdown capture (3-10 s) with audio or visual cue | A user cannot tap a button while posing at distance; every serious capture flow auto-captures or counts down | LOW-MEDIUM | Preferred: auto-capture when quality checks pass for N consecutive frames (hold-still 1-2 s), with a manual timer fallback. |
| Live quality checks before capture is accepted | Photo tools gate on pose/visibility to avoid garbage-in; "having trouble detecting your body pose" is a common support topic | MEDIUM-HIGH | Minimum set: full body visible (head and feet landmarks inside frame with margin), subject upright/centered, correct facing (front vs side via shoulder landmark spacing), arms clear of torso, subject stationary, distance sane, brightness not too low, single person. Each failure maps to one plain-language hint (EN + ID). |
| Retake (per view) and review of captured images before measuring | Users expect to redo a bad shot without restarting everything | LOW | Thumbnails of front/side with "Retake" per view. Keep images in memory only (see privacy). |
| Show the estimated measurements in cm | Core of the project; users want to see what the system "thinks" before trusting a verdict | LOW | Simple list: label, value, short "what this is" help. |
| Edit/correct any measurement | Project requirement; standard in tape-measure-entry fit finders, rarer in photo apps | LOW | Inline numeric edit; mark values as "estimated" vs "edited by you"; keep "reset to scanned" option. Verdict must recompute instantly. |
| How-to-measure help for tape-measure users (illustrated "how to measure chest") | Users who correct a value need to know what chest/shoulder means; Indonesian retailers (e.g. Zalora blog) publish such guides | LOW | Short illustrated tooltips per measurement. Lets users replace a scan value with a tape value. |
| Garment/size picker from a built-in catalog | Project requirement | LOW | One garment in v1 (white T-shirt), sizes in a chip row. Architecture should still be N garments. |
| Overall fit verdict for the chosen size | The product's core output | MEDIUM | Three-or-four state label, not a bare yes/no: e.g. "Good fit", "Snug", "Loose", "Too small/Too large". Always with a one-sentence reason. |
| Recommended alternative size when the chosen size does not fit | Project requirement; every fit-finder does this ("M fits you", "between sizes") | MEDIUM | Evaluate all sizes in the chart, rank by score, return best; if two are close say "between M and L". |
| Per-area tight / OK / loose breakdown | Verdict credibility depends on the "why"; the pattern "S: tight at chest, L: loose at shoulders" is standard among garment-aware checkers | MEDIUM | Areas for tops: chest, shoulder, length, sleeve (waist/hem optional). Show cm difference alongside label (Virtusize-style). |
| User fit-preference input (snug / regular / loose / oversize) | Fit-finders ask "fit preference" (Fit Analytics, Kiwi); same body wants different sizes | LOW-MEDIUM | One selector, defaulted to Regular, changeable at any time on the result screen. Sets a target ease band. |
| Garment cut label (regular / loose / oversize) visible on product | Project requirement; shoppers need to know the garment is boxy before reading the verdict | LOW | Display only plus used for ease logic fallback (see Ease section). |
| Size chart stored with garment measurements | Without it there is nothing to compare | MEDIUM | See data model below. Must be collected from ColourBox for the white T-shirt. |
| Local profile that remembers height, measurements, preference | Project requirement; repeat visitors expect "no rescan" | LOW-MEDIUM | `localStorage` (or IndexedDB) with schema version. Include "Edit profile" and "Delete my data". |
| History of past fit checks (garment, size, verdict, date) | Project requirement | LOW | Store the verdict inputs (garment id, size, preference, measurement snapshot hash/version) so history entries remain explainable after a rescan. |
| Consent notice before camera use stating what is captured, where it is processed, whether images are stored | Biometric-adjacent imagery; expected by users and required in spirit by privacy law; Amazon/other try-on tools drew lawsuits over missing notice | LOW | Plain-language screen: images processed on this device, not uploaded, not saved (or exactly what is saved). Explicit "I agree / Start" action. EN + ID. |
| Delete data control | Standard privacy expectation; Amazon exposes deletion of photos as the consent-withdrawal path | LOW | One button wiping profile, history and any stored images. |
| Language toggle EN / ID | Project requirement | MEDIUM | Not a feature but a cross-cutting cost: every instruction, quality hint, verdict sentence, and size label needs both languages; use a key-based string table from day one. |
| Camera-permission-denied handling | Already exists; expected | LOW | Carry over, but remove the "skip" path if it leads to a meaningless scan. Offer manual measurement entry instead. |

### Differentiators (Competitive Advantage)

Not expected, but support the Core Value ("a fit answer they can trust").

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Fully on-device processing and local profile, stated plainly in the UI | Commercial vendors (3DLOOK, Amazon, ZOZO) are server-based; "images never leave your phone" is a real trust advantage in the biometrics-wary climate | LOW (given architecture is already decided) | Make it visible: a persistent "Processed on your device" badge and a verifiable claim (no network calls during scan). Costs nothing extra but must be true; do not add analytics that contradict it. |
| Transparent per-area verdict with cm differences ("chest: 6 cm roomier than your preferred fit") | Most widgets are black-box ML; Sizely and Virtusize prove cm-level transparency is valued | MEDIUM | Needs garment measurements per size. Pair with plain-language explanation, not just numbers. |
| Fit verdict that scores against actual garment measurements, not only body size | Chart-letter-based or purchase-history systems cannot tell that a boxy tee runs large; Erigo-style tees are noticeably wider than their size letter suggests | MEDIUM | This is the right model for a single-brand catalog (see ease model). |
| Confidence / margin indicator on the verdict | Honest signal given 2-3 cm measurement error; Sizely shows "great / good / between sizes" | MEDIUM | Simplest defensible implementation: compute the verdict under measurement uncertainty (e.g. chest +/-2.5 cm); if the verdict changes across that band, flag "borderline, between sizes M and L" instead of claiming certainty. Do not show a fake percentage. |
| Scan-quality score shown to the user, with a gate on low quality | Tells the user when to retake rather than silently producing a bad estimate | MEDIUM | Aggregate of the live checks (visibility, pose, lighting). Low score lowers verdict confidence and prompts retake. |
| Preference-aware recommendation shown side-by-side ("for snug: S, for regular: M, for oversize: L") | Lets the user explore without rescanning; makes the cut + preference interaction understandable | LOW-MEDIUM | Cheap once the verdict function exists: run it for each preference and display a small table. Strong demo moment. |
| Tape-measure override mode as first-class path ("I know my chest = 96 cm") | Gives a trusted fallback and doubles as the validation ground truth for the project's 2-3 cm accuracy check | LOW | Same editing UI; mark source = "tape". Useful for the team-member accuracy test. |
| "Compare with a tee you own" (enter one garment's flat chest width and length) | Virtusize's key insight: comparing garments is easier and more accurate than measuring bodies | MEDIUM | Strong v1.x candidate and an excellent accuracy cross-check; skip in v1 to protect the timeline. |
| Measurement history / "your measurements changed" comparison across scans | Valuable for body-change tracking, but secondary here | MEDIUM | Defer. |
| Bilingual quality hints with spoken (TTS) guidance | Hands-free capture from 2 m away | MEDIUM | Browser speech synthesis has uneven Indonesian voice support; verify before promising. Nice-to-have, not v1. |
| Export / import profile as a file | Compensates for no backend (move profile between phone and laptop) | LOW-MEDIUM | v1.x. Natural fit with the local-only stance. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Asking weight, age, gender as required inputs | Kiwi Sizing, True Fit, Fit Analytics, Sizely ask them | They exist to *estimate* a body when no scan exists (statistical proxy). Here the body is measured, so these inputs add friction, are sensitive, and offer no accuracy gain over the silhouette. Weight in particular is socially sensitive and hurts completion. | Ask height only. Skip gender entirely (a plain tee chart is unisex/one chart). If a future garment has gendered charts, make that a garment property, not a user input. |
| Statistical body estimation from height/weight as a fallback | Gives "an answer" when the scan fails | Hides the failure, undermines the 2-3 cm accuracy bar, and invites silent wrong verdicts | On failed or low-quality scans: say so, offer retake or manual tape entry. |
| Garment overlay / AR try-on / 3D avatar | Looks impressive; Amazon, Zalando, ZOZO invest in it | Already out of scope; heavy; visual realism raises trust beyond what 2-3 cm accuracy supports | Per-area numeric verdict + simple flat diagram highlighting tight/loose zones. |
| 80+ body measurements (3DLOOK-style) | Competitor marketing number | Browser-quality silhouettes cannot support it; most are irrelevant for tops | 4-5 top-relevant measurements only (below). |
| Percentage "accuracy" or "98% match" claims | Looks authoritative (Sizely quotes 98.1%) | Unvalidated on n = team members; misleading | Use "good fit / borderline / between sizes" and state the measurement tolerance honestly. |
| Server-side photo storage, accounts, cloud sync | Cross-device profile, analytics | Violates the core privacy decision; creates biometric-law exposure (Amazon/BIPA-style suits; Indonesia UU PDP treats biometric data as specific personal data needing explicit consent) | Local profile; optional manual export file later. |
| Storing the raw front/side photos by default | "Show my scan later" | Highest-risk data for the least value; measurements are what is reused | Keep frames in memory for the session only; persist numbers. If a thumbnail review is needed, discard on leaving the scan flow. |
| Back-view capture or video/rotating 3D scan | More data | Not needed for tops chest/shoulder/length; adds friction | Front + side only. |
| Multiple retailers / user-entered size charts | Generality | Already out of scope; data-quality burden | Built-in ColourBox charts. |
| Social sharing of results, body-shape labelling ("pear", "apple"), style recommendations | Engagement features common in styling apps | Out of scope, body-shaming risk, privacy risk | None. |
| Letter-size-only recommendation ("You are an M") without garment context | Simple | Same body maps to different letters in different cuts; this is the exact problem the project solves | Always verdict relative to a specific garment, size and preference. |
| Silent auto-correction of user-edited measurements | "Smart" sanity | Surprising; erodes trust | Warn on implausible values (e.g. chest below shoulder-width implied), but accept the user's number. |

## Detailed Findings for the Specific Questions

### 1. Guided capture (what products do)

Common across vendors (3DLOOK, MeThreeSixty/SizeStream, ZOZOFIT, Verifyt, Mirrorsize, others; MEDIUM confidence, multiple consistent sources):

- Two photos (front, side). Some use four (3D Measure Me) or three; two is the mainstream.
- Clothing: tight-fitting, solid colour contrasting with the wall; hair off shoulders and face; no bulky layers. (ZOZOFIT publishes an explicit "how to dress for an app-only scan" page.) Note for this project: the scan clothing guidance is the opposite of how the user will wear the T-shirt, so say "wear fitted clothes for scanning only."
- Background: plain, uncluttered, even lighting, nobody else in frame.
- Camera: full body in frame, roughly waist-level, upright, phone propped. Laptop is not a mainstream target for commercial apps, so laptop guidance is a project-specific design burden (distance, tilt, webcam field of view/lens distortion).
- Pose: standing straight, feet shoulder-width, arms slightly away from body (so torso silhouette is not merged with arms) for the front; side view with arms relaxed or raised per tool.
- Timer / auto capture: countdown or automatic capture once pose is held; audio cues in some apps.
- Retake: per-photo.

Quality-check set to implement (all derivable from MediaPipe landmarks and the segmentation mask, no extra model): full-body visibility with margin, upright (small head-to-ankle tilt), correct orientation (front vs side by shoulder-width ratio or nose/ear landmark visibility), arms clear of torso, stillness over N frames, subject distance (height in frame between roughly 60-90%), single person, brightness/contrast of mask edge. Complexity: MEDIUM-HIGH, and this is where accuracy is won or lost.

### 2. Inputs: which are needed

| Input | Commonly asked by | Needed here? | Reason |
|-------|-------------------|--------------|--------|
| Height | Everyone | **Yes, required** | Scale source |
| Weight | Kiwi, True Fit, Fit Analytics, Sizely, Amazon Made for You, many photo apps | **No** | Only helps estimate body shape when not measured; sensitive; scan provides the girth |
| Age | True Fit, Fit Analytics, Kiwi | **No** | Statistical proxy only |
| Gender | Kiwi, 3DLOOK (often) | **No for v1** | One unisex tee chart; asking adds friction/inclusivity questions. Revisit if gendered charts appear |
| Fit preference | Fit Analytics, Kiwi, Bold Metrics | **Yes** | Core of the project's fit model |
| Usual size / a garment they own | True Fit (closet), Virtusize | Optional, v1.x | Strong accuracy cross-check, not needed for v1 |
| Tape-measured values | Kiwi simple types, Sizely optional | Optional override | Via edit UI |

Confidence MEDIUM-HIGH that weight/age/gender are statistical proxies; the project has a better source (silhouette).

### 3. Measurements shown and edited

Recommended v1 set for a plain T-shirt (match what the retailer chart provides; Indonesian charts — Erigo, Zalora, Uniqlo ID — use *lebar dada* (chest width, flat), *panjang badan/baju* (body length), *panjang lengan* (sleeve), sometimes *lebar bahu* (shoulder)):

| Measurement | Role | Pairs with garment dimension | Scan difficulty |
|-------------|------|------------------------------|-----------------|
| Chest circumference | Primary driver of size | 2 x flat chest width (lebar dada, pit-to-pit) | HIGH (needs front width + side depth and an ellipse model; breast/body-shape error) |
| Shoulder width | Fit at seam; important for oversized "drop shoulder" tees | Garment shoulder width (if chart has it) | MEDIUM-HIGH (pose landmarks are joint centres, not bone-edge points; needs silhouette-based refinement) |
| Torso length (neck base/shoulder to hip or desired hem) | Length verdict | Body length (panjang badan, HPS to hem) | MEDIUM (landmarks) |
| Arm length (shoulder to wrist; sleeve uses shoulder to mid-bicep) | Sleeve verdict | Sleeve length | MEDIUM |
| Waist circumference | Optional, for tapered/fitted tees only | Garment hem/waist width if present | HIGH; skip in v1 for a straight tee unless the chart lists it |

Display: label, cm value, "estimated" tag, edit pencil, tiny diagram of where it is measured. Edits recompute the verdict live. Keep a "scan value" alongside the "your value" so users can revert. Commercial photo apps mostly hide measurements behind retailer dashboards, so editable measurements are closer to tape-entry widgets (Kiwi simple types, Bold Metrics' 50+ measurement model) than to photo apps. (MEDIUM.)

### 4. Presenting the verdict

Pattern observed (GitHub fit-check design, Sizely, Virtusize; MEDIUM):

1. **Headline for the chosen size:** one of Good fit / Snug / Loose / Too tight / Too large (colour + icon + words, not colour alone).
2. **Per-area chips:** Chest: OK (+8 cm ease), Shoulder: loose (+3 cm), Length: OK, Sleeve: OK. Show cm differences from the preferred target.
3. **Alternative size** when the headline is not "good fit": "Try M instead." If chosen size is acceptable but a neighbour is better, say so softly.
4. **Confidence:** a three-level read (clear fit / borderline / between sizes) derived from the measurement-uncertainty band, plus a "based on N measurements" note and a visible scan-quality note. Avoid false-precision percentages.
5. **Explanation sentence** in EN/ID: "Size M is about 4 cm too tight across the chest for how you like to wear tops."
6. **Show all sizes** as a compact row (S M L XL with a coloured dot each) so the user sees the neighbourhood, not just a single recommendation.

Rule of thumb from one design source: a size is shown with the count of measurements assessed; only compare measurements that exist for both body and garment. Chest-ease comfort range quoted there: ~4-12 cm good, under 4 tight, over ~16 loose (LOW confidence, single source, and tuned to shirts rather than boxy T-shirts).

### 5. Garment cut, user preference, ease allowances

Reference ease ranges (sewing/pattern-making sources; MEDIUM, directionally consistent, numbers vary by author):

| Fit | Chest ease over body (garment chest circumference minus body chest) |
|-----|------|
| Very close/slim | ~0-5 cm |
| Close | ~2.5-5 cm |
| Standard/regular | ~5-10 cm (up to ~16 cm for men's woven shirts) |
| Loose | ~10-15 cm |
| Oversized | ~15 cm and above (boxy tees often 20-30 cm+) |

Real data point: Erigo tees have chest width 51-59 cm flat for S-XXL, i.e. 102-118 cm garment circumference, so a person with a 90 cm chest in a size S gets about 12 cm ease. This confirms retail "regular" tees in Indonesia often carry more ease than textbook ease tables, so the numbers must be calibrated to the real ColourBox chart, not copied from sewing tables.

**Recommended model (opinionated; avoids the double-count trap):**

- The garment's *actual measurements* already encode its cut. The garment cut label (regular/loose/oversize) is therefore **display and fallback metadata**, not an extra additive term when real garment measurements exist.
- The user's **preference** defines a *target ease band per area* (e.g. chest: snug 4-8, regular 8-14, loose 14-20, oversize 20+ cm, to be tuned).
- Verdict per area = actual ease (garment measurement minus body measurement) versus the preference band: below the band = tight, inside = OK, above = loose.
- The cut label is used (a) in the UI ("this tee is cut oversize, so it will look roomy even in your usual size"), (b) as a sanity check (if actual ease at the user's normal size is wildly different from the label's typical range, flag a data-entry error in the chart), and (c) only if a garment lacks full measurements, to derive approximate ease from the label.
- This matches how Sizely scores against garment measurements and how a per-garment comfort range works in the GitHub fit-check design.
- Treat chest as the dominant area; shoulder and length verdicts adjust the result but should rarely flip a size alone (tolerance bands wider for length/sleeve, which are style-tolerant on a T-shirt).
- Add a stretch factor per garment (jersey cotton T-shirt is stretchy, so an "ease" slightly below the band can still be comfortable). Keep as a per-garment constant rather than a user-facing feature.

Complexity: MEDIUM. The logic is small, but the calibration (what ease bands feel right) needs tuning with the team's own bodies and real garments. That tuning is the actual work.

### 6. Size chart data model for tops

Two models exist, and the product needs both ends:

| Model | Contents | Used by | Pros | Cons |
|-------|----------|---------|------|------|
| **Body-measurement chart** ("fits body chest 88-94 cm") | Ranges of body measurements per size letter | Traditional brand size guides, 3DLOOK-style mapping, Kiwi simple types | Direct comparison with scan output; simple | Hides the cut/ease; brand must have defined it; tends to be inconsistent with the actual garment |
| **Garment-measurement chart** (flat chest width, body length, shoulder, sleeve in cm) | Finished product dimensions | Erigo, Zalora, Uniqlo ID, Virtusize, Sizely | Objective, easy for a retailer to measure and publish; shows true ease | Needs ease logic to compare with a body |

**Recommendation for v1: store garment measurements as the source of truth** (retailers already publish them, e.g. lebar dada / panjang badan / panjang lengan), and derive "implied body range" at display time from ease. Suggested schema:

```
garment {
  id, name {en,id}, category: "top", cut: "regular|loose|oversize",
  stretch_cm_chest (optional), unit: "cm",
  sizes: [
    { label: "S", chest_flat_cm, shoulder_cm?, length_cm, sleeve_cm? }, ...
  ],
  measured_how: { chest: "pit-to-pit flat", length: "HPS to hem", ... },
  source: "ColourBox size chart, collected <date>", tolerance_cm: 1-2
}
```

Notes: store *flat* widths as published and convert to circumference (x2) in code, in one place; record how each value is measured (retailer measurement points vary: HPS vs back-neck-to-hem, sleeve from shoulder vs from neck); include the manufacturing tolerance (+/-1-2 cm), which should be included in the verdict margin. Body-measurement ranges are optional extra display data, not an input.

### 7. Saved profiles and history

- Profile (local): height, last scanned measurements (with source scanned/edited/tape and date), fit preference, language, consent flag. Include a schema version.
- History entry: timestamp, garment id, size, preference, verdict, per-area result summary, recommended size, measurement snapshot (so reopening explains itself).
- Users expect: view, re-open, delete one, clear all, "update measurements without redoing everything" (re-scan or edit).
- Local-only caveat: data is lost with browser-storage clearing and is not shared between phone and laptop; say so in the UI and consider export later. Browsers (notably iOS Safari) can evict storage for unused sites; ITP rules are worth a check in the stack research. (LOW confidence; verify.)

### 8. Consent and privacy messaging for body images

- Industry pattern: Amazon says photos are deleted after the digital twin is built (Made for You) or retained until the user deletes them (virtual try-on) with consent withdrawn by deletion; over fifteen biometric class actions since 2021 against retailers over try-on tools (one source, LOW-MEDIUM). Lesson: notice, explicit consent, retention statement, and deletion path are the table stakes.
- Indonesia: UU PDP (Law No. 27 of 2022) classes biometric data as *specific personal data* requiring explicit consent (Art. 20(2) per secondary legal sources; MEDIUM). Whether a body silhouette counts as biometric is arguable; face visible in the frame makes treating it as sensitive the safe and honest stance. Not legal advice; a capstone demo run entirely on-device substantially reduces exposure.
- Message content to write (EN + ID): what is captured (two camera images), where processed (this device, in the browser), what is stored (height, measurements, history; images not stored), what is never done (no upload, no account), how to delete, and that results are estimates. Show it before the first camera start, require a positive action, re-show a short reminder on the capture screen, and add a persistent "Delete my data" in settings.
- Do not claim "no data ever leaves the device" if MediaPipe model files load from a CDN (that is a network request, though it carries no body data). State "your images are not uploaded," and consider self-hosting model files (also fixes the unpinned-CDN issue noted in the project).

## Feature Dependencies

```
Height entry ─────────────┐
                          ├──requires──> Pixel-to-cm scaling ──requires──> Silhouette segmentation + pose landmarks
Front capture ────────────┤                                                      (existing pose plumbing + new segmentation)
Side capture ─────────────┘
Live quality checks ──enhances──> Guided capture ──requires──> Camera access (exists)
Self-timer / auto-capture ──requires──> Live quality checks (for "hold still / pose OK" gating)
Retake ──requires──> Captured-frame review (in-memory)

Estimated measurements ──requires──> Front + side capture, height, scaling
Edit measurements ──requires──> Measurements display
Tape override ──is──> Edit measurements (same UI, different source tag)

Garment catalog + garment-measurement size chart ──requires──> Real ColourBox chart data (external dependency, must be collected)
Per-area verdict ──requires──> Measurements (scanned or edited) + garment chart + preference ease bands
Overall verdict ──requires──> Per-area verdict
Alternative-size recommendation ──requires──> Per-area verdict run across all sizes
Confidence indicator ──requires──> Verdict function + measurement-uncertainty band (+ scan-quality score, optional)
Preference side-by-side table ──requires──> Verdict function (cheap re-run)

Local profile ──requires──> Measurements + preference
History ──requires──> Verdict + local profile
Delete my data ──requires──> Local profile + history storage
Consent screen ──precedes──> Camera start (gate)

Language toggle (EN/ID) ──cross-cuts──> all of the above (string table from day one)

Weight/age/gender inputs ──conflicts──> "Measured, not estimated" principle (anti-feature)
Statistical fallback estimation ──conflicts──> 2-3 cm accuracy bar and honest failure
Storing raw images ──conflicts──> On-device privacy promise
```

### Dependency Notes

- **Verdict requires real garment data:** the single biggest external dependency is collecting the ColourBox chart (flat chest, length, sleeve, shoulder if available, and how each is measured). Until this exists, ease calibration and verdict testing cannot be validated, so collect it first.
- **Quality checks gate the timer/auto-capture:** auto-capture should fire off the same pass/fail checks the user sees, so build the check engine once and reuse it.
- **Edit + tape override share the same component:** one UI, a `source` tag; also gives the team a ground-truth path for the accuracy test.
- **Confidence needs the measurement-error assumption:** use the validated error from team testing (e.g. 2-3 cm) as the band; before validation, use a conservative default.
- **Language cross-cuts:** adding EN/ID after the fact is expensive (quality hints, verdict sentences, size labels). Do it as a string table in the first phase.
- **Preference vs cut:** do not let both add ease independently (double-count); see model above. This is the main logic dependency to get right.

## MVP Definition

### Launch With (v1)

- [ ] Consent screen before camera (EN/ID) and "Delete my data" — gates everything
- [ ] Height entry with validation
- [ ] Guided front then side capture: pictogram/overlay, clothing + background + distance checklist, live quality checks with plain-language hints, countdown or hold-still auto-capture, per-view retake and review
- [ ] Estimated chest circumference, shoulder width, torso length, arm length (waist only if the chart or accuracy testing justify it)
- [ ] Measurements list in cm with inline edit, estimated/edited tag, revert, short how-to-measure help
- [ ] Catalog with one garment (white T-shirt), garment-measurement size chart, cut label shown
- [ ] Fit preference selector (snug/regular/loose/oversize; default regular)
- [ ] Overall verdict + per-area tight/OK/loose with cm differences + recommended alternative size + borderline/between-sizes confidence flag
- [ ] Local profile (height, measurements, preference, language) and fit-check history
- [ ] EN/ID throughout
- [ ] Phone and laptop capture guidance variants

### Add After Validation (v1.x)

- [ ] Preference side-by-side table (S/M/L per preference) — cheap once the verdict function is stable
- [ ] Scan-quality score surfaced to the user — after the check engine is validated
- [ ] "Compare with a tee you own" — accuracy cross-check and Virtusize-style benefit
- [ ] Profile export/import — once local-only limits are felt
- [ ] More garments (more tops from the catalog) — validates the data model
- [ ] Spoken/TTS capture guidance — after checking Indonesian voice support

### Future Consideration (v2+)

- [ ] Bottoms, dresses — new measurement set (waist, hip, inseam)
- [ ] Multiple profiles (family members) — adds profile management complexity
- [ ] Return/feedback loop ("this fit me / didn't") to calibrate ease — needs data collection beyond local-only
- [ ] AR/avatar visualisation — explicitly out of scope
- [ ] Multi-retailer charts — needs data pipeline and backend

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Height entry + scale | HIGH | LOW | P1 |
| Guided front + side capture flow | HIGH | MEDIUM | P1 |
| Live quality checks + hints | HIGH | HIGH | P1 |
| Timer / hold-still auto-capture | HIGH | MEDIUM | P1 |
| Retake + review | HIGH | LOW | P1 |
| Measurement estimation (chest, shoulder, length, arm) | HIGH | HIGH | P1 |
| Measurements display + edit | HIGH | LOW | P1 |
| Garment-measurement size chart + catalog | HIGH | MEDIUM (data collection) | P1 |
| Overall verdict + per-area breakdown | HIGH | MEDIUM | P1 |
| Alternative size recommendation | HIGH | MEDIUM | P1 |
| Fit preference + ease bands | HIGH | MEDIUM | P1 |
| Borderline / between-sizes confidence | MEDIUM-HIGH | MEDIUM | P1 |
| Consent screen + delete data | HIGH | LOW | P1 |
| Local profile + history | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| EN/ID i18n | HIGH | MEDIUM | P1 |
| Preference side-by-side table | MEDIUM | LOW | P2 |
| Scan-quality score display | MEDIUM | MEDIUM | P2 |
| Compare with owned tee | MEDIUM-HIGH | MEDIUM | P2 |
| Profile export/import | MEDIUM | LOW-MEDIUM | P2 |
| TTS guidance | LOW-MEDIUM | MEDIUM | P3 |
| Waist measurement | LOW (for tees) | HIGH | P3 |

**Priority key:** P1 = must have for launch; P2 = should have, add when possible; P3 = nice to have.

## Competitor Feature Analysis

| Feature | Fit-finder widgets (True Fit, Fit Analytics, Kiwi, Sizely) | Photo-scan (3DLOOK, Mirrorsize, ZOZOFIT, Amazon Made for You) | Virtusize | Our Approach |
|---------|------|------|------|------|
| Inputs | Height, weight, age (+gender, fit preference) | Two photos + height (often weight/gender) | Garment you own, or measurements | Height + photos + preference; no weight/age/gender |
| Body measurement source | Statistical estimate | Image segmentation + keypoints, server-side | Not needed | In-browser segmentation + landmarks |
| Measurement visibility/edit | Hidden (Kiwi simple types take typed measurements) | Mostly retailer dashboard | Garment dims shown | Shown in cm, editable, revertable |
| Verdict form | Single size (Sizely adds great/good/between) | Size recommendation | Per-dimension cm difference overlay | Overall + per-area + cm + alt size + borderline flag |
| Garment basis | Purchase history/ML (Sizely: garment measurements) | Brand chart mapping | Garment measurements | Garment measurements + preference-defined ease band |
| Privacy | Server, retailer-controlled | Server; Amazon deletes photos after twin generation | Server profiles | On-device, nothing uploaded, delete button |
| Languages | Sizely 13+ | Varies | Varies | EN + ID |
| Accuracy claim | 25-35% return reduction (vendor claim) | "tailor-level", "85% within one size" (3DLOOK, vendor claim) | n/a | 2-3 cm vs tape on team members; no marketing percentages |

## Sources

- Photo-based measurement overview and capture description: https://3dlook.ai/content-hub/body-measurement-app-for-clothing/ (MEDIUM; marketing, little capture detail), https://www.griddynamics.com/blog/body-measurement-app-computer-vision (MEDIUM, via search summary), https://www.mirrorsize.com/blogs/ultimate-body-measuring-app-for-perfectly-fitting-clothes (LOW-MEDIUM)
- Capture tips: https://knowledgebase.sizestream.com/knowledge/methreesixty-tips-on-getting-scan, https://help.zozofit.com/hc/en-us/articles/29118486789651-How-should-I-dress-for-an-APP-ONLY-scan-Not-with-a-ZOZOSUIT, https://help-scan.verifyt.com/shc/having-trouble-detecting-your-body-pose (MEDIUM; vendor help pages, consistent with each other)
- Fit-finder inputs and output forms: https://www.size.ly/blog/size-recommendation-apps-compared (LOW-MEDIUM; vendor-authored comparison, includes Sizely's own accuracy claim), https://kiwisizing.com/features/ai-size-recommender/, https://boldmetrics.com/solutions/smart-size-chart (MEDIUM)
- Garment-vs-garment comparison: http://www.virtusize.com/site/how-it-works, http://developers.virtusize.com/providing-product-measurements/index.html (MEDIUM)
- Per-area fit verdict and comfort ranges: https://github.com/devmtnaing/shopping-mall/issues/9 (LOW; single design-discussion source, numbers tuned for shirts)
- Indonesian chart conventions (lebar dada / panjang badan / panjang lengan; Erigo S-XXL chest width 51-59 cm): https://www.blibli.com/friends/blog/size-chart-erigo-10/, https://www.uniqlo.com/id/id/size/427917_size.html, https://www.zalora.co.id/blog/fashion/cara-mengukur-lingkar-dada-sendiri-di-rumah-nggak-ribet/ (MEDIUM; retailer pages)
- Ease allowances by fit: https://sewguide.com/ease-in-clothing/, https://dresspatternmaking.com/blog/ease-in-patterns-and-blocks, https://mfgmerch.com/t-shirt-size-chart/ (MEDIUM for ranges, LOW for exact T-shirt numbers; sewing sources, must be calibrated)
- Privacy and consent: https://wwd.com/sourcing-journal/industry-news/amazon-fashion-made-for-you-body-scanning-virtual-fit-tech-1238764658/ (MEDIUM), https://www.techradar.com/computing/artificial-intelligence/amazon-thinks-ai-helping-you-buy-clothes-is-better-than-you-sending-back-whatever-doesnt-fit, https://ssqrd.substack.com/p/what-happens-to-your-body-data-after (LOW), https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/undangundang+nomor+27+tahun+2022 (official; UU PDP text), https://siplawfirm.id/perlindungan-data-biometrik/?lang=id (LOW-MEDIUM; law firm summary of Art. 4(2)(b) and Art. 20(2))

## Gaps / Needs Phase-Specific Research

- Actual ColourBox size chart (which dimensions, how measured) — blocks verdict calibration.
- Ease band numbers for a jersey cotton T-shirt in the Indonesian market — calibrate on team bodies with real garments.
- Whether front+side silhouettes in a browser reach 2-3 cm for chest circumference (covered by the stack/accuracy researchers, not here); this file assumes chest, shoulder, torso length, and arm length as the measurement set and flags chest as the riskiest.
- Laptop webcam capture UX (distance, lens distortion, field of view) — little vendor precedent.
- Local storage persistence/eviction behaviour on iOS Safari for the local profile.
- Legal reading of UU PDP for on-device processing of body silhouettes — not legal advice; consent wording could be reviewed.

---
*Feature research for: body-scan size recommendation for tops (online fashion shoppers)*
*Researched: 2026-10-02*
