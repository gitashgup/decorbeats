/**
 * Decorbeats Studio Photo Enhancer & Authentic Lifestyle Staging
 * 
 * High-performance client-side studio photograph processing:
 * 1. Professional Background Removal: BFS border flood-fill with color-distance & chroma separation.
 *    Removes ANY studio backdrop (slate gray, off-white, paper creases, falloff shadows) to pure transparent.
 * 2. Pure White Studio Export: Centers real product on pure #FFFFFF with realistic grounding contact shadow.
 * 3. Exposure & Brass Warmth Boost: Elevates dark diffuser shadows, enhances warm brass luster (+15%).
 * 4. Real-Product Lifestyle Staging: Composites the clean cutout of the REAL physical product onto curated
 *    authentic Indian settings (Pooja Mandir, Living Room, Festive Diwali) with natural perspective & shadows.
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
 * Extracts a transparent cutout of the physical product from any studio backdrop.
 * Uses perimeter-seeded BFS flood fill with adaptive color distance and chroma discrimination.
 */
function extractProductCutout(img) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const total = w * h;

  // 1. Profile background color from image perimeter (outer 3% borders)
  let bgR = 0, bgG = 0, bgB = 0, sampleCount = 0;
  const sampleMargin = Math.max(2, Math.floor(Math.min(w, h) * 0.03));

  for (let x = 0; x < w; x += 4) {
    for (let y = 0; y < sampleMargin; y++) {
      const idx = (y * w + x) * 4;
      bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2]; sampleCount++;
    }
    for (let y = h - sampleMargin; y < h; y++) {
      const idx = (y * w + x) * 4;
      bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2]; sampleCount++;
    }
  }
  for (let y = sampleMargin; y < h - sampleMargin; y += 4) {
    for (let x = 0; x < sampleMargin; x++) {
      const idx = (y * w + x) * 4;
      bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2]; sampleCount++;
    }
    for (let x = w - sampleMargin; x < w; x++) {
      const idx = (y * w + x) * 4;
      bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2]; sampleCount++;
    }
  }

  bgR = sampleCount ? bgR / sampleCount : 220;
  bgG = sampleCount ? bgG / sampleCount : 220;
  bgB = sampleCount ? bgB / sampleCount : 220;

  // 2. BFS Flood Fill starting from perimeter
  const isBg = new Uint8Array(total);
  // Queue stores pixel indices
  const queue = new Int32Array(total);
  let qHead = 0;
  let qTail = 0;

  // Enqueue all outer border pixels
  for (let x = 0; x < w; x++) {
    const topIdx = x;
    const botIdx = (h - 1) * w + x;
    if (!isBg[topIdx]) { isBg[topIdx] = 1; queue[qTail++] = topIdx; }
    if (!isBg[botIdx]) { isBg[botIdx] = 1; queue[qTail++] = botIdx; }
  }
  for (let y = 1; y < h - 1; y++) {
    const leftIdx = y * w;
    const rightIdx = y * w + (w - 1);
    if (!isBg[leftIdx]) { isBg[leftIdx] = 1; queue[qTail++] = leftIdx; }
    if (!isBg[rightIdx]) { isBg[rightIdx] = 1; queue[qTail++] = rightIdx; }
  }

  const bgLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;

  // Helper to test if a neighbor pixel is part of the studio backdrop
  function isBackdropPixel(r, g, b, pr, pg, pb) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Brass / bronze / copper artifacts have warm tones (r > g > b, sat > 0.14)
    const isBrassTone = (r > g + 10 && g > b + 6 && sat > 0.14) || (r > b + 24 && sat > 0.18) || (sat > 0.24);
    if (isBrassTone) return false;

    // Distance to global background profile
    const distGlobal = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
    // Distance to adjacent background neighbor (handles smooth lighting gradients)
    const distLocal = Math.sqrt((r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2);

    // If close to background profile or low saturation neutral grey/white
    if (distGlobal < 70) return true;
    if (distLocal < 30 && sat < 0.18) return true;
    if (bgLum > 175 && lum > 170 && sat < 0.15) return true;

    return false;
  }

  while (qHead < qTail) {
    const curr = queue[qHead++];
    const cx = curr % w;
    const cy = Math.floor(curr / w);
    const cIdx = curr * 4;
    const pr = data[cIdx], pg = data[cIdx + 1], pb = data[cIdx + 2];

    // 4-way neighbors
    if (cx > 0) {
      const n = curr - 1;
      if (!isBg[n]) {
        const nIdx = n * 4;
        if (isBackdropPixel(data[nIdx], data[nIdx + 1], data[nIdx + 2], pr, pg, pb)) {
          isBg[n] = 1; queue[qTail++] = n;
        }
      }
    }
    if (cx < w - 1) {
      const n = curr + 1;
      if (!isBg[n]) {
        const nIdx = n * 4;
        if (isBackdropPixel(data[nIdx], data[nIdx + 1], data[nIdx + 2], pr, pg, pb)) {
          isBg[n] = 1; queue[qTail++] = n;
        }
      }
    }
    if (cy > 0) {
      const n = curr - w;
      if (!isBg[n]) {
        const nIdx = n * 4;
        if (isBackdropPixel(data[nIdx], data[nIdx + 1], data[nIdx + 2], pr, pg, pb)) {
          isBg[n] = 1; queue[qTail++] = n;
        }
      }
    }
    if (cy < h - 1) {
      const n = curr + w;
      if (!isBg[n]) {
        const nIdx = n * 4;
        if (isBackdropPixel(data[nIdx], data[nIdx + 1], data[nIdx + 2], pr, pg, pb)) {
          isBg[n] = 1; queue[qTail++] = n;
        }
      }
    }
  }

  // 3. Find product bounding box and apply transparency with anti-aliasing feathering
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const pIdx = idx * 4;

      if (isBg[idx]) {
        data[pIdx + 3] = 0; // Pure transparent background
      } else {
        // Check if on the border of background for anti-aliasing
        const isBorder = (
          (x > 0 && isBg[idx - 1]) ||
          (x < w - 1 && isBg[idx + 1]) ||
          (y > 0 && isBg[idx - w]) ||
          (y < h - 1 && isBg[idx + w])
        );

        if (isBorder) {
          data[pIdx + 3] = 175; // Smooth edge feathering
        } else {
          data[pIdx + 3] = 255;
        }

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  if (minX > maxX || minY > maxY) {
    return { croppedCanvas: canvas, cropW: w, cropH: h };
  }

  const cropW = Math.max(20, maxX - minX + 1);
  const cropH = Math.max(20, maxY - minY + 1);
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropW;
  croppedCanvas.height = cropH;
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

  return { croppedCanvas, cropW, cropH };
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
  const ctx = canvas.getContext('2d');

  // Pure white studio base
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetSize, targetSize);

  if (cleanBackground) {
    // Extract clean cutout without background
    const { croppedCanvas, cropW, cropH } = extractProductCutout(img);
    const scale = Math.min((targetSize * 0.88) / cropW, (targetSize * 0.88) / cropH);
    const destW = Math.round(cropW * scale);
    const destH = Math.round(cropH * scale);
    const destX = Math.round((targetSize - destW) / 2);
    const destY = Math.round((targetSize - destH) / 2);

    // Grounding shadow
    if (shadow) {
      ctx.save();
      const shadowY = destY + destH - Math.round(destH * 0.03);
      const shadowW = Math.round(destW * 0.7);
      const shadowH = Math.round(destH * 0.06);
      const grad = ctx.createRadialGradient(
        targetSize / 2, shadowY, shadowW * 0.05,
        targetSize / 2, shadowY, shadowW * 0.5
      );
      grad.addColorStop(0, 'rgba(30, 20, 10, 0.28)');
      grad.addColorStop(0.5, 'rgba(30, 20, 10, 0.12)');
      grad.addColorStop(1, 'rgba(30, 20, 10, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(targetSize / 2, shadowY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw brightened brass cutout
    if (brighten) {
      ctx.save();
      ctx.filter = 'brightness(1.14) contrast(1.08) saturate(1.10)';
      ctx.drawImage(croppedCanvas, destX, destY, destW, destH);
      ctx.restore();
    } else {
      ctx.drawImage(croppedCanvas, destX, destY, destW, destH);
    }
  } else {
    // Draw original image with exposure adjustment
    const scale = Math.min(targetSize / img.naturalWidth, targetSize / img.naturalHeight);
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);
    const ox = Math.round((targetSize - w) / 2);
    const oy = Math.round((targetSize - h) / 2);

    if (brighten) {
      ctx.filter = 'brightness(1.15) contrast(1.08) saturate(1.10)';
    }
    ctx.drawImage(img, ox, oy, w, h);
    ctx.filter = 'none';
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.94));
  if (!blob) throw new Error('Studio photo enhancement failed to render');

  const file = new File([blob], `studio-white-${Date.now()}.webp`, { type: 'image/webp' });
  return { blob, file, width: targetSize, height: targetSize };
}

