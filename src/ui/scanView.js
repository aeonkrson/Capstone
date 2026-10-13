// Plain scan status view: one line per view (front, side) with the rejection reason.
// The review screen (MEAS-06) replaces the old result list and Use button.
// textContent only.

export function createScanView({ doc, t }) {
  const frontStatusEl = doc.getElementById("scan-front-status");
  const sideStatusEl = doc.getElementById("scan-side-status");

  function viewLine(view, entry) {
    const head = t(view === "front" ? "scan.view.front" : "scan.view.side");
    if (entry.status === "ok") return head + " " + t("scan.view.ok");
    if (entry.status === "rejected") {
      return head + " " + t("scan.view.rejected", { reason: t("scan.reason." + entry.reason) });
    }
    return head + " " + t("scan.view.empty");
  }

  function render(snapshot) {
    if (frontStatusEl) frontStatusEl.textContent = viewLine("front", snapshot.front);
    if (sideStatusEl) sideStatusEl.textContent = viewLine("side", snapshot.side);
  }

  return { render };
}
