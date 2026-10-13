import { test } from "node:test";
import assert from "node:assert/strict";
import { maskBBox, rowRuns, torsoRunAtRow, widestTorsoRun, narrowestTorsoRun } from "../../src/core/mask.js";

function newMask(w, h) {
  return { w, h, data: new Uint8Array(w * h) };
}

function fill(mask, c0, c1, r0, r1) {
  for (let y = r0; y <= r1; y++) {
    for (let x = c0; x <= c1; x++) mask.data[y * mask.w + x] = 1;
  }
}

function bodyMask(armsTouch = false) {
  const m = newMask(200, 60);
  fill(m, 55, 144, 0, 49);
  fill(m, 50, 149, 20, 24);
  fill(m, 45, 154, 2, 5);
  if (armsTouch) {
    fill(m, 10, 54, 0, 49);
    fill(m, 145, 189, 0, 49);
  } else {
    fill(m, 10, 39, 0, 49);
    fill(m, 160, 189, 0, 49);
  }
  return m;
}

const at100 = () => 100;

test("maskBBox", () => {
  assert.equal(maskBBox(newMask(50, 50)), null);
  const m = newMask(50, 50);
  fill(m, 10, 19, 5, 24);
  assert.deepEqual(maskBBox(m), { top: 5, bottom: 24, left: 10, right: 19 });
});

test("rowRuns finds runs with exclusive end", () => {
  const m = newMask(100, 3);
  fill(m, 0, 9, 1, 1);
  fill(m, 30, 39, 1, 1);
  fill(m, 90, 99, 1, 1);
  assert.deepEqual(rowRuns(m, 1), [
    { start: 0, end: 10 },
    { start: 30, end: 40 },
    { start: 90, end: 100 },
  ]);
  assert.deepEqual(rowRuns(m, 0), []);
});

test("torsoRunAtRow", () => {
  const m = bodyMask();
  const r = torsoRunAtRow(m, 10, 100);
  assert.equal(r.width, 90);
  assert.equal(torsoRunAtRow(m, 10, 50), null);
  assert.equal(torsoRunAtRow(m, 60, 100), null);
  assert.equal(torsoRunAtRow(m, -1, 100), null);
  assert.equal(torsoRunAtRow(m, 10.4, 99.6).width, 90);
  assert.equal(torsoRunAtRow(m, 10, 99.6).start, 55);
});

test("widestTorsoRun excludes arms, honours band, ties keep highest row", () => {
  const m = bodyMask();
  const a = widestTorsoRun(m, 10, 40, at100);
  assert.deepEqual(a, { row: 20, start: 50, end: 150, width: 100 });
  const b = widestTorsoRun(m, 0, 40, at100);
  assert.equal(b.row, 2);
  assert.equal(b.width, 110);
  const c = widestTorsoRun(m, 30, 40, at100);
  assert.equal(c.row, 30);
  assert.equal(c.width, 90);
  const d = widestTorsoRun(m, -5, 100, at100);
  assert.equal(d.row, 2);
  assert.equal(d.width, 110);
});

test("arms touching the torso are included", () => {
  const r = widestTorsoRun(bodyMask(true), 10, 40, at100);
  assert.equal(r.row, 10);
  assert.equal(r.width, 180);
});

test("no run at the midline gives null", () => {
  assert.equal(widestTorsoRun(bodyMask(), 10, 40, () => 45), null);
});

test("narrowestTorsoRun picks the narrowest midline run, ties keep the highest row", () => {
  const m = bodyMask();
  assert.deepEqual(narrowestTorsoRun(m, 0, 40, at100), { row: 0, start: 55, end: 145, width: 90 });
  const b = narrowestTorsoRun(m, 2, 5, at100);
  assert.equal(b.row, 2);
  assert.equal(b.width, 110);
  const c = narrowestTorsoRun(m, 18.6, 24.4, at100);
  assert.equal(c.row, 19);
  assert.equal(c.width, 90);
  const d = narrowestTorsoRun(m, -5, 100, at100);
  assert.equal(d.row, 0);
});

test("narrowestTorsoRun skips rows without a midline run", () => {
  const m = newMask(200, 20);
  fill(m, 60, 139, 0, 19);
  fill(m, 40, 159, 10, 19);
  for (let x = 95; x <= 105; x++) m.data[5 * m.w + x] = 0;
  for (let x = 0; x < 200; x++) m.data[6 * m.w + x] = 0;
  const r = narrowestTorsoRun(m, 5, 19, at100);
  assert.equal(r.row, 7);
  assert.equal(r.width, 80);
});

test("narrowestTorsoRun returns null when no row has a midline run", () => {
  assert.equal(narrowestTorsoRun(bodyMask(), 10, 40, () => 45), null);
});
