import { test } from "node:test";
import assert from "node:assert/strict";
import { REVIEW_KEYS, REQUIRED_REVIEW_KEYS, reviewRows, parseReviewInputs } from "../../src/core/review.js";
import { SCAN_KEYS } from "../../src/core/scan.js";

const scanned = { shoulderCm: 42.0, chestCm: 92.0, waistCm: 80.0, torsoCm: 50.0, armCm: 58.0 };

test("keys follow scan order and required keys", () => {
  assert.deepEqual(REVIEW_KEYS, SCAN_KEYS);
  assert.deepEqual(REQUIRED_REVIEW_KEYS, ["shoulderCm", "chestCm", "torsoCm"]);
});

test("unchanged values are all scanned, estimate flag on waist torso arm", () => {
  const rows = reviewRows(scanned, scanned);
  assert.deepEqual(rows.map((r) => r.key), SCAN_KEYS);
  assert.ok(rows.every((r) => r.source === "scanned"));
  assert.deepEqual(rows.filter((r) => r.estimate).map((r) => r.key), ["waistCm", "torsoCm", "armCm"]);
});

test("changed value is edited; 0.1 rounding keeps scanned", () => {
  const rows = reviewRows(scanned, { ...scanned, chestCm: 95, shoulderCm: 42.04 });
  assert.equal(rows.find((r) => r.key === "chestCm").source, "edited");
  assert.equal(rows.find((r) => r.key === "shoulderCm").source, "scanned");
});

test("missing scanned value", () => {
  const s = { ...scanned, armCm: null };
  const none = reviewRows(s, { ...s, armCm: null }).find((r) => r.key === "armCm");
  assert.equal(none.scannedCm, null);
  assert.equal(none.valueCm, null);
  assert.equal(none.source, null);
  const typed = reviewRows(s, { ...s, armCm: 60 }).find((r) => r.key === "armCm");
  assert.equal(typed.source, "edited");
});

test("parse valid inputs with comma and empty optionals", () => {
  const r = parseReviewInputs({ shoulderCm: "42,5", chestCm: "92", torsoCm: "50", waistCm: "", armCm: "" });
  assert.equal(r.ok, true);
  assert.equal(r.values.shoulderCm, 42.5);
  assert.equal(r.values.waistCm, null);
  assert.equal(r.values.armCm, null);
});

test("parse errors", () => {
  const ok = { shoulderCm: "42", chestCm: "92", torsoCm: "50", waistCm: "", armCm: "" };
  let r = parseReviewInputs({ ...ok, chestCm: "" });
  assert.equal(r.ok, false);
  assert.equal(r.errors.chestCm, "empty");
  r = parseReviewInputs({ ...ok, chestCm: "abc" });
  assert.equal(r.errors.chestCm, "not-a-number");
  r = parseReviewInputs({ ...ok, shoulderCm: "10" });
  assert.equal(r.errors.shoulderCm, "too-low");
  r = parseReviewInputs({ ...ok, waistCm: "500" });
  assert.equal(r.errors.waistCm, "too-high");
});

test("missing keys are treated as empty", () => {
  const r = parseReviewInputs({});
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ["chestCm", "shoulderCm", "torsoCm"]);
  assert.equal(r.values.waistCm, null);
});
