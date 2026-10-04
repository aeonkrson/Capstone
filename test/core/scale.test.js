import { test } from "node:test";
import assert from "node:assert/strict";
import { cmPerPxFromMask } from "../../src/core/scale.js";

function newMask(w, h) {
  return { w, h, data: new Uint8Array(w * h) };
}

function fillRows(mask, r0, r1) {
  for (let y = r0; y <= r1; y++) for (let x = 10; x < 20; x++) mask.data[y * mask.w + x] = 1;
}

const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test("full-resolution mask", () => {
  const m = newMask(480, 640);
  fillRows(m, 40, 599);
  const r = cmPerPxFromMask(168, m, { w: 480, h: 640 });
  assert.equal(r.ok, true);
  near(r.cmPerPx, 0.3);
  assert.equal(r.headTopY, 40);
  assert.equal(r.soleY, 599);
});

test("half-resolution mask gives the same scale", () => {
  const m = newMask(240, 320);
  fillRows(m, 20, 299);
  const r = cmPerPxFromMask(168, m, { w: 480, h: 640 });
  assert.equal(r.ok, true);
  near(r.cmPerPx, 0.3);
  assert.equal(r.headTopY, 40);
  assert.equal(r.soleY, 599);
});

test("refusals", () => {
  const image = { w: 480, h: 640 };
  assert.deepEqual(cmPerPxFromMask(168, null, image), { ok: false, code: "no-mask" });
  assert.deepEqual(cmPerPxFromMask(168, newMask(480, 640), image), { ok: false, code: "no-mask" });
  const top = newMask(480, 640);
  fillRows(top, 0, 500);
  assert.deepEqual(cmPerPxFromMask(168, top, image), { ok: false, code: "body-touches-edge" });
  const bottom = newMask(480, 640);
  fillRows(bottom, 100, 639);
  assert.deepEqual(cmPerPxFromMask(168, bottom, image), { ok: false, code: "body-touches-edge" });
});
