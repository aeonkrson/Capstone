// Phase 3 acceptance test: typed height plus a synthetic front and side burst gives shoulder, chest,
// waist, torso length and arm length in cm, calibrated through one table.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFrame, summariseBurst, combineScan, ESTIMATE_KEYS, SCAN_KEYS } from "../src/core/scan.js";

const W = 480;
const H = 640;
const HEIGHT = 168;

function newMask(w, h) {
  return { w, h, data: new Uint8Array(w * h) };
}

// Fill columns c0..c1 and rows r0..r1 (inclusive) with 1.
function fillRect(mask, c0, c1, r0, r1) {
  for (let y = r0; y <= r1; y++) {
    for (let x = c0; x <= c1; x++) mask.data[y * mask.w + x] = 1;
  }
}

// Rectangles as [c0, c1, r0, r1]. Same body as test/pipeline.e2e.test.js with a narrower waist.
const FRONT_RECTS = [
  [215, 264, 40, 119],  // head
  [196, 285, 120, 299], // upper torso, 90 px wide
  [201, 280, 300, 319], // waist, 80 px wide
  [196, 285, 320, 399], // lower torso, 90 px wide
  [190, 289, 210, 219], // bust bulge, 100 px wide
  [140, 164, 130, 379], // left arm
  [315, 339, 130, 379], // right arm
  [195, 234, 400, 599], // left leg
  [245, 284, 400, 599], // right leg
];

const SIDE_RECTS = [
  [215, 264, 20, 99],   // head
  [205, 274, 100, 289], // upper torso, 70 px deep
  [210, 269, 290, 309], // waist, 60 px deep
  [205, 274, 310, 420], // lower torso, 70 px deep
  [205, 279, 202, 211], // bust bulge, 75 px deep
  [215, 264, 421, 619], // legs
];

// Front: shoulder midpoint (240, 140), hip midpoint (240, 390), span 250, so the waist band
// 0.55..0.80 covers image rows 277.5 to 340 and the narrowest midline run is the 80 px waist.
// Arm per side: two segments of hypot(20, 110) = 111.8 px, 223.6 px * 0.300 = 67.1 cm.
const FRONT_LM = [
  [11, 300, 140], [12, 180, 140], [23, 260, 390], [24, 220, 390],
  [13, 320, 250], [14, 160, 250], [15, 340, 360], [16, 140, 360],
];
// Side: shoulder midpoint (240, 125), hip midpoint (240, 400), span 275, band rows 276 to 345.
const SIDE_LM = [[11, 242, 125], [12, 238, 125], [23, 242, 400], [24, 238, 400]];

function buildMask(rects) {
  const mask = newMask(W, H);
  for (const [c0, c1, r0, r1] of rects) fillRect(mask, c0, c1, r0, r1);
  return mask;
}

function buildLandmarks(points) {
  const lm = [];
  for (let i = 0; i < 33; i++) lm.push({ x: 240, y: 320, z: 0, v: 0.9 });
  for (const [i, x, y] of points) lm[i] = { x, y, z: 0, v: 0.99 };
  return lm;
}

function observation(mask, lm) {
  return { t: 0, image: { w: W, h: H }, lm, world: null, mask };
}

const FRONT_MASK = buildMask(FRONT_RECTS);
const SIDE_MASK = buildMask(SIDE_RECTS);

function front(lm = buildLandmarks(FRONT_LM)) {
  return observation(FRONT_MASK, lm);
}

function side() {
  return observation(SIDE_MASK, buildLandmarks(SIDE_LM));
}

