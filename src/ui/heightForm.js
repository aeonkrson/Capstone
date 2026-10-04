import { validateHeightCm, HEIGHT_MIN_CM, HEIGHT_MAX_CM } from "../core/height.js";

export function createHeightForm({ formEl, inputEl, errorEl, t, onValid }) {
  const sectionEl = formEl.closest("section");

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    const result = validateHeightCm(inputEl.value);
    if (!result.ok) {
      errorEl.textContent = t("height.error." + result.code, { min: HEIGHT_MIN_CM, max: HEIGHT_MAX_CM });
      errorEl.removeAttribute("hidden");
      inputEl.setAttribute("aria-invalid", "true");
      inputEl.focus();
      return;
    }
    errorEl.textContent = "";
    errorEl.setAttribute("hidden", "");
    inputEl.removeAttribute("aria-invalid");
    onValid(result.cm);
  });

  return {
    show() {
      if (sectionEl) sectionEl.removeAttribute("hidden");
    },
    hide() {
      if (sectionEl) sectionEl.setAttribute("hidden", "");
    },
    focus() {
      inputEl.focus();
    },
  };
}
