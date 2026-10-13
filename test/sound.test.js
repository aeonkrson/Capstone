import { test } from "node:test";
import assert from "node:assert/strict";
import { CUES, createSound } from "../src/platform/sound.js";

function makeFake() {
  const log = { oscillators: [], closed: false, resumed: false };
  class FakeContext {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
    }
    createOscillator() {
      const osc = {
        type: "",
        freq: null,
        startAt: null,
        stopAt: null,
        frequency: {
          setValueAtTime: (hz) => {
            osc.freq = hz;
          },
        },
        connect() {},
        start: (at) => {
          osc.startAt = at;
        },
        stop: (at) => {
          osc.stopAt = at;
        },
      };
      log.oscillators.push(osc);
      return osc;
    }
    createGain() {
      return { gain: { setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} };
    }
    async resume() {
      log.resumed = true;
    }
    async close() {
      log.closed = true;
    }
  }
  return { FakeContext, log };
}

test("play before unlock creates no oscillator", () => {
  const { FakeContext, log } = makeFake();
  const s = createSound({ AudioContextCtor: FakeContext });
  s.play("hold");
  assert.equal(log.oscillators.length, 0);
});

test("patterns differ and use the specified frequencies", async () => {
  const freqs = {};
  for (const name of ["hold", "captured", "turn"]) {
    const { FakeContext, log } = makeFake();
    const s = createSound({ AudioContextCtor: FakeContext });
    assert.equal(await s.unlock(), true);
    s.play(name);
    freqs[name] = log.oscillators.map((o) => o.freq);
  }
  assert.deepEqual(freqs.hold, [660]);
  assert.deepEqual(freqs.captured, [880, 1320]);
  assert.deepEqual(freqs.turn, [523, 523, 392]);
  assert.notDeepEqual(freqs.hold, freqs.captured);
  assert.notDeepEqual(freqs.captured, freqs.turn);
});

test("CUES is frozen", () => {
  assert.ok(Object.isFrozen(CUES));
});

test("unknown cue is ignored", async () => {
  const { FakeContext, log } = makeFake();
  const s = createSound({ AudioContextCtor: FakeContext });
  await s.unlock();
  assert.doesNotThrow(() => s.play("unknown"));
  assert.equal(log.oscillators.length, 0);
});

test("captured then turn in the same tick do not overlap", async () => {
  const { FakeContext, log } = makeFake();
  const s = createSound({ AudioContextCtor: FakeContext });
  await s.unlock();
  s.play("captured");
  s.play("turn");
  const capturedEnd = 0.12 + 0.08 + 0.2;
  assert.ok(log.oscillators[2].startAt > capturedEnd, `${log.oscillators[2].startAt}`);
});

test("no constructor: unlock false, play silent", async () => {
  const s = createSound({ AudioContextCtor: undefined });
  assert.equal(await s.unlock(), false);
  assert.doesNotThrow(() => s.play("hold"));
});

test("throwing constructor: unlock false", async () => {
  const s = createSound({
    AudioContextCtor: class {
      constructor() {
        throw new Error("nope");
      }
    },
  });
  assert.equal(await s.unlock(), false);
});

test("close closes the context and later play does nothing", async () => {
  const { FakeContext, log } = makeFake();
  const s = createSound({ AudioContextCtor: FakeContext });
  await s.unlock();
  s.close();
  assert.equal(log.closed, true);
  s.play("hold");
  assert.equal(log.oscillators.length, 0);
});
