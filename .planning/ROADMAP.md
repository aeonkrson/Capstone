# Roadmap: Size Fit Scanner (working title)

## Overview

The journey runs from "can a browser on our own phones and laptops measure a body well enough?" to "a shopper scans live, hands-free, and gets a fit verdict they can trust." It starts with an accuracy spike on real devices, which is a go/no-go gate that fixes the measurement set and the per-measurement accuracy bar. It then builds the manual-entry fit-check slice (catalog, verdicts, profile, English and Indonesian) so a working demo exists whatever the scanner turns out to deliver. The measurement engine follows, calibrated against tape. On top of it goes the live AR guided capture with auto-lock and sound cues, which replaces typing measurements. The last phase hardens everything with the team tape study and a device matrix, and produces the acceptance evidence. All processing stays on the device.

Granularity is coarse (5 phases; research suggested six, so validation and hardening are folded into the last phase and its data collection starts in Phase 1). Target: demo-ready in 1 to 3 months by one developer.

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation and Accuracy Spike** - Pinned on-device pose and silhouette running on real phones and laptops over HTTPS, with a go/no-go on the measurement set and accuracy bar
- [x] **Phase 2: Manual-Entry Fit Check** - Type your measurements, pick a ColourBox top and size, and get a verdict and recommended size, saved locally in English or Indonesian (completed 2026-10-08)
- [ ] **Phase 3: Measurement Engine** - Turn a front and side capture plus typed height into calibrated cm measurements, with quality gates (code complete 2026-10-13; team tape accuracy session outstanding)
- [ ] **Phase 4: Live AR Guided Capture** - Consent, then a hands-free guided front and side scan that auto-locks with sound cues and ends at a measurement review (completed 2026-10-13)
- [ ] **Phase 5: Validation and Demo Hardening** - Team tape study, per-device accuracy results, rescan, and a demo that holds up on real devices (completed 2026-10-13)

## Phase Details

### Phase 1: Foundation and Accuracy Spike

**Goal**: A team member can open the app on a real phone and a laptop over HTTPS, enter their height, and see live body landmarks and a silhouette computed entirely on the device, with first shoulder and chest readings to judge feasibility.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: CAPT-01, PRIV-02
**Success Criteria** (what must be TRUE):

  1. User can enter their height in cm before the camera starts, and unrealistic values (for example 20 cm or 400 cm) are rejected with a clear message.
  2. On a real iPhone or Android phone and on a laptop webcam, over HTTPS, the camera starts and a debug view shows live landmarks, the body silhouette, and a first shoulder and chest reading in cm.
  3. Body detection runs from self-hosted, version-pinned files. With the network inspector open during a scan, no camera frame is uploaded and nothing image-based is written to storage.
  4. A tape-measure protocol and measurement definitions sheet exist, with per-measurement pass criteria written down before any data is collected, and the first 2-3 team members have been measured and logged.
  5. A recorded go/no-go decision fixes the measurement set (including whether waist stays), the model variant and the accuracy targets. The ColourBox size chart has been requested or collected.

