import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState, sanitiseState, setProfileName, setMeasurement, addHistoryEntry, HISTORY_LIMIT,
  applyScan, ESTIMATE_KEYS, MEASUREMENT_KEYS,
} from "../src/core/profileState.js";

const entry = (n = 1) => ({
  garmentId: "plain-white-tee", garmentName: "Plain White Tee", size: "M",
  preference: "regular", verdict: "fits", at: `2026-10-0${n}T10:00:00.000Z`,
});

test("emptyState shape", () => {
  assert.deepEqual(emptyState(), {
    version: 1,
    profile: null,
    measurements: { chestCm: null, shoulderCm: null, torsoCm: null, waistCm: null, armCm: null },
    sources: { chestCm: null, shoulderCm: null, torsoCm: null, waistCm: null, armCm: null },
    preference: "regular",
    history: [],
  });
});

test("setProfileName trims, validates and never mutates", () => {
  const s = emptyState();
  const next = setProfileName(s, "  Sari ");
  assert.deepEqual(next.profile, { name: "Sari" });
  assert.equal(s.profile, null);
  assert.deepEqual(setProfileName(s, "   "), { ok: false, code: "empty" });
  assert.deepEqual(setProfileName(s, "x".repeat(41)), { ok: false, code: "too-long" });
  assert.equal(setProfileName(s, "x".repeat(40)).profile.name.length, 40);
});

test("setMeasurement marks typed then edited", () => {
  const s1 = setMeasurement(emptyState(), "chestCm", 86);
  assert.equal(s1.measurements.chestCm, 86);
  assert.equal(s1.sources.chestCm, "typed");
  const s2 = setMeasurement(s1, "chestCm", 88);
  assert.equal(s2.sources.chestCm, "edited");
  assert.equal(s1.measurements.chestCm, 86);
});

test("setMeasurement ignores out-of-range and unknown fields", () => {
  const s = emptyState();
  assert.deepEqual(setMeasurement(s, "chestCm", 500), s);
  assert.deepEqual(setMeasurement(s, "chestCm", "86"), s);
  assert.deepEqual(setMeasurement(s, "__proto__", 80), s);
});

test("addHistoryEntry prepends and caps", () => {
  let s = addHistoryEntry(emptyState(), entry(1));
  s = addHistoryEntry(s, entry(2));
  assert.equal(s.history[0].at, entry(2).at);
  for (let i = 0; i < 60; i++) s = addHistoryEntry(s, entry(3));
  assert.equal(s.history.length, HISTORY_LIMIT);
});

test("sanitiseState returns empty for garbage", () => {
  for (const bad of [null, undefined, 5, "x", [], {}, { version: 2 }, { version: "1" }]) {
    assert.deepEqual(sanitiseState(bad), emptyState());
  }
});

test("sanitiseState round-trips a valid state", () => {
  let s = setProfileName(emptyState(), "Sari");
  s = setMeasurement(s, "chestCm", 90);
  s = setMeasurement(s, "chestCm", 91);
  s = addHistoryEntry(s, entry());
  assert.deepEqual(sanitiseState(JSON.parse(JSON.stringify(s))), s);
});

test("sanitiseState nulls out-of-range numbers, fixes preference, drops bad history", () => {
  const out = sanitiseState({
    version: 1,
    profile: { name: "A" },
    measurements: { chestCm: 9999, shoulderCm: "40", torsoCm: 50 },
    sources: { torsoCm: "edited" },
    preference: "baggy",
    history: [entry(), { garmentId: 5 }, null, "x", { ...entry(), size: undefined }],
  });
  assert.equal(out.measurements.chestCm, null);
  assert.equal(out.measurements.shoulderCm, null);
  assert.equal(out.measurements.torsoCm, 50);
  assert.equal(out.sources.torsoCm, "edited");
  assert.equal(out.preference, "regular");
  assert.equal(out.history.length, 1);
});

