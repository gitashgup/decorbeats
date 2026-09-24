function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch {}
  }
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

export function parseAsin(input) {
  if (!input) return null;
  const str = String(input).trim();
  const m = str.match(/(?:dp|product|\/d\/)?\/([A-Z0-9]{10})(?:[/?#]|$)/i) || str.match(/\b([A-Z0-9]{10})\b/i);
  return m ? m[1].toUpperCase() : null;
}

export async function scrapeAmazonProduct(asin) {
  const url = `https://www.amazon.in/dp/${asin}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-IN,en-GB;q=0.9,en;q=0.8',
      'Cache-Control': 'no-cache'
    }
  });

  if (!res.ok) {
    throw new Error(`Amazon.in returned HTTP ${res.status}. Please check the ASIN or try again.`);
  }

  const html = await res.text();

  // Title
  let title = '';
  const titleMatch = html.match(/<span id="productTitle"[^>]*>([\s\S]*?)<\/span>/i) || html.match(/<title>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/<[^>]+>/g, '').replace(/\s*:\s*Amazon\.[a-z.]+.*$/i, '').trim();
  }

  // Price
  let price = null;
  const pMatch = html.match(/class="a-price-whole">([0-9,]+)/) ||
                html.match(/class="[^\"]*price[^\"]*"[^>]*>₹?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  if (pMatch) price = Number(pMatch[1].replace(/,/g, ''));

  // Specs
  const specs = {};
  const sMatches = html.matchAll(/<tr[^>]*>[\s\S]*?<th[^>]*>([\s\S]*?)<\/th>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi);
  for (const m of sMatches) {
    const k = m[1].replace(/<[^>]+>/g, '').trim();
    const v = m[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
    if (k && v) specs[k.toLowerCase()] = v;
  }

  // Dimensions & Weight
  let length = '', width = '', height = '', weight_g = '';
  const dimStr = specs['item dimensions'] || specs['product dimensions'] || specs['package dimensions'] || '';
  const dimM = dimStr.match(/([0-9.]+)\s*x\s*([0-9.]+)\s*x\s*([0-9.]+)/i);
  if (dimM) {
    length = dimM[1];
    width = dimM[2];
    height = dimM[3];
  }
  const weightStr = specs['item weight'] || specs['weight'] || '';
  const wtM = weightStr.match(/([0-9.]+)\s*(kilograms|kg|grams|g)/i);
  if (wtM) {
    const val = parseFloat(wtM[1]);
    weight_g = /kg|kilo/i.test(wtM[2]) ? String(Math.round(val * 1000)) : String(Math.round(val));
  }

  // Bullets
  const bullets = [];
  const bMatches = html.matchAll(/<span class="a-list-item">([\s\S]*?)<\/span>/gi);
  for (const m of bMatches) {
    const txt = m[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim();
    if (txt.length > 20 && !/(deliver|return|warranty|amazon|sign in|customer reviews|frequently bought|ship from)/i.test(txt)) {
      if (!bullets.includes(txt)) bullets.push(txt);
    }
  }

  // A+ & Description
  const descParts = [];
  const aplusMatches = [...html.matchAll(/<div[^>]+class="[^\"]*aplus[^\"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
  for (const m of aplusMatches) {
    const headings = [...m[1].matchAll(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/gi)].map(h => h[1].replace(/<[^>]+>/g, '').trim());
    const paras = [...m[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map(p => p[1].replace(/<[^>]+>/g, '').trim());
    for (let i = 0; i < Math.max(headings.length, paras.length); i++) {
      const h = headings[i];
      const p = paras[i];
      if (h && p && p.length > 20 && !descParts.some(d => d.includes(h))) {
        descParts.push(`${h}: ${p}`);
      } else if (p && p.length > 30 && !descParts.some(d => d.includes(p))) {
        descParts.push(p);
      }
    }
  }

  // Ordered High-Res Images
  const images = [];
  const seen = new Set();
  const productImgMatches = [...html.matchAll(/<img[^>]+alt="([^\"]*Product Image (\d+)[^\"]*)"[^>]+(?:data-src|src)="([^\"]+)"[^>]*>/gi)];
  const ordered = [];
  for (const m of productImgMatches) {
    const num = parseInt(m[2], 10);
    let src = m[3];
    if (src.includes('grey-pixel')) continue;
    src = src.replace(/\._[^.]+\./, '.');
    if (!ordered[num]) ordered[num] = src;
  }

  ordered.filter(Boolean).forEach(url => {
    if (!seen.has(url)) {
      seen.add(url);
      images.push(url);
    }
  });

  // Additional product images
  const allImgs = [...html.matchAll(/https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9%_-]+\.(?:jpg|jpeg|png|webp)/gi)];
  for (const m of allImgs) {
    const clean = m[0].replace(/\._[^.]+\./, '.');
    if (!seen.has(clean) && !/(icon|logo|badge|btn|play-button|transparent-pixel|grey-pixel|amazon-header|apm-)/i.test(clean)) {
      seen.add(clean);
      images.push(clean);
    }
  }

  // Material & Category
  let material = 'Solid Virgin Brass (Moradabad Handcrafted)';
  if (specs.material && /brass/i.test(specs.material)) {
    material = '100% Pure Brass (Moradabad Handcrafted)';
  }
  let category = 'Decor';
  if (/chess/i.test(title)) category = 'Decor';
  else if (/diya|lamp/i.test(title)) category = 'Diya';
  else if (/bell/i.test(title)) category = 'Bell';
  else if (/idol|sculpture|statue|krishna|ganesha/i.test(title)) category = 'Idol';
  else if (/urli/i.test(title)) category = 'Urli';

  let unit = '1 Sellable Unit';
  if (/chess/i.test(title)) {
    unit = '1 Handcrafted Pure Brass Chess Board with 32 Spartan Pieces';
  } else if (title) {
    unit = `1 ${title.split('(')[0].trim()}`;
  }

  return {
    asin,
    title,
    price,
    mrp: price ? Math.round(price * 1.25) : 13999,
    dimensions: { length, width, height },
    weight_g,
    material,
    category,
    unit,
    bullets,
    description: descParts.join('\n\n') || bullets.join('\n\n'),
    images,
    specs
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    const payload = await body(req);

    // Image proxy feature if requested
    if (payload.action === 'proxy_image' && payload.imageUrl) {
      const imgRes = await fetch(payload.imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
        }
      });
      if (!imgRes.ok) throw new Error(`Could not fetch image: ${imgRes.status}`);
      const arrayBuffer = await imgRes.arrayBuffer();
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return json(res, 200, {
        base64: `data:${contentType};base64,${base64}`,
        contentType,
        bytes: arrayBuffer.byteLength
      });
    }

    // Direct live catalog listing updater
    if (payload.action === 'update_catalog' && payload.productId && payload.updates) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !serviceKey) throw new Error('Database connection not configured.');

      const updateRes = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${payload.productId}`, {
        method: 'PATCH',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          ...payload.updates,
          updated_at: new Date().toISOString()
        })
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        throw new Error(`Catalog update failed: ${errText}`);
      }

      const updated = await updateRes.json();
      return json(res, 200, { success: true, updated: updated[0] || null });
    }

    const { urlOrAsin } = payload;
    const asin = parseAsin(urlOrAsin);
    if (!asin) {
      return json(res, 400, { error: 'Invalid Amazon URL or ASIN. Please provide a valid Amazon link or 10-character ASIN.' });
    }

    const data = await scrapeAmazonProduct(asin);

    // Cross-reference existing catalog in Supabase
    let matchingProduct = null;
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const catRes = await fetch(`${supabaseUrl}/rest/v1/products?select=*&archived_at=is.null`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        });
        if (catRes.ok) {
          const catalog = await catRes.json();
          // Priority 1: Match by SKU DB-MT-DECOR-002 or if ASIN or title has SKU
          matchingProduct = catalog.find(p => p.sku === 'DB-MT-DECOR-002' && (/chess/i.test(data.title) || asin === 'B09HXVLC76')) ||
                            catalog.find(p => p.sku && data.title.includes(p.sku)) ||
                            catalog.find(p => /chess/i.test(data.title) && /chess/i.test(p.name));
          
          if (matchingProduct) {
            if (matchingProduct.mrp) data.mrp = matchingProduct.mrp;
            data.cost_price = matchingProduct.cost_price || 5000;
            data.sellerSku = matchingProduct.sku;
          }
        }
      } catch (catErr) {
        console.warn('Could not query catalog for match:', catErr);
      }
    }

    return json(res, 200, {
      success: true,
      product: data,
      matchingProduct
    });
  } catch (err) {
    console.error('Amazon import failed:', err);
    return json(res, 500, { error: err.message || 'Failed to import product from Amazon.' });
  }
}
