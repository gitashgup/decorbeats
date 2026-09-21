function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

async function body(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

async function admin(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/, '');
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return false;
  const result = await fetch(new URL('/rest/v1/rpc/is_decorbeats_admin', url), {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}'
  });
  return result.ok && (await result.json()) === true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  try {
    if (!(await admin(req))) return json(res, 401, { error: 'Admin authentication required' });

    const { productName = 'Indian brass handicraft', sceneType = 'pooja_mandir' } = await body(req);
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error('AI image service is not configured (OPENAI_API_KEY is missing)');

    const cleanedName = String(productName).replace(/[^a-zA-Z0-9\s,.-]/g, '').slice(0, 140);

    let sceneDescription = '';
    if (sceneType === 'living_room') {
      sceneDescription = `The brass handicraft (${cleanedName}) is prominently centered in the foreground on a sleek dark walnut credenza inside a luxury modern Indian apartment. Warm architectural backlighting, soft textured plaster wall, minimal ceramic decor piece in blurred background, warm golden reflections on brass. Sophisticated Architectural Digest interior style.`;
    } else if (sceneType === 'festive_diwali') {
      sceneDescription = `The brass handicraft (${cleanedName}) is beautifully placed as the centerpiece of a festive Indian celebration setup. Fresh orange and yellow marigold flowers, soft glowing brass diyas with natural flames, subtle festive rangoli elements, warm golden hour ambient lighting, celebration atmosphere.`;
    } else {
      // Default: pooja_mandir
      sceneDescription = `The authentic Indian brass handicraft (${cleanedName}) is reverently placed in the center foreground of a beautifully hand-carved teakwood Pooja Mandir altar. Garlanded with fresh yellow marigold petals, a small glowing brass diya with a warm flickering flame nearby, and soft fragrant incense haze in the background. Divine, serene temple sanctuary ambiance with warm golden illumination.`;
    }

    const prompt = `A magazine-grade commercial lifestyle photograph featuring ${cleanedName}, crafted in authentic polished Moradabad brass. ${sceneDescription} Photorealistic, sharp 8k focus on the brass item, natural depth of field, balanced lighting, zero text, zero watermarks, zero hands, zero distorted artifacts.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json'
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.error?.message || 'Could not generate lifestyle staging image');
    }

    const b64 = payload?.data?.[0]?.b64_json;
    if (!b64) throw new Error('AI image generation returned no image data');

    return json(res, 200, {
      success: true,
      image: b64,
      mime: 'image/png',
      sceneType
    });
  } catch (error) {
    console.error('Lifestyle staging error:', error);
    return json(res, 500, { error: error.message || 'Could not generate lifestyle photo' });
  }
}