test("sanitiseState truncates strings and caps a huge history", () => {
  const long = { ...entry(), garmentName: "n".repeat(500) };
  const out = sanitiseState({
    version: 1, profile: { name: "p".repeat(500) },
    history: Array.from({ length: 1000 }, () => long),
  });
  assert.equal(out.profile.name.length, 40);
  assert.equal(out.history.length, HISTORY_LIMIT);
  assert.equal(out.history[0].garmentName.length, 80);
});

test("sanitiseState ignores hostile keys and extra fields", () => {
  const raw = JSON.parse(
    '{"version":1,"__proto__":{"polluted":true},"extra":1,"measurements":{"__proto__":{"chestCm":80},"constructor":1},"history":[{"garmentId":"a","garmentName":"b","size":"M","preference":"regular","verdict":"fits","at":"x","__proto__":{"evil":1},"image":"data:..."}]}'
  );
  const out = sanitiseState(raw);
  assert.equal(out.extra, undefined);
  assert.equal(out.polluted, undefined);
  assert.equal(out.measurements.chestCm, null);
  assert.equal(out.history[0].image, undefined);
  assert.equal(out.history[0].evil, undefined);
  assert.equal({}.polluted, undefined);
});

const FULL = { shoulderCm: 40, chestCm: 90, waistCm: 80, torsoCm: 50, armCm: 60 };

test("key lists", () => {
  assert.deepEqual(ESTIMATE_KEYS, ["waistCm", "torsoCm", "armCm"]);
  assert.deepEqual(MEASUREMENT_KEYS, ["chestCm", "shoulderCm", "torsoCm", "waistCm", "armCm"]);
});

test("applyScan sets all five as scanned without mutating input", () => {
  const s = emptyState();
  const r = applyScan(s, FULL);
  for (const k of MEASUREMENT_KEYS) {
    assert.equal(r.state.measurements[k], FULL[k]);
    assert.equal(r.state.sources[k], "scanned");
  }
  assert.equal(r.applied.length, 5);
  assert.deepEqual(r.rejected, []);
  assert.deepEqual(s, emptyState());
});

test("applyScan rejects null and out-of-range, keeps old values", () => {
  let s = setMeasurement(emptyState(), "waistCm", 70);
  const r = applyScan(s, { ...FULL, armCm: null, waistCm: 200 });
  assert.deepEqual(r.rejected.sort(), ["armCm", "waistCm"]);
  assert.equal(r.applied.length, 3);
  assert.equal(r.state.measurements.waistCm, 70);
  assert.equal(r.state.measurements.armCm, null);
  assert.equal(r.state.measurements.chestCm, 90);
});

test("applyScan replaces typed values; later edit marks edited", () => {
  let s = setMeasurement(emptyState(), "chestCm", 85);
  s = applyScan(s, FULL).state;
  assert.equal(s.measurements.chestCm, 90);
  assert.equal(s.sources.chestCm, "scanned");
  s = setMeasurement(s, "chestCm", 91);
  assert.equal(s.sources.chestCm, "edited");
});

test("applyScan rounds to 0.1 and ignores unknown keys", () => {
  const r = applyScan(emptyState(), { chestCm: 90, shoulderCm: 38.27, bogus: 5, __proto__: { x: 1 } });
  assert.equal(r.state.measurements.shoulderCm, 38.3);
  assert.equal(r.state.measurements.bogus, undefined);
});

test("sanitiseState keeps scanned, loads old states, fixes bogus source", () => {
  const s = applyScan(emptyState(), FULL).state;
  assert.deepEqual(sanitiseState(JSON.parse(JSON.stringify(s))), s);
  const old = sanitiseState({
    version: 1, profile: { name: "A" },
    measurements: { chestCm: 90, shoulderCm: 40, torsoCm: 50 },
    sources: { chestCm: "bogus", shoulderCm: "typed", torsoCm: "edited" },
  });
  assert.equal(old.measurements.waistCm, null);
  assert.equal(old.measurements.armCm, null);
  assert.equal(old.sources.chestCm, "typed");
});
