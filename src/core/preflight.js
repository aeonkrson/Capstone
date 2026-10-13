// Startup capability check (D-09). Pure: the caller reads the browser and passes booleans.

/**
 * Issue codes in display order.
 */
export const PREFLIGHT_CODES = Object.freeze(["insecure-context", "no-camera-api", "no-webassembly"]);

/**
 * Lists what stops the scan from running here. Missing or non-boolean flags count as false.
 * @param {{ secureContext?: boolean, cameraApi?: boolean, webAssembly?: boolean }} [caps]
 * @returns {string[]} codes from PREFLIGHT_CODES, in that order; empty when all is fine
 */
export function preflightIssues(caps) {
  const c = caps && typeof caps === "object" ? caps : {};
  const okByCode = {
    "insecure-context": c.secureContext === true,
    "no-camera-api": c.cameraApi === true,
    "no-webassembly": c.webAssembly === true,
  };
  return PREFLIGHT_CODES.filter((code) => !okByCode[code]);
}
