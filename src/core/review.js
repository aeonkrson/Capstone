// Pure review model: rows with scanned/edited source and estimate flag, typed input parsing. No browser globals.
import { SCAN_KEYS, ESTIMATE_KEYS } from "./scan.js";
import { validateBodyMeasurement } from "./bodyMeasurements.js";

export const REVIEW_KEYS = SCAN_KEYS;
// The fit check needs these three; waist and arm may stay empty.
export const REQUIRED_REVIEW_KEYS = ["shoulderCm", "chestCm", "torsoCm"];

// State key -> BODY_FIELDS key
const FIELD_OF = {
  shoulderCm: "shoulder", chestCm: "chest", waistCm: "waist", torsoCm: "torso", armCm: "arm",
};

const round1 = (x) => Math.round(x * 10) / 10;
const isNum = (x) => typeof x === "number" && Number.isFinite(x);

/**
 * Build review rows in REVIEW_KEYS order.
 * @param {object} scanned - state key -> scanned cm or null
 * @param {object} values - state key -> current (possibly edited) cm or null
 * @returns {{ key: string, scannedCm: number | null, valueCm: number | null,
 *   source: "scanned" | "edited" | null, estimate: boolean }[]} rows
 */
export function reviewRows(scanned, values) {
  const s = scanned || {};
  const v = values || {};
  return REVIEW_KEYS.map((key) => {
    const scannedCm = isNum(s[key]) ? s[key] : null;
    const valueCm = isNum(v[key]) ? v[key] : null;
    let source = null;
    if (valueCm !== null) {
      source = scannedCm !== null && round1(valueCm) === round1(scannedCm) ? "scanned" : "edited";
    }
    return { key, scannedCm, valueCm, source, estimate: ESTIMATE_KEYS.includes(key) };
  });
}

/**
 * Parse typed review inputs. Required fields must be valid; optional fields may be empty.
 * @param {object} texts - state key -> raw string (missing = empty)
 * @returns {{ ok: true, values: object } | { ok: false, values: object, errors: object }} result
 */
export function parseReviewInputs(texts) {
  const input = texts && typeof texts === "object" ? texts : {};
  const values = {};
  const errors = {};
  for (const key of REVIEW_KEYS) {
    const raw = Object.prototype.hasOwnProperty.call(input, key) ? input[key] : "";
    const result = validateBodyMeasurement(FIELD_OF[key], raw);
    if (result.ok) {
      values[key] = result.cm;
    } else {
      values[key] = null;
      if (result.code !== "empty" || REQUIRED_REVIEW_KEYS.includes(key)) errors[key] = result.code;
    }
  }
  return Object.keys(errors).length === 0 ? { ok: true, values } : { ok: false, values, errors };
}
