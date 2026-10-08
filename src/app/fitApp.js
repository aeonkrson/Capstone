import { createProfileView } from "../ui/profileView.js";
import { createSettingsView } from "../ui/settingsView.js";
import { emptyState, setProfileName, setMeasurement } from "../core/profileState.js";
import { setLocale, getLocale } from "../i18n/index.js";

export function initFitApp({ doc, storage, t, formatNumber, applyTranslations }) {
  let state = storage.loadState();

  function render() {
    profileView.render(state);
  }

  function update(nextState) {
    state = nextState;
    storage.saveState(state);
    render();
  }

  const profileView = createProfileView({
    doc,
    t,
    formatNumber,
    onSaveName(name) {
      const result = setProfileName(state, name);
      if (result.ok === false) return result;
      update(result);
      return { ok: true };
    },
    onSaveMeasurements(values) {
      let next = state;
      for (const key of Object.keys(values)) {
        // Unchanged values keep their existing source; changed ones become "edited".
        if (next.measurements[key] === values[key]) continue;
        next = setMeasurement(next, key, values[key]);
      }
      update(next);
      return { ok: true };
    },
  });

  const settingsView = createSettingsView({
    doc,
    t,
    getLocale,
    onLanguage(tag) {
      if (!setLocale(tag)) return;
      storage.saveLocale(tag);
      doc.documentElement.lang = tag;
      doc.title = t("app.title");
      applyTranslations(doc);
      settingsView.syncLanguage();
      render();
    },
    onDeleteAll() {
      storage.clearAll();
      state = emptyState();
      profileView.reset();
      render();
    },
  });

  render();
  return { render, getState: () => state };
}