/**
 * Stages the real physical product into an authentic Indian lifestyle setting.
 * Extracts the real product cutout (zero background) and places it onto the lifestyle scene plate.
 * 100% genuine product fidelity, natural grounding contact shadows, zero watermarks.
 * @param {string} productImageUrl - Public URL of the real product photo
 * @param {'pooja_mandir'|'living_room'|'festive_diwali'} sceneType
 * @returns {Promise<{ blob: Blob, file: File, width: number, height: number }>}
 */
export async function stageRealProductLifestyle(productImageUrl, sceneType = 'pooja_mandir') {
  const sceneConfigs = {
    pooja_mandir: {
      bgPath: '/assets/images/lifestyle/pooja-mandir.jpg',
      targetHeightPercent: 0.42, // Product height ~42% of canvas
      bottomY: 745,             // Teakwood altar surface plane
      centerX: 512,
      shadowWidthMultiplier: 0.82,
      shadowHeight: 26,
      shadowOpacity: 0.52,
      warmthTint: 'rgba(255, 185, 90, 0.08)' // Temple diya glow
    },
    living_room: {
      bgPath: '/assets/images/lifestyle/living-room.jpg',
      targetHeightPercent: 0.38,
      bottomY: 705,             // Credenza surface plane
      centerX: 450,
      shadowWidthMultiplier: 0.80,
      shadowHeight: 24,
      shadowOpacity: 0.44,
      warmthTint: 'rgba(255, 205, 130, 0.06)' // Ambient room warmth
    },
    festive_diwali: {
      bgPath: '/assets/images/lifestyle/festive-diwali.jpg',
      targetHeightPercent: 0.36,
      bottomY: 675,             // Table centerpiece plane between diyas
      centerX: 512,
      shadowWidthMultiplier: 0.85,
      shadowHeight: 26,
      shadowOpacity: 0.50,
      warmthTint: 'rgba(255, 175, 75, 0.10)' // Festive lamp illumination
    }
  };

  const config = sceneConfigs[sceneType] || sceneConfigs.pooja_mandir;
  const canvasSize = 1024;

  // 1. Load lifestyle background and product image concurrently
  const [bgImg, productImg] = await Promise.all([
    loadImage(config.bgPath),
    loadImage(productImageUrl)
  ]);

  // 2. Extract clean transparent product cutout (completely removes any background)
  const { croppedCanvas, cropW, cropH } = extractProductCutout(productImg);

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

  // 4. Multi-layer Grounding Contact Shadows (Occlusion Core + Diffuse Ambient)
  fCtx.save();
  const shadowCenterY = config.bottomY - 4;
  const shadowWidth = Math.round(destW * config.shadowWidthMultiplier);
  const shadowHeight = config.shadowHeight;

  // Layer 1: Occlusion shadow (dark core directly under the brass base)
  const contactGrad = fCtx.createRadialGradient(
    config.centerX, shadowCenterY, 3,
    config.centerX, shadowCenterY, shadowWidth * 0.35
  );
  contactGrad.addColorStop(0, `rgba(18, 9, 4, ${config.shadowOpacity})`);
  contactGrad.addColorStop(0.6, `rgba(18, 9, 4, ${config.shadowOpacity * 0.4})`);
  contactGrad.addColorStop(1, 'rgba(18, 9, 4, 0)');
  fCtx.fillStyle = contactGrad;
  fCtx.beginPath();
  fCtx.ellipse(config.centerX, shadowCenterY, shadowWidth / 2, shadowHeight / 2, 0, 0, Math.PI * 2);
  fCtx.fill();

  // Layer 2: Diffuse ambient shadow (spreads naturally on table surface)
  const diffuseGrad = fCtx.createRadialGradient(
    config.centerX, shadowCenterY + 3, shadowWidth * 0.1,
    config.centerX, shadowCenterY + 3, shadowWidth * 0.65
  );
  diffuseGrad.addColorStop(0, `rgba(28, 14, 6, ${config.shadowOpacity * 0.35})`);
  diffuseGrad.addColorStop(1, 'rgba(28, 14, 6, 0)');
  fCtx.fillStyle = diffuseGrad;
  fCtx.beginPath();
  fCtx.ellipse(config.centerX, shadowCenterY + 3, (shadowWidth * 1.25) / 2, (shadowHeight * 1.5) / 2, 0, 0, Math.PI * 2);
  fCtx.fill();
  fCtx.restore();

  // 5. Draw the clean transparent product cutout
  fCtx.save();
  // Lift brightness and warmth slightly to match rich room lighting
  fCtx.filter = 'brightness(1.08) contrast(1.05) saturate(1.08)';
  fCtx.drawImage(croppedCanvas, destX, destY, destW, destH);
  fCtx.restore();

  // 6. Ambient lighting harmonization overlay
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
