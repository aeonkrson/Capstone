// Scan page flow without a browser: gated burst -> scan session -> profile.
import { test } from "node:test";
import assert from "node:assert/strict";
import { runBurst, BURST_FRAMES } from "../src/app/burst.js";
import { createScanSession } from "../src/app/scanSession.js";
import { ESTIMATE_KEYS as SCAN_ESTIMATE_KEYS, SCAN_KEYS } from "../src/core/scan.js";
import { ESTIMATE_KEYS as PROFILE_ESTIMATE_KEYS, emptyState, setProfileName, applyScan } from "../src/core/profileState.js";
import { BODY_FIELDS } from "../src/core/bodyMeasurements.js";

const W = 480;
const H = 640;
const HEIGHT = 168;

function fillRect(mask, c0, c1, r0, r1) {
  for (let y = r0; y <= r1; y++) for (let x = c0; x <= c1; x++) mask.data[y * mask.w + x] = 1;
}

function buildMask(rects) {
  const mask = { w: W, h: H, data: new Uint8Array(W * H) };
  for (const r of rects) fillRect(mask, ...r);
  return mask;
}

// Plan 03-01 e2e bodies.
const FRONT_RECTS = [
  [215, 264, 40, 119], [196, 285, 120, 299], [201, 280, 300, 319], [196, 285, 320, 399],
  [190, 289, 210, 219], [140, 164, 130, 379], [315, 339, 130, 379], [195, 234, 400, 599], [245, 284, 400, 599],
];
// Arms filled into the torso: one run per row.
const MERGED_RECTS = [...FRONT_RECTS, [140, 339, 130, 379]];
const SIDE_RECTS = [
  [215, 264, 20, 99], [205, 274, 100, 289], [210, 269, 290, 309], [205, 274, 310, 420],
  [205, 279, 202, 211], [215, 264, 421, 619],
];

// Plan 03-01 landmarks plus nose and ankles as in plan 03-02.
const FRONT_LM = [
  [0, 240, 60], [11, 300, 140], [12, 180, 140], [23, 260, 390], [24, 220, 390],
  [13, 320, 250], [14, 160, 250], [15, 340, 360], [16, 140, 360], [27, 220, 595], [28, 260, 595],
];
const SIDE_LM = [[0, 240, 40], [11, 242, 125], [12, 238, 125], [23, 242, 400], [24, 238, 400], [27, 240, 615], [28, 240, 615]];

function buildLandmarks(points) {
  const lm = [];
  for (let i = 0; i < 33; i++) lm.push({ x: 240, y: 320, z: 0, v: 0.9 });
  for (const [i, x, y] of points) lm[i] = { x, y, z: 0, v: 0.99 };
  return lm;
}

const FRONT_MASK = buildMask(FRONT_RECTS);
const MERGED_MASK = buildMask(MERGED_RECTS);
const SIDE_MASK = buildMask(SIDE_RECTS);
const obs = (mask, lm) => ({ t: 0, image: { w: W, h: H }, lm, world: null, mask });
const front = () => obs(FRONT_MASK, buildLandmarks(FRONT_LM));
const side = () => obs(SIDE_MASK, buildLandmarks(SIDE_LM));

// Fake pose: detect returns make(frameIndex); the running mode history is recorded.
function fakePose(make) {
  let i = 0;
  const modes = [];
  return {
    modes,
    setRunningMode: async (mode) => { modes.push(mode); },
    detect: () => {
      const o = make(i);
      i += 1;
      return o;
    },
  };
}

function burst(view, make, extra = {}) {
  const pose = fakePose(make);
  const promise = runBurst({ pose, videoEl: {}, view, heightCm: HEIGHT, nextFrame: async () => true, ...extra });
  return promise.then((result) => ({ result, pose }));
}

test("15 good front frames give an ok burst with the scan and debug fields", async () => {
  const { result } = await burst("front", () => front());
  assert.equal(result.ok, true);
  assert.equal(result.n, BURST_FRAMES);
  for (const field of ["shoulderCm", "bustExtentCm", "waistExtentCm", "torsoCm", "armCm", "cmPerPx", "bustRowFrac"]) {
    assert.equal(typeof result[field].median, "number", field);
  }
  assert.equal(result.armsMergedFrames, 0);
});

test("arms against the body in 10 of 15 frames rejects the view with that reason", async () => {
  const { result } = await burst("front", (i) => (i < 10 ? obs(MERGED_MASK, buildLandmarks(FRONT_LM)) : front()));
  assert.equal(result.ok, false);
  assert.equal(result.code, "burst-too-few");
  assert.equal(result.reason, "arms-against-body");
});

