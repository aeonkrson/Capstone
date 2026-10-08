import { chestCircumferenceCm, MIN_EASE_CM, BORDERLINE_BAND_CM } from "./sizeFromTape.js";

export const PREFERENCES = ["regular", "loose", "oversize"];

// ASSUMED starting values; tune after the real-shirt measurement (Phase 1 blocker).
// Chest ease = garment chest circumference minus body chest, cm.
export const CHEST_EASE_WINDOWS = {
  regular: { min: MIN_EASE_CM, max: 16 },
  loose: { min: 16, max: 24 },
  oversize: { min: 24, max: 36 },
};
// Garment flat shoulder minus body shoulder, cm.
export const SHOULDER_DIFF_WINDOWS = {
  regular: { min: -1, max: 3 },
  loose: { min: 1, max: 5 },
  oversize: { min: 3, max: 9 },
};
// Chart backLength.midpoint (a placeholder) minus body torso, cm.
export const LENGTH_DIFF_WINDOWS = {
  regular: { min: 10, max: 20 },
  loose: { min: 10, max: 26 },
  oversize: { min: 10, max: 34 },
};

const EPS = 1e-9;

function assertChart(chart) {
  if (!chart || chart.status !== "collected" || !Array.isArray(chart.sizes)) {
    throw new Error(`Chart ${chart && chart.id} cannot be used for a size answer`);
  }
}

function assertPreference(preference) {
  if (!PREFERENCES.includes(preference)) throw new Error(`Unknown preference: ${preference}`);
}

/**
 * Recommend the smallest size whose chest ease reaches the preference minimum.
 * @param {number} chestCm - body chest circumference in cm
 * @param {"regular" | "loose" | "oversize"} preference - wanted fit
 * @param {object} chart - a collected chart
 * @returns {{ label: string | null, index: number | null, easeCm: number | null, borderline: boolean, neighbour: string | null, outOfRange: "above" | null }}
 */
export function recommendSize(chestCm, preference, chart) {
  assertChart(chart);
  assertPreference(preference);
  if (typeof chestCm !== "number" || !Number.isFinite(chestCm)) {
    throw new Error("chestCm must be a finite number");
  }
  const { min } = CHEST_EASE_WINDOWS[preference];
  const sizes = chart.sizes;
  const eases = sizes.map((s) => chestCircumferenceCm(chart, s) - chestCm);
  const index = eases.findIndex((e) => e + EPS >= min);
  if (index === -1) {
    return { label: null, index: null, easeCm: null, borderline: false, neighbour: null, outOfRange: "above" };
  }
  let borderline = false;
  let neighbour = null;
  if (eases[index] - min <= BORDERLINE_BAND_CM + EPS && index + 1 < sizes.length) {
    borderline = true;
    neighbour = sizes[index + 1].label;
  } else if (index > 0 && min - eases[index - 1] <= BORDERLINE_BAND_CM + EPS) {
    borderline = true;
    neighbour = sizes[index - 1].label;
  }
  return { label: sizes[index].label, index, easeCm: eases[index], borderline, neighbour, outOfRange: null };
}

/**
 * Recommended size for all three preferences at once.
 * @param {number} chestCm - body chest circumference in cm
 * @param {object} chart - a collected chart
 * @returns {{ regular: object, loose: object, oversize: object }}
 */
export function recommendAll(chestCm, chart) {
  return {
    regular: recommendSize(chestCm, "regular", chart),
    loose: recommendSize(chestCm, "loose", chart),
    oversize: recommendSize(chestCm, "oversize", chart),
  };
}

function area(valueCm, { min, max }) {
  if (valueCm + EPS < min) return { status: "tight", valueCm, diffCm: valueCm - min, borderline: false };
  if (valueCm - EPS > max) return { status: "loose", valueCm, diffCm: valueCm - max, borderline: false };
  const near = valueCm - min <= BORDERLINE_BAND_CM + EPS || max - valueCm <= BORDERLINE_BAND_CM + EPS;
  return { status: "ok", valueCm, diffCm: 0, borderline: near };
}

/**
 * Check how one size fits one body for a fit preference.
 * Reason codes and numbers only; the UI maps them to text.
 * @param {{ chart: object, sizeLabel: string, preference: string, body: { chestCm: number, shoulderCm: number, torsoCm: number } }} args
 * @returns {{ sizeLabel: string, preference: string, areas: { chest: object, shoulder: object, length: object }, verdict: "fits" | "borderline" | "too-small" | "too-large", recommended: object }}
 */
export function checkFit({ chart, sizeLabel, preference, body }) {
  assertChart(chart);
  assertPreference(preference);
  const size = chart.sizes.find((s) => s.label === sizeLabel);
  if (!size) throw new Error(`Unknown size: ${sizeLabel}`);
  const areas = {
    chest: area(chestCircumferenceCm(chart, size) - body.chestCm, CHEST_EASE_WINDOWS[preference]),
    shoulder: area(size.shoulder - body.shoulderCm, SHOULDER_DIFF_WINDOWS[preference]),
    length: area(size.backLength.midpoint - body.torsoCm, LENGTH_DIFF_WINDOWS[preference]),
  };
  const list = Object.values(areas);
  let verdict = "fits";
  if (list.some((a) => a.status === "tight")) verdict = "too-small";
  else if (list.some((a) => a.status === "loose")) verdict = "too-large";
  else if (list.some((a) => a.borderline)) verdict = "borderline";
  return { sizeLabel, preference, areas, verdict, recommended: recommendSize(body.chestCm, preference, chart) };
}
