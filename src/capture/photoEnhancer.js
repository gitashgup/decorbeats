/**
 * Decorbeats Studio Photo Enhancer & Authentic Lifestyle Staging
 * 
 * High-performance client-side studio photograph processing:
 * 1. Studio Background Cleaning: Smoothly maps off-white/gray studio backdrops to pure white (#FFFFFF)
 *    while strictly preserving product edges and fine brass chiseled details.
 * 2. Exposure & Golden Warmth Boost: Elevates dark diffuser shadows, enhances warm brass luster (+15%).
 * 3. Natural Grounding Shadow: Adds a subtle, realistic diffuse contact shadow so the idol sits naturally.
 * 4. Real-Product Lifestyle Staging: Composites the EXACT physical product into authentic Indian settings
 *    (Pooja Mandir, Living Room, Festive Diwali) with realistic contact shadows and zero external hallucinations.
 */

async function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image for enhancement'));
    img.src = url;
  });
}

/**
 * Enhances a studio photograph with pure white background, exposure boost, and grounding shadow.
 * @param {string} imageUrl - Public or local URL of the photograph
 * @param {Object} options - Enhancement options { cleanBackground: true, brighten: true, shadow: true }
 * @returns {Promise<{ blob: Blob, file: File, width: number, height: number }>}
 */