**Plans:** 6/8 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Keep the pending style change, remove the GreenWear code, write the clean page shell, README and FILES (wave 1)
- [x] 01-02-PLAN.md — Pin the tooling after a package check, self-host the pose files with recorded hashes, HTTPS dev server that denies validation/ and .planning/ (wave 1, has a package check)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-03-PLAN.md — Height entry in English and Indonesian with validation, plus the acceptance and privacy guard tests (wave 2)
- [x] 01-04-PLAN.md — ColourBox charts as data, the tape-to-size rule, and the validation kit written before any data (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-05-PLAN.md — Camera with a correct lifecycle, a Start camera control, and live on-device landmarks and silhouette (wave 3)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-06-PLAN.md — Shoulder and bust readings in cm (bust at the widest torso row in a frozen band), live and from an abortable front and side capture (wave 4)

**Wave 5** *(blocked on Wave 4 completion)*

- [ ] 01-07-PLAN.md — Real-device run, physical tee check, boxy chart request, first tape and scan readings (wave 5, human steps)

**Wave 6** *(blocked on Wave 5 completion)*

- [ ] 01-08-PLAN.md — Evidence, the go/no-go decision, and its record (wave 6, human decision)

### Phase 2: Manual-Entry Fit Check

**Goal**: A shopper can type their measurements, pick a ColourBox top and size, and get a trustworthy fit verdict with a recommended size, saved on the device and available in English and Indonesian.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CAT-01, CAT-02, CAT-03, FIT-01, FIT-02, FIT-03, FIT-04, FIT-05, FIT-06, PROF-01, PROF-02, PROF-03, I18N-01, I18N-02, MEAS-07, MEAS-08, PRIV-03
**Success Criteria** (what must be TRUE):

  1. User can create a local profile with no account or password, type in their measurements by hand (skipping any scan), and correct any value later; fit checks use the corrected value.
  2. User can browse the catalog, see the plain white T-shirt with its size chart and cut label (regular, loose or oversize), pick a size, and get a verdict on whether it fits, with the recommended size shown when it does not.
  3. User sees a per-area breakdown (chest, shoulder, length) marked tight, OK or loose with the cm difference. Results near a size boundary are shown as borderline or between two sizes, not a hard yes or no.
  4. User can set how they like tops to fit (regular, loose or oversize) and compare the recommended size for all three preferences side by side.
  5. After closing and reopening the browser, the profile, measurements and past fit checks (garment, size, verdict, date) are still there; one control deletes all of it. The user can switch the whole interface between English and Indonesian, and the choice is remembered.

**Plans:** 4/4 plans complete

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Catalog data, body-measurement validation and the pure fit engine (verdict, breakdown, recommendation, three-preference compare)
- [x] 02-02-PLAN.md — Profile state, the one localStorage module, setLocale and guard updates

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-03-PLAN.md — Profile and manual measurement entry/correction, language switch, delete-all, scan flow collapsed

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-04-PLAN.md — Catalog and chart view, size pick, verdict and breakdown, preference compare, history

**UI hint**: yes

### Phase 3: Measurement Engine

**Goal**: A user can stand for a front and a side capture, with their typed height as scale, and get calibrated shoulder, chest, waist, torso and arm measurements in cm, with capture-quality problems caught before a bad result is trusted.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: MEAS-01, MEAS-02, MEAS-03, MEAS-04, MEAS-05
**Success Criteria** (what must be TRUE):

  1. After a front and a side capture on the scan page (a simple capture trigger is enough; guided auto-lock comes in Phase 4), the user gets estimated shoulder width, chest, waist, torso length and arm length in cm.
  2. Repeating the same capture on the same person gives values within about 1 cm of each other, measured by running it repeatedly on the team.
  3. Bad captures (full body not in frame, wrong distance, tilted camera, arms against the body, wrong side facing, moving) are rejected with a reason instead of producing a confident-looking number.
  4. Estimates for a team member compared with the tape protocol from Phase 1 show shoulder width and chest within the agreed starting targets, or the shortfall is recorded. Waist, torso length and arm length carry an explicit "estimate" marker for Phase 4's review screen.

**Plans:** 5/5 plans complete

Plans:
- [x] 03-01-PLAN.md — Pure scan engine: five measurements, waist row, calibration table (TDD, wave 1)
- [x] 03-02-PLAN.md — Capture-quality gates and device tilt adapter (TDD, wave 1)
- [x] 03-03-PLAN.md — Profile accepts scanned values with scanned/estimate markers, fitApp.applyScan (wave 1)
- [x] 03-04-PLAN.md — Scan page wiring: gated burst, scan session, plain result view, Use button (wave 2)
- [x] 03-05-PLAN.md — Team repeatability and tape check, fitted calibration, results record (wave 3, human checkpoint; session not yet run, see PHASE3-RESULTS.md)

### Phase 4: Live AR Guided Capture

**Goal**: A shopper can consent, then scan themselves hands-free in a phone or laptop browser. The app guides them with a live pose overlay and sound cues, locks each view automatically, and ends at a measurement review where values can be checked and corrected.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: PRIV-01, CAPT-02, CAPT-03, CAPT-04, CAPT-05, CAPT-06, CAPT-07, CAPT-08, MEAS-06
**Success Criteria** (what must be TRUE):

  1. Before the camera starts, the user sees a consent screen saying what the camera is used for and what is saved, and the camera does not start until they accept.
  2. User sees a live camera view with a pose guide for the front view and then for the side view, and gets plain-language hints (in the chosen language) when something is wrong: not fully in frame, too close or too far, arms against body, wrong side, moving.
  3. With no button press, the front view locks once the user stands correctly and still, the app prompts them to turn sideways, and the side view locks the same way.
  4. User hears distinct sound cues for hold still, view captured and turn, so the scan works from across the room where the screen cannot be read.
  5. A full scan completes in a phone browser and on a laptop webcam. If the camera is denied or unavailable, the user sees a clear message and is sent to manual measurement entry.
  6. The scan ends at a review screen showing all measurements in cm, each marked scanned or edited, with the less reliable ones marked as estimates; the user can correct any value and go straight on to a fit check.

**Plans:** 7/7 plans complete

Plans:
**Wave 1**

- [x] 04-01-PLAN.md — Pure auto-lock state machine in core: hold-still lock, turn phase, cues, hints from Phase 3 reason codes (TDD, wave 1)
- [x] 04-02-PLAN.md — Pure review model: scanned/edited/estimate rows, input parsing, profileState.applyReview (TDD, wave 1)
- [x] 04-03-PLAN.md — WebAudio sound cues (hold, captured, turn) and pose guide figure geometry (wave 1)
- [x] 04-05-PLAN.md — Consent, guide hint, manual-entry and review markup plus en/id strings; consent view; scan view trimmed (wave 1)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 04-04-PLAN.md — Guided scan controller: live gate -> auto-lock -> burst capture -> cues (TDD, wave 2)
- [x] 04-06-PLAN.md — Review view and fitApp applyReview, goToFitCheck, showManualEntry (wave 2)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 04-07-PLAN.md — main.js wiring: consent gating, live guide overlay, hands-free scan with sound, review, manual routing and fallback (wave 3; real-device check listed as outstanding, not a gate)

**UI hint**: yes

### Phase 5: Validation and Demo Hardening

**Goal**: The team can show the scan-to-verdict flow working on real devices and back its accuracy claims with a recorded tape study, and a returning user can rescan to replace their saved measurements.
**Mode:** mvp
**Depends on**: Phase 4 (data collection starts in Phase 1)
**Requirements**: MEAS-09, ACC-01, ACC-02, ACC-03
**Success Criteria** (what must be TRUE):

  1. A user with saved measurements can choose to rescan, and the new scan replaces the saved measurements used for later fit checks.
  2. Across the team members tested, shoulder width estimates are within about 2.5 cm of tape on average (or the revised target set after the first accuracy test).
  3. Across the same team, chest estimates are within about 3.5 cm of tape on average, and the recommended size matches the tape-based size or is flagged borderline.
  4. A results table records error per measurement and per device (phone, laptop), with subjects identified by anonymous ID and photos kept out of the repository.
  5. The whole flow (consent, scan, review, verdict, history) has been run on a real iPhone, a real Android phone and a laptop over HTTPS, and a recorded fallback demo exists in case the venue fails.

**Plans:** 7/7 plans complete

Plans:
**Wave 1**

- [x] 05-01-PLAN.md — Rescan: applyRescan replaces all five measurements, Scan again button, replace note (MEAS-09)
- [x] 05-02-PLAN.md — Study evaluator: per-measurement, per-device error table and honest GO/CONDITIONAL/NO-GO/INSUFFICIENT DATA verdict (TDD; ACC-01..03)
- [x] 05-03-PLAN.md — Demo build: copy hashed vendor wasm/models into dist, npm run demo over HTTPS LAN

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 05-04-PLAN.md — Startup preflight message and debug fps readout
- [x] 05-05-PLAN.md — Study protocol, full-flow device checklist, demo recording script (human items, all "not run"), media kept out of git

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 05-06-PLAN.md — Rewrite .planning/codebase docs and regenerate CLAUDE.md (GreenWear text removed)
- [x] 05-07-PLAN.md — README demo runbook, FILES.md, HUMAN-TODO.md, STATE.md current position
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 (decimal phases, if inserted, run between their surrounding integers).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Accuracy Spike | 6/8 | In Progress|  |
| 2. Manual-Entry Fit Check | 4/4 | Complete   | 2026-10-08 |
| 3. Measurement Engine | 5/5 | Code complete (tape session outstanding) | 2026-10-13 |
| 4. Live AR Guided Capture | 7/7 | Code complete (device check outstanding) | 2026-10-13 |
| 5. Validation and Demo Hardening | 7/7 | Code complete (human sessions outstanding, see HUMAN-TODO.md) | 2026-10-13 |