test("drifting hips reject the view as moving", async () => {
  const drifting = (i) => {
    const lm = buildLandmarks(FRONT_LM);
    const dx = Math.round((30 * i) / (BURST_FRAMES - 1));
    lm[23] = { ...lm[23], x: lm[23].x + dx };
    lm[24] = { ...lm[24], x: lm[24].x + dx };
    return obs(FRONT_MASK, lm);
  };
  const { result } = await burst("front", drifting);
  assert.equal(result.ok, false);
  assert.equal(result.code, "moving");
  assert.equal(result.reason, "moving");
});

test("a tilted phone rejects the view as tilted", async () => {
  const { result } = await burst("front", () => front(), { getDevicePitchDeg: () => 20 });
  assert.equal(result.ok, false);
  assert.equal(result.code, "burst-too-few");
  assert.equal(result.reason, "tilted");
});

test("abort mid-burst returns aborted and restores VIDEO mode", async () => {
  let calls = 0;
  const { result, pose } = await burst("front", () => front(), { isAborted: () => { calls += 1; return calls > 6; } });
  assert.equal(result.code, "aborted");
  assert.equal(pose.modes.at(-1), "VIDEO");
});

test("scan session records views, combines both and clears", async () => {
  const f = (await burst("front", () => front())).result;
  const s = (await burst("side", () => side())).result;
  const session = createScanSession();
  assert.deepEqual(session.snapshot(), { front: { status: "empty" }, side: { status: "empty" }, combined: null });

  session.record("front", f);
  session.record("side", s);
  let snap = session.snapshot();
  assert.equal(snap.front.status, "ok");
  assert.equal(snap.side.status, "ok");
  assert.equal(snap.combined.ok, true);
  assert.deepEqual(Object.keys(snap.combined.measurements).sort(), SCAN_KEYS.slice().sort());
  for (const key of SCAN_KEYS) assert.equal(snap.combined.estimate[key], SCAN_ESTIMATE_KEYS.includes(key));

  session.record("side", { ok: false, code: "burst-too-few", n: 2, reason: "wrong-side" });
  snap = session.snapshot();
  assert.deepEqual(snap.side, { status: "rejected", reason: "wrong-side" });
  assert.equal(snap.front.status, "ok");
  assert.equal(snap.combined, null);

  session.record("side", { ok: false, code: "moving", n: 15, reason: "moving" });
  assert.deepEqual(session.snapshot().side, { status: "rejected", reason: "moving" });
  session.record("front", { ok: false, code: "burst-too-few", n: 0, reason: null });
  assert.deepEqual(session.snapshot().front, { status: "rejected", reason: "burst-too-few" });

  session.record("front", f);
  session.record("side", s);
  session.record("front", { ok: false, code: "burst-too-few", n: 0, reason: "too-far" });
  snap = session.snapshot();
  assert.equal(snap.front.status, "rejected");
  assert.equal(snap.side.status, "ok");

  session.clear();
  assert.deepEqual(session.snapshot(), { front: { status: "empty" }, side: { status: "empty" }, combined: null });
});

test("scan and profile agree on the estimate keys", () => {
  assert.deepEqual(SCAN_ESTIMATE_KEYS, PROFILE_ESTIMATE_KEYS);
});

test("combined measurements go through applyScan with out-of-range keys rejected", async () => {
  const session = createScanSession();
  session.record("front", (await burst("front", () => front())).result);
  session.record("side", (await burst("side", () => side())).result);
  const m = session.snapshot().combined.measurements;
  const state = setProfileName(emptyState(), "Tester");
  const r = applyScan(state, m);
  const FIELD = { chestCm: "chest", shoulderCm: "shoulder", torsoCm: "torso", waistCm: "waist", armCm: "arm" };
  const inside = SCAN_KEYS.filter((k) => m[k] !== null && m[k] >= BODY_FIELDS[FIELD[k]].min && m[k] <= BODY_FIELDS[FIELD[k]].max);
  assert.deepEqual(r.applied.slice().sort(), inside.slice().sort());
  assert.ok(r.rejected.includes("torsoCm"), "torso 75 cm is outside BODY_FIELDS");
  for (const key of r.applied) {
    assert.equal(r.state.measurements[key], m[key]);
    assert.equal(r.state.sources[key], "scanned");
  }
});
