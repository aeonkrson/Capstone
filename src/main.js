import { initLocale, t, applyTranslations, formatNumber } from "./i18n/index.js";
import { createHeightForm } from "./ui/heightForm.js";
import { createCamera } from "./platform/camera.js";
import { createFrameLoop } from "./platform/frameLoop.js";
import { createDebugView } from "./ui/debugView.js";

const locale = initLocale(navigator.language);
document.documentElement.lang = locale;
document.title = t("app.title");
applyTranslations(document);

// Developer switches, read once at startup.
const params = new URLSearchParams(window.location.search);
const flags = {
  debug: params.get("debug") === "1",
  model: params.get("model") === "heavy" ? "heavy" : "full",
  camera: params.get("camera") === "rear" ? "rear" : "front",
  delegate: params.get("delegate") === "gpu" ? "GPU" : "CPU",
};
const facingMode = flags.camera === "rear" ? "environment" : "user";

const heightSectionEl = document.getElementById("height-section");
const heightFormEl = document.getElementById("height-form");
const heightInputEl = document.getElementById("height-input");
const heightErrorEl = document.getElementById("height-error");
const cameraSectionEl = document.getElementById("camera-section");
const cameraStatusEl = document.getElementById("camera-status");
const heightCurrentEl = document.getElementById("height-current");
const changeHeightBtn = document.getElementById("btn-change-height");
const webcamElement = document.getElementById("webcam");
const viewCanvasEl = document.getElementById("view-canvas");
const cameraErrorEl = document.getElementById("camera-error");
const cameraErrorTitleEl = document.getElementById("camera-error-title");
const cameraErrorMessageEl = document.getElementById("camera-error-message");
const retryBtn = document.getElementById("btn-camera-retry");
const startBtn = document.getElementById("btn-camera-start");
const stopBtn = document.getElementById("btn-camera-stop");
const debugEngineEl = document.getElementById("debug-engine");

const required = [
  heightSectionEl, heightFormEl, heightInputEl, heightErrorEl,
  cameraSectionEl, cameraStatusEl, heightCurrentEl, changeHeightBtn,
  webcamElement, viewCanvasEl, cameraErrorEl, cameraErrorTitleEl, cameraErrorMessageEl,
  retryBtn, startBtn, stopBtn,
];

if (required.some((el) => !el)) {
  console.error("Page markup is missing a required element.");
} else {
  // The typed height lives only here, in memory.
  let heightCm = null;
  let starting = false;
  let lastStatus = "";

  const debugView = createDebugView({ canvasEl: viewCanvasEl, engineListEl: debugEngineEl, t });
  debugView.setOptions({ mirror: flags.camera !== "rear" });

  function setStatus(text) {
    if (text === lastStatus) return;
    lastStatus = text;
    cameraStatusEl.textContent = text;
  }

  const camera = createCamera({ videoEl: webcamElement });

  const frameLoop = createFrameLoop({
    videoEl: webcamElement,
    onFrame() {
      debugView.render({ videoEl: webcamElement, obs: null });
    },
  });

  function setCameraControls(running) {
    if (running) {
      stopBtn.removeAttribute("hidden");
      startBtn.setAttribute("hidden", "");
    } else {
      startBtn.removeAttribute("hidden");
      stopBtn.setAttribute("hidden", "");
    }
  }

  async function startCamera() {
    if (starting) return;
    starting = true;
    try {
      cameraErrorEl.setAttribute("hidden", "");
      startBtn.setAttribute("hidden", "");
      stopBtn.setAttribute("hidden", "");
      setStatus(t("camera.status.starting"));
      const result = await camera.start({ facingMode });
      if (!result.ok) {
        cameraErrorTitleEl.textContent = t("camera.error.title");
        cameraErrorMessageEl.textContent = t("camera.error." + result.code);
        cameraErrorEl.removeAttribute("hidden");
        setStatus(t("camera.status.stopped"));
        setCameraControls(false);
        return;
      }
      frameLoop.start();
      setStatus(t("camera.status.searching"));
      setCameraControls(true);
    } finally {
      starting = false;
    }
  }

  function stopCamera() {
    frameLoop.stop();
    camera.stop();
    setStatus(t("camera.status.stopped"));
    setCameraControls(false);
  }

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
      setStatus(t("camera.status.stopped"));
      startCamera();
    },
  });

  startBtn.addEventListener("click", () => { startCamera(); });
  retryBtn.addEventListener("click", () => { startCamera(); });
  stopBtn.addEventListener("click", stopCamera);

  changeHeightBtn.addEventListener("click", () => {
    stopCamera();
    cameraSectionEl.setAttribute("hidden", "");
    heightForm.show();
    heightForm.focus();
  });

  // The camera never restarts by itself; the user presses Start camera.
  window.addEventListener("pagehide", stopCamera);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") stopCamera();
  });
}
