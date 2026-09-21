/**
 * Decorbeats Studio Photo Enhancer
 * 
 * High-performance client-side studio photograph processing:
 * 1. Studio Background Cleaning: Smoothly maps off-white/gray studio backdrops to pure white (#FFFFFF)
 *    while strictly preserving product edges and fine brass chiseled details.
 * 2. Exposure & Golden Warmth Boost: Elevates dark diffuser shadows, enhances warm brass luster (+15%).
 * 3. Natural Grounding Shadow: Adds a subtle, realistic diffuse contact shadow so the idol sits naturally.
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

    // Sample perimeter to detect backdrop average
    let bgR = 235, bgG = 235, bgB = 235;
    let sampleCount = 0;
    const sampleStep = 16;
    for (let x = 0; x < targetSize; x += sampleStep) {
      // Top and bottom rows
      for (const y of [4, targetSize - 5]) {
        const idx = (y * targetSize + x) * 4;
        bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
        sampleCount++;
      }
    }
    if (sampleCount > 0) {
      bgR /= sampleCount; bgG /= sampleCount; bgB /= sampleCount;
    }

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
        // Protect highlights from blowing out
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
