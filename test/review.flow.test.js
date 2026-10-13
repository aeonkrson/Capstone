import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, setProfileName, setMeasurement, applyReview, applyRescan } from "../src/core/profileState.js";
import { parseReviewInputs } from "../src/core/review.js";
import { checkFit } from "../src/core/fit.js";
import { CATALOG } from "../src/data/catalog.js";

const SCANNED = { shoulderCm: 41.5, chestCm: 92.3, waistCm: 80.1, torsoCm: 50.2, armCm: 58.7 };

function texts(overrides = {}) {
  const out = {};
  for (const key of Object.keys(SCANNED)) out[key] = String(SCANNED[key]);
  return { ...out, ...overrides };
}

test("flow: scan -> review edit -> profile -> fit check", () => {
  const parsed = parseReviewInputs(texts({ chestCm: "95" }));
  assert.equal(parsed.ok, true);
  const named = setProfileName(emptyState(), "Sari");
  assert.notEqual(named.ok, false);
  const { state, rejected } = applyReview(named, SCANNED, parsed.values);
  assert.deepEqual(rejected, []);
  assert.equal(state.sources.chestCm, "edited");
  for (const key of ["shoulderCm", "waistCm", "torsoCm", "armCm"]) assert.equal(state.sources[key], "scanned");
  const garment = CATALOG[0];
  const result = checkFit({ chart: garment.chart, sizeLabel: "M", preference: "regular", body: state.measurements });
  assert.ok(["fits", "borderline", "too-small", "too-large"].includes(result.verdict));
});

test("a review with torso emptied fails with code empty", () => {
  const parsed = parseReviewInputs(texts({ torsoCm: "" }));
  assert.equal(parsed.ok, false);
  assert.equal(parsed.errors.torsoCm, "empty");
});

test("flow: rescan replaces old body and the fit check uses the new one", () => {
  let old = setProfileName(emptyState(), "Sari");
  for (const [k, v] of Object.entries({ chestCm: 70, shoulderCm: 33, torsoCm: 40, waistCm: 60, armCm: 50 })) {
    old = setMeasurement(old, k, v);
  }
  const parsed = parseReviewInputs(texts({ waistCm: "" }));
  assert.equal(parsed.ok, true);
  const { state, cleared } = applyRescan(old, SCANNED, parsed.values);
  assert.deepEqual(cleared, ["waistCm"]);
  assert.equal(state.measurements.waistCm, null);
  assert.equal(state.measurements.chestCm, 92.3);
  const chart = CATALOG[0].chart;
  const expected = checkFit({ chart, sizeLabel: "M", preference: "regular",
    body: { chestCm: 92.3, shoulderCm: 41.5, torsoCm: 50.2 } });
  const actual = checkFit({ chart, sizeLabel: "M", preference: "regular", body: state.measurements });
  assert.deepEqual(actual, expected);
});
