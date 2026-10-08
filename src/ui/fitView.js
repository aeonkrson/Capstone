// Fit section: size and preference pickers, verdict, breakdown, comparison, history.
// createElement/textContent only.
const AREA_NAMES = ["chest", "shoulder", "length"];
const PREFERENCES = ["regular", "loose", "oversize"];

export function createFitView({ doc, t, formatNumber, formatDate, onCheck, onPreference }) {
  const section = doc.getElementById("fit-section");
  const hint = doc.getElementById("fit-hint");
  const controls = doc.getElementById("fit-controls");
  const sizeSelect = doc.getElementById("fit-size");
  const checkBtn = doc.getElementById("btn-check-fit");
  const resultEl = doc.getElementById("fit-result");
  const verdictEl = doc.getElementById("fit-verdict");
  const recommendedEl = doc.getElementById("fit-recommended");
  const areasEl = doc.getElementById("fit-areas");
  const compareEl = doc.getElementById("fit-compare");
  const historyList = doc.getElementById("history-list");
  const historyEmpty = doc.getElementById("history-empty");
  const radios = {};
  for (const pref of PREFERENCES) radios[pref] = doc.getElementById("pref-" + pref);

  for (const pref of PREFERENCES) {
    radios[pref].addEventListener("change", () => {
      if (radios[pref].checked) onPreference(pref);
    });
  }
  checkBtn.addEventListener("click", () => {
    onCheck({ sizeLabel: sizeSelect.value, preference: selectedPreference() });
  });

  function selectedPreference() {
    for (const pref of PREFERENCES) if (radios[pref].checked) return pref;
    return "regular";
  }

  function hasAllMeasurements(state) {
    const m = state.measurements;
    return Boolean(state.profile) && m.chestCm !== null && m.shoulderCm !== null && m.torsoCm !== null;
  }

  function render({ state, garment }) {
    // Section shows once a profile exists; the hint covers missing measurements.
    if (state.profile) section.removeAttribute("hidden");
    else section.setAttribute("hidden", "");
    const ready = hasAllMeasurements(state);
    if (ready) {
      hint.setAttribute("hidden", "");
      controls.removeAttribute("hidden");
    } else {
      hint.removeAttribute("hidden");
      controls.setAttribute("hidden", "");
      resultEl.setAttribute("hidden", "");
    }

    const previous = sizeSelect.value;
    sizeSelect.textContent = "";
    for (const size of garment.chart.sizes) {
      const opt = doc.createElement("option");
      opt.setAttribute("value", size.label);
      opt.textContent = size.label;
      sizeSelect.appendChild(opt);
    }
    if (garment.chart.sizes.some((s) => s.label === previous)) sizeSelect.value = previous;

    for (const pref of PREFERENCES) radios[pref].checked = pref === state.preference;
  }

  function signed(n) {
    const text = formatNumber(Math.abs(n));
    if (n > 0) return "+" + text;
    if (n < 0) return "-" + text;
    return text;
  }

  function recommendedText(rec) {
    if (rec.label === null) return t("fit.recommended.none");
    if (rec.borderline && rec.neighbour) {
      return t("fit.recommended.between", { size: rec.label, neighbour: rec.neighbour });
    }
    return t("fit.recommended", { size: rec.label });
  }

  function cellText(rec) {
    if (rec.label === null) return t("compare.cell.none");
    if (rec.borderline && rec.neighbour) {
      return t("compare.cell.between", { size: rec.label, neighbour: rec.neighbour });
    }
    return rec.label;
  }

  function renderResult(result, comparison) {
    verdictEl.textContent = t("verdict." + result.verdict);
    // Recommendation shown when the size does not simply fit, and for borderline.
    if (result.verdict === "fits") recommendedEl.textContent = "";
    else recommendedEl.textContent = recommendedText(result.recommended);

    areasEl.textContent = "";
    for (const name of AREA_NAMES) {
      const a = result.areas[name];
      const li = doc.createElement("li");
      const key = a.borderline && a.status === "ok" ? "area.line.borderline" : "area.line";
      li.textContent = t(key, {
        area: t("area." + name),
        status: t("status." + a.status),
        diff: signed(a.diffCm),
      });
      areasEl.appendChild(li);
    }

    compareEl.textContent = "";
    const head = doc.createElement("tr");
    for (const key of ["pref", "size"]) {
      const th = doc.createElement("th");
      th.textContent = t("compare.col." + key);
      head.appendChild(th);
    }
    compareEl.appendChild(head);
    for (const pref of PREFERENCES) {
      const row = doc.createElement("tr");
      const th = doc.createElement("th");
      th.textContent = t("fit.pref." + pref);
      const td = doc.createElement("td");
      td.textContent = cellText(comparison[pref]);
      row.appendChild(th);
      row.appendChild(td);
      compareEl.appendChild(row);
    }
    resultEl.removeAttribute("hidden");
  }

  function hideResult() {
    resultEl.setAttribute("hidden", "");
  }

  function renderHistory(history) {
    historyList.textContent = "";
    for (const entry of history) {
      const li = doc.createElement("li");
      li.textContent = t("history.entry", {
        date: formatDate(entry.at),
        garment: entry.garmentName,
        size: entry.size,
        pref: t("fit.pref." + entry.preference),
        verdict: t("verdict." + entry.verdict),
      });
      historyList.appendChild(li);
    }
    if (history.length === 0) historyEmpty.removeAttribute("hidden");
    else historyEmpty.setAttribute("hidden", "");
  }

  return { render, renderResult, hideResult, renderHistory };
}
