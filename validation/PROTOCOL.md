# Validation protocol

Frozen with PASS-CRITERIA.md. Read DEFINITIONS.md first.

## Who

Women on the team only (D-09). Target three subjects. If fewer are available, write the shortfall in GO-NO-GO.md. Do not add other subjects.

## Privacy

Subjects are S1, S2, S3 (D-14). The list of who is which ID stays outside the repository, together with each subject's agreement to take part. No photos, screenshots or screen recordings of a scan are taken or committed. Notes must not contain names.

## Tape measurements

Each woman measures herself or picks who measures her (D-10). Write `self` or `helper` in notes.

- Bust is taped over a bra or thin fitted layer, not over the everyday top (user-confirmed rule; see DEFINITIONS.md).
- Take every tape value twice, removing and replacing the tape between readings, and log both to the nearest 0.5 cm.
- Measure height once, barefoot against a wall.
- Take the tape readings before the scans so they are not influenced by the scan numbers.

## Camera setup

Device upright (portrait on a phone), at chest to waist height, level, 2 to 3 m from the subject so the whole body fits with a margin above the head and below the feet. Plain background, light from the front.

On a laptop, switch off auto-framing and background effects.

On a phone, set Auto-Lock (screen timeout) to its longest setting or Never for the session. When the screen locks or the tab is hidden the camera stops on purpose and a Start camera button appears. Press it and repeat any capture that was interrupted.

## Scans

Everyday clothes (D-11). Open `https://<LAN-IP>:5173/?debug=1`, type the height, start the camera.

Per device (phone and laptop): three repeats with the default model, each repeat being Capture front then Capture side, stepping out of the frame between repeats. Then one repeat with `&model=heavy` added to the address.

Add `&camera=rear` when the phone's rear camera is used and say so in notes.

## Recording

After each repeat read the Captured panel and add two rows to `validation/readings.csv` (one `shoulder`, one `bust`), repeating the subject's two tape values on each row.

Header:

```
subject,device,clothing,measurement,repeat,tape1_cm,tape2_cm,scan_cm,model_variant,delegate,notes
```

Allowed values: `subject` S1 to S9; `device` phone or laptop; `clothing` everyday; `measurement` shoulder or bust; `repeat` 1 to 9; `tape1_cm`, `tape2_cm`, `scan_cm` decimal numbers with a dot; `model_variant` full or heavy; `delegate` CPU or GPU; `notes` space-separated key=value tokens, no comma, no names.

Notes on both rows use exactly this format:

```
who=<self|helper> h=<typed height cm> fw=<bust width cm> sd=<bust depth cm> ff=<front bust row fraction> sf=<side bust row fraction> cpf=<front cm/px> cps=<side cm/px>
```

Example: `who=self h=162.5 fw=29.8 sd=21.4 ff=0.25 sf=0.30 cpf=0.291 cps=0.284`

## Order of work

Definitions, then this protocol, then the pass criteria, then readings, then the go/no-go. The pass criteria, this protocol, the definitions, the size rule and the bust band constants must not change after the first data row.
