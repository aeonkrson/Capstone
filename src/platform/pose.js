import { FilesetResolver, PoseLandmarker } from "../../vendor/mediapipe/vision_bundle.mjs";

/**
 * Self-hosted PoseLandmarker adapter. All coordinates leaving it are raw, unmirrored image pixels.
 * @param {{ modelUrl: string, wasmBaseUrl: string, variant: string, delegate?: "CPU" | "GPU", runningMode?: "VIDEO" | "IMAGE" }} opts
 * @returns {Promise<{ detect: Function, setRunningMode: Function, info: object, close: Function }>}
 */
export async function createPose({ modelUrl, wasmBaseUrl, variant, delegate = "CPU", runningMode = "VIDEO" }) {
  const fileset = await FilesetResolver.forVisionTasks(wasmBaseUrl);
  const landmarker = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: modelUrl, delegate },
    runningMode,
    numPoses: 1,
    outputSegmentationMasks: true,
  });
  let mode = runningMode;
  const info = { variant, delegate, runningMode };

  /**
   * @param {HTMLVideoElement} videoEl
   * @param {number} timestampMs
   * @param {{ wantMask?: boolean }} [options]
   * @returns {import("../core/types.js").FrameObservation | null}
   */
  function detect(videoEl, timestampMs, { wantMask = true } = {}) {
    const w = videoEl.videoWidth;
    const h = videoEl.videoHeight;
    if (!w || !h) return null;
    let obs = null;
    const onResult = (result) => {
      if (!result.landmarks || result.landmarks.length === 0) return;
      const lm = result.landmarks[0].map((p) => ({ x: p.x * w, y: p.y * h, z: p.z, v: p.visibility ?? 0 }));
      const world = result.worldLandmarks?.[0] ?? null;
      let mask = null;
      const m = wantMask ? result.segmentationMasks?.[0] : null;
      if (m) {
        const floats = m.getAsFloat32Array();
        const data = new Uint8Array(m.width * m.height);
        for (let i = 0; i < data.length; i += 1) data[i] = floats[i] >= 0.5 ? 1 : 0;
        mask = { w: m.width, h: m.height, data };
      }
      obs = { t: timestampMs, image: { w, h }, lm, world, mask };
    };
    if (mode === "VIDEO") landmarker.detectForVideo(videoEl, timestampMs, onResult);
    else landmarker.detect(videoEl, onResult);
    return obs;
  }

  async function setRunningMode(next) {
    await landmarker.setOptions({ runningMode: next });
    mode = next;
    info.runningMode = next;
  }

  return { detect, setRunningMode, info, close: () => landmarker.close() };
}
