# Phase 1: Foundation and Accuracy Spike - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-02
**Phase:** 1-Foundation and Accuracy Spike
**Areas discussed:** Size chart meaning, Test subjects and tape, Spike page and old code

**Input supplied with the command:** size charts for three ColourBox women's tees (plain white, boxy, fitted), six unlabelled values per size.

**Area offered but not selected:** Devices and HTTPS.

---

## Size chart meaning

### Column meanings

| Option | Description | Selected |
|--------|-------------|----------|
| Chest, hem, shoulder, sleeve length, sleeve opening, body length | All widths flat; same order on all three tees | |
| Chest, waist, shoulder, sleeve length, sleeve opening, body length | Column 2 is waist width, not hem | |
| I need to check | Record as unlabelled and confirm with ColourBox | |

**User's choice:** Free text. First message: "Size Spec (cm) : Chest x Bottom x Shoulder x Armhole x Sleeve Length x Body Length". Later, for the plain tee: "Size Spec (cm) : Chest x Bottom x Shoulder x Sleeve Length x Armhole x Back Length".
**Notes:** The two specs differ in the order of armhole and sleeve length and in the name of the last column. A follow-up question settled which tee uses which.

### Which tee the first spec belongs to

| Option | Description | Selected |
|--------|-------------|----------|
| The fitted tee | Boxy stays unconfirmed | |
| The boxy tee | Fitted column order then unknown | |
| Both fitted and boxy | Only the plain tee uses the other order | ✓ |

**User's choice:** Both fitted and boxy.

### Plain and boxy charts identical

| Option | Description | Selected |
|--------|-------------|----------|
| Paste error, I'll resend | Mark boxy unconfirmed, resend later | |
| They really are identical | Record both as given | |
| Not sure, treat as unconfirmed | Record plain, add a task to confirm boxy | ✓ |

**User's choice:** Not sure, treat as unconfirmed.
**Notes:** Read in the boxy column order the values give a 12 cm armhole, which suggests the boxy chart is a paste of the plain one.

### Back length range (54-58)

| Option | Description | Selected |
|--------|-------------|----------|
| Unknown, use the midpoint for now | Record both, midpoint as marked placeholder | ✓ |
| Use the larger number | Back is the longest part | |
| Use the smaller number | Length that matters on the body | |

**User's choice:** Unknown, use the midpoint for now.
**Notes:** The first time this was asked (as front/back, curved hem, or tolerance) the user replied with the plain tee's column spec instead, so the question was asked again in this form.

### Source and flat widths

| Option | Description | Selected |
|--------|-------------|----------|
| ColourBox product page, flat widths | Official, widths doubled for circumference | |
| ColourBox product page, not sure if flat | Assume flat, confirm on a physical shirt | ✓ |
| Measured by hand or from somewhere else | Lower confidence | |

**User's choice:** ColourBox product page, not sure if flat.

---

## Test subjects and tape

### Who is measured

| Option | Description | Selected |
|--------|-------------|----------|
| Women on the team only | Matches the garments | ✓ |
| Everyone on the team, any gender | More subjects for shoulder and chest error | |
| Only me for now | One body first | |

**User's choice:** Women on the team only.

### Who holds the tape

| Option | Description | Selected |
|--------|-------------|----------|
| Each woman measures herself or picks who measures her | Most comfortable; each value taken twice | ✓ |
| One woman on the team measures everyone | Most consistent | |
| Two measurers, each takes a reading | Research-grade, most effort | |

**User's choice:** Each woman measures herself or picks who measures her.

### Clothing during scans

| Option | Description | Selected |
|--------|-------------|----------|
| Fitted top, scanned once | Cleanest feasibility answer | |
| Both fitted and everyday clothes | Two scans, logged separately | |
| Everyday clothes only | Closest to a real shopper; larger bust error likely | ✓ |

**User's choice:** Everyday clothes only.
**Notes:** Research recommends fitted clothing for scanning. The user chose everyday clothes; the consequence (bust error likely above 3.5 cm) was stated in the next question.

### Go/no-go when bust misses the target

| Option | Description | Selected |
|--------|-------------|----------|
| Go, and switch to 'estimate then confirm' | Scan proposes, user confirms | |
| Judge by size agreement, not cm | Same size, or one away and flagged borderline, for most subjects | ✓ |
| Retest that subject in a fitted top before deciding | Separates clothing from method | |

**User's choice:** Judge by size agreement, not cm.

---

## Spike page and old code

### Existing GreenWear code

| Option | Description | Selected |
|--------|-------------|----------|
| Remove it and start clean | Git history keeps the old version | ✓ |
| Move it to a legacy folder | Old prototype stays runnable | |
| Keep it and build the spike beside it | Least disruption now | |

**User's choice:** Remove it and start clean.

### Debug view

| Option | Description | Selected |
|--------|-------------|----------|
| Part of the real app, behind a debug switch | Nothing thrown away | |
| A separate throwaway test page | Fastest to an answer | |
| You decide | | ✓ |

**User's choice:** You decide.

### How readings are logged

| Option | Description | Selected |
|--------|-------------|----------|
| A 'save reading' button that exports a file | Numbers only, saved by the person | |
| Read the numbers off the screen and type them in a sheet | No extra code | |
| You decide | | ✓ |

**User's choice:** You decide.

### Where tape and scan numbers live

| Option | Description | Selected |
|--------|-------------|----------|
| In the repo, under anonymous IDs | S1, S2, S3; ID list kept outside the repo | ✓ |
| Outside the repo entirely | Private spreadsheet | |
| You decide | | |

**User's choice:** In the repo, under anonymous IDs.

### Language of Phase 1 screens

| Option | Description | Selected |
|--------|-------------|----------|
| English now, Indonesian added in Phase 2 | Keyed for later | |
| Indonesian now | Matches existing strings | |
| Both from the start | Pulls a slice of Phase 2 forward | ✓ |

**User's choice:** Both from the start.

---

## Wrap-up

**Question:** Which gray areas remain unclear?
**User's choice:** I'm ready for context. This accepted the stated default "drop waist from the scan, confirm at the go/no-go".

## Claude's Discretion

- Form of the debug view (in-app behind a switch, or separate page)
- How scan readings are logged (export button or manual entry)
- Devices and HTTPS setup (area not selected; research default applies)
- The written rule for turning a tape bust value into a size, needed for the size-agreement test
- How Phase 1 strings hold two languages before the Phase 2 language module exists

## Deferred Ideas

- Boxy and fitted tees in the catalog (CAT-04 is v2; Phase 2 decides)
- Stretch handling for the fitted tee in the fit rules (Phase 2)
- Fitted-clothing scans (Phase 5 tape study, if wanted)
