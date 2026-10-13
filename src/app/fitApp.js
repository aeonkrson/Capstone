import { createProfileView } from "../ui/profileView.js";
import { createSettingsView } from "../ui/settingsView.js";
import { createCatalogView } from "../ui/catalogView.js";
import { createFitView } from "../ui/fitView.js";
import { emptyState, setProfileName, setMeasurement, addHistoryEntry, applyScan, applyReview } from "../core/profileState.js";
import { checkFit, recommendAll } from "../core/fit.js";
import { CATALOG } from "../data/catalog.js";
import { setLocale, getLocale } from "../i18n/index.js";

export function initFitApp({ doc, storage, t, formatNumber, applyTranslations }) {
  let state = storage.loadState();
  let selectedGarmentId = CATALOG[0].id;
  // The check currently on screen, re-run on every render so it is never stale.
  let lastCheck = null;
  // Key of the manual-entry message on screen, re-translated on every render.
  let manualRouteKey = null;

  function selectedGarment() {
    return CATALOG.find((g) => g.id === selectedGarmentId) || CATALOG[0];
  }

  function formatDate(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return String(iso);
    const tag = getLocale() === "id" ? "id-ID" : "en-US";
    return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(date);
  }

  function bodyOf(s) {
    const m = s.measurements;
    if (m.chestCm === null || m.shoulderCm === null || m.torsoCm === null) return null;
    return { chestCm: m.chestCm, shoulderCm: m.shoulderCm, torsoCm: m.torsoCm };
  }

  // Compute and show a check; shows no result rather than a wrong one on bad input.
  function showCheck(check) {
    const body = bodyOf(state);
    if (!body) {
      fitView.hideResult();
      return false;
    }
    try {
      const chart = selectedGarment().chart;
      const result = checkFit({ chart, sizeLabel: check.sizeLabel, preference: check.preference, body });
      fitView.renderResult(result, recommendAll(body.chestCm, chart));
      return result;
    } catch (err) {
      console.error("Fit check failed:", err);
      fitView.hideResult();
      return false;
    }
  }

  function render() {
    profileView.render(state);
    catalogView.render({ catalog: CATALOG, selectedId: selectedGarmentId });
    fitView.render({ state, garment: selectedGarment() });
    fitView.renderHistory(state.history);
    if (lastCheck) {
      if (!showCheck(lastCheck)) lastCheck = null;
    } else {
      fitView.hideResult();
    }
    if (manualRouteKey) {
      const el = doc.getElementById("manual-route-status");
      if (el) el.textContent = t(manualRouteKey);
    }
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

  const catalogView = createCatalogView({
    doc,
    t,
    formatNumber,
    onSelect(garmentId) {
      selectedGarmentId = garmentId;
      lastCheck = null;
      render();
    },
  });

  const fitView = createFitView({
    doc,
    t,
    formatNumber,
    formatDate,
    onPreference(pref) {
      lastCheck = null;
      update({ ...state, preference: pref });
    },
    onCheck({ sizeLabel, preference }) {
      const body = bodyOf(state);
      if (!body) return;
      const garment = selectedGarment();
      let result;
      try {
        result = checkFit({ chart: garment.chart, sizeLabel, preference, body });
      } catch (err) {
        console.error("Fit check failed:", err);
        return;
      }
      lastCheck = { sizeLabel, preference };
      update(addHistoryEntry(state, {
        garmentId: garment.id,
        garmentName: garment.name,
        size: sizeLabel,
        preference,
        verdict: result.verdict,
        at: new Date().toISOString(),
      }));
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
      lastCheck = null;
      profileView.reset();
      render();
    },
  });

  // Write scan results into the saved profile (needs a profile).
  function applyScanResult(measurements) {
    if (!state.profile) return { ok: false, code: "no-profile" };
    const r = applyScan(state, measurements);
    update(r.state);
    return { ok: true, applied: r.applied, rejected: r.rejected };
  }

  // Save a reviewed scan; creates the profile name first if there is none (one update).
  function applyReviewResult({ name, scanned, values }) {
    let base = state;
    if (!base.profile) {
      const named = setProfileName(base, name);
      if (named.ok === false) return { ok: false, code: "name-" + named.code };
      base = named;
    }
    const r = applyReview(base, scanned, values);
    lastCheck = null;
    update(r.state);
    return { ok: true, applied: r.applied, rejected: r.rejected };
  }

  function hasProfile() {
    return Boolean(state.profile);
  }

  function scrollAndFocus(target, focusEl) {
    if (target && typeof target.scrollIntoView === "function") target.scrollIntoView();
    if (focusEl && typeof focusEl.focus === "function") focusEl.focus();
  }

  function goToFitCheck() {
    const hint = doc.getElementById("fit-hint");
    const size = doc.getElementById("fit-size");
    const controlsHidden = !size || (hint && !hint.hasAttribute("hidden"));
    scrollAndFocus(doc.getElementById("fit-section"), controlsHidden ? hint : size);
  }

  function showManualEntry(messageKey) {
    manualRouteKey = messageKey;
    const el = doc.getElementById("manual-route-status");
    if (el) {
      el.textContent = t(messageKey);
      el.removeAttribute("hidden");
    }
    if (hasProfile()) {
      scrollAndFocus(doc.getElementById("body-section"), doc.getElementById("body-chest"));
    } else {
      scrollAndFocus(doc.getElementById("profile-section"), doc.getElementById("profile-name"));
    }
  }

  render();
  return {
    render,
    getState: () => state,
    applyScan: applyScanResult,
    applyReview: applyReviewResult,
    hasProfile,
    goToFitCheck,
    showManualEntry,
  };
}
