import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, setProfileName, setMeasurement, addHistoryEntry, sanitiseState } from "../src/core/profileState.js";
import { checkFit, PREFERENCES } from "../src/core/fit.js";
import { CATALOG, CUTS } from "../src/data/catalog.js";
import en from "../src/i18n/en.js";
import id from "../src/i18n/id.js";

const PLAIN = CATALOG[0];

function filledState() {
  let state = setProfileName(emptyState(), "Sari");
  state = setMeasurement(state, "chestCm", 80);
  state = setMeasurement(state, "shoulderCm", 38);
  state = setMeasurement(state, "torsoCm", 42);
  return state;
}

test("flow: profile, measurements, fit check, history survives a JSON round trip", () => {
  const state = filledState();
  const result = checkFit({ chart: PLAIN.chart, sizeLabel: "M", preference: "regular", body: state.measurements });
  assert.ok(["fits", "borderline", "too-small", "too-large"].includes(result.verdict));
  const next = addHistoryEntry(state, {
    garmentId: PLAIN.id,
    garmentName: PLAIN.name,
    size: "M",
    preference: "regular",
    verdict: result.verdict,
    at: "2026-10-08T00:00:00.000Z",
  });
  const restored = sanitiseState(JSON.parse(JSON.stringify(next)));
  assert.equal(restored.history.length, 1);
  assert.equal(restored.history[0].verdict, result.verdict);
  assert.equal(restored.history[0].size, "M");
  assert.equal(restored.profile.name, "Sari");
});

test("a corrected measurement is used by the next check", () => {
  const state = filledState();
  const before = checkFit({ chart: PLAIN.chart, sizeLabel: "XS", preference: "regular", body: state.measurements });
  assert.equal(before.areas.chest.status, "ok");
  const corrected = setMeasurement(state, "chestCm", 90);
  assert.equal(corrected.sources.chestCm, "edited");
  const after = checkFit({ chart: PLAIN.chart, sizeLabel: "XS", preference: "regular", body: corrected.measurements });
  assert.equal(after.verdict, "too-small");
  assert.equal(after.areas.chest.status, "tight");
});

test("every code the engine can emit has an i18n key in en and id", () => {
  const codes = [
    ...["fits", "borderline", "too-small", "too-large"].map((v) => "verdict." + v),
    ...["tight", "ok", "loose"].map((s) => "status." + s),
    ...["chest", "shoulder", "length"].map((a) => "area." + a),
    ...PREFERENCES.map((p) => "fit.pref." + p),
    ...CUTS.map((c) => "cut." + c),
  ];
  for (const dict of [en, id]) {
    for (const key of codes) assert.ok(typeof dict[key] === "string" && dict[key] !== "", `missing ${key}`);
  }
  for (const garment of CATALOG) assert.ok(CUTS.includes(garment.cut));
});
