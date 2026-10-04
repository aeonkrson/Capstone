export const HEIGHT_MIN_CM = 120; // cm, lowest accepted height
export const HEIGHT_MAX_CM = 220; // cm, highest accepted height

/**
 * Validate a typed height. One comma is read as a decimal point.
 * Returns reason codes only, never display text.
 * @param {string} input - raw text from the height field
 * @returns {import("./types.js").HeightResult}
 */
export function validateHeightCm(input) {
  const text = String(input === undefined || input === null ? "" : input).trim();
  if (text === "") return { ok: false, code: "empty" };
  const normalised = text.replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalised)) return { ok: false, code: "not-a-number" };
  const cm = Number(normalised);
  if (cm < HEIGHT_MIN_CM) return { ok: false, code: "too-low" };
  if (cm > HEIGHT_MAX_CM) return { ok: false, code: "too-high" };
  return { ok: true, cm };
}
