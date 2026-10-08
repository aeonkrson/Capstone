import { test } from "node:test";
import assert from "node:assert/strict";
import { createStorage } from "../src/platform/storage.js";
import { emptyState, setProfileName, setMeasurement } from "../src/core/profileState.js";

function fake() {
  const map = new Map();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

const throwing = () => {
  const boom = () => { throw new Error("blocked"); };
  return { getItem: boom, setItem: boom, removeItem: boom };
};

test("saveState then loadState round-trips (simulated reload)", () => {
  const backing = fake();
  let s = setProfileName(emptyState(), "Sari");
  s = setMeasurement(s, "chestCm", 88);
  assert.equal(createStorage(backing).saveState(s), true);
  assert.deepEqual(createStorage(backing).loadState(), s);
});

test("loadState on empty store gives emptyState", () => {
  assert.deepEqual(createStorage(fake()).loadState(), emptyState());
});

test("invalid JSON and foreign data give emptyState", () => {
  const backing = fake();
  backing.setItem("sfs.state.v1", "{not json");
  assert.deepEqual(createStorage(backing).loadState(), emptyState());
  backing.setItem("sfs.state.v1", JSON.stringify({ version: 99, x: 1 }));
  assert.deepEqual(createStorage(backing).loadState(), emptyState());
});

test("throwing storage never throws out of the module", () => {
  const api = createStorage(throwing());
  assert.deepEqual(api.loadState(), emptyState());
  assert.equal(api.saveState(emptyState()), false);
  assert.equal(api.loadLocale(), null);
  assert.equal(api.saveLocale("id"), false);
  assert.doesNotThrow(() => api.clearAll());
});

test("saved data contains only the sanitised state", () => {
  const backing = fake();
  const dirty = { ...emptyState(), image: "data:image/png;base64,AAAA" };
  createStorage(backing).saveState(dirty);
  assert.ok(!backing.map.get("sfs.state.v1").includes("image"));
});

test("clearAll removes both keys", () => {
  const backing = fake();
  const api = createStorage(backing);
  api.saveState(setProfileName(emptyState(), "Sari"));
  api.saveLocale("id");
  assert.equal(backing.map.size, 2);
  api.clearAll();
  assert.equal(backing.map.size, 0);
  assert.deepEqual(api.loadState(), emptyState());
  assert.equal(api.loadLocale(), null);
});

test("saveLocale rejects unsupported and stores id", () => {
  const backing = fake();
  const api = createStorage(backing);
  assert.equal(api.saveLocale("fr"), false);
  assert.equal(api.loadLocale(), null);
  assert.equal(api.saveLocale("id"), true);
  assert.equal(backing.map.get("sfs.locale"), "id");
  assert.equal(api.loadLocale(), "id");
});

test("a tampered locale value loads as null", () => {
  const backing = fake();
  backing.setItem("sfs.locale", "<script>");
  assert.equal(createStorage(backing).loadLocale(), null);
});
