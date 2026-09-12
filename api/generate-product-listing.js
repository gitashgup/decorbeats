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
export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    if(!await admin(req))return json(res,401,{error:'Admin authentication required'});
    const input=await body(req), apiKey=process.env.OPENAI_API_KEY||process.env.VITE_OPENAI_API_KEY;
    if(!apiKey)throw new Error('AI service is not configured');
    const facts=JSON.stringify(input.facts||{}).slice(0,10000);
    const imageUrls=(input.imageUrls||[]).filter(x=>/^https:\/\//.test(x)).slice(0,4);
    const content=[{type:'text',text:`Product facts: ${facts}`}].concat(imageUrls.map(image_url=>({type:'image_url',image_url:{url:image_url,detail:'low'}})));
    const result=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model:'gpt-4o-mini',temperature:.25,response_format:{type:'json_object'},messages:[{role:'system',content:LISTING_PROMPT},{role:'user',content}]})});
    const payload=await result.json().catch(()=>null);if(!result.ok)throw new Error(payload?.error?.message||'Could not create listing');
    const listing=JSON.parse(payload?.choices?.[0]?.message?.content||'{}');
    return json(res,200,{listing});
  }catch(error){console.error('Listing generation error',error);return json(res,500,{error:error.message||'Could not create listing'});}
}
