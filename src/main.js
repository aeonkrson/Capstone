import { initLocale, t, applyTranslations, formatNumber } from "./i18n/index.js";
import { createHeightForm } from "./ui/heightForm.js";
import { createCamera } from "./platform/camera.js";
import { createFrameLoop, nextVideoFrame } from "./platform/frameLoop.js";
import { createDebugView } from "./ui/debugView.js";
import { createPose } from "./platform/pose.js";
import { measureView, bustCircumferenceCm } from "./core/measure.js";
import { runBurst, CAPTURE_DELAY_MS } from "./app/burst.js";
import { createScanSession } from "./app/scanSession.js";
import { createScanView } from "./ui/scanView.js";
import { createTiltSensor } from "./platform/tilt.js";
import * as storage from "./platform/storage.js";
import { initFitApp } from "./app/fitApp.js";
import { createGuidedScan } from "./app/guidedScan.js";
import { createSound } from "./platform/sound.js";
import { createConsentView } from "./ui/consentView.js";
import { createReviewView } from "./ui/reviewView.js";
import { createGuideView } from "./ui/guideView.js";

const locale = initLocale(storage.loadLocale() ?? navigator.language);
document.documentElement.lang = locale;
document.title = t("app.title");
applyTranslations(document);
const fitApp = initFitApp({ doc: document, storage, t, formatNumber, applyTranslations });

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
const loadingEl = document.getElementById("camera-loading");
const debugSectionEl = document.getElementById("debug-section");
const toggleSkeletonBtn = document.getElementById("btn-toggle-skeleton");
const toggleMaskBtn = document.getElementById("btn-toggle-mask");
const toggleMirrorBtn = document.getElementById("btn-toggle-mirror");
const captureFrontBtn = document.getElementById("btn-capture-front");
const captureSideBtn = document.getElementById("btn-capture-side");
const captureResetBtn = document.getElementById("btn-capture-reset");
const captureStatusEl = document.getElementById("capture-status");
const debugLiveEl = document.getElementById("debug-live");
const debugCapturedEl = document.getElementById("debug-captured");
const guideHintEl = document.getElementById("guide-hint");
const guideRestartBtn = document.getElementById("btn-guide-restart");
const manualEntryBtn = document.getElementById("btn-manual-entry");

const required = [
  heightSectionEl, heightFormEl, heightInputEl, heightErrorEl,
  cameraSectionEl, cameraStatusEl, heightCurrentEl, changeHeightBtn,
  webcamElement, viewCanvasEl, cameraErrorEl, cameraErrorTitleEl, cameraErrorMessageEl,
  retryBtn, startBtn, stopBtn, loadingEl,
];

