// Review of scan numbers: five editable cm values with scanned/edited markers. Nothing image-based.
import { BODY_FIELDS } from "../core/bodyMeasurements.js";
import { REVIEW_KEYS, reviewRows, parseReviewInputs } from "../core/review.js";

// State key -> element suffix (same as the BODY_FIELDS key)
const FIELD_OF = {
  shoulderCm: "shoulder", chestCm: "chest", waistCm: "waist", torsoCm: "torso", armCm: "arm",
};

export function createReviewView({ doc, t, formatNumber, onSave }) {
  const section = doc.getElementById("review-section");
  const form = doc.getElementById("review-form");
  const nameRow = doc.getElementById("review-name-row");
  const nameInput = doc.getElementById("review-name");
  const nameError = doc.getElementById("review-name-error");
  const statusEl = doc.getElementById("review-status");
  const inputs = {};
  const markers = {};
  const errors = {};
  for (const key of REVIEW_KEYS) {
    const f = FIELD_OF[key];
    inputs[key] = doc.getElementById("review-" + f);
    markers[key] = doc.getElementById("review-" + f + "-marker");
    errors[key] = doc.getElementById("review-" + f + "-error");
  }

  // Scanned numbers from the last show(); in memory only.
  let scanned = {};
  let shown = false;
  let savedShown = false;

  function showError(el, input, text) {
    if (el) {
      el.textContent = text;
      el.removeAttribute("hidden");
    }
    if (input) input.setAttribute("aria-invalid", "true");
  }

  function clearError(el, input) {
    if (el) {
      el.textContent = "";
      el.setAttribute("hidden", "");
    }
    if (input) input.removeAttribute("aria-invalid");
  }

  function clearAllErrors() {
    for (const key of REVIEW_KEYS) clearError(errors[key], inputs[key]);
    clearError(nameError, nameInput);
  }

  function currentTexts() {
    const texts = {};
    for (const key of REVIEW_KEYS) texts[key] = inputs[key] ? inputs[key].value : "";
    return texts;
  }

  function renderMarkers() {
    const result = parseReviewInputs(currentTexts());
    const rows = reviewRows(scanned, result.values);
    for (const row of rows) {
      const el = markers[row.key];
      if (!el) continue;
      const source = t("review.source." + (row.source ?? "missing"));
      el.textContent = t(row.estimate ? "review.marker-estimate" : "review.marker", { source });
    }
  }

  function renderStatus() {
    if (statusEl) statusEl.textContent = savedShown ? t("review.saved") : "";
  }

  if (form) {
    form.addEventListener("input", () => {
      savedShown = false;
      renderStatus();
      renderMarkers();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      savedShown = false;
      renderStatus();
      clearAllErrors();
      const parsed = parseReviewInputs(currentTexts());
      if (!parsed.ok) {
        let firstBad = null;
        for (const key of REVIEW_KEYS) {
          const code = parsed.errors[key];
          if (!code) continue;
          const { min, max } = BODY_FIELDS[FIELD_OF[key]];
          showError(errors[key], inputs[key], t("body.error." + code, { min, max }));
          if (!firstBad) firstBad = inputs[key];
        }
        if (firstBad && typeof firstBad.focus === "function") firstBad.focus();
        return;
      }
      const result = onSave({ name: nameInput ? nameInput.value : "", scanned, values: parsed.values });
      if (result && result.ok === false) {
        const code = result.code === "name-too-long" ? "too-long" : "empty";
        showError(nameError, nameInput, t("profile.name.error." + code));
        if (nameInput && typeof nameInput.focus === "function") nameInput.focus();
        return;
      }
      savedShown = true;
      renderStatus();
    });
  }

  function show({ scanned: next, hasProfile }) {
    scanned = next && typeof next === "object" ? { ...next } : {};
    savedShown = false;
    clearAllErrors();
    renderStatus();
    for (const key of REVIEW_KEYS) {
      const value = scanned[key];
      if (inputs[key]) inputs[key].value = typeof value === "number" && Number.isFinite(value) ? formatNumber(value) : "";
    }
    if (nameInput) nameInput.value = "";
    if (nameRow) {
      if (hasProfile) nameRow.setAttribute("hidden", "");
      else nameRow.removeAttribute("hidden");
    }
    renderMarkers();
    if (section) {
      section.removeAttribute("hidden");
      if (typeof section.scrollIntoView === "function") section.scrollIntoView();
    }
    shown = true;
  }

  function hide() {
    if (section) section.setAttribute("hidden", "");
    shown = false;
  }

  function refresh() {
    renderMarkers();
    renderStatus();
  }

  return { show, hide, refresh, isShown: () => shown };
}
