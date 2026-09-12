import {zipSync,strToU8} from 'fflate';
import {supabase} from '../lib/supabase';

export function listingDetails(d){
  return {brand:'Decorbeats',name:d.name||'',sku:d.sellerSku||d.sku||'',asin:d.asin||'',category:d.category||'',material:d.material||'',contents:d.unit||'',description:d.notes||'',highlights:d.marketing?.highlights||[],care:d.marketing?.careInstructions||'',sellingPriceINR:d.mrp??'',productCm:{length:d.length||'',width:d.width||'',height:d.height||''},productWeightG:d.weight_g||'',packedCm:{length:d.packed_length||'',width:d.packed_width||'',height:d.packed_height||''},packedWeightG:d.packed_weight_g||''};
}
export function listingText(d){const p=listingDetails(d);return `DECORBEATS — PRODUCT DETAILS\nBlank fields are unconfirmed. Do not invent missing facts.\n\nName: ${p.name}\nBrand: ${p.brand}\nSKU: ${p.sku}\nASIN: ${p.asin}\nCategory: ${p.category}\nMaterial: ${p.material}\nIncludes: ${p.contents}\nSelling price (INR): ${p.sellingPriceINR}\nProduct L × W × H (cm): ${p.productCm.length} × ${p.productCm.width} × ${p.productCm.height}\nProduct weight (g): ${p.productWeightG}\nPacked L × W × H (cm): ${p.packedCm.length} × ${p.packedCm.width} × ${p.packedCm.height}\nPacked weight (g): ${p.packedWeightG}\n\nDESCRIPTION\n${p.description}\n\nHIGHLIGHTS\n${p.highlights.join('\n')}\n\nCARE\n${p.care}\n\nUse these facts and attached product photos to draft a listing. Preserve the exact product, material, dimensions and set contents. Review all AI-generated claims before publishing.\n`;}
async function jpeg(blob){const bitmap=await createImageBitmap(blob);try{const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0);return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Photo conversion failed')),'image/jpeg',.96));}finally{bitmap.close();}}
export async function downloadListing(d,onProgress){
  const order=['hero','front','back','detail','contents'];
  const photos=Object.entries(d.photos||{}).filter(([,p])=>p?.url).sort(([a],[b])=>(order.includes(a)?order.indexOf(a):99)-(order.includes(b)?order.indexOf(b):99));
  if(!photos.length)throw new Error('Add at least one photo first.');
  const files={'product-details.txt':strToU8(listingText(d)),'product-details.json':strToU8(JSON.stringify(listingDetails(d),null,2)),'START-HERE.txt':strToU8('Unzip this folder. Upload the JPG files in photos to Seller Central or Canva. Paste product-details.txt into the listing form or AI tool. This is a handoff package, not an Amazon bulk-upload template. Photos are captured images converted to JPEG, not automatically retouched or approved by Amazon. Original camera files, when available, are in originals. Cost prices and warehouse locations are excluded. Review before publishing.')};
  for(const [index,[slot,photo]] of photos.entries()){
    onProgress(`Preparing photo ${index+1} of ${photos.length}…`);
    const safe=slot.replace(/[^a-z0-9_-]/gi,'_');
    const response=await fetch(photo.url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw new Error(`Could not download ${slot}. Retry the package.`);
    files[`photos/${String(index+1).padStart(2,'0')}-${safe}.jpg`]=new Uint8Array(await (await jpeg(await response.blob())).arrayBuffer());
    if(photo.original){const {data,error}=await supabase.storage.from('capture-originals').download(photo.original);if(error)throw new Error(`Original ${slot} could not be downloaded. Retry.`);const ext=photo.original.split('.').pop().replace(/[^a-z0-9]/gi,'').slice(0,8)||'jpg';files[`originals/${safe}.${ext}`]=new Uint8Array(await data.arrayBuffer());}
  }
  const blob=new Blob([zipSync(files,{level:0})],{type:'application/zip'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`Decorbeats-${(d.sku||d.name||'product').replace(/[^a-z0-9_-]/gi,'-').slice(0,75)}.zip`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);onProgress('Package downloaded. Unzip to use the photos and details.');
}