if (required.some((el) => !el)) {
  console.error("Page markup is missing a required element.");
} else {
  // The typed height lives only here, in memory.
  let heightCm = null;
  let starting = false;
  let lastStatus = "";

  const debugView = createDebugView({
    canvasEl: viewCanvasEl,
    engineListEl: debugEngineEl,
    liveListEl: debugLiveEl,
    capturedListEl: debugCapturedEl,
    captureStatusEl,
    formatNumber,
    t,
  });
  // Capture results live only in this memory: numbers, no frames.
  const captured = { front: null, side: null };
  let captureToken = 0;
  let capturing = false;
  // Scan results shown to the user: burst summaries only, in memory.
  const session = createScanSession();
  const scanView = createScanView({ doc: document, t });
  scanView.render(session.snapshot());
  // Live pose guide outline and hint line (CAPT-02, CAPT-03).
  const guideView = createGuideView({ canvasEl: viewCanvasEl, hintEl: guideHintEl, t });
  // Sound cues; unlocked by the consent Accept click (P4-D11).
  const sound = createSound();
  // Review of scanned numbers before they are saved (MEAS-06).
  const reviewView = createReviewView({
    doc: document,
    t,
    formatNumber,
    onSave(payload) {
      const r = fitApp.applyReview(payload);
      if (r.ok) fitApp.goToFitCheck();
      return r;
    },
  });
  // Re-render the scan lines after the settings language switch (registered earlier, so it runs first).
  document.getElementById("language-select")?.addEventListener("change", () => {
    scanView.render(session.snapshot());
    reviewView.refresh();
    const key = guideView.currentKey();
    if (key) guideView.setMessage(key, { force: true });
  });
  // Phone tilt; started from the consent Accept click (iOS needs a user gesture).
  const tilt = createTiltSensor();
  let tiltStarted = false;
  debugView.setOptions({ mirror: flags.camera !== "rear" });

  function startTilt() {
    if (tiltStarted) return Promise.resolve(true);
    tiltStarted = true;
    return tilt.start();
  }

  // Camera consent, in memory for this page load only (PRIV-01, P4-D17).
  let consented = false;
  const consentView = createConsentView({
    doc: document,
    onAccept() {
      consented = true;
      sound.unlock();
      startTilt();
      consentView.hide();
      startCamera();
    },
    onDecline() {
      consentView.hide();
      fitApp.showManualEntry("manual.declined");
    },
  });

  function setStatus(text) {
    if (text === lastStatus) return;
    lastStatus = text;
    cameraStatusEl.textContent = text;
  }

  const camera = createCamera({ videoEl: webcamElement });

  // Page-relative addresses: work on Vite and on a plain static server.
  const wasmBaseUrl = new URL("vendor/mediapipe/wasm", document.baseURI).href;
  const modelUrl = new URL("vendor/mediapipe/models/pose_landmarker_" + flags.model + ".task", document.baseURI).href;
  let pose = null;

  async function ensurePose() {
    if (pose) return pose;
    loadingEl.removeAttribute("hidden");
    try {
      pose = await createPose({ modelUrl, wasmBaseUrl, variant: flags.model, delegate: flags.delegate });
      loadingEl.setAttribute("hidden", "");
      return pose;
    } catch (err) {
      console.error("Pose engine load failed:", err);
      loadingEl.setAttribute("hidden", "");
      cameraErrorTitleEl.textContent = t("engine.error.title");
      cameraErrorMessageEl.textContent = t("engine.error.load-failed");
      cameraErrorEl.removeAttribute("hidden");
      setStatus(t("camera.status.stopped"));
      setCameraControls(false);
      fitApp.showManualEntry("manual.routed");
      return null;
    }
  }

  const frameLoop = createFrameLoop({
    videoEl: webcamElement,
    onFrame(timestampMs) {
      if (!pose) return;
      const t0 = performance.now();
      const guiding = guided.status().active;
      // The guided gate needs the mask on every frame (P4-D16).
      const obs = pose.detect(webcamElement, timestampMs, { wantMask: flags.debug || guiding });
      const inferenceMs = performance.now() - t0;
      let guides;
      if (flags.debug) {
        const reading = measureView(obs, "front", heightCm);
        debugView.setLiveReading(reading);
        if (reading.ok) guides = reading;
      }
      debugView.render({ videoEl: webcamElement, obs, guides });
      if (guiding) {
        const status = guided.onFrame(obs, timestampMs, tilt.pitchDeg());
        guideView.draw(status);
        guideView.setMessage(status.messageKey);
      }
      setStatus(obs ? t("camera.status.detected") : t("camera.status.searching"));
      if (flags.debug) {
        debugView.setEngineInfo({
          model: pose.info.variant,
          delegate: pose.info.delegate,
          mode: pose.info.runningMode,
          "inference ms": Math.round(inferenceMs),
          frame: obs ? obs.image.w + " x " + obs.image.h : "none",
          mask: obs && obs.mask ? obs.mask.w + " x " + obs.mask.h : "none",
        });
      }
    },
  });

  if (flags.debug) {
    debugSectionEl?.removeAttribute("hidden");
    debugView.setOptions({ debug: true });
    const wire = (btn, key, initial) => {
      if (!btn) return;
      let on = initial;
      btn.classList.toggle("active", on);
      btn.addEventListener("click", () => {
        on = !on;
        btn.classList.toggle("active", on);
        debugView.setOptions({ [key]: on });
      });
    };
    wire(toggleSkeletonBtn, "showSkeleton", true);
    wire(toggleMaskBtn, "showMask", true);
    wire(toggleMirrorBtn, "mirror", flags.camera !== "rear");
  }

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
    if (!consented) {
      consentView.show();
      return;
    }
    if (starting) return;
    starting = true;
    try {
      cameraErrorEl.setAttribute("hidden", "");
      startBtn.setAttribute("hidden", "");
      stopBtn.setAttribute("hidden", "");
      setStatus(t("camera.status.starting"));
      if (!(await ensurePose())) return;
      setStatus(t("camera.status.starting"));
      const result = await camera.start({ facingMode });
      if (!result.ok) {
        cameraErrorTitleEl.textContent = t("camera.error.title");
        cameraErrorMessageEl.textContent = t("camera.error." + result.code);
        cameraErrorEl.removeAttribute("hidden");
        setStatus(t("camera.status.stopped"));
        setCameraControls(false);
        fitApp.showManualEntry("manual.routed");
        return;
      }
      startTilt();
      frameLoop.start();
      setStatus(t("camera.status.searching"));
      setCameraControls(true);
      // A fresh guided scan each time the camera starts (P4-D23).
      clearCaptured();
      reviewView.hide();
      guided.start();
    } finally {
      starting = false;
    }
  }

  function stopCamera() {
    captureToken += 1;
    guided.stop();
    guideView.clear();
    frameLoop.stop();
    camera.stop();
    tilt.stop();
    tiltStarted = false;
    setStatus(t("camera.status.stopped"));
    setCameraControls(false);
  }

  function refreshCaptured() {
    const both = captured.front && captured.side;
    debugView.setCaptured({
      front: captured.front,
      side: captured.side,
      bustCm: both ? bustCircumferenceCm(captured.front.bustExtentCm.median, captured.side.bustExtentCm.median) : null,
    });
  }

  function setCaptureButtons(enabled) {
    if (captureFrontBtn) captureFrontBtn.disabled = !enabled;
    if (captureSideBtn) captureSideBtn.disabled = !enabled;
  }

  const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  const ABORTED = Object.freeze({ ok: false, code: "aborted", n: 0 });

  // Runs one burst for a view; with countdown false it starts at once (guided scan).
  async function capture(view, { countdown = true } = {}) {
    if (!camera.isRunning() || capturing || !pose || heightCm === null) return { ...ABORTED };
    capturing = true;
    captureToken += 1;
    const token = captureToken;
    const heightAtStart = heightCm;
    const isAborted = () => token !== captureToken || !camera.isRunning();
    setCaptureButtons(false);
    let result = { ...ABORTED };
    try {
      await startTilt();
      let aborted = isAborted();
      for (let seconds = countdown ? Math.round(CAPTURE_DELAY_MS / 1000) : 0; !aborted && seconds > 0; seconds -= 1) {
        debugView.setCaptureStatus(t("debug.capture.countdown", { seconds }));
        await sleep(1000);
        if (isAborted()) {
          aborted = true;
          break;
        }
      }
      if (!aborted) {
        frameLoop.stop();
        result = await runBurst({
          pose,
          videoEl: webcamElement,
          view,
          heightCm: heightAtStart,
          nextFrame: nextVideoFrame,
          onProgress: (done, total) => debugView.setCaptureStatus(t("debug.capture.collecting", { done, total })),
          isAborted,
          getDevicePitchDeg: tilt.pitchDeg,
        });
      }
      if (result.code !== "aborted") {
        session.record(view, result);
        scanView.render(session.snapshot());
      }
      if (result.ok) {
        captured[view] = result;
        debugView.setCaptureStatus(t("debug.capture.done"));
      } else {
        if (result.code !== "aborted") captured[view] = null;
        debugView.setCaptureStatus(t("debug.capture.failed", {
          reason: t("scan.reason." + (result.reason ?? result.code)),
        }));
      }
      refreshCaptured();
      if (result.code !== "aborted") maybeOpenReview();
    } finally {
      capturing = false;
      setCaptureButtons(true);
      if (camera.isRunning()) frameLoop.start();
    }
    return result;
  }

  // Both views good: stop the camera and open the review (MEAS-06, P4-D20).
  function maybeOpenReview() {
    const { combined } = session.snapshot();
    if (!combined || !combined.ok || reviewView.isShown()) return;
    // stopCamera drops the guided late result, so play its final captured cue here.
    const wasGuided = guided.status().active;
    stopCamera();
    if (wasGuided) sound.play("captured");
    reviewView.show({
      scanned: combined.measurements,
      hasProfile: fitApp.hasProfile(),
      hasMeasurements: fitApp.hasMeasurements(),
    });
  }

  // Hands-free scan: gate -> auto-lock -> burst, with sound cues (CAPT-04 to CAPT-08).
  const guided = createGuidedScan({
    capture: (view) => capture(view, { countdown: false }),
    cue: (name) => sound.play(name),
    onChange(status) {
      guideView.setMessage(status.messageKey);
      // A good scan is already in review (camera stopped); a bad combine starts over.
      if (status.phase === "done" && !session.snapshot().combined?.ok) {
        clearCaptured();
        guided.restart();
      }
    },
  });

  function clearCaptured() {
    captured.front = null;
    captured.side = null;
    session.clear();
    scanView.render(session.snapshot());
    debugView.setCaptureStatus("");
    refreshCaptured();
  }

  // Manual capture fallback: stops the guided scan, keeps the countdown (P4-D20).
  function manualCapture(view) {
    guided.stop();
    guideView.setMessage("guide.manual-mode");
    capture(view);
  }

  captureFrontBtn?.addEventListener("click", () => { manualCapture("front"); });
  captureSideBtn?.addEventListener("click", () => { manualCapture("side"); });
  captureResetBtn?.addEventListener("click", clearCaptured);

  // Drop any scan in progress or in review before a new one.
  function resetScan() {
    captureToken += 1; // abort any countdown or burst still running
    clearCaptured();
    reviewView.hide();
  }

  function restartGuidedScan() {
    if (camera.isRunning()) guided.restart();
    else startCamera(); // shows consent first when not given this page load
  }

  guideRestartBtn?.addEventListener("click", () => {
    resetScan();
    restartGuidedScan();
  });

  // Scan again (MEAS-09): consent, height, guided scan, review; saving replaces the old values.
  function beginRescan() {
    const scanArea = document.getElementById("scan-area");
    if (scanArea) scanArea.open = true;
    resetScan();
    // Height first when none is set this page load or the height form is open.
    if (heightCm === null || cameraSectionEl.hasAttribute("hidden")) {
      cameraSectionEl.setAttribute("hidden", "");
      heightForm.show();
      heightForm.focus();
      document.getElementById("height-section")?.scrollIntoView();
      return;
    }
    cameraSectionEl.scrollIntoView();
    restartGuidedScan();
  }

  document.getElementById("btn-rescan")?.addEventListener("click", beginRescan);

  manualEntryBtn?.addEventListener("click", () => {
    fitApp.showManualEntry("manual.routed");
  });

  const heightForm = createHeightForm({
    formEl: heightFormEl,
    inputEl: heightInputEl,
    errorEl: heightErrorEl,
    t,
    onValid(cm) {
      heightCm = cm;
      clearCaptured();
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
