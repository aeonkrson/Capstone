// Guided scan controller without a browser: fake clock, fake capture, cue spy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createGuidedScan } from "../src/app/guidedScan.js";
import { front, side, farFront } from "./helpers/bodyFixtures.js";

const flush = () => new Promise((r) => setImmediate(r));

function setup() {
  const clock = { t: 0 };
  const calls = [];
  const cues = [];
  const changes = [];
  const capture = (view) => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
    calls.push({ view, resolve, reject, promise });
    return promise;
  };
  const g = createGuidedScan({
    capture,
    cue: (name) => cues.push(name),
    onChange: (s) => changes.push(s),
    now: () => clock.t,
  });
  // Feed `make()` frames from t0 to t1 inclusive, moving the clock along.
  const feed = (make, t0, t1, step = 100) => {
    let s = null;
    for (let t = t0; t <= t1; t += step) {
      clock.t = t;
      s = g.onFrame(make(), t);
    }
    return s;
  };
  return { g, clock, calls, cues, changes, feed };
}

test("good front frames for 1.5 s trigger one front capture after a hold cue", () => {
  const { g, calls, cues, feed } = setup();
  g.start();
  const s = feed(front, 0, 1500);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].view, "front");
  assert.deepEqual(cues, ["hold"]);
  assert.equal(s.phase, "capturing");
  assert.equal(s.gateOk, true);
});

test("frames during capturing do not call capture again", () => {
  const { g, calls, feed } = setup();
  g.start();
  feed(front, 0, 1500);
  const s = feed(front, 1600, 3000);
  assert.equal(calls.length, 1);
  assert.equal(s.phase, "capturing");
});

test("front ok -> captured and turn cues, then side frames give one side capture and done", async () => {
  const { g, calls, cues, feed } = setup();
  g.start();
  feed(front, 0, 1500);
  calls[0].resolve({ ok: true, n: 15 });
  await flush();
  assert.deepEqual(cues.slice(-2), ["captured", "turn"]);
  let s = g.status();
  assert.equal(s.phase, "turn");
  assert.equal(s.messageKey, "guide.turn");

  s = feed(side, 4000, 5700);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].view, "side");
  assert.equal(s.phase, "capturing");
  calls[1].resolve({ ok: true, n: 15 });
  await flush();
  s = g.status();
  assert.equal(s.phase, "done");
  assert.equal(s.messageKey, "guide.done");
  assert.equal(cues[cues.length - 1], "captured");
});

test("a too-far frame gives the too-far hint and no capture", () => {
  const { g, calls, feed } = setup();
  g.start();
  const s = feed(farFront, 0, 2000);
  assert.equal(calls.length, 0);
  assert.equal(s.hint, "too-far");
  assert.equal(s.messageKey, "scan.reason.too-far");
  assert.equal(s.gateOk, false);
});

test("side frames while guiding the front view give wrong-side", () => {
  const { g, calls, feed } = setup();
  g.start();
  const s = feed(side, 0, 500);
  assert.equal(calls.length, 0);
  assert.equal(s.hint, "wrong-side");
});

test("a failed front capture goes back to guide front with the reason as hint", async () => {
  const { g, calls, cues, feed } = setup();
  g.start();
  feed(front, 0, 1500);
  calls[0].resolve({ ok: false, code: "moving", reason: "moving" });
  await flush();
  const s = g.status();
  assert.equal(s.phase, "guide");
  assert.equal(s.view, "front");
  assert.equal(s.hint, "moving");
  assert.ok(!cues.includes("captured"));
});

test("a rejected capture goes back to guide with no hint", async () => {
  const { g, calls, feed } = setup();
  const origError = console.error;
  const logged = [];
  console.error = (...a) => logged.push(a);
  try {
    g.start();
    feed(front, 0, 1500);
    calls[0].reject(new Error("boom"));
    await flush();
  } finally {
    console.error = origError;
  }
  const s = g.status();
  assert.equal(s.phase, "guide");
  assert.equal(s.hint, null);
  assert.equal(logged[0][0], "Guided capture failed:");
});

test("stop() while a capture is pending ignores the late result", async () => {
  const { g, calls, cues, feed } = setup();
  g.start();
  feed(front, 0, 1500);
  g.stop();
  const before = g.status();
  assert.equal(before.active, false);
  calls[0].resolve({ ok: true, n: 15 });
  await flush();
  const after = g.status();
  assert.equal(after.phase, before.phase);
  assert.ok(!cues.includes("captured"));
});

test("restart() returns to guide front and a fresh capture can be triggered", async () => {
  const { g, calls, cues, feed } = setup();
  g.start();
  feed(front, 0, 1500);
  g.restart();
  let s = g.status();
  assert.equal(s.active, true);
  assert.equal(s.phase, "guide");
  assert.equal(s.view, "front");
  // Late result from the first capture is dropped.
  calls[0].resolve({ ok: true, n: 15 });
  await flush();
  assert.equal(g.status().phase, "guide");
  assert.ok(!cues.includes("captured"));
  s = feed(front, 5000, 6500);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].view, "front");
  assert.equal(s.phase, "capturing");
});

test("onFrame before start() does nothing", () => {
  const { g, calls, cues, changes } = setup();
  const s = g.onFrame(front(), 0);
  assert.equal(s.active, false);
  assert.equal(s.gateOk, false);
  assert.equal(calls.length, 0);
  assert.equal(cues.length, 0);
  assert.equal(changes.length, 0);
});

test("start() reports a fresh status through onChange", () => {
  const { g, changes } = setup();
  g.start();
  assert.equal(changes.length, 1);
  assert.deepEqual(changes[0], {
    active: true, phase: "guide", view: "front", hint: null, messageKey: "guide.front", gateOk: false,
  });
});
