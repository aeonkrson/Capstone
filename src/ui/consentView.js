// Camera consent block (PRIV-01). Consent is held in memory by the caller; nothing is stored here.

export function createConsentView({ doc, onAccept, onDecline }) {
  const sectionEl = doc.getElementById("consent-section");
  const acceptBtn = doc.getElementById("btn-consent-accept");
  const declineBtn = doc.getElementById("btn-consent-decline");

  acceptBtn?.addEventListener("click", () => {
    if (onAccept) onAccept();
  });
  declineBtn?.addEventListener("click", () => {
    if (onDecline) onDecline();
  });

  function show() {
    if (!sectionEl) return;
    sectionEl.hidden = false;
    if (typeof sectionEl.scrollIntoView === "function") sectionEl.scrollIntoView();
    if (acceptBtn && typeof acceptBtn.focus === "function") acceptBtn.focus();
  }

  function hide() {
    if (sectionEl) sectionEl.hidden = true;
  }

  function isShown() {
    return Boolean(sectionEl && !sectionEl.hidden);
  }

  return { show, hide, isShown };
}
