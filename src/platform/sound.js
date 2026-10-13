// Sound cues for the hands-free scan. Synthesized, no audio files, nothing recorded.

const GAP = 0.08; // seconds between tones inside one cue
const CUE_GAP = 0.15; // seconds between queued cues
const PEAK = 0.3;
const RAMP = 0.01;

export const CUES = Object.freeze({
  hold: Object.freeze([Object.freeze([660, 0.15])]),
  captured: Object.freeze([Object.freeze([880, 0.12]), Object.freeze([1320, 0.2])]),
  turn: Object.freeze([Object.freeze([523, 0.18]), Object.freeze([523, 0.18]), Object.freeze([392, 0.35])]),
});

/**
 * Create a cue player. unlock() must be called from a user gesture (consent Accept click).
 * @param {{ AudioContextCtor?: new () => any }} [deps]
 * @returns {{ unlock: () => Promise<boolean>, play: (name: string) => void, close: () => void }}
 */
export function createSound({
  AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext,
} = {}) {
  let ctx = null;
  let closed = false;
  let queueEnd = -Infinity;

  return {
    async unlock() {
      if (closed || !AudioContextCtor) return false;
      try {
        if (!ctx) ctx = new AudioContextCtor();
        if (typeof ctx.resume === "function") await ctx.resume();
        return true;
      } catch (err) {
        console.error("Sound cue failed:", err);
        ctx = null;
        return false;
      }
    },
    play(name) {
      if (!ctx || closed) return;
      const cue = CUES[name];
      if (!cue) return;
      try {
        let t = Math.max(ctx.currentTime, queueEnd + CUE_GAP);
        for (const [hz, dur] of cue) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(hz, t);
          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(PEAK, t + RAMP);
          gain.gain.setValueAtTime(PEAK, Math.max(t + RAMP, t + dur - RAMP));
          gain.gain.linearRampToValueAtTime(0, t + dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + dur);
          t += dur + GAP;
        }
        queueEnd = t - GAP;
      } catch (err) {
        console.error("Sound cue failed:", err);
      }
    },
    close() {
      closed = true;
      try {
        if (ctx && typeof ctx.close === "function") ctx.close();
      } catch (err) {
        console.error("Sound cue failed:", err);
      }
      ctx = null;
    },
  };
}
