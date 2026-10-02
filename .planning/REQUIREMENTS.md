# Requirements: Size Fit Scanner (working title)

**Defined:** 2026-10-02
**Core Value:** A shopper who picks a size gets a fit answer they can trust — because the body measurements behind it are close to what a tape measure would give.

## v1 Requirements

Requirements for the first release. Each maps to roadmap phases.

### Privacy

- [ ] **PRIV-01**: User sees a consent screen explaining what the camera is used for and what is saved, and must accept it before the camera starts
- [ ] **PRIV-02**: User's camera images are processed on the device and are never saved or uploaded; only measurement values are stored
- [ ] **PRIV-03**: User can delete all their data (profile, measurements, history) from the device with one control

### Capture

- [ ] **CAPT-01**: User can enter their height in cm before scanning, with validation of unrealistic values
- [ ] **CAPT-02**: User sees a live camera view with a pose guide overlay showing how to stand for the front view and for the side view
- [ ] **CAPT-03**: User gets live plain-language hints when capture conditions are wrong (full body not in frame, too close or too far, arms against body, wrong side facing, moving)
- [ ] **CAPT-04**: User's front view locks automatically, with no button press, once they stand correctly and still
- [ ] **CAPT-05**: User is prompted to turn sideways and the side view locks automatically in the same way
- [ ] **CAPT-06**: User hears sound cues for hold still, view captured and turn, so the scan works when the screen is too far away to read
- [ ] **CAPT-07**: User can complete a scan in a phone browser and on a laptop webcam
- [ ] **CAPT-08**: User whose camera is denied or unavailable sees a clear message and is sent to manual measurement entry

### Measurements

- [ ] **MEAS-01**: User gets an estimated shoulder width in cm from the scan
- [ ] **MEAS-02**: User gets an estimated chest circumference in cm from the scan
- [ ] **MEAS-03**: User gets an estimated waist circumference in cm from the scan
- [ ] **MEAS-04**: User gets an estimated torso length in cm from the scan
- [ ] **MEAS-05**: User gets an estimated arm length in cm from the scan
- [ ] **MEAS-06**: User sees all measurements on a review screen, each marked as scanned or edited, with the less reliable ones marked as estimates
- [ ] **MEAS-07**: User can correct any measurement and the corrected value is used for fit checks
- [ ] **MEAS-08**: User can skip the scan and type their measurements in by hand
- [ ] **MEAS-09**: User can rescan to replace their saved measurements

### Catalog

- [ ] **CAT-01**: User can browse a built-in catalog of ColourBox tops; the first garment is a plain white T-shirt
- [ ] **CAT-02**: User can see each garment's size chart and its cut label (regular, loose or oversize)
- [ ] **CAT-03**: User can pick a garment and a size to check

### Fit

- [ ] **FIT-01**: User can set how they like tops to fit (regular, loose or oversize)
- [ ] **FIT-02**: User gets a verdict on whether the chosen size fits
- [ ] **FIT-03**: User is shown the recommended size when the chosen size does not fit
- [ ] **FIT-04**: User sees a per-area breakdown (chest, shoulder, length) marked tight, OK or loose with the cm difference
- [ ] **FIT-05**: User is told when the result is borderline or between two sizes instead of getting a hard yes or no
- [ ] **FIT-06**: User can compare the recommended size for regular, loose and oversize preference side by side

### Profile

- [ ] **PROF-01**: User can create a local profile on the device, with no account or password
- [ ] **PROF-02**: User's measurements are saved and reused for later fit checks without rescanning, including after the browser is closed
- [ ] **PROF-03**: User can view a history of past fit checks (garment, size, verdict, date)

### Language

- [ ] **I18N-01**: User can switch the whole interface between English and Indonesian
- [ ] **I18N-02**: User's language choice is remembered on the device

### Accuracy

- [ ] **ACC-01**: Shoulder width estimates are within about 2.5 cm of tape measurements on average across the team members tested
- [ ] **ACC-02**: Chest estimates are within about 3.5 cm of tape on average, and the recommended size matches the tape-based size or is flagged borderline
- [ ] **ACC-03**: Accuracy results are recorded per measurement and per device (phone, laptop) in a results table

