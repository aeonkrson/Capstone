// Plain scan result view: per-view status, reasons, five measurements with estimate markers, Use button.
// createElement and textContent only.

import { SCAN_KEYS, ESTIMATE_KEYS } from "../core/scan.js";

const LABEL_KEYS = {
  shoulderCm: "body.shoulder.label", chestCm: "body.chest.label", waistCm: "body.waist.label",
  torsoCm: "body.torso.label", armCm: "body.arm.label",
};

export function createScanView({ doc, t, formatNumber, onUse }) {
  const frontStatusEl = doc.getElementById("scan-front-status");
  const sideStatusEl = doc.getElementById("scan-side-status");
  const resultsEl = doc.getElementById("scan-results");
  const useBtn = doc.getElementById("btn-scan-use");
  const useStatusEl = doc.getElementById("scan-use-status");
  let current = null;

  function viewLine(view, entry) {
    const head = t(view === "front" ? "scan.view.front" : "scan.view.side");
    if (entry.status === "ok") return head + " " + t("scan.view.ok");
    if (entry.status === "rejected") {
      return head + " " + t("scan.view.rejected", { reason: t("scan.reason." + entry.reason) });
    }
    return head + " " + t("scan.view.empty");
  }

  function render(snapshot) {
    current = snapshot;
    if (frontStatusEl) frontStatusEl.textContent = viewLine("front", snapshot.front);
    if (sideStatusEl) sideStatusEl.textContent = viewLine("side", snapshot.side);
    if (useStatusEl) useStatusEl.textContent = "";
    const combined = snapshot.combined;
    const ok = Boolean(combined && combined.ok);
    if (resultsEl) {
      resultsEl.replaceChildren();
      if (ok) {
        for (const key of SCAN_KEYS) {
          const label = t(LABEL_KEYS[key]);
          const value = combined.measurements[key];
          const li = doc.createElement("li");
          if (value === null) li.textContent = t("scan.result.unavailable", { label });
          else {
            const lineKey = ESTIMATE_KEYS.includes(key) ? "scan.result.line-estimate" : "scan.result.line";
            li.textContent = t(lineKey, { label, value: formatNumber(value) });
          }
          resultsEl.appendChild(li);
        }
      }
    }
    if (useBtn) useBtn.disabled = !ok;
  }

  function showUseResult(result) {
    if (!useStatusEl) return;
    if (!result || !result.ok) useStatusEl.textContent = t("scan.need-profile");
    else if (result.rejected.length > 0) useStatusEl.textContent = t("scan.used-partial", { count: result.applied.length });
    else useStatusEl.textContent = t("scan.used");
  }

  useBtn?.addEventListener("click", () => {
    if (current && current.combined && current.combined.ok) onUse(current);
  });

  return { render, showUseResult };
}