function near(actual, expected, tol, label) {
  assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual} is not within ${tol} of ${expected}`);
}

function burst(view, make, n = 15) {
  const readings = [];
  for (let i = 0; i < n; i++) readings.push(readFrame(make(i), view, HEIGHT));
  return summariseBurst(readings, view);
}

function cleanScan() {
  return combineScan(burst("front", () => front()), burst("side", () => side()));
}

test("readFrame on the front view gives raw cm values and anchors", () => {
  const f = readFrame(front(), "front", HEIGHT);
  assert.equal(f.ok, true);
  assert.equal(f.view, "front");
  near(f.cmPerPx, 0.300, 0.002, "cmPerPx");
  near(f.shoulderCm, 36.0, 0.5, "shoulderCm");
  near(f.bustExtentCm, 30.0, 0.5, "bustExtentCm");
  near(f.waistExtentCm, 24.0, 0.5, "waistExtentCm");
  near(f.torsoCm, 75.0, 0.5, "torsoCm");
  near(f.armCm, 67.1, 0.5, "armCm");
  assert.equal(f.anchors.span, 250);
  assert.deepEqual(f.anchors.shoulderMid, { x: 240, y: 140 });
  assert.deepEqual(f.anchors.hipMid, { x: 240, y: 390 });
});

test("readFrame on the side view gives depth only", () => {
  const s = readFrame(side(), "side", HEIGHT);
  assert.equal(s.ok, true);
  near(s.cmPerPx, 0.280, 0.002, "cmPerPx");
  near(s.waistExtentCm, 16.8, 0.5, "waistExtentCm");
  assert.equal(s.torsoCm, null);
  assert.equal(s.armCm, null);
  assert.equal(s.shoulderCm, null);
});

test("clean bursts combine into five calibrated measurements", () => {
  const fb = burst("front", () => front());
  assert.equal(fb.ok, true);
  assert.equal(fb.n, 15);
  assert.equal(fb.shoulderCm.mad, 0);
  assert.equal(fb.waistExtentCm.mad, 0);

  const sb = burst("side", () => side());
  assert.equal(sb.ok, true);
  assert.equal(sb.n, 15);
  assert.equal(sb.waistExtentCm.mad, 0);

  const scan = combineScan(fb, sb);
  assert.equal(scan.ok, true);
  const m = scan.measurements;
  near(m.shoulderCm, 38.0, 0.5, "shoulderCm");
  near(m.chestCm, 80.7, 0.5, "chestCm");
  near(m.waistCm, 64.6, 0.5, "waistCm");
  near(m.torsoCm, 75.0, 0.5, "torsoCm");
  near(m.armCm, 67.1, 0.5, "armCm");
  near(scan.raw.shoulderCm, 36.0, 0.5, "raw shoulderCm");

  assert.deepEqual(Object.keys(m).sort(), SCAN_KEYS.slice().sort());
  for (const key of SCAN_KEYS) {
    assert.equal(scan.estimate[key], ESTIMATE_KEYS.includes(key), `estimate ${key}`);
    const tenths = m[key] * 10;
    assert.ok(Math.abs(tenths - Math.round(tenths)) < 1e-9, `${key} ${m[key]} is not a multiple of 0.1`);
  }
  assert.equal(scan.estimate.shoulderCm, false);
  assert.equal(scan.estimate.chestCm, false);
  for (const key of SCAN_KEYS) assert.equal(scan.spreadCm[key], 0, `spread ${key}`);
});

test("a jittered 15-frame burst stays within 1.0 cm of the clean values", () => {
  const JITTER_IDS = [11, 12, 13, 14, 15, 16, 23, 24];
  const jittered = (i) => {
    const lm = buildLandmarks(FRONT_LM);
    JITTER_IDS.forEach((id, k) => {
      const dx = ((i + k) % 5) - 2;
      const dy = ((i * 2 + k * 3) % 5) - 2;
      lm[id] = { ...lm[id], x: lm[id].x + dx, y: lm[id].y + dy };
    });
    return front(lm);
  };
  const clean = cleanScan();
  const noisy = combineScan(burst("front", jittered), burst("side", () => side()));
  assert.equal(noisy.ok, true);
  for (const key of SCAN_KEYS) {
    near(noisy.measurements[key], clean.measurements[key], 1.0, `jittered ${key}`);
  }
});

test("arm length follows landmark visibility", () => {
  const hidden = buildLandmarks(FRONT_LM);
  for (const id of [13, 14, 15, 16]) hidden[id] = { ...hidden[id], v: 0.1 };
  const clean = cleanScan();
  const noArms = combineScan(burst("front", () => front(hidden)), burst("side", () => side()));
  assert.equal(noArms.ok, true);
  assert.equal(noArms.measurements.armCm, null);
  assert.equal(noArms.spreadCm.armCm, null);
  for (const key of ["shoulderCm", "chestCm", "waistCm", "torsoCm"]) {
    assert.equal(noArms.measurements[key], clean.measurements[key], `unchanged ${key}`);
  }

  // Only the left side visible, with a longer left arm: wrist at (350, 380).
  const oneSide = buildLandmarks(FRONT_LM);
  oneSide[15] = { ...oneSide[15], x: 350, y: 380 };
  oneSide[14] = { ...oneSide[14], v: 0.1 };
  const r = readFrame(front(oneSide), "front", HEIGHT);
  const leftPx = Math.hypot(20, 110) + Math.hypot(30, 130);
  near(r.armCm, leftPx * 0.3, 0.05, "one-side armCm");
});

test("unusable frames pass reason codes through and a short burst fails", () => {
  const touching = observation(buildMask([...FRONT_RECTS, [215, 264, 0, 39]]), buildLandmarks(FRONT_LM));
  assert.deepEqual(readFrame(touching, "front", HEIGHT), { ok: false, code: "body-touches-edge" });

  const noMask = front();
  noMask.mask = null;
  assert.deepEqual(readFrame(noMask, "front", HEIGHT), { ok: false, code: "no-mask" });

  const noPose = front();
  noPose.lm = [];
  assert.deepEqual(readFrame(noPose, "front", HEIGHT), { ok: false, code: "no-pose" });

  const readings = [];
  for (let i = 0; i < 7; i++) readings.push(readFrame(front(), "front", HEIGHT));
  for (let i = 0; i < 8; i++) readings.push({ ok: false, code: "no-mask" });
  assert.deepEqual(summariseBurst(readings, "front"), { ok: false, code: "burst-too-few", n: 7, reason: "no-mask" });
});

test("combineScan needs both views", () => {
  const fb = burst("front", () => front());
  const sb = burst("side", () => side());
  assert.deepEqual(combineScan(null, sb), { ok: false, code: "missing-front" });
  assert.deepEqual(combineScan(fb, null), { ok: false, code: "missing-side" });
});
