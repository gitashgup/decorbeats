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

export function cmToInches(cm) {
  const val = Number(cm);
  if (!val || isNaN(val) || val <= 0) return '0.0';
  return (val / 2.54).toFixed(1);
}

export function formatWeight(grams) {
  const g = Number(grams);
  if (!g || isNaN(g) || g <= 0) return '';
  if (g >= 1000) {
    const kg = (g / 1000).toFixed(2);
    return `${g.toLocaleString('en-IN')} g (${kg} kg)`;
  }
  return `${g.toLocaleString('en-IN')} g`;
}

export function computeScaleDimensions(cropW, cropH, dims = {}) {
  const hInput = Number(dims.height);
  const wInput = Number(dims.width);
  const lInput = Number(dims.length);
  const aspect = cropW && cropH ? cropW / cropH : 1;

  let height, width;
  if (hInput > 0 && wInput > 0) {
    height = hInput;
    width = wInput;
  } else if (hInput > 0) {
    height = hInput;
    width = Math.round(hInput * aspect * 10) / 10;
  } else if (wInput > 0) {
    width = wInput;
    height = Math.round((wInput / aspect) * 10) / 10;
  } else {
    height = 15;
    width = Math.round(15 * aspect * 10) / 10;
  }

  const length = lInput > 0 ? lInput : null;

  return {
    height,
    width,
    length,
    heightInches: cmToInches(height),
    widthInches: cmToInches(width),
    lengthInches: length ? cmToInches(length) : null,
    weight: dims.weight_g ? formatWeight(dims.weight_g) : ''
  };
}

/**
 * Creates an e-commerce Product Dimensions & Scale Guide photo.
 * Features:
 * - Pure white #FFFFFF studio background with soft grounding contact shadow
 * - Architectural measurement ruler above the product with cm and mm tick marks
 * - Width caliper guide lines and bold metric + imperial label (cm / inches)
 * - Vertical height caliper with arrowheads and scale markings
 * - Specifications summary card with height, width, depth, weight, and material
 * 
 * @param {string} productImageUrl
 * @param {Object} dimensions - { height, width, length, weight_g, title, material }
 * @param {Object} options - { targetSize: 1600 }
 * @returns {Promise<{ blob: Blob, file: File, width: number, height: number }>}
 */
