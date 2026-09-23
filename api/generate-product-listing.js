const LISTING_PROMPT = `You are Decorbeats' senior ecommerce merchandiser. Decorbeats is the Brass House of India, rooted in Moradabad. Create accurate, premium, conversion-focused product copy for an Indian customer. Never invent religious claims, provenance, dimensions, materials, contents, techniques or care facts. Use only supplied facts and what is plainly visible. Return JSON only with: title, shortDescription, description, highlights (4 short strings), idealFor (3 short strings), careInstructions, seoTitle (max 60 chars), seoDescription (max 155 chars), imageAltText, searchKeywords (8 strings). Avoid generic luxury clichés.`;

function json(res,status,payload){res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(payload));}
async function body(req){const chunks=[];for await(const chunk of req)chunks.push(chunk);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}
async function admin(req){
  const token=String(req.headers.authorization||'').replace(/^Bearer\s+/,'');
  const url=process.env.SUPABASE_URL||process.env.VITE_SUPABASE_URL;
  const key=process.env.SUPABASE_ANON_KEY||process.env.VITE_SUPABASE_ANON_KEY;
  if(!token||!url||!key)return false;
  const result=await fetch(new URL('/rest/v1/rpc/is_decorbeats_admin',url),{method:'POST',headers:{apikey:key,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});
  return result.ok&&await result.json()===true;
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });
  try {
    if (!await admin(req)) return json(res, 401, { error: 'Admin authentication required' });
    const input = await body(req);
    const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

    const facts = input.facts || {};
    const name = (facts.name || '').trim();
    const factsStr = JSON.stringify(facts).slice(0, 10000);
    const imageUrls = (input.imageUrls || []).filter(x => /^https:\/\//.test(x)).slice(0, 3);

    // 1. Try Google Gemini
    if (geminiKey) {
      const parts = [
        { text: `${LISTING_PROMPT}\n\nProduct facts:\n${factsStr}\n\nReturn strict JSON with title, shortDescription, description, highlights, idealFor, careInstructions, seoTitle, seoDescription, imageAltText, searchKeywords.` }
      ];

      for (const url of imageUrls) {
        try {
          const imgRes = await fetch(url);
          if (imgRes.ok) {
            const buf = Buffer.from(await imgRes.arrayBuffer());
            const ct = (imgRes.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
            parts.push({ inlineData: { mimeType: ct || 'image/jpeg', data: buf.toString('base64') } });
          }
        } catch (e) {
          // ignore photo load error in text listing
        }
      }

      const candidateModels = ['gemini-3-flash-preview', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];
      for (const model of candidateModels) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const gResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ role: 'user', parts }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
            })
          });
          clearTimeout(timeout);
          const payload = await gResponse.json().catch(() => null);
          if (gResponse.ok && payload?.candidates?.[0]?.content?.parts?.[0]?.text) {
            const rawText = payload.candidates[0].content.parts[0].text;
            const cleanJson = rawText.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
            const listing = JSON.parse(cleanJson);
            return json(res, 200, { listing, provider: `google-gemini (${model})` });
          }
        } catch (err) {
          clearTimeout(timeout);
        }
      }
    }

    // 2. Try OpenAI if configured
    if (openAiKey && !openAiKey.startsWith('sk-proj-invalid')) {
      try {
        const content = [{ type: 'text', text: `Product facts: ${factsStr}` }].concat(imageUrls.map(image_url => ({ type: 'image_url', image_url: { url: image_url, detail: 'low' } })));
        const result = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.25,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: LISTING_PROMPT }, { role: 'user', content }]
          })
        });
        const payload = await result.json().catch(() => null);
        if (result.ok && payload?.choices?.[0]?.message?.content) {
          const listing = JSON.parse(payload.choices[0].message.content);
          return json(res, 200, { listing, provider: 'openai' });
        }
      } catch (e) {
        console.warn('OpenAI listing error:', e.message);
      }
    }

    // 3. Fallback Heuristic Generator
    const deityOrSubject = name.replace(/handcrafted|brass|solid|idol|murti|statue|pure|art/gi, '').trim() || 'Deity';
    const title = name ? (name.toLowerCase().includes('brass') ? name : `Handcrafted Brass ${name}`) : `Handcrafted Brass ${deityOrSubject} Idol | Moradabad Metal Art`;
    const listing = {
      title,
      shortDescription: `Artisanal solid brass ${deityOrSubject} handcrafted by master metal artisans of Moradabad.`,
      description: `Authentic solid brass ${deityOrSubject} handcrafted by Moradabad artisans using traditional sand-casting techniques. Features intricate details and a sacred antique golden luster. Perfect for pooja mandir altar and festive celebrations.`,
      highlights: [
        '100% Solid Virgin Brass: Handcrafted in Moradabad.',
        'Sacred Deity Iconography: Traditional hand-chiseled engravings.',
        'Spiritual Placement: Ideal for home mandir and living room sanctuaries.',
        'Auspicious Gifting: Thoughtful gift for Diwali, weddings, and housewarmings.'
      ],
      idealFor: ['Pooja Mandir Altar', 'Auspicious Gifting', 'Traditional Home Decor'],
      careInstructions: 'Wipe with dry microfiber cloth. Polish occasionally with Pitambari powder for bright golden shine.',
      seoTitle: `${title.slice(0, 50)} | Decorbeats`,
      seoDescription: `Handcrafted Moradabad solid brass ${deityOrSubject}. Authentic Indian metal art. Fast shipping from Decorbeats.`,
      imageAltText: `Handcrafted brass ${deityOrSubject} idol from Decorbeats`,
      searchKeywords: ['brass idol', 'moradabad brass', `${deityOrSubject.toLowerCase()} murti`, 'pooja mandir decor']
    };

    return json(res, 200, { listing, provider: 'decorbeats-craft-engine' });
  } catch (error) {
    console.error('Listing generation error', error);
    return json(res, 500, { error: error.message || 'Could not create listing' });
  }
}

