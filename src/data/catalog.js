import { PLAIN_TEE } from "./colourboxCharts.js";

export const CUTS = ["regular", "loose", "oversize"];

// Only collected charts with a cut label are listed.
// FITTED_TEE (no matching cut label) and UNCONFIRMED_BOXY_TEE (refused by sizeFromBust)
// are deliberately not listed.
export const CATALOG = [
  {
    id: PLAIN_TEE.id,
    name: PLAIN_TEE.name,
    brand: PLAIN_TEE.brand,
    cut: "regular", // ASSUMED from the product name; unconfirmed
    chart: PLAIN_TEE,
  },
];
