import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAIN_TEE, FITTED_TEE, UNCONFIRMED_BOXY_TEE } from "../../src/data/colourboxCharts.js";

const PLAIN = {
  XS: [47, 50, 37, 12, 20, 54, 58],
  S: [49, 52, 39, 13, 21, 56, 60],
  M: [51, 54, 41, 14, 22, 58, 62],
  L: [53, 56, 43, 15, 23, 60, 64],
  XL: [55, 58, 45, 16, 24, 62, 66],
};
const FITTED = {
  XS: [33, 31.5, 31, 18, 14, 41],
  S: [35, 33.5, 32, 19, 15, 42],
  M: [37, 35.5, 33, 20, 16, 43],
  L: [39, 37.5, 34, 21, 17, 44],
  XL: [41, 39.5, 35, 22, 18, 45],
};

test("plain tee matches the published table field by field", () => {
  assert.deepEqual(PLAIN_TEE.columnOrder, ["chest", "bottom", "shoulder", "sleeveLength", "armhole", "backLength"]);
  assert.deepEqual(PLAIN_TEE.sizes.map((s) => s.label), Object.keys(PLAIN));
  for (const s of PLAIN_TEE.sizes) {
    const [chest, bottom, shoulder, sleeveLength, armhole, min, max] = PLAIN[s.label];
    assert.equal(s.chest, chest);
    assert.equal(s.bottom, bottom);
    assert.equal(s.shoulder, shoulder);
    assert.equal(s.sleeveLength, sleeveLength);
    assert.equal(s.armhole, armhole);
    assert.equal(s.backLength.min, min);
    assert.equal(s.backLength.max, max);
  }
});

test("plain back length carries a placeholder midpoint", () => {
  for (const s of PLAIN_TEE.sizes) {
    assert.equal(s.backLength.midpoint, (s.backLength.min + s.backLength.max) / 2);
    assert.equal(s.backLength.placeholder, true);
  }
  assert.equal(PLAIN_TEE.sizes[0].backLength.midpoint, 56);
});

test("fitted tee matches the published table with its own column order", () => {
  assert.deepEqual(FITTED_TEE.columnOrder, ["chest", "bottom", "shoulder", "armhole", "sleeveLength", "bodyLength"]);
  for (const s of FITTED_TEE.sizes) {
    const [chest, bottom, shoulder, armhole, sleeveLength, bodyLength] = FITTED[s.label];
    assert.deepEqual(
      [s.chest, s.bottom, s.shoulder, s.armhole, s.sleeveLength, s.bodyLength],
      [chest, bottom, shoulder, armhole, sleeveLength, bodyLength]
    );
  }
});

test("chest rises by exactly 2 cm of flat width per size (4 cm of circumference)", () => {
  for (const chart of [PLAIN_TEE, FITTED_TEE]) {
    for (let i = 1; i < chart.sizes.length; i++) {
      assert.equal(chart.sizes[i].chest - chart.sizes[i - 1].chest, 2);
    }
  }
});

test("collected charts are marked as assumed flat widths", () => {
  for (const chart of [PLAIN_TEE, FITTED_TEE]) {
    assert.equal(chart.unit, "cm");
    assert.equal(chart.convention, "flat");
    assert.equal(chart.audience, "women");
    assert.equal(chart.status, "collected");
    assert.equal(chart.measuredHow, "assumed flat width, unconfirmed");
  }
});

test("boxy chart is unconfirmed, raw text only, with no sizes", () => {
  assert.equal(UNCONFIRMED_BOXY_TEE.status, "unconfirmed");
  assert.equal("sizes" in UNCONFIRMED_BOXY_TEE, false);
  assert.equal(UNCONFIRMED_BOXY_TEE.rawSupplied.XS, "47 x 50 x 37 x 12 x 20 x 54-58");
});

test("no chart has a waist key", () => {
  const text = JSON.stringify({ PLAIN_TEE, FITTED_TEE, UNCONFIRMED_BOXY_TEE });
  assert.ok(!/"[^"]*waist[^"]*"\s*:/i.test(text));
});
