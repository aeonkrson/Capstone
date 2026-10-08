// Catalog list and size chart table. createElement/textContent only.
export function createCatalogView({ doc, t, formatNumber, onSelect }) {
  const listEl = doc.getElementById("catalog-list");
  const chartEl = doc.getElementById("chart-area");
  const noteEl = doc.getElementById("chart-note");

  function cell(tag, text) {
    const el = doc.createElement(tag);
    el.textContent = text;
    return el;
  }

  function renderChart(chart) {
    chartEl.textContent = "";
    const table = doc.createElement("table");
    const caption = doc.createElement("caption");
    caption.textContent = t("chart.title");
    table.appendChild(caption);
    const head = doc.createElement("tr");
    for (const key of ["size", "chest", "shoulder", "length"]) {
      head.appendChild(cell("th", t("chart.col." + key)));
    }
    table.appendChild(head);
    for (const size of chart.sizes) {
      const row = doc.createElement("tr");
      row.appendChild(cell("th", size.label));
      row.appendChild(cell("td", formatNumber(size.chest)));
      row.appendChild(cell("td", formatNumber(size.shoulder)));
      row.appendChild(cell("td", formatNumber(size.backLength.midpoint)));
      table.appendChild(row);
    }
    chartEl.appendChild(table);
    noteEl.textContent = t("chart.note");
  }

  function render({ catalog, selectedId }) {
    listEl.textContent = "";
    for (const garment of catalog) {
      const li = doc.createElement("li");
      const selected = garment.id === selectedId;
      const title = doc.createElement("strong");
      title.textContent = garment.name + " (" + garment.brand + ")";
      const cut = doc.createElement("span");
      cut.textContent = " " + t("catalog.cut", { cut: t("cut." + garment.cut) }) + " ";
      const btn = doc.createElement("button");
      btn.setAttribute("type", "button");
      btn.setAttribute("data-id", garment.id);
      btn.textContent = selected ? t("catalog.selected") : t("catalog.select");
      if (selected) btn.setAttribute("aria-pressed", "true");
      btn.addEventListener("click", () => onSelect(garment.id));
      li.appendChild(title);
      li.appendChild(cut);
      li.appendChild(btn);
      listEl.appendChild(li);
    }
    const current = catalog.find((g) => g.id === selectedId);
    if (current) renderChart(current.chart);
  }

  return { render };
}