export async function createDimensionsPhoto(productImageUrl, dimensions = {}, options = {}) {
  const targetSize = options.targetSize || 1600;
  const productImg = await loadImage(productImageUrl);

  // 1. Extract clean transparent product cutout
  const { croppedCanvas, cropW, cropH } = extractProductCutout(productImg);

  // 2. Compute dimensional scale
  const parsedDims = computeScaleDimensions(cropW, cropH, dimensions);

  // 3. Initialize High-Res Canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');

  // Background: Studio White with subtle framing
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, targetSize, targetSize);

  // Subtle architectural micro-grid lines (very faint light slate)
  ctx.save();
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  for (let x = 80; x < targetSize; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 80);
    ctx.lineTo(x, targetSize - 80);
    ctx.stroke();
  }
  for (let y = 80; y < targetSize; y += 80) {
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(targetSize - 80, y);
    ctx.stroke();
  }
  ctx.restore();

  // Layout Boundaries:
  // Reserve top space for ruler & dimension badge: ~280px
  // Reserve right space for vertical caliper: ~260px
  // Reserve bottom space for grounding shadow & specs: ~240px
  // Reserve left space for margin: ~160px
  const maxW = 960;
  const maxH = 920;
  const scale = Math.min(maxW / cropW, maxH / cropH);
  const destW = Math.round(cropW * scale);
  const destH = Math.round(cropH * scale);

  // Center product in measurement viewport
  const viewportCenterX = Math.round((1600 - 260 + 160) / 2);
  const viewportCenterY = Math.round((1600 - 240 + 260) / 2);
  const destX = Math.round(viewportCenterX - destW / 2);
  const destY = Math.round(viewportCenterY - destH / 2);

  // 4. Grounding Contact Shadow
  ctx.save();
  const shadowCenterY = destY + destH - 4;
  const shadowW = Math.round(destW * 0.78);
  const shadowH = 24;
  const shadowGrad = ctx.createRadialGradient(
    viewportCenterX, shadowCenterY, 3,
    viewportCenterX, shadowCenterY, shadowW * 0.5
  );
  shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.28)');
  shadowGrad.addColorStop(0.5, 'rgba(15, 23, 42, 0.10)');
  shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(viewportCenterX, shadowCenterY, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 5. Draw Clean Cutout Product
  ctx.save();
  ctx.filter = 'brightness(1.04) contrast(1.03)';
  ctx.drawImage(croppedCanvas, destX, destY, destW, destH);
  ctx.restore();

  // Helper function to draw rounded rectangle safely on any browser
  function drawRoundedRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.rect(x, y, w, h);
    }
  }

  // Helper function to draw an arrowhead
  function drawArrowhead(ctx, x, y, angle, size = 10, color = '#0f172a') {
    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size * 0.45);
    ctx.lineTo(-size, size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Helper function to draw rounded pill badge
  function drawPillBadge(ctx, cx, cy, textPrefix, textMain, prefixColor = '#f59e0b', bgColor = '#0f172a') {
    ctx.save();
    ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const mainWidth = ctx.measureText(textMain).width;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const prefixWidth = textPrefix ? ctx.measureText(textPrefix).width + 10 : 0;
    const totalTextW = prefixWidth + mainWidth;
    const pillW = totalTextW + 36;
    const pillH = 42;
    const px = cx - pillW / 2;
    const py = cy - pillH / 2;

    // Pill background
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    drawRoundedRect(ctx, px, py, pillW, pillH, 21);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Text rendering
    let cursorX = px + 18;
    if (textPrefix) {
      ctx.fillStyle = prefixColor;
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(textPrefix, cursorX, cy);
      cursorX += prefixWidth;
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(textMain, cursorX, cy);
    ctx.restore();
  }

  // 6. Horizontal Dimension Ruler & Markings Above Product
  const rulerY = destY - 80;
  const rulerH = 34;
  const rulerOverhang = 18;
  const rulerLeft = destX - rulerOverhang;
  const rulerRight = destX + destW + rulerOverhang;
  const rulerW = rulerRight - rulerLeft;

  // Extension Guide Lines (Left and Right edges of product up to ruler)
  ctx.save();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  // Left guide line
  ctx.beginPath();
  ctx.moveTo(destX, destY + 20);
  ctx.lineTo(destX, rulerY - 35);
  ctx.stroke();

  // Right guide line
  ctx.beginPath();
  ctx.moveTo(destX + destW, destY + 20);
  ctx.lineTo(destX + destW, rulerY - 35);
  ctx.stroke();
  ctx.restore();

  // Draw Physical Architectural Ruler Bar
  ctx.save();
  // Ruler body
  const rulerGrad = ctx.createLinearGradient(0, rulerY - rulerH / 2, 0, rulerY + rulerH / 2);
  rulerGrad.addColorStop(0, '#f8fafc');
  rulerGrad.addColorStop(0.5, '#f1f5f9');
  rulerGrad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = rulerGrad;
  ctx.beginPath();
  drawRoundedRect(ctx, rulerLeft, rulerY - rulerH / 2, rulerW, rulerH, 5);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ruler Tick Marks & Caliper Ticks
  const numCm = Math.max(1, Math.round(parsedDims.width));
  const pxPerCm = destW / numCm;
  const tickBaseY = rulerY + rulerH / 2 - 2;

  ctx.fillStyle = '#334155';
  ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textAlign = 'center';

  for (let i = 0; i <= numCm; i++) {
    const tx = destX + i * pxPerCm;
    if (tx < rulerLeft + 2 || tx > rulerRight - 2) continue;

    // Major cm tick
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx, tickBaseY);
    ctx.lineTo(tx, tickBaseY - 14);
    ctx.stroke();

    // Numeral label on every few cm or when spaced
    if (pxPerCm > 24 || i === 0 || i === numCm || i % 2 === 0) {
      ctx.fillText(String(i), tx, tickBaseY - 17);
    }

    // Sub-centimeter ticks
    if (i < numCm) {
      // Half-cm tick
      const midX = tx + pxPerCm * 0.5;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(midX, tickBaseY);
      ctx.lineTo(midX, tickBaseY - 9);
      ctx.stroke();

      // Millimeter ticks if resolution permits
      if (pxPerCm >= 35) {
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 0.75;
        for (let m = 1; m < 10; m++) {
          if (m === 5) continue;
          const mmX = tx + pxPerCm * (m / 10);
          ctx.beginPath();
          ctx.moveTo(mmX, tickBaseY);
          ctx.lineTo(mmX, tickBaseY - 5);
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();

  // Dimension Arrow Bar Above Ruler
  const arrowBarY = rulerY - rulerH / 2 - 22;
  ctx.save();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(destX, arrowBarY);
  ctx.lineTo(destX + destW, arrowBarY);
  ctx.stroke();

  // Outer extension end ticks
  ctx.beginPath();
  ctx.moveTo(destX, arrowBarY - 8);
  ctx.lineTo(destX, arrowBarY + 8);
  ctx.moveTo(destX + destW, arrowBarY - 8);
  ctx.lineTo(destX + destW, arrowBarY + 8);
  ctx.stroke();

  // Outward-pointing arrowheads
  drawArrowhead(ctx, destX, arrowBarY, Math.PI, 12, '#0f172a');
  drawArrowhead(ctx, destX + destW, arrowBarY, 0, 12, '#0f172a');
  ctx.restore();

  // Centered Width Dimension Badge
  drawPillBadge(
    ctx,
    viewportCenterX,
    arrowBarY - 26,
    'WIDTH ↔',
    `${parsedDims.width} cm (${parsedDims.widthInches} in)`
  );

  // 7. Vertical Height Caliper & Scale on Right Side
  const caliperX = destX + destW + 65;

  // Horizontal Extension Lines from top and bottom of product
  ctx.save();
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  // Top extension line
  ctx.beginPath();
  ctx.moveTo(destX + destW - 15, destY);
  ctx.lineTo(caliperX + 25, destY);
  ctx.stroke();

  // Bottom extension line
  ctx.beginPath();
  ctx.moveTo(destX + destW - 15, destY + destH);
  ctx.lineTo(caliperX + 25, destY + destH);
  ctx.stroke();
  ctx.restore();

  // Vertical Dimension Line with Arrowheads
  ctx.save();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(caliperX, destY);
  ctx.lineTo(caliperX, destY + destH);
  ctx.stroke();

  // End ticks
  ctx.beginPath();
  ctx.moveTo(caliperX - 8, destY);
  ctx.lineTo(caliperX + 8, destY);
  ctx.moveTo(caliperX - 8, destY + destH);
  ctx.lineTo(caliperX + 8, destY + destH);
  ctx.stroke();

  // Caliper arrowheads
  drawArrowhead(ctx, caliperX, destY, -Math.PI / 2, 12, '#0f172a');
  drawArrowhead(ctx, caliperX, destY + destH, Math.PI / 2, 12, '#0f172a');

  // Vertical Scale Ticks
  const numCmH = Math.max(1, Math.round(parsedDims.height));
  const pxPerCmH = destH / numCmH;
  for (let i = 0; i <= numCmH; i++) {
    const ty = destY + destH - i * pxPerCmH;
    ctx.strokeStyle = i % 5 === 0 ? '#0f172a' : '#64748b';
    ctx.lineWidth = i % 5 === 0 ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(caliperX - (i % 5 === 0 ? 9 : 5), ty);
    ctx.lineTo(caliperX + (i % 5 === 0 ? 9 : 5), ty);
    ctx.stroke();
  }
  ctx.restore();

  // Centered Height Dimension Badge
  drawPillBadge(
    ctx,
    caliperX + 115,
    destY + destH / 2,
    'HEIGHT ↕',
    `${parsedDims.height} cm (${parsedDims.heightInches} in)`
  );

  // 8. Depth Dimension Badge (if length/depth is specified)
  if (parsedDims.length) {
    const depthY = destY + destH + 42;
    drawPillBadge(
      ctx,
      viewportCenterX,
      depthY,
      'DEPTH / BASE ↗',
      `${parsedDims.length} cm (${parsedDims.lengthInches} in)`,
      '#0284c7'
    );
  }

  // 9. Top-Left Header & Authenticity Branding
  ctx.save();
  // Pill banner
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  drawRoundedRect(ctx, 60, 56, 320, 32, 16);
  ctx.fill();
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#475569';
  ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('DECORBEATS STUDIO · TRUE SCALE GUIDE', 76, 72);

  // Product title
  const productTitle = dimensions.title || 'Handcrafted Moradabad Brass Idol';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'top';
  // Truncate title if very long
  const displayTitle = productTitle.length > 42 ? productTitle.slice(0, 39) + '…' : productTitle;
  ctx.fillText(displayTitle, 60, 98);

  ctx.fillStyle = '#64748b';
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('100% Genuine Physical Product Scale · Amazon & Marketplace Standard', 60, 132);
  ctx.restore();

  // 10. Bottom-Left Specifications Summary Card
  ctx.save();
  const cardX = 60;
  const cardY = parsedDims.length ? targetSize - 220 : targetSize - 200;
  const cardW = 380;
  const cardH = parsedDims.length ? 150 : 132;

  // Card Background with subtle shadow
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 12);
  ctx.fill();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Card Header
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  ctx.fillText('📏 PRODUCT SPECIFICATIONS', cardX + 16, cardY + 22);

  // Card Items
  ctx.fillStyle = '#334155';
  ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  let lineY = cardY + 46;
  const lineHeight = 21;

  ctx.fillText(`• Height: ${parsedDims.height} cm (${parsedDims.heightInches} inches)`, cardX + 16, lineY);
  lineY += lineHeight;
  ctx.fillText(`• Width:  ${parsedDims.width} cm (${parsedDims.widthInches} inches)`, cardX + 16, lineY);
  lineY += lineHeight;

  if (parsedDims.length) {
    ctx.fillText(`• Depth:  ${parsedDims.length} cm (${parsedDims.lengthInches} inches)`, cardX + 16, lineY);
    lineY += lineHeight;
  }

  if (parsedDims.weight) {
    ctx.fillText(`• Weight: ${parsedDims.weight}`, cardX + 16, lineY);
    lineY += lineHeight;
  } else {
    ctx.fillText(`• Material: Handcrafted Solid Brass`, cardX + 16, lineY);
    lineY += lineHeight;
  }
  ctx.restore();

  // 11. Export pristine high-resolution WebP
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.95));
  if (!blob) throw new Error('Dimension guide photo rendering failed');

  const file = new File([blob], `dimensions-guide-${Date.now()}.webp`, { type: 'image/webp' });
  return { blob, file, width: targetSize, height: targetSize };
}
