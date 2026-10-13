import { test } from "node:test";
import assert from "node:assert/strict";
import { createTiltSensor } from "../src/platform/tilt.js";

const fire = (target, beta, gamma) => target.dispatchEvent(Object.assign(new Event("deviceorientation"), { beta, gamma }));
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test("no permission API: start true, null until an event, then pitch", async () => {
  const target = new EventTarget();
  const s = createTiltSensor({ target, OrientationEvent: {} });
  assert.equal(await s.start(), true);
  assert.equal(s.pitchDeg(), null);
  fire(target, 90, 0);
  near(s.pitchDeg(), 0, 1e-6);
  fire(target, 60, 0);
  near(s.pitchDeg(), 30, 1e-6);
});

test("permission denied: false and no listener", async () => {
  const target = new EventTarget();
  const s = createTiltSensor({ target, OrientationEvent: { requestPermission: async () => "denied" } });
  assert.equal(await s.start(), false);
  fire(target, 90, 0);
  assert.equal(s.pitchDeg(), null);
});

test("permission granted: true and readings flow", async () => {
  const target = new EventTarget();
  const s = createTiltSensor({ target, OrientationEvent: { requestPermission: async () => "granted" } });
  assert.equal(await s.start(), true);
  fire(target, 90, 0);
  near(s.pitchDeg(), 0, 1e-6);
});

test("permission throwing: false, never rejects", async () => {
  const target = new EventTarget();
  const s = createTiltSensor({
    target,
    OrientationEvent: { requestPermission: () => { throw new Error("nope"); } },
  });
  assert.equal(await s.start(), false);
  const s2 = createTiltSensor({ target, OrientationEvent: { requestPermission: () => Promise.reject(new Error("x")) } });
  assert.equal(await s2.start(), false);
});

test("stop removes the listener and clears the reading", async () => {
  const target = new EventTarget();
  const s = createTiltSensor({ target, OrientationEvent: {} });
  await s.start();
  fire(target, 90, 0);
  assert.notEqual(s.pitchDeg(), null);
  s.stop();
  assert.equal(s.pitchDeg(), null);
  fire(target, 60, 0);
  assert.equal(s.pitchDeg(), null);
});

test("null beta (laptop) keeps pitch null", async () => {
  const target = new EventTarget();
  const s = createTiltSensor({ target, OrientationEvent: {} });
  await s.start();
  fire(target, null, null);
  assert.equal(s.pitchDeg(), null);
});
