// Pure profile state: shape, sanitising, history. No browser globals, no clock.
import { BODY_FIELDS } from "./bodyMeasurements.js";
import { PREFERENCES } from "./fit.js";

export const HISTORY_LIMIT = 50;
const NAME_MAX = 40;
const TEXT_MAX = 80;
const STATE_VERSION = 1;

// State key -> BODY_FIELDS key
const FIELD_MAP = { chestCm: "chest", shoulderCm: "shoulder", torsoCm: "torso" };
const FIELD_KEYS = Object.keys(FIELD_MAP);
const HISTORY_FIELDS = ["garmentId", "garmentName", "size", "preference", "verdict", "at"];

export function emptyState() {
  return {
    version: STATE_VERSION,
    profile: null,
    measurements: { chestCm: null, shoulderCm: null, torsoCm: null },
    sources: { chestCm: null, shoulderCm: null, torsoCm: null },
    preference: "regular",
    history: [],
  };
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function own(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function inRange(stateKey, value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  const { min, max } = BODY_FIELDS[FIELD_MAP[stateKey]];
  return value >= min && value <= max;
}

function cloneState(state) {
  return {
    version: STATE_VERSION,
    profile: state.profile ? { name: state.profile.name } : null,
    measurements: { ...state.measurements },
    sources: { ...state.sources },
    preference: state.preference,
    history: state.history.map((entry) => ({ ...entry })),
  };
}

/**
 * Set the profile name (trimmed, 1 to 40 chars).
 * @param {object} state - current state
 * @param {string} name - raw name
 * @returns {object | { ok: false, code: "empty" | "too-long" }} new state or error
 */
export function setProfileName(state, name) {
  const text = String(name === undefined || name === null ? "" : name).trim();
  if (text === "") return { ok: false, code: "empty" };
  if (text.length > NAME_MAX) return { ok: false, code: "too-long" };
  const next = cloneState(state);
  next.profile = { name: text };
  return next;
}

/**
 * Set one measurement. Out-of-range or unknown fields leave the state unchanged.
 * @param {object} state - current state
 * @param {"chestCm" | "shoulderCm" | "torsoCm"} key - field
 * @param {number} cm - value in cm
 * @returns {object} new state
 */
export function setMeasurement(state, key, cm) {
  const next = cloneState(state);
  if (!FIELD_KEYS.includes(key) || !inRange(key, cm)) return next;
  next.sources[key] = state.measurements[key] === null ? "typed" : "edited";
  next.measurements[key] = cm;
  return next;
}

/**
 * Prepend a fit-check entry; history is capped at HISTORY_LIMIT, newest first.
 * @param {object} state - current state
 * @param {object} entry - { garmentId, garmentName, size, preference, verdict, at }
 * @returns {object} new state
 */
export function addHistoryEntry(state, entry) {
  const next = cloneState(state);
  const clean = {};
  for (const field of HISTORY_FIELDS) clean[field] = entry[field];
  next.history = [clean, ...next.history].slice(0, HISTORY_LIMIT);
  return next;
}

function sanitiseEntry(raw) {
  if (!isObject(raw)) return null;
  const out = {};
  for (const field of HISTORY_FIELDS) {
    if (!own(raw, field) || typeof raw[field] !== "string" || raw[field] === "") return null;
    out[field] = raw[field].slice(0, TEXT_MAX);
  }
  return out;
}

/**
 * Rebuild any value into a safe state, field by field. Garbage gives emptyState().
 * @param {unknown} raw - parsed stored data
 * @returns {object} safe state
 */
export function sanitiseState(raw) {
  const out = emptyState();
  if (!isObject(raw) || raw.version !== STATE_VERSION) return out;

  if (isObject(raw.profile) && typeof raw.profile.name === "string") {
    const name = raw.profile.name.trim().slice(0, NAME_MAX);
    if (name !== "") out.profile = { name };
  }

  const measurements = isObject(raw.measurements) ? raw.measurements : {};
  const sources = isObject(raw.sources) ? raw.sources : {};
  for (const key of FIELD_KEYS) {
    if (own(measurements, key) && inRange(key, measurements[key])) {
      out.measurements[key] = measurements[key];
      out.sources[key] = sources[key] === "edited" ? "edited" : "typed";
    }
  }

  if (typeof raw.preference === "string" && PREFERENCES.includes(raw.preference)) {
    out.preference = raw.preference;
  }

  if (Array.isArray(raw.history)) {
    for (const item of raw.history.slice(0, HISTORY_LIMIT)) {
      const entry = sanitiseEntry(item);
      if (entry) out.history.push(entry);
    }
  }
  return out;
}
