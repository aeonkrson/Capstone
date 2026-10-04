// ColourBox size charts, copied exactly from the product pages supplied by Jordan.
// Named fields only, never positional arrays, so a swapped column order cannot be misread.
// All widths are ASSUMED flat widths (D-04) until one physical shirt is measured.

// Published column order: Chest x Bottom x Shoulder x Sleeve length x Armhole x Back length (D-01).
export const PLAIN_TEE = {
  id: "colourbox-plain-white-tee",
  name: "Plain white T-shirt",
  brand: "ColourBox",
  audience: "women",
  unit: "cm",
  convention: "flat", // widths are flat, not circumferences (assumption, D-04)
  measuredHow: "assumed flat width, unconfirmed",
  status: "collected",
  source: "ColourBox product page, supplied by Jordan, 2026-10-02",
  columnOrder: ["chest", "bottom", "shoulder", "sleeveLength", "armhole", "backLength"],
  sizes: [
    // cm, flat width for chest, bottom and shoulder; back length is a range with a placeholder midpoint (D-05)
    { label: "XS", chest: 47, bottom: 50, shoulder: 37, sleeveLength: 12, armhole: 20,
      backLength: { min: 54, max: 58, midpoint: 56, placeholder: true } },
    { label: "S", chest: 49, bottom: 52, shoulder: 39, sleeveLength: 13, armhole: 21,
      backLength: { min: 56, max: 60, midpoint: 58, placeholder: true } },
    { label: "M", chest: 51, bottom: 54, shoulder: 41, sleeveLength: 14, armhole: 22,
      backLength: { min: 58, max: 62, midpoint: 60, placeholder: true } },
    { label: "L", chest: 53, bottom: 56, shoulder: 43, sleeveLength: 15, armhole: 23,
      backLength: { min: 60, max: 64, midpoint: 62, placeholder: true } },
    { label: "XL", chest: 55, bottom: 58, shoulder: 45, sleeveLength: 16, armhole: 24,
      backLength: { min: 62, max: 66, midpoint: 64, placeholder: true } },
  ],
};

// Published column order: Chest x Bottom x Shoulder x Armhole x Sleeve length x Body length (D-02).
// Armhole and sleeve length are in the opposite order to the plain tee.
export const FITTED_TEE = {
  id: "colourbox-fitted-tee",
  name: "Fitted T-shirt",
  brand: "ColourBox",
  audience: "women",
  unit: "cm",
  convention: "flat",
  measuredHow: "assumed flat width, unconfirmed",
  status: "collected",
  source: "ColourBox product page, supplied by Jordan, 2026-10-02",
  columnOrder: ["chest", "bottom", "shoulder", "armhole", "sleeveLength", "bodyLength"],
  sizes: [
    // cm, flat width for chest, bottom and shoulder
    { label: "XS", chest: 33, bottom: 31.5, shoulder: 31, armhole: 18, sleeveLength: 14, bodyLength: 41 },
    { label: "S", chest: 35, bottom: 33.5, shoulder: 32, armhole: 19, sleeveLength: 15, bodyLength: 42 },
    { label: "M", chest: 37, bottom: 35.5, shoulder: 33, armhole: 20, sleeveLength: 16, bodyLength: 43 },
    { label: "L", chest: 39, bottom: 37.5, shoulder: 34, armhole: 21, sleeveLength: 17, bodyLength: 44 },
    { label: "XL", chest: 41, bottom: 39.5, shoulder: 35, armhole: 22, sleeveLength: 18, bodyLength: 45 },
  ],
};

// UNCONFIRMED (D-03). The numbers supplied for the boxy tee are identical to the plain tee in every size.
// Read in the claimed column order they give a 12 cm armhole, which points to a pasted plain chart.
// Do not use them. There is no `sizes` array on purpose; sizeFromBust refuses this chart.
export const UNCONFIRMED_BOXY_TEE = {
  id: "colourbox-boxy-tee",
  name: "Boxy T-shirt",
  brand: "ColourBox",
  status: "unconfirmed",
  columnOrderClaimed: ["chest", "bottom", "shoulder", "armhole", "sleeveLength", "bodyLength"],
  rawSupplied: {
    XS: "47 x 50 x 37 x 12 x 20 x 54-58",
    S: "49 x 52 x 39 x 13 x 21 x 56-60",
    M: "51 x 54 x 41 x 14 x 22 x 58-62",
    L: "53 x 56 x 43 x 15 x 23 x 60-64",
    XL: "55 x 58 x 45 x 16 x 24 x 62-66",
  },
};
