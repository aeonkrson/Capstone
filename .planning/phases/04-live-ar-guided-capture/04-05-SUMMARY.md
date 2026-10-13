---
phase: 04-live-ar-guided-capture
plan: 05
subsystem: ui-markup-i18n
tags: [consent, i18n, markup, review, manual-entry]
requires: []
provides:
  - "index.html ids: manual-route-status, consent-section, btn-consent-accept, btn-consent-decline, btn-manual-entry, guide-area, guide-hint, btn-guide-restart, review-section, review-form, review-name-row, review-name, review-name-error, review-{shoulder,chest,waist,torso,arm}[-marker|-error], review-status"
  - "createConsentView({ doc, onAccept, onDecline }) -> { show, hide, isShown }"
  - "createScanView({ doc, t }) -> { render }"
  - "consent.*, guide.*, manual.*, review.*, scan.manual.note strings in en and id"
affects: [04-06, 04-07]
tech-stack:
  added: []
  patterns: ["plain unstyled sections, data-i18n, null-guarded views"]
key-files:
  created:
    - src/ui/consentView.js
  modified:
    - index.html
    - src/i18n/en.js
    - src/i18n/id.js
    - test/i18n.parity.test.js
    - src/ui/scanView.js
decisions:
  - "Phase 4 markup ids and i18n keys are fixed in 04-05; 04-06 and 04-07 code against them"
  - "Old scan result list and Use button removed; main.js onUse callback left in place and unreachable until 04-07 rewires it"
metrics:
  duration: 6min
  completed: 2026-10-13
  tasks: 2
  files: 6
---

# Phase 4 Plan 05: Phase 4 markup, strings, consent view Summary

All Phase 4 ids and en/id strings are now in place: a consent block, the guide hint area, a manual-entry route and a five-field review form. Also added: a small consent view, and the scan view is cut down to the front and side status lines.

## Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Strings in English and Indonesian, parity test | 9214aca | src/i18n/en.js, src/i18n/id.js, test/i18n.parity.test.js |
| 2 | Markup, consent view, trimmed scan view | 115bc18 | index.html, src/ui/consentView.js, src/ui/scanView.js |

## What changed

- 28 new keys (consent.*, guide.*, manual.*, review.*, scan.manual.note) in both dictionaries with matching `{source}` params. The 8 retired keys (scan.result.*, scan.use, scan.used, scan.used-partial, scan.need-profile) are gone from en, id and EXPECTED_KEYS. Before removing them, a grep confirmed that only scanView.js used them.
- index.html markup items 1 to 6 added exactly as the plan specifies. The CSP meta, the single module script and all other ids are unchanged. No style attributes. css/ is untouched.
- consentView: show() unhides the section, scrolls to it and focuses Accept. The click handlers call onAccept and onDecline. Missing elements are null-guarded.
- scanView: `createScanView({ doc, t })` with `render(snapshot)` only. The SCAN_KEYS and ESTIMATE_KEYS imports and LABEL_KEYS are removed.

## Verification

- `npm test`: 222/222 pass (parity and privacy static tests included).
- `npm run build`: green.
- The grep for the 5 key ids finds all 5. `btn-scan-use` has 0 matches. `git diff --stat css/` is empty.

## Deviations from Plan

None. The plan was executed as written.

## Pending (needs a real device)

These are not ticked in REQUIREMENTS.md. This plan only adds markup and strings, and the behaviour is wired in 04-06 and 04-07:
- PRIV-01 (consent gating of camera start): enforced in 04-07.
- CAPT-02 and CAPT-03 (live guide hint and sound cues): need a real-device check.
- CAPT-08 (manual route on denial or decline): wired in 04-07.
- MEAS-06 (review form behaviour): wired in 04-06 and 04-07.

## Known Stubs

- `#guide-hint`, `#manual-route-status`, `#review-*-marker` and `#review-status` are empty until 04-06 and 04-07 fill them. This is intended, because this plan only defines the markup contract.
- In src/main.js, the `onUse` callback still calls `scanView.showUseResult`, which no longer exists. It cannot fire because the Use button is gone. 04-07 rewires main.js.

## Self-Check: PASSED

- FOUND: src/ui/consentView.js
- FOUND: 9214aca, 115bc18
