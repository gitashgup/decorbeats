const ENRICH_PROMPT = `You are Decorbeats' Principal Indian Brass Metallurgist and Senior Ecommerce Merchandiser. Decorbeats is "The Brass House of India", rooted in Moradabad handcrafted metal art.

Analyze the provided multi-angle photographs (hero, front, back, detail) of this brass product alongside any recorded physical measurements and weight.

Perform the following:
1. MULTI-ANGLE VISUAL IDENTIFICATION:
- Detect the exact deity or subject (e.g. Lord Krishna playing flute / Venugopal, Lord Ganesha, Devi Lakshmi, Nataraja, Kamadhenu, Ashtalakshmi Kalash, Peacock Diya, Urli with bells, etc.).
- Identify posture (mudra), features (e.g., Tribhanga pose on lotus pedestal, peacock crown, pitambar dhoti), and attributes held.
- Identify the craft technique: Moradabad sand-casting / lost-wax, virgin brass, antique golden patina, hand-chiseled engraving, or glossy lacquer.

2. INDIAN MARKET PRICING BENCHMARK:
- Cross-reference the verified dimensions (L × W × H in cm) and weight (grams) against current Indian marketplace benchmarks (Amazon.in, Etsy, luxury Indian handicraft retailers).
- Provide:
  - marketPriceRange: formatted string e.g. "₹1,600 – ₹2,400"
  - suggestedMrp: integer INR
  - suggestedSellingPrice: integer INR
  - estimatedCostPrice: integer INR (artisan procurement benchmark, typically 35-50% of MRP)

3. HIGH-CONVERTING ECOMMERCE LISTING:
- title: Keyword-rich, high-converting title formatted as "Handcrafted Brass [Subject/Deity] [Key Pose/Feature] ([Height] cm, [Weight]g) | [Distinguishing Style]"
- category: Standard category (e.g. "Idols & Sculptures", "Diyas & Lamps", "Pooja Essentials", "Home Décor", "Tableware & Serveware")
- material: "Solid Virgin Brass (Moradabad Handcrafted)"
- unit: What is included (e.g. "1 Handcrafted Brass Krishna Idol")
- shortDescription: 1-2 compelling sentences.
- description: Rich, authentic cultural and artisan story covering:
  a) Iconography & Spiritual Meaning
  b) Moradabad Handcrafted Brass Heritage
  c) Vastu & Home Placement Guidance (e.g. Northeast corner / Pooja Mandir / Living room)
  d) Auspicious Gifting & Festivals (e.g. Janmashtami, Diwali, Housewarming)
- highlights: 4-5 bullet points covering solid brass assurance, exact dimensions/weight, artisan details, and gifting.
- careInstructions: Practical brass care (wipe with dry microfiber cloth; use Pitambari powder or lemon-salt paste for festive shine; avoid abrasive scrubbers or acid cleaners).
- seoTitle: Max 60 characters.
- seoDescription: Max 155 characters.
- searchKeywords: Array of 8-10 high-intent search tags for Indian festivals and decor.

Return STRICT JSON ONLY without markdown fences or backticks.`;

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

    const input = await body(req);
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey) throw new Error('AI service is not configured (OPENAI_API_KEY is missing)');

    const { photos = {}, dimensions = {}, currentFacts = {} } = input;
    const photoEntries = Object.entries(photos).filter(([, p]) => /^https:\/\//.test(p?.url || ''));

    if (!photoEntries.length) {
      return json(res, 400, { error: 'At least one captured photo is required for visual identification' });
    }

    const factsText = [
      `Existing product name/label: ${currentFacts.name || 'Not provided'}`,
      `Dimensions: Length ${dimensions.length || '?'} cm × Width ${dimensions.width || '?'} cm × Height ${dimensions.height || '?'} cm`,
      `Product Weight: ${dimensions.weight_g || '?'} grams`,
      `Packed Weight: ${dimensions.packed_weight_g || '?'} grams`,
      `Current Category: ${currentFacts.category || 'Idol'}`,
      `Current Material: ${currentFacts.material || 'Brass'}`
    ].join('\n');

    const content = [
      { type: 'text', text: `Here are the captured product specifications:\n${factsText}\n\nExamine the attached multi-angle photographs and return the complete identification and catalog listing in JSON format.` }
    ];

    for (const [slot, photo] of photoEntries.slice(0, 5)) {
      content.push({
        type: 'text',
        text: `Camera Angle: ${slot.toUpperCase()}`
      });
      content.push({
        type: 'image_url',
        image_url: { url: photo.url, detail: 'high' }
      });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: ENRICH_PROMPT },
          { role: 'user', content }
        ]
      })
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || 'Could not enrich product');

    const rawContent = payload?.choices?.[0]?.message?.content || '{}';
    const enriched = JSON.parse(rawContent);

    return json(res, 200, {
      success: true,
      enriched
    });
  } catch (error) {
    console.error('Auto-enrich error:', error);
    return json(res, 500, { error: error.message || 'Could not auto-enrich product from photos' });
  }
}
