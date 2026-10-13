import { test } from "node:test";
import assert from "node:assert/strict";
import { QUALITY, checkFrame, checkStability, cameraPitchDeg } from "../../src/core/quality.js";

const W = 480;
const H = 640;

function fillRect(mask, c0, c1, r0, r1, v = 1) {
  for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) mask.data[y * mask.w + x] = v;
}

const FRONT_RECTS = [
  [215, 264, 40, 119], [196, 285, 120, 399], [190, 289, 210, 219],
  [140, 164, 130, 379], [315, 339, 130, 379], [195, 234, 400, 599], [245, 284, 400, 599],
];
const SIDE_RECTS = [[215, 264, 20, 99], [205, 274, 100, 420], [205, 279, 202, 211], [215, 264, 421, 619]];

function mk(rects) {
  const mask = { w: W, h: H, data: new Uint8Array(W * H) };
  for (const r of rects) fillRect(mask, ...r);
  return mask;
}

function lms(points, v = 0.99) {
  const lm = [];
  for (let i = 0; i < 33; i++) lm.push({ x: 240, y: 320, z: 0, v: 0.9 });
  for (const [i, x, y] of points) lm[i] = { x, y, z: 0, v };
  return lm;
}

const FRONT_LM = [[0, 240, 60], [11, 300, 140], [12, 180, 140], [23, 260, 390], [24, 220, 390], [27, 220, 595], [28, 260, 595]];
const SIDE_LM = [[0, 240, 40], [11, 242, 125], [12, 238, 125], [23, 242, 400], [24, 238, 400], [27, 240, 615], [28, 240, 615]];

const obs = (mask, lm) => ({ t: 0, image: { w: W, h: H }, lm, world: null, mask });
const front = (rects = FRONT_RECTS) => obs(mk(rects), lms(FRONT_LM));
const side = () => obs(mk(SIDE_RECTS), lms(SIDE_LM));
const near = (a, b, tol, label) => assert.ok(Math.abs(a - b) <= tol, `${label}: ${a} vs ${b}`);
const setV = (o, i, v) => { o.lm[i] = { ...o.lm[i], v }; };

test("QUALITY is frozen and holds the starting values", () => {
  assert.ok(Object.isFrozen(QUALITY));
  assert.deepEqual({ ...QUALITY }, {
    MIN_BODY_FRAC: 0.5,
    MAX_BODY_FRAC: 0.97,
    MAX_LEAN_DEG: 6,
    MAX_SHOULDER_ROLL_DEG: 8,
    FRONT_MIN_SHOULDER_RATIO: 0.35,
    SIDE_MAX_SHOULDER_RATIO: 0.25,
    ARM_GAP_ROW_FRACS: QUALITY.ARM_GAP_ROW_FRACS,
    MAX_DEVICE_PITCH_DEG: 10,
    MAX_ANCHOR_DRIFT_FRAC: 0.04,
    MAX_MAD_CM: 1.0,
  });
  assert.deepEqual([...QUALITY.ARM_GAP_ROW_FRACS], [0.35, 0.55]);
});

test("good fixtures pass for their own view", () => {
  assert.deepEqual(checkFrame(front(), "front"), { ok: true });
  assert.deepEqual(checkFrame(side(), "side"), { ok: true });
});

test("no-pose and no-mask", () => {
  assert.deepEqual(checkFrame(null, "front"), { ok: false, code: "no-pose" });
  const short = front();
  short.lm = short.lm.slice(0, 10);
  assert.deepEqual(checkFrame(short, "front"), { ok: false, code: "no-pose" });
  const nm = front();
  nm.mask = null;
  assert.deepEqual(checkFrame(nm, "front"), { ok: false, code: "no-mask" });
  const em = front();
  em.mask = mk([]);
  assert.deepEqual(checkFrame(em, "front"), { ok: false, code: "no-mask" });
});

test("not-full-body", () => {
  const top = front([...FRONT_RECTS, [215, 264, 0, 39]]);
  assert.deepEqual(checkFrame(top, "front"), { ok: false, code: "not-full-body" });
  const left = front([...FRONT_RECTS, [0, 0, 300, 310]]);
  assert.deepEqual(checkFrame(left, "front"), { ok: false, code: "not-full-body" });
  const ank = front();
  setV(ank, 27, 0.1);
  assert.deepEqual(checkFrame(ank, "front"), { ok: false, code: "not-full-body" });
  const nose = front();
  setV(nose, 0, 0.1);
  assert.deepEqual(checkFrame(nose, "front"), { ok: false, code: "not-full-body" });
  const both = side();
  setV(both, 27, 0.1);
  setV(both, 28, 0.1);
  assert.deepEqual(checkFrame(both, "side"), { ok: false, code: "not-full-body" });
  const one = side();
  setV(one, 27, 0.1);
  assert.deepEqual(checkFrame(one, "side"), { ok: true });
});