The ACC numbers are starting targets. They are confirmed or revised after the first accuracy test on real devices.

## v2 Requirements

Deferred. Tracked but not in the current roadmap.

### Capture

- **CAPT-09**: User can review each captured view and retake the front or the side separately
- **CAPT-10**: User can use a fixed countdown timer instead of auto-lock

### Fit

- **FIT-07**: User sees a compact row showing how every size would fit, not only the chosen one
- **FIT-08**: User can compare the garment against a top they already own

### Profile

- **PROF-04**: User can export their profile to a file and import it on another device

### Catalog

- **CAT-04**: Catalog includes more ColourBox tops beyond the first T-shirt

### Measurements

- **MEAS-10**: User sees a scan-quality score for each scan

## Out of Scope

| Feature | Reason |
|---------|--------|
| Clothing tag scanning | Old GreenWear direction, replaced by the pivot |
| Sustainability information | Dropped; this is a pure size-fit tool |
| Mix & Match outfit recommendations | Old GreenWear direction |
| Garment overlay / AR try-on on the body | Not selected; the verdict is the core value |
| Bottoms, dresses and other non-top garments | First version covers tops only |
| Server accounts or any backend | Body data stays on the device |
| User-entered size charts | Catalog is built in |
| Weight, age or gender inputs | The scan measures the body directly; they add friction without accuracy gain |
| Estimating the body from height/weight statistics when a scan fails | Hides failures and breaks the accuracy bar |
| Storing captured photos | Privacy risk with no benefit; only measurement values are kept |
| YOLO or other detection models | MediaPipe PoseLandmarker chosen: more landmarks, native browser package, permissive licence |
| Reference-object or fully automatic scale | User-typed height was chosen as the scale source |
| Accuracy testing on people outside the team | Validation is on team members only |
| "X% accurate" marketing claims | Not supportable from a small team sample |
| Revising the capstone proposal document | Left out for now at Jordan's request |

## Traceability

Which phases cover which requirements. Filled in during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRIV-01 | Phase 4 | Pending |
| PRIV-02 | Phase 1 | Pending |
| PRIV-03 | Phase 2 | Pending |
| CAPT-01 | Phase 1 | Pending |
| CAPT-02 | Phase 4 | Pending |
| CAPT-03 | Phase 4 | Pending |
| CAPT-04 | Phase 4 | Pending |
| CAPT-05 | Phase 4 | Pending |
| CAPT-06 | Phase 4 | Pending |
| CAPT-07 | Phase 4 | Pending |
| CAPT-08 | Phase 4 | Pending |
| MEAS-01 | Phase 3 | Pending |
| MEAS-02 | Phase 3 | Pending |
| MEAS-03 | Phase 3 | Pending |
| MEAS-04 | Phase 3 | Pending |
| MEAS-05 | Phase 3 | Pending |
| MEAS-06 | Phase 4 | Pending |
| MEAS-07 | Phase 2 | Pending |
| MEAS-08 | Phase 2 | Pending |
| MEAS-09 | Phase 5 | Pending |
| CAT-01 | Phase 2 | Pending |
| CAT-02 | Phase 2 | Pending |
| CAT-03 | Phase 2 | Pending |
| FIT-01 | Phase 2 | Pending |
| FIT-02 | Phase 2 | Pending |
| FIT-03 | Phase 2 | Pending |
| FIT-04 | Phase 2 | Pending |
| FIT-05 | Phase 2 | Pending |
| FIT-06 | Phase 2 | Pending |
| PROF-01 | Phase 2 | Pending |
| PROF-02 | Phase 2 | Pending |
| PROF-03 | Phase 2 | Pending |
| I18N-01 | Phase 2 | Pending |
| I18N-02 | Phase 2 | Pending |
| ACC-01 | Phase 5 | Pending |
| ACC-02 | Phase 5 | Pending |
| ACC-03 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 37 total
- Mapped to phases: 37
- Unmapped: 0

---
*Requirements defined: 2026-10-02*
*Last updated: 2026-10-02 after roadmap creation*
