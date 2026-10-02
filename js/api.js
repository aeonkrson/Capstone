const api = {
  /**
   * Simulates fetching product data from a remote server with a 1-second delay.
   * @param {string} id - The product ID to fetch.
   * @returns {Promise<Object>} The product object.
   */
  fetchProductById(id) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const product = PRODUCTS.find(p => p.id === id);
        if (product) {
          resolve(JSON.parse(JSON.stringify(product))); // Return copy
        } else {
          reject(new Error(`Product not found: ${id}`));
        }
      }, 1000);
    });
  },

  /**
   * Rules-based recommendation engine for Mix & Match outfits.
   * Pairs products by category and color-compatibility tags.
   * @param {Object} currentProduct - The product currently viewed/scanned.
   * @param {Array<string>} historyIds - User's scanned/owned wardrobe list (localStorage).
   * @returns {Promise<Object>} Recomended garment object with ownership badge metadata.
   */
  recommendOutfit(currentProduct, historyIds = []) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Filter history ids to remove current product
        const filteredHistory = historyIds.filter(id => id !== currentProduct.id);

        // Rule helper to check if a product fits currentProduct compatibility criteria
        const isCompatible = (candidate) => {
          const catMatches = currentProduct.compatibleCategories.includes(candidate.category);
          const colorMatches = currentProduct.compatibleColors.includes(candidate.color);
          return catMatches && colorMatches;
        };

        // 1. Primary: Search in scanned history (Wardrobe)
        for (const id of filteredHistory) {
          const candidate = PRODUCTS.find(p => p.id === id);
          if (candidate && isCompatible(candidate)) {
            resolve({
              ...candidate,
              inWardrobe: true
            });
            return;
          }
        }

        // 2. Secondary: Search global database (Catalog Suggestion)
        for (const candidate of PRODUCTS) {
          if (candidate.id !== currentProduct.id && isCompatible(candidate)) {
            resolve({
              ...candidate,
              inWardrobe: false
            });
            return;
          }
        }

        // 3. Fallback: Return any item of a compatible category if color match fails
        for (const candidate of PRODUCTS) {
          if (candidate.id !== currentProduct.id && currentProduct.compatibleCategories.includes(candidate.category)) {
            resolve({
              ...candidate,
              inWardrobe: false
            });
            return;
          }
        }

        // 4. Absolute fallback: Just recommend the first non-current product
        const absoluteFallback = PRODUCTS.find(p => p.id !== currentProduct.id) || currentProduct;
        resolve({
          ...absoluteFallback,
          inWardrobe: false
        });
      }, 500); // Shorter simulated search latency
    });
  }
};
window.api = api;