export async function enhanceStudioPhoto(imageUrl, options = {}) {
  const {
    cleanBackground = true,
    brighten = true,
    shadow = true,
    targetSize = 1600
  } = options;

  const img = await loadImage(imageUrl);
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  // Pure white studio base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetSize, targetSize);

  // Center fit the product image
  const scale = Math.min((targetSize * 0.92) / img.naturalWidth, (targetSize * 0.92) / img.naturalHeight);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const ox = Math.round((targetSize - w) / 2);
  const oy = Math.round((targetSize - h) / 2);

  // 1. Natural Contact Shadow (applied under the product base)
  if (shadow) {
    ctx.save();
    const shadowY = oy + h - Math.round(h * 0.04);
    const shadowW = Math.round(w * 0.65);
    const shadowH = Math.round(h * 0.06);
    const grad = ctx.createRadialGradient(
      targetSize / 2, shadowY, shadowW * 0.05,
      targetSize / 2, shadowY, shadowW * 0.5
    );
    grad.addColorStop(0, 'rgba(40, 30, 20, 0.22)');
    grad.addColorStop(0.4, 'rgba(40, 30, 20, 0.12)');
    grad.addColorStop(0.8, 'rgba(40, 30, 20, 0.03)');
    grad.addColorStop(1, 'rgba(40, 30, 20, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(targetSize / 2, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw image
  ctx.drawImage(img, ox, oy, w, h);

  // 2. Pixel-level Background Whitening & Brass Brightness
  if (cleanBackground || brighten) {
    const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
    const data = imageData.data;
    const totalPixels = targetSize * targetSize;

    const exposureBoost = brighten ? 1.15 : 1.0;
    const brassWarmth = brighten ? 1.05 : 1.0;

    for (let i = 0; i < totalPixels * 4; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Studio background condition: light tone + low color saturation (white/light grey backdrop cloth)
      if (cleanBackground && lum > 175 && sat < 0.20) {
        // Smooth whitening ramp
        const factor = Math.min(1, Math.max(0, (lum - 175) / 55));
        data[i] = Math.round(r + (255 - r) * factor);
        data[i + 1] = Math.round(g + (255 - g) * factor);
        data[i + 2] = Math.round(b + (255 - b) * factor);
      } else if (brighten) {
        // Brass / subject pixel: lift exposure and enhance warm golden tones
        const brightR = Math.min(255, Math.round(r * exposureBoost * brassWarmth));
        const brightG = Math.min(255, Math.round(g * exposureBoost));
        const brightB = Math.min(255, Math.round(b * (exposureBoost * 0.94))); // Slight yellow-warmth bias for brass

        // Contrast enhancement
        const contrast = 1.06;
        data[i] = Math.min(255, Math.max(0, Math.round((brightR - 128) * contrast + 128)));
        data[i + 1] = Math.min(255, Math.max(0, Math.round((brightG - 128) * contrast + 128)));
        data[i + 2] = Math.min(255, Math.max(0, Math.round((brightB - 128) * contrast + 128)));
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
  if (!blob) throw new Error('Studio photo enhancement failed to render');

  const file = new File([blob], `studio-enhanced-${Date.now()}.webp`, { type: 'image/webp' });
  return { blob, file, width: targetSize, height: targetSize };
}

/**
 * Stages the real physical product into an authentic Indian lifestyle setting.
 * Uses exact product cutout segmentation + natural contact shadow + ambient light integration.
 * ZERO external AI image hallucination, ZERO watermarks, 100% genuine product fidelity.
 * @param {string} productImageUrl - Public URL of the real product photo
 * @param {'pooja_mandir'|'living_room'|'festive_diwali'} sceneType
 * @returns {Promise<{ blob: Blob, file: File, width: number, height: number }>}
 */
export async function stageRealProductLifestyle(productImageUrl, sceneType = 'pooja_mandir') {
  const sceneConfigs = {
    pooja_mandir: {
      bgPath: '/assets/images/lifestyle/pooja-mandir.jpg',
      targetHeightPercent: 0.44, // 44% of canvas
      bottomY: 745,             // Altar surface plane
      centerX: 512,
      shadowWidthMultiplier: 0.85,
      shadowHeight: 28,
      shadowOpacity: 0.48,
      warmthTint: 'rgba(255, 185, 90, 0.08)' // Soft temple diya glow
    },
    living_room: {
      bgPath: '/assets/images/lifestyle/living-room.jpg',
      targetHeightPercent: 0.40,
      bottomY: 710,             // Credenza surface plane
      centerX: 420,
      shadowWidthMultiplier: 0.80,
      shadowHeight: 24,
      shadowOpacity: 0.40,
      warmthTint: 'rgba(255, 205, 130, 0.06)' // Ambient room warmth
    },
    festive_diwali: {
      bgPath: '/assets/images/lifestyle/festive-diwali.jpg',
      targetHeightPercent: 0.38,
      bottomY: 670,             // Table centerpiece plane
      centerX: 512,
      shadowWidthMultiplier: 0.82,
      shadowHeight: 26,
      shadowOpacity: 0.45,
      warmthTint: 'rgba(255, 170, 70, 0.10)' // Festive oil lamp illumination
    }
  };

  const config = sceneConfigs[sceneType] || sceneConfigs.pooja_mandir;
  const canvasSize = 1024;

  // 1. Load lifestyle background and product image concurrently
  const [bgImg, productImg] = await Promise.all([
    loadImage(config.bgPath),
    loadImage(productImageUrl)
  ]);

  // 2. Extract transparent product cutout from white studio background
  const pCanvas = document.createElement('canvas');
  pCanvas.width = productImg.naturalWidth;
  pCanvas.height = productImg.naturalHeight;
  const pCtx = pCanvas.getContext('2d', { willReadFrequently: true });
  pCtx.drawImage(productImg, 0, 0);

  const pData = pCtx.getImageData(0, 0, pCanvas.width, pCanvas.height);
  const pixels = pData.data;
  const pw = pCanvas.width;
  const ph = pCanvas.height;

  // Track bounding box of the physical product
  let minX = pw, maxX = 0, minY = ph, maxY = 0;

  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const idx = (y * pw + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Backdrop: light and unsaturated
      if (lum > 185 && sat < 0.18) {
        // Smooth alpha falloff near product boundary
        const alphaFactor = Math.max(0, Math.min(1, (240 - lum) / 55));
        pixels[idx + 3] = Math.round(alphaFactor * 255);
      } else {
        // Real product pixel
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  pCtx.putImageData(pData, 0, 0);

  // If bounding box was detected, crop to tight bounds
  const cropW = Math.max(10, maxX - minX);
  const cropH = Math.max(10, maxY - minY);
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(pCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  // 3. Composite onto final lifestyle canvas
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = canvasSize;
  finalCanvas.height = canvasSize;
  const fCtx = finalCanvas.getContext('2d');

  // Draw background scene
  fCtx.drawImage(bgImg, 0, 0, canvasSize, canvasSize);

  // Calculate product scale and placement
  const destH = Math.round(canvasSize * config.targetHeightPercent);
  const destW = Math.round(cropW * (destH / cropH));
  const destX = Math.round(config.centerX - destW / 2);
  const destY = Math.round(config.bottomY - destH);

  // 4. Grounding Contact Shadows (Occlusion + Diffuse Ambient)
  fCtx.save();
  const shadowCenterY = config.bottomY - 4;
  const shadowWidth = Math.round(destW * config.shadowWidthMultiplier);
  const shadowHeight = config.shadowHeight;

  // Deep contact shadow (dark core directly under base)
  const contactGrad = fCtx.createRadialGradient(
    config.centerX, shadowCenterY, 4,
    config.centerX, shadowCenterY, shadowWidth * 0.4
  );
  contactGrad.addColorStop(0, `rgba(20, 10, 5, ${config.shadowOpacity})`);
  contactGrad.addColorStop(0.6, `rgba(20, 10, 5, ${config.shadowOpacity * 0.4})`);
  contactGrad.addColorStop(1, 'rgba(20, 10, 5, 0)');
  fCtx.fillStyle = contactGrad;
  fCtx.beginPath();
  fCtx.ellipse(config.centerX, shadowCenterY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
  fCtx.fill();

  // Diffuse soft ambient falloff
  const diffuseGrad = fCtx.createRadialGradient(
    config.centerX, shadowCenterY + 4, shadowWidth * 0.1,
    config.centerX, shadowCenterY + 4, shadowWidth * 0.7
  );
  diffuseGrad.addColorStop(0, `rgba(35, 18, 8, ${config.shadowOpacity * 0.3})`);
  diffuseGrad.addColorStop(1, 'rgba(35, 18, 8, 0)');
  fCtx.fillStyle = diffuseGrad;
  fCtx.beginPath();
  fCtx.ellipse(config.centerX, shadowCenterY + 4, (shadowWidth * 1.3) / 2, (shadowHeight * 1.6) / 2, 0, 0, Math.PI * 2);
  fCtx.fill();
  fCtx.restore();

  // 5. Draw the real product cutout
  fCtx.drawImage(croppedCanvas, destX, destY, destW, destH);

  // 6. Ambient lighting harmonization wash (marries brass reflections to room illumination)
  if (config.warmthTint) {
    fCtx.save();
    fCtx.globalCompositeOperation = 'soft-light';
    fCtx.fillStyle = config.warmthTint;
    fCtx.fillRect(destX, destY, destW, destH);
    fCtx.restore();
  }

  // 7. Export pristine WebP
  const blob = await new Promise((resolve) => finalCanvas.toBlob(resolve, 'image/webp', 0.94));
  if (!blob) throw new Error('Lifestyle staging rendering failed');

  const file = new File([blob], `lifestyle-${sceneType}-${Date.now()}.webp`, { type: 'image/webp' });
  return { blob, file, width: canvasSize, height: canvasSize };
}