test("too-close and too-far", () => {
  const close = obs(mk([[200, 280, 2, 637]]), lms(FRONT_LM));
  assert.deepEqual(checkFrame(close, "front"), { ok: false, code: "too-close" });
  const far = obs(mk([[200, 280, 200, 455]]), lms(FRONT_LM));
  assert.deepEqual(checkFrame(far, "front"), { ok: false, code: "too-far" });
});

test("low-visibility", () => {
  const o = front();
  setV(o, 11, 0.2);
  assert.deepEqual(checkFrame(o, "front"), { ok: false, code: "low-visibility" });
  const h = front();
  setV(h, 24, 0.2);
  assert.deepEqual(checkFrame(h, "front"), { ok: false, code: "low-visibility" });
});

test("wrong-side", () => {
  assert.deepEqual(checkFrame(front(), "side"), { ok: false, code: "wrong-side" });
  assert.deepEqual(checkFrame(side(), "front"), { ok: false, code: "wrong-side" });
  const swapped = front();
  [swapped.lm[11], swapped.lm[12]] = [swapped.lm[12], swapped.lm[11]];
  assert.deepEqual(checkFrame(swapped, "front"), { ok: false, code: "wrong-side" });
});

test("tilted: shoulder roll, lean, device pitch", () => {
  const roll = front();
  roll.lm[11] = { ...roll.lm[11], y: 170 };
  assert.deepEqual(checkFrame(roll, "front"), { ok: false, code: "tilted" });

  const lean = front();
  const k = Math.tan((10 * Math.PI) / 180);
  lean.lm = lean.lm.map((p) => ({ ...p, x: p.x + (595 - p.y) * k }));
  assert.deepEqual(checkFrame(lean, "front"), { ok: false, code: "tilted" });

  assert.deepEqual(checkFrame(front(), "front", { devicePitchDeg: 15 }), { ok: false, code: "tilted" });
  assert.deepEqual(checkFrame(front(), "front", { devicePitchDeg: 5 }), { ok: true });
  assert.deepEqual(checkFrame(front(), "front", { devicePitchDeg: null }), { ok: true });
  assert.deepEqual(checkFrame(side(), "side", { devicePitchDeg: 15 }), { ok: false, code: "tilted" });
});

test("arms-against-body in front only", () => {
  const rects = FRONT_RECTS.filter((q) => q[0] !== 140 && q[0] !== 315).concat([[166, 195, 130, 379], [286, 314, 130, 379]]);
  assert.deepEqual(checkFrame(front(rects), "front"), { ok: false, code: "arms-against-body" });
  assert.deepEqual(checkFrame(side(), "side"), { ok: true });
});

const reading = (over = {}) => ({
  shoulderCm: 38,
  bustExtentCm: 30,
  anchors: { shoulderMid: { x: 240, y: 140 }, hipMid: { x: 240, y: 390 }, span: 250 },
  ...over,
});

test("checkStability", () => {
  assert.deepEqual(checkStability(Array.from({ length: 10 }, () => reading())), { ok: true });
  assert.deepEqual(checkStability([reading()]), { ok: true });
  assert.deepEqual(checkStability([]), { ok: true });

  const drift = Array.from({ length: 10 }, (_, i) => reading({
    anchors: { shoulderMid: { x: 240, y: 140 }, hipMid: { x: 240 + (i * 20) / 9, y: 390 }, span: 250 },
  }));
  assert.deepEqual(checkStability(drift), { ok: false, code: "moving" });

  const small = Array.from({ length: 10 }, (_, i) => reading({
    anchors: { shoulderMid: { x: 240, y: 140 }, hipMid: { x: 240 + (i * 5) / 9, y: 390 }, span: 250 },
  }));
  assert.deepEqual(checkStability(small), { ok: true });

  const alt = Array.from({ length: 10 }, (_, i) => reading({ shoulderCm: i % 2 ? 39 : 36 }));
  assert.deepEqual(checkStability(alt), { ok: false, code: "moving" });

  const bust = Array.from({ length: 10 }, (_, i) => reading({ bustExtentCm: i % 2 ? 32 : 29 }));
  assert.deepEqual(checkStability(bust), { ok: false, code: "moving" });

  const side = Array.from({ length: 10 }, () => reading({ shoulderCm: null }));
  assert.deepEqual(checkStability(side), { ok: true });
});

test("cameraPitchDeg", () => {
  near(cameraPitchDeg(90, 0), 0, 1e-9, "portrait");
  near(cameraPitchDeg(0, 0), 90, 1e-9, "flat");
  near(cameraPitchDeg(0, 90), 0, 1e-6, "landscape");
  near(cameraPitchDeg(80, 0), 10, 0.5, "80");
  assert.equal(cameraPitchDeg(null, 0), null);
  assert.equal(cameraPitchDeg(0, NaN), null);
  assert.equal(cameraPitchDeg("90", 0), null);
});
