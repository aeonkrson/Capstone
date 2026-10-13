// Scan session: the latest front and side burst summaries, in memory, numbers only (PRIV-02).

import { combineScan } from "../core/scan.js";

const EMPTY = { status: "empty" };

/**
 * Create a scan session. Recording a view replaces only that view.
 * @returns {{ record: (view: "front" | "side", burstResult: object) => void, clear: () => void,
 *   snapshot: () => { front: object, side: object, combined: object | null } }}
 */
export function createScanSession() {
  const views = { front: EMPTY, side: EMPTY };
  return {
    record(view, burstResult) {
      if (view !== "front" && view !== "side") return;
      views[view] = burstResult && burstResult.ok
        ? { status: "ok", result: burstResult }
        : { status: "rejected", reason: burstResult?.reason ?? burstResult?.code ?? "burst-too-few" };
    },
    clear() {
      views.front = EMPTY;
      views.side = EMPTY;
    },
    snapshot() {
      const both = views.front.status === "ok" && views.side.status === "ok";
      return {
        front: { ...views.front },
        side: { ...views.side },
        combined: both ? combineScan(views.front.result, views.side.result) : null,
      };
    },
  };
}
