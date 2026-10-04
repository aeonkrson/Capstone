import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAIN_TEE, UNCONFIRMED_BOXY_TEE } from "../../src/data/colourboxCharts.js";
import {
  MIN_EASE_CM, BORDERLINE_BAND_CM, chestCircumferenceCm, sizeFromBust, sizesAgree,
} from "../../src/core/sizeFromTape.js";

const label = (v) => sizeFromBust(v, PLAIN_TEE).label;

test("constants", () => {
  assert.equal(MIN_EASE_CM, 8);
  assert.equal(BORDERLINE_BAND_CM, 1.0);
});

test("flat chest is doubled to a circumference", () => {
  assert.equal(chestCircumferenceCm(PLAIN_TEE, PLAIN_TEE.sizes[0]), 94);
  assert.equal(chestCircumferenceCm(PLAIN_TEE, PLAIN_TEE.sizes[4]), 110);
});

test("labels follow the written rule", () => {
  const cases = [
    [78, "below-XS"], [82.0, "below-XS"], [82.1, "XS"], [84, "XS"], [86.0, "XS"],
    [86.1, "S"], [88, "S"], [90.0, "S"], [92, "M"], [94.0, "M"], [94.1, "L"],
    [98.0, "L"], [100, "XL"], [102.0, "XL"], [102.1, "above-XL"], [110, "above-XL"],
  ];
  for (const [v, l] of cases) assert.equal(label(v), l, `bust ${v}`);
});

test("index runs -1 to 5", () => {
  assert.equal(sizeFromBust(78, PLAIN_TEE).index, -1);
  assert.equal(sizeFromBust(84, PLAIN_TEE).index, 0);
  assert.equal(sizeFromBust(100, PLAIN_TEE).index, 4);
  assert.equal(sizeFromBust(110, PLAIN_TEE).index, 5);
});

test("borderline flag and neighbour", () => {
  const b = (v) => sizeFromBust(v, PLAIN_TEE);
  assert.equal(b(84).borderline, false);
  assert.equal(b(85.0).borderline, true);
  assert.equal(b(85.0).neighbour, "S");
  assert.equal(b(86.0).neighbour, "S");
  assert.equal(b(86.1).borderline, true);
  assert.equal(b(86.1).neighbour, "XS");
  assert.equal(b(87.0).borderline, true);
  assert.equal(b(87.0).neighbour, "XS");
  assert.equal(b(87.1).borderline, false);
  assert.equal(b(82.0).borderline, true);
  assert.equal(b(82.0).neighbour, "XS");
  assert.equal(b(102.5).borderline, true);
  assert.equal(b(102.5).neighbour, "XL");
  assert.equal(b(104).borderline, false);
});

test("ease", () => {
  assert.equal(sizeFromBust(84, PLAIN_TEE).easeCm, 10);
  assert.equal(sizeFromBust(110, PLAIN_TEE).easeCm, null);
});

test("sizesAgree", () => {
  const r = (v) => sizeFromBust(v, PLAIN_TEE);
  assert.equal(sizesAgree(r(88), r(89)), "same");
  assert.equal(sizesAgree(r(85.5), r(86.8)), "adjacent-borderline");
  assert.equal(sizesAgree(r(84), r(88)), "disagree");
  assert.equal(sizesAgree(r(84), r(91)), "disagree");
});

test("refuses unconfirmed charts and bad input", () => {
  assert.throws(() => sizeFromBust(88, UNCONFIRMED_BOXY_TEE), /unconfirmed/);
  assert.throws(() => sizeFromBust(NaN, PLAIN_TEE));
});
