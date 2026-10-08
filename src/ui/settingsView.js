export function createSettingsView({ doc, t, getLocale, onLanguage, onDeleteAll }) {
  const selectEl = doc.getElementById("language-select");
  const deleteBtn = doc.getElementById("btn-delete-all");
  const statusEl = doc.getElementById("settings-status");

  selectEl.value = getLocale();
  selectEl.addEventListener("change", () => {
    statusEl.textContent = "";
    onLanguage(selectEl.value);
  });

  deleteBtn.addEventListener("click", () => {
    if (!window.confirm(t("settings.delete.confirm"))) return;
    onDeleteAll();
    statusEl.textContent = t("settings.deleted");
  });

  return {
    syncLanguage() {
      selectEl.value = getLocale();
    },
    clearStatus() {
      statusEl.textContent = "";
    },
  };
}
