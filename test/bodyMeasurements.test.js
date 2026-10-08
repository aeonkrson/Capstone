import { test } from "node:test";
import assert from "node:assert/strict";
import { validateBodyMeasurement, BODY_FIELDS } from "../src/core/bodyMeasurements.js";
import { CATALOG, CUTS } from "../src/data/catalog.js";
import { PLAIN_TEE } from "../src/data/colourboxCharts.js";

test("comma is read as a decimal point", () => {
  assert.deepEqual(validateBodyMeasurement("chest", "86,5"), { ok: true, cm: 86.5 });
});

test("reason codes", () => {
  assert.deepEqual(validateBodyMeasurement("chest", ""), { ok: false, code: "empty" });
  assert.deepEqual(validateBodyMeasurement("chest", "  "), { ok: false, code: "empty" });
  assert.deepEqual(validateBodyMeasurement("chest", undefined), { ok: false, code: "empty" });
  assert.deepEqual(validateBodyMeasurement("chest", "abc"), { ok: false, code: "not-a-number" });
  assert.deepEqual(validateBodyMeasurement("chest", "1,2,3"), { ok: false, code: "not-a-number" });
  assert.deepEqual(validateBodyMeasurement("chest", "-5"), { ok: false, code: "not-a-number" });
  assert.deepEqual(validateBodyMeasurement("chest", "20"), { ok: false, code: "too-low" });
  assert.deepEqual(validateBodyMeasurement("chest", "300"), { ok: false, code: "too-high" });
});

test("ranges are inclusive and exported", () => {
  assert.deepEqual(BODY_FIELDS, {
    chest: { min: 60, max: 160 },
    shoulder: { min: 25, max: 60 },
    torso: { min: 30, max: 70 },
  });
  for (const [key, { min, max }] of Object.entries(BODY_FIELDS)) {
    assert.equal(validateBodyMeasurement(key, String(min)).ok, true);
    assert.equal(validateBodyMeasurement(key, String(max)).ok, true);
    assert.equal(validateBodyMeasurement(key, String(min - 1)).code, "too-low");
    assert.equal(validateBodyMeasurement(key, String(max + 1)).code, "too-high");
  }
});

test("unknown key throws", () => {
  assert.throws(() => validateBodyMeasurement("waist", "70"), Error);
});

test("catalog lists only the plain white tee", () => {
  assert.equal(CATALOG.length, 1);
  assert.equal(CATALOG[0].id, "colourbox-plain-white-tee");
  assert.equal(CATALOG[0].cut, "regular");
  assert.equal(CATALOG[0].chart, PLAIN_TEE);
  assert.ok(CATALOG.every((e) => e.chart.status === "collected"));
  assert.deepEqual(CUTS, ["regular", "loose", "oversize"]);
});
