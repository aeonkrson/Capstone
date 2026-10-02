document.addEventListener("DOMContentLoaded", () => {
  const webcamElement = document.getElementById("webcam");
  const canvasElement = document.getElementById("ar-canvas");
  const canvasCtx = canvasElement.getContext("2d");
  
  const loadingOverlay = document.getElementById("loading-overlay");
  const fallbackUI = document.getElementById("webcam-fallback-ui");
  const cameraCover = document.getElementById("camera-disabled-cover");
  const scanFeedback = document.getElementById("scan-feedback-banner");
  
  const startCameraBtn = document.getElementById("btn-start-camera");
  const skipCameraBtn = document.getElementById("btn-skip-camera");
  const skipCameraFallbackBtn = document.getElementById("btn-skip-camera-fallback");
  const retryBtn = document.getElementById("btn-retry-webcam");
  
  const toggleSkeletonBtn = document.getElementById("btn-toggle-skeleton");
  const mirrorBtn = document.getElementById("btn-mirror");
  const trackingStatusBadge = document.getElementById("tracking-status-badge");
  const cameraHud = document.getElementById("camera-hud");
  
  const catalogDrawer = document.getElementById("catalog-drawer");
  const dashboardDetails = document.getElementById("dashboard-details");
  const clearHistoryBtn = document.getElementById("btn-clear-history");
  
  let activeProduct = PRODUCTS[0];
  let showSkeleton = false;
  let isMirrored = true;
  let trackingActive = false;
  let activeStream = null;
  let hasBypassed = false;
  let poseInstance = null;

  const STATE_IDLE = "idle";
  const STATE_SCANNING = "scanning";
  const STATE_LOADING = "loading";
  const STATE_TRACKING = "tracking";
  let currentState = STATE_IDLE;
  
  // Pre-load garment overlay images
  const garmentImages = {};
  PRODUCTS.forEach(p => {
    if (p.overlayImage) {
      const img = new Image();
      img.src = p.overlayImage;
      garmentImages[p.id] = img;
    }
  });

  // LocalStorage History Helpers
  function getHistory() {
    const hist = localStorage.getItem("greenwear_history");
    return hist ? JSON.parse(hist) : [];
  }

  function saveToHistory(id) {
    const hist = getHistory();
    if (!hist.includes(id)) {
      hist.push(id);
      localStorage.setItem("greenwear_history", JSON.stringify(hist));
    }
    renderWardrobe();
  }

  function clearHistory() {
    localStorage.removeItem("greenwear_history");
    renderWardrobe();
    // Re-trigger matching for active product since history changed
    if (hasBypassed) {
      loadProductDirect(activeProduct);
    } else if (activeStream && currentState === STATE_TRACKING) {
      api.recommendOutfit(activeProduct, [])
        .then(recommendation => updateRecommendationDetails(recommendation));
    }
  }

  function renderWardrobe() {
    const history = getHistory();
    const drawer = document.getElementById("wardrobe-drawer");
    const grid = document.getElementById("wardrobe-history-grid");
    const emptyMsg = document.getElementById("empty-wardrobe-msg");
    
    if (!drawer) return;
    drawer.style.display = "block"; // Always visible when dashboard/catalog opens
    
    if (history.length === 0) {
      if (grid) grid.innerHTML = "";
      if (emptyMsg) emptyMsg.style.display = "block";
      return;
    }
    
    if (emptyMsg) emptyMsg.style.display = "none";
    if (grid) {
      grid.innerHTML = history.map(id => {
        const product = PRODUCTS.find(p => p.id === id);
        if (!product) return "";
        let categoryIcon = "👕";
        if (product.category === "Bottom") categoryIcon = "👖";
        if (product.category === "Dress") categoryIcon = "👗";
        if (product.category === "Outer") categoryIcon = "🧥";
        
        const isActive = activeProduct.id === product.id ? "active" : "";
        return `
          <div class="garment-card scanned-item ${isActive}" data-id="${product.id}">
            <span class="garment-card-icon">${categoryIcon}</span>
            <span class="garment-card-name">${product.name}</span>
            <span class="scanned-color-dot" style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color:${product.color}; margin-top:2px;"></span>
          </div>
        `;
      }).join('');
      
      // Hook up clicks on Wardrobe items
      document.querySelectorAll(".scanned-item").forEach(card => {
        card.addEventListener("click", (e) => {
          const productId = e.currentTarget.getAttribute("data-id");
          selectProduct(productId);
        });
      });
    }
  }

  // 1. Render Catalog Selector Grid
  const catalogGrid = document.getElementById("garment-selector-grid");
  if (catalogGrid) {
    catalogGrid.innerHTML = PRODUCTS.map((product, idx) => {
      let categoryIcon = "👕";
      if (product.category === "Bottom") categoryIcon = "👖";
      if (product.category === "Dress") categoryIcon = "👗";
      if (product.category === "Outer") categoryIcon = "🧥";
      
      return `
        <div class="garment-card catalog-item ${idx === 0 ? 'active' : ''}" data-id="${product.id}">
          <span class="garment-card-icon">${categoryIcon}</span>
          <span class="garment-card-name">${product.name}</span>
        </div>
      `;
    }).join('');
    
    // Select product click handlers
    document.querySelectorAll(".catalog-item").forEach(card => {
      card.addEventListener("click", (e) => {
        const productId = e.currentTarget.getAttribute("data-id");
        selectProduct(productId);
      });
    });
  }

  // Select Product Flow Control
  function selectProduct(productId) {
    activeProduct = PRODUCTS.find(p => p.id === productId);
    
    // Update active class on selector grids
    document.querySelectorAll(".garment-card").forEach(card => {
      if (card.getAttribute("data-id") === productId) {
        card.classList.add("active");
      } else {
        card.classList.remove("active");
      }
    });

    if (activeStream && !hasBypassed) {
      triggerScanAndLoad(activeProduct);
    } else {
      loadProductDirect(activeProduct);
    }
  }

  // Trigger simulated tag scan cycle
  function triggerScanAndLoad(product) {
    currentState = STATE_SCANNING;
    trackingActive = false;
    trackingStatusBadge.textContent = "Scanning Tag...";
    trackingStatusBadge.className = "hud-status";
    
    dashboardDetails.style.display = "none";
    scanFeedback.style.display = "block";
    scanFeedback.textContent = `🔍 Memindai Tag: ${product.name}...`;
    
    setTimeout(() => {
      if (activeProduct.id !== product.id) return; // Prevent race conditions
      
      currentState = STATE_LOADING;
      scanFeedback.textContent = "⌛ Mengambil data produk dari server...";
      
      // Call mock api to simulate database lookup
      api.fetchProductById(product.id)
        .then(fetchedProduct => {
          if (activeProduct.id !== product.id) return;
          
          saveToHistory(fetchedProduct.id);
          updateDashboardDetails(fetchedProduct);
          
          // Call matcher to retrieve outfit suggestions
          return api.recommendOutfit(fetchedProduct, getHistory());
        })
        .then(recommendation => {
          if (activeProduct.id !== product.id) return;
          
          updateRecommendationDetails(recommendation);
          
          scanFeedback.style.display = "none";
          dashboardDetails.style.display = "block";
          currentState = STATE_TRACKING;
        })
        .catch(err => {
          console.error("API error:", err);
          scanFeedback.textContent = "⚠️ Gagal mengambil data produk.";
        });
    }, 2200);
  }

  // Fetch product directly when bypassing camera
  function loadProductDirect(product) {
    dashboardDetails.style.display = "block";
    
    api.fetchProductById(product.id)
      .then(fetchedProduct => {
        saveToHistory(fetchedProduct.id);
        updateDashboardDetails(fetchedProduct);
        return api.recommendOutfit(fetchedProduct, getHistory());
      })
      .then(recommendation => {
        updateRecommendationDetails(recommendation);
        if (hasBypassed) {
          drawBypassScreen();
        }
      })
      .catch(err => console.error("Error loading direct product:", err));
  }

  function updateDashboardDetails(product) {
    document.getElementById("eco-category").textContent = product.category;
    document.getElementById("eco-name").textContent = product.name;
    document.getElementById("eco-description").textContent = product.description;
    document.getElementById("eco-material").textContent = product.material;
    
    const ratingBadge = document.getElementById("eco-rating");
    ratingBadge.textContent = product.ecoRating;
    
    document.getElementById("eco-care").textContent = product.careGuide;
    
    // Circular meters
    const maxWaterSaved = 100;
    const maxCarbonSaved = 120;
    
    updateCirclePercent("water-fill", "water-percent", product.waterSavings, maxWaterSaved);
    document.getElementById("water-saved-desc").textContent = `Hemat ${product.waterUsage}L air`;
    
    updateCirclePercent("carbon-fill", "carbon-percent", product.carbonSavings, maxCarbonSaved);
    document.getElementById("carbon-saved-desc").textContent = `Kurang ${product.carbonFootprint}kg CO₂`;
  }

  function updateRecommendationDetails(recommendation) {
    let mixIcon = "👖";
    if (recommendation.category === "Outer") mixIcon = "🧥";
    if (recommendation.category === "Top") mixIcon = "👕";
    if (recommendation.category === "Dress") mixIcon = "👗";
    
    document.getElementById("mix-icon").textContent = mixIcon;
    document.getElementById("mix-name").textContent = recommendation.name;
    document.getElementById("mix-material").textContent = `${recommendation.material} • Hemat ${recommendation.waterUsage}L air`;
    document.getElementById("mix-category").textContent = recommendation.category;
    
    const badge = document.getElementById("mix-ownership-badge");
    if (badge) {
      if (recommendation.inWardrobe) {
        badge.textContent = "In Wardrobe";
        badge.className = "badge-ownership owned";
      } else {
        badge.textContent = "Catalog Suggestion";
        badge.className = "badge-ownership suggestion";
      }
    }
  }

  function updateCirclePercent(circleId, textId, percentValue, maxValue) {
    const circle = document.getElementById(circleId);
    const text = document.getElementById(textId);
    if (!circle || !text) return;
    
    const radius = 40;
    const circumference = 2 * Math.PI * radius; // 251.2
    const offset = circumference - (percentValue / 100) * circumference;
    
    circle.style.strokeDashoffset = offset;
    text.textContent = `${percentValue}%`;
  }

  // 2. Camera Access Control & Bypass
  function initCamera() {
    cameraCover.style.display = "none";
    loadingOverlay.style.display = "flex";
    fallbackUI.style.display = "none";
    hasBypassed = false;
    
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 }, 
        height: { ideal: 480 },
        facingMode: "user" 
      }, 
      audio: false 
    })
    .then((stream) => {
      activeStream = stream;
      webcamElement.srcObject = stream;
      webcamElement.addEventListener("loadedmetadata", () => {
        canvasElement.width = webcamElement.videoWidth;
        canvasElement.height = webcamElement.videoHeight;
        
        loadingOverlay.style.display = "none";
        cameraHud.style.display = "flex";
        catalogDrawer.style.display = "block";
        
        triggerScanAndLoad(activeProduct);
        startMediaPipe();
      });
    })
    .catch((err) => {
      console.error("Camera access denied or error:", err);
      loadingOverlay.style.display = "none";
      fallbackUI.style.display = "flex";
      trackingStatusBadge.textContent = "Kamera Ditolak";
      trackingStatusBadge.className = "hud-status";
    });
  }

  function bypassCamera() {
    hasBypassed = true;
    cameraCover.style.display = "none";
    fallbackUI.style.display = "none";
    loadingOverlay.style.display = "none";
    
    catalogDrawer.style.display = "block";
    renderWardrobe();
    
    loadProductDirect(activeProduct);
  }

  function drawBypassScreen() {
    canvasElement.width = 640;
    canvasElement.height = 480;
    
    canvasCtx.fillStyle = "#efeae0";
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);
    
    canvasCtx.fillStyle = "#122c20";
    canvasCtx.font = "italic 500 1.25rem serif";
    canvasCtx.textAlign = "center";
    canvasCtx.fillText("Kamera AR Dihindari", canvasElement.width / 2, canvasElement.height / 2 - 20);
    
    canvasCtx.fillStyle = "#647d70";
    canvasCtx.font = "14px sans-serif";
    canvasCtx.fillText("Memilih produk di katalog kanan untuk melihat data langsung.", canvasElement.width / 2, canvasElement.height / 2 + 10);
  }

  // 3. MediaPipe Pose tracking
  function startMediaPipe() {
    if (poseInstance) return; // Prevent multiple instances
    
    poseInstance = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    
    poseInstance.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    poseInstance.onResults(onResults);
    
    const fps = 30;
    let lastTime = 0;
    
    function renderLoop(time) {
      if (!activeStream || hasBypassed) return;
      
      if (time - lastTime >= 1000 / fps) {
        poseInstance.send({ image: webcamElement })
          .catch(err => console.error("Error sending frame to MediaPipe:", err));
        lastTime = time;
      }
      requestAnimationFrame(renderLoop);
    }
    requestAnimationFrame(renderLoop);
  }

  function onResults(results) {
    if (hasBypassed) return;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    if (isMirrored) {
      canvasCtx.translate(canvasElement.width, 0);
      canvasCtx.scale(-1, 1);
    }
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    
    // Only overlay clothes if in STATE_TRACKING
    if (currentState === STATE_TRACKING) {
      if (results.poseLandmarks) {
        if (!trackingActive) {
          trackingActive = true;
          trackingStatusBadge.textContent = "Tracking Aktif";
          trackingStatusBadge.className = "hud-status active";
          scanFeedback.style.display = "none";
        }

        if (showSkeleton) {
          drawSkeleton(results.poseLandmarks);
        }
        
        drawGarmentOverlay(results.poseLandmarks);
        
      } else {
        if (trackingActive) {
          trackingActive = false;
          trackingStatusBadge.textContent = "Mencari Tubuh...";
          trackingStatusBadge.className = "hud-status";
        }
        
        scanFeedback.style.display = "block";
        scanFeedback.innerHTML = "⚠️ Tubuh tidak terdeteksi. Posisikan badan di tengah.";
      }
    } else {
      // In Scanning/Loading state, clear landmarks active status
      trackingActive = false;
    }
    
    canvasCtx.restore();
  }

  function drawGarmentOverlay(landmarks) {
    const lShoulder = landmarks[11];
    const rShoulder = landmarks[12];
    const lHip = landmarks[23];
    const rHip = landmarks[24];
    
    if (!lShoulder || !rShoulder) return;
    
    const scaleX = canvasElement.width;
    const scaleY = canvasElement.height;
    
    const shoulderX = ((lShoulder.x + rShoulder.x) / 2) * scaleX;
    const shoulderY = ((lShoulder.y + rShoulder.y) / 2) * scaleY;
    
    const dx = (rShoulder.x - lShoulder.x) * scaleX;
    const dy = (rShoulder.y - lShoulder.y) * scaleY;
    const shoulderDist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    
    let overlayWidth = shoulderDist * 1.8;
    let overlayHeight = overlayWidth * 1.25;
    
    if (lHip && rHip) {
      const hipX = ((lHip.x + rHip.x) / 2) * scaleX;
      const hipY = ((lHip.y + rHip.y) / 2) * scaleY;
      const heightDist = Math.sqrt(Math.pow(hipX - shoulderX, 2) + Math.pow(hipY - shoulderY, 2));
      overlayHeight = heightDist * 1.5;
    }
    
    let yOffset = overlayHeight * 0.1;
    if (activeProduct.category === "Dress") {
      overlayWidth = shoulderDist * 2.1;
      overlayHeight = overlayWidth * 2.1;
      yOffset = overlayHeight * 0.05;
    }
    
    const garmentImg = garmentImages[activeProduct.id];
    
    if (garmentImg && garmentImg.complete && garmentImg.width > 0) {
      canvasCtx.save();
      canvasCtx.translate(shoulderX, shoulderY + yOffset);
      canvasCtx.rotate(angle);
      canvasCtx.drawImage(
        garmentImg, 
        -overlayWidth / 2, 
        0, 
        overlayWidth, 
        overlayHeight
      );
      canvasCtx.restore();
    } else {
      // Draw transparent color block representation for newly added products (e.g. Pants, Shawl)
      canvasCtx.save();
      canvasCtx.translate(shoulderX, shoulderY + yOffset);
      canvasCtx.rotate(angle);
      
      canvasCtx.fillStyle = "rgba(79, 119, 45, 0.45)"; // Soft green tint
      canvasCtx.fillRect(-overlayWidth / 2, 0, overlayWidth, overlayHeight);
      
      // Draw white text indicating garment area
      canvasCtx.fillStyle = "#ffffff";
      canvasCtx.font = "italic bold 10px sans-serif";
      canvasCtx.textAlign = "center";
      canvasCtx.fillText(activeProduct.name, 0, overlayHeight / 2);
      canvasCtx.restore();
    }
  }

  function drawSkeleton(landmarks) {
    const connections = [
      [11, 12], [11, 23], [12, 24], [23, 24]
    ];
    
    canvasCtx.lineWidth = 3;
    canvasCtx.strokeStyle = "rgba(0, 150, 136, 0.8)"; 
    canvasCtx.fillStyle = "rgba(11, 135, 86, 0.9)";   
    
    connections.forEach(([i1, i2]) => {
      const pt1 = landmarks[i1];
      const pt2 = landmarks[i2];
      if (pt1 && pt2) {
        canvasCtx.beginPath();
        canvasCtx.moveTo(pt1.x * canvasElement.width, pt1.y * canvasElement.height);
        canvasCtx.lineTo(pt2.x * canvasElement.width, pt2.y * canvasElement.height);
        canvasCtx.stroke();
      }
    });
    
    [11, 12, 23, 24].forEach(idx => {
      const pt = landmarks[idx];
      if (pt) {
        canvasCtx.beginPath();
        canvasCtx.arc(pt.x * canvasElement.width, pt.y * canvasElement.height, 6, 0, 2 * Math.PI);
        canvasCtx.fill();
      }
    });
  }

  // 4. Hook up Buttons
  startCameraBtn.addEventListener("click", () => {
    initCamera();
  });
  
  skipCameraBtn.addEventListener("click", () => {
    bypassCamera();
  });
  
  skipCameraFallbackBtn.addEventListener("click", () => {
    bypassCamera();
  });
  
  retryBtn.addEventListener("click", () => {
    initCamera();
  });
  
  toggleSkeletonBtn.addEventListener("click", () => {
    showSkeleton = !showSkeleton;
    toggleSkeletonBtn.style.borderColor = showSkeleton ? "rgba(0, 150, 136, 1)" : "#999999";
    toggleSkeletonBtn.style.color = showSkeleton ? "rgba(0, 150, 136, 1)" : "#333333";
  });
  
  mirrorBtn.addEventListener("click", () => {
    isMirrored = !isMirrored;
    mirrorBtn.style.borderColor = isMirrored ? "rgba(0, 150, 136, 1)" : "#999999";
    mirrorBtn.style.color = isMirrored ? "rgba(0, 150, 136, 1)" : "#333333";
    
    if (hasBypassed) {
      drawBypassScreen();
    }
  });

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", () => {
      clearHistory();
    });
  }

  // Init dashboard and wardrobe display on startup (idle state)
  renderWardrobe();
});
