import { BODY_FIELDS, validateBodyMeasurement } from "../core/bodyMeasurements.js";

// Form field key -> state key
const STATE_KEYS = { chest: "chestCm", shoulder: "shoulderCm", torso: "torsoCm" };
const FIELD_NAMES = Object.keys(STATE_KEYS);

export function createProfileView({ doc, t, formatNumber, onSaveName, onSaveMeasurements }) {
  const profileForm = doc.getElementById("profile-form");
  const nameInput = doc.getElementById("profile-name");
  const nameError = doc.getElementById("profile-error");
  const currentEl = doc.getElementById("profile-current");
  const bodySection = doc.getElementById("body-section");
  const bodyForm = doc.getElementById("body-form");
  const bodyStatus = doc.getElementById("body-status");
  const sourcesEl = doc.getElementById("body-sources");
  const inputs = {};
  const errors = {};
  for (const name of FIELD_NAMES) {
    inputs[name] = doc.getElementById("body-" + name);
    errors[name] = doc.getElementById("body-" + name + "-error");
  }

  function showError(el, input, text) {
    el.textContent = text;
    el.removeAttribute("hidden");
    input.setAttribute("aria-invalid", "true");
  }

  function clearError(el, input) {
    el.textContent = "";
    el.setAttribute("hidden", "");
    input.removeAttribute("aria-invalid");
  }

  function clearBodyErrors() {
    for (const name of FIELD_NAMES) clearError(errors[name], inputs[name]);
  }

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = onSaveName(nameInput.value);
    if (result && result.ok === false) {
      showError(nameError, nameInput, t("profile.name.error." + result.code));
      nameInput.focus();
      return;
    }
    clearError(nameError, nameInput);
  });

  bodyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    bodyStatus.textContent = "";
    const values = {};
    let firstBad = null;
    for (const name of FIELD_NAMES) {
      const result = validateBodyMeasurement(name, inputs[name].value);
      if (result.ok) {
        values[name] = result.cm;
        clearError(errors[name], inputs[name]);
      } else {
        const { min, max } = BODY_FIELDS[name];
        showError(errors[name], inputs[name], t("body.error." + result.code, { min, max }));
        if (!firstBad) firstBad = inputs[name];
      }
    }
    // All three must validate or none is saved.
    if (firstBad) {
      firstBad.focus();
      return;
    }
    onSaveMeasurements({
      chestCm: values.chest,
      shoulderCm: values.shoulder,
      torsoCm: values.torso,
    });
    bodyStatus.textContent = t("body.saved");
  });

  function render(state) {
    const hasProfile = Boolean(state.profile);
    if (hasProfile) bodySection.removeAttribute("hidden");
    else bodySection.setAttribute("hidden", "");

    currentEl.textContent = hasProfile ? t("profile.current", { name: state.profile.name }) : "";
    if (hasProfile) nameInput.value = state.profile.name;

    for (const name of FIELD_NAMES) {
      const value = state.measurements[STATE_KEYS[name]];
      inputs[name].value = value === null ? "" : formatNumber(value);
    }

    sourcesEl.textContent = "";
    for (const name of FIELD_NAMES) {
      const key = STATE_KEYS[name];
      const value = state.measurements[key];
      if (value === null) continue;
      const li = doc.createElement("li");
      li.textContent = t("body.source.line", {
        label: t("body." + name + ".label"),
        value: formatNumber(value),
        source: t("body.source." + (state.sources[key] === "edited" ? "edited" : "typed")),
      });
      sourcesEl.appendChild(li);
    }
  }

  function reset() {
    nameInput.value = "";
    clearError(nameError, nameInput);
    bodyStatus.textContent = "";
    clearBodyErrors();
    for (const name of FIELD_NAMES) inputs[name].value = "";
  }

  return { render, reset };
}
