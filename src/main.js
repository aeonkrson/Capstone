import { initLocale, t, applyTranslations, formatNumber } from "./i18n/index.js";
import { createHeightForm } from "./ui/heightForm.js";

const locale = initLocale(navigator.language);
document.documentElement.lang = locale;
document.title = t("app.title");
applyTranslations(document);

const heightSectionEl = document.getElementById("height-section");
const heightFormEl = document.getElementById("height-form");
const heightInputEl = document.getElementById("height-input");
const heightErrorEl = document.getElementById("height-error");
const cameraSectionEl = document.getElementById("camera-section");
const cameraStatusEl = document.getElementById("camera-status");
const heightCurrentEl = document.getElementById("height-current");
const changeHeightBtn = document.getElementById("btn-change-height");

const required = [
  heightSectionEl, heightFormEl, heightInputEl, heightErrorEl,
  cameraSectionEl, cameraStatusEl, heightCurrentEl, changeHeightBtn,
];

if (required.some((el) => !el)) {
  console.error("Page markup is missing a required element.");
} else {
  // The typed height lives only here, in memory.
  let heightCm = null;

  const heightForm = createHeightForm({
    formEl: heightFormEl,
    inputEl: heightInputEl,
    errorEl: heightErrorEl,
    t,
    onValid(cm) {
      heightCm = cm;
      heightForm.hide();
      cameraSectionEl.removeAttribute("hidden");
      heightCurrentEl.textContent = t("height.current", { cm: formatNumber(heightCm) });
      cameraStatusEl.textContent = t("camera.status.stopped");
      // Plan 01-05 starts the camera here.
    },
  });

  changeHeightBtn.addEventListener("click", () => {
    cameraSectionEl.setAttribute("hidden", "");
    heightForm.show();
    heightForm.focus();
  });
}
