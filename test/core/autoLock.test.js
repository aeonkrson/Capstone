import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AUTO_LOCK,
  initialLock,
  bodyAnchors,
  stepLock,
  lockMessageKey,
} from "../../src/core/autoLock.js";
import { LM } from "../../src/core/landmarks.js";

function anchorsAt(dx = 0) {
  return { shoulderMid: { x: 240 + dx, y: 140 }, hipMid: { x: 240 + dx, y: 390 }, span: 250 };
}
function okFrame(t, dx = 0) {
  return { type: "frame", t, gate: { ok: true }, anchors: anchorsAt(dx) };
}
function badFrame(t, code) {
  return { type: "frame", t, gate: { ok: false, code }, anchors: null };
}
function run(state, events) {
  let s = state;
  let last = null;
  for (const e of events) {
    last = stepLock(s, e);
    s = last.state;
  }
  return last;
}
// Drive front view to capturing (ok frames 0..1500).
function toCapturingFront() {
  const evs = [];
  for (let t = 0; t <= 1500; t += 100) evs.push(okFrame(t));
  return run(initialLock(), evs);
}
function deepFreeze(o) {
  if (o && typeof o === "object") {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
}

test("AUTO_LOCK starting values", () => {
  assert.equal(AUTO_LOCK.HOLD_MS, 1500);
  assert.equal(AUTO_LOCK.TURN_MS, 2500);
  assert.equal(AUTO_LOCK.MAX_HOLD_DRIFT_FRAC, 0.05);
  assert.equal(AUTO_LOCK.HOLD_CUE_GAP_MS, 2000);
  assert.ok(Object.isFrozen(AUTO_LOCK));
});

test("initialLock is guide/front with null hint", () => {
  const s = initialLock();
  assert.deepEqual(s, { phase: "guide", view: "front", since: null, ref: null, hint: null, lastHoldCueT: null });
  assert.equal(lockMessageKey(s), "guide.front");
});

test("guide + bad frame sets hint only", () => {
  const r = stepLock(initialLock(), badFrame(0, "too-far"));
  assert.equal(r.state.phase, "guide");
  assert.equal(r.state.hint, "too-far");
  assert.deepEqual(r.cues, []);
  assert.equal(r.action, null);
  assert.equal(lockMessageKey(r.state), "scan.reason.too-far");
});

test("guide + ok frame enters hold with cue and ref", () => {
  const r = stepLock(initialLock(), okFrame(0));
  assert.equal(r.state.phase, "hold");
  assert.equal(r.state.since, 0);
  assert.deepEqual(r.cues, ["hold"]);
  assert.deepEqual(r.state.ref, anchorsAt(0));
  assert.equal(r.state.hint, null);
  assert.equal(r.action, null);
  assert.equal(lockMessageKey(r.state), "guide.hold");
});

test("hold for HOLD_MS asks for front capture", () => {
  let s = initialLock();
  for (let t = 0; t <= 1400; t += 100) {
    const r = stepLock(s, okFrame(t));
    s = r.state;
    assert.equal(s.phase, "hold");
    assert.equal(r.action, null);
  }
  const r = stepLock(s, okFrame(1500));
  assert.equal(r.state.phase, "capturing");
  assert.deepEqual(r.action, { type: "capture", view: "front" });
  assert.deepEqual(r.cues, []);
  assert.equal(lockMessageKey(r.state), "guide.capturing");
});

test("hold + bad frame returns to guide with code hint", () => {
  const r = run(initialLock(), [okFrame(0), badFrame(100, "arms-against-body")]);
  assert.equal(r.state.phase, "guide");
  assert.equal(r.state.hint, "arms-against-body");
  assert.equal(r.action, null);
});

test("hold drift beyond 5% of span cancels with moving", () => {
  const moved = run(initialLock(), [okFrame(0), okFrame(100, 20)]);
  assert.equal(moved.state.phase, "guide");
  assert.equal(moved.state.hint, "moving");
  assert.equal(moved.action, null);
  const small = run(initialLock(), [okFrame(0), okFrame(100, 10)]);
  assert.equal(small.state.phase, "hold");
});

test("hold cue is rate limited by HOLD_CUE_GAP_MS", () => {
  let r = stepLock(initialLock(), okFrame(0));
  assert.deepEqual(r.cues, ["hold"]);
  r = stepLock(r.state, badFrame(300, "too-close"));
  r = stepLock(r.state, okFrame(400));
  assert.equal(r.state.phase, "hold");
  assert.deepEqual(r.cues, []);
  r = stepLock(r.state, badFrame(500, "too-close"));
  r = stepLock(r.state, okFrame(2100));
  assert.equal(r.state.phase, "hold");
  assert.deepEqual(r.cues, ["hold"]);
});

test("capturing ignores frames", () => {
  const cap = toCapturingFront();
  const r1 = stepLock(cap.state, okFrame(1600));
  assert.deepEqual(r1.state, cap.state);
  assert.deepEqual(r1.cues, []);
  assert.equal(r1.action, null);
  const r2 = stepLock(cap.state, badFrame(1700, "no-pose"));
  assert.deepEqual(r2.state, cap.state);
  assert.equal(r2.action, null);
});

test("front capture-done ok goes to turn, then side guide after TURN_MS", () => {
  const cap = toCapturingFront();
  const r = stepLock(cap.state, { type: "capture-done", t: 5000, view: "front", ok: true, reason: null });
  assert.equal(r.state.phase, "turn");
  assert.equal(r.state.view, "side");
  assert.equal(r.state.since, 5000);
  assert.deepEqual(r.cues, ["captured", "turn"]);
  assert.equal(r.action, null);
  assert.equal(lockMessageKey(r.state), "guide.turn");

  const early = stepLock(r.state, okFrame(7499));
  assert.equal(early.state.phase, "turn");
  assert.deepEqual(early.cues, []);

  const g = stepLock(early.state, okFrame(7500));
  assert.equal(g.state.phase, "guide");
  assert.equal(g.state.view, "side");
  assert.equal(g.state.hint, null);
  assert.equal(g.state.since, null);
  assert.deepEqual(g.cues, []);
  assert.equal(g.action, null);
  assert.equal(lockMessageKey(g.state), "guide.side");

  const h = stepLock(g.state, okFrame(7600));
  assert.equal(h.state.phase, "hold");
  assert.equal(h.state.view, "side");
});

test("full side path ends in done", () => {
  let r = toCapturingFront();
  r = stepLock(r.state, { type: "capture-done", t: 5000, view: "front", ok: true, reason: null });
  r = stepLock(r.state, okFrame(7500));
  let last = null;
  for (let t = 7600; t <= 9100; t += 100) {
    last = stepLock(r.state, okFrame(t));
    r = last;
  }
  assert.equal(r.state.phase, "capturing");
  assert.deepEqual(r.action, { type: "capture", view: "side" });
  r = stepLock(r.state, { type: "capture-done", t: 9500, view: "side", ok: true, reason: null });
  assert.equal(r.state.phase, "done");
  assert.deepEqual(r.cues, ["captured"]);
  assert.equal(lockMessageKey(r.state), "guide.done");
  const after = stepLock(r.state, okFrame(9600));
  assert.deepEqual(after.state, r.state);
  assert.deepEqual(after.cues, []);
  assert.equal(after.action, null);
});

test("failed capture returns to guide with reason hint", () => {
  const cap = toCapturingFront();
  const m = stepLock(cap.state, { type: "capture-done", t: 3000, view: "front", ok: false, reason: "moving" });
  assert.equal(m.state.phase, "guide");
  assert.equal(m.state.view, "front");
  assert.equal(m.state.hint, "moving");
  assert.deepEqual(m.cues, []);
  assert.equal(m.action, null);
  const a = stepLock(cap.state, { type: "capture-done", t: 3000, view: "front", ok: false, reason: "aborted" });
  assert.equal(a.state.phase, "guide");
  assert.equal(a.state.hint, null);
  const n = stepLock(cap.state, { type: "capture-done", t: 3000, view: "front", ok: false, reason: null });
  assert.equal(n.state.hint, null);
});

test("mismatched or stray capture-done is ignored", () => {
  const cap = toCapturingFront();
  const wrong = stepLock(cap.state, { type: "capture-done", t: 3000, view: "side", ok: true, reason: null });
  assert.deepEqual(wrong.state, cap.state);
  assert.deepEqual(wrong.cues, []);
  const g = initialLock();
  const stray = stepLock(g, { type: "capture-done", t: 3000, view: "front", ok: true, reason: null });
  assert.deepEqual(stray.state, g);
  assert.deepEqual(stray.cues, []);
  assert.equal(stray.action, null);
});

test("restart from any phase returns initialLock", () => {
  const cap = toCapturingFront();
  const r = stepLock(cap.state, { type: "restart" });
  assert.deepEqual(r.state, initialLock());
  assert.deepEqual(r.cues, []);
  assert.equal(r.action, null);
  const t = stepLock(cap.state, { type: "capture-done", t: 5000, view: "front", ok: true, reason: null });
  assert.deepEqual(stepLock(t.state, { type: "restart" }).state, initialLock());
});

test("stepLock does not mutate input state", () => {
  const hold = stepLock(initialLock(), okFrame(0)).state;
  deepFreeze(hold);
  assert.doesNotThrow(() => {
    stepLock(hold, okFrame(100));
    stepLock(hold, okFrame(1500));
    stepLock(hold, okFrame(100, 20));
    stepLock(hold, badFrame(100, "tilted"));
    stepLock(hold, { type: "restart" });
  });
  assert.equal(hold.phase, "hold");
  assert.equal(hold.since, 0);
});

test("unknown event type leaves state unchanged", () => {
  const s = initialLock();
  const r = stepLock(s, { type: "bogus" });
  assert.deepEqual(r.state, s);
  assert.deepEqual(r.cues, []);
  assert.equal(r.action, null);
});

test("bodyAnchors computes midpoints and span", () => {
  const lm = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0, v: 1 }));
  lm[LM.LEFT_SHOULDER] = { x: 300, y: 130, z: 0, v: 1 };
  lm[LM.RIGHT_SHOULDER] = { x: 180, y: 150, z: 0, v: 1 };
  lm[LM.LEFT_HIP] = { x: 280, y: 380, z: 0, v: 1 };
  lm[LM.RIGHT_HIP] = { x: 200, y: 400, z: 0, v: 1 };
  assert.deepEqual(bodyAnchors(lm), { shoulderMid: { x: 240, y: 140 }, hipMid: { x: 240, y: 390 }, span: 250 });
});

test("bodyAnchors returns null for bad input", () => {
  assert.equal(bodyAnchors(null), null);
  assert.equal(bodyAnchors(undefined), null);
  assert.equal(bodyAnchors([{ x: 0, y: 0 }]), null);
  const flat = Array.from({ length: 33 }, () => ({ x: 10, y: 100, z: 0, v: 1 }));
  assert.equal(bodyAnchors(flat), null);
});
