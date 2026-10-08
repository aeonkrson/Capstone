// Typed body measurements for manual entry. Reason codes only, never display text.

export const BODY_FIELDS = {
  chest: { min: 60, max: 160 }, // cm, body bust circumference
  shoulder: { min: 25, max: 60 }, // cm, body shoulder width
  torso: { min: 30, max: 70 }, // cm, neck base to hip bone
};

/**
 * Validate a typed body measurement. One comma is read as a decimal point.
 * @param {"chest" | "shoulder" | "torso"} key - which field is being validated
 * @param {string} input - raw text from the field
 * @returns {{ ok: true, cm: number } | { ok: false, code: "empty" | "not-a-number" | "too-low" | "too-high" }}
 */
export function validateBodyMeasurement(key, input) {
  if (!Object.prototype.hasOwnProperty.call(BODY_FIELDS, key)) {
    throw new Error(`Unknown body field: ${key}`);
  }
  const { min, max } = BODY_FIELDS[key];
  const text = String(input === undefined || input === null ? "" : input).trim();
  if (text === "") return { ok: false, code: "empty" };
  const normalised = text.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalised)) return { ok: false, code: "not-a-number" };
  const cm = Number(normalised);
  if (!Number.isFinite(cm)) return { ok: false, code: "not-a-number" };
  if (cm < min) return { ok: false, code: "too-low" };
  if (cm > max) return { ok: false, code: "too-high" };
  return { ok: true, cm };
}
