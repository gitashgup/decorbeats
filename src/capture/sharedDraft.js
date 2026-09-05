export const sameValue = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const keys = Object.keys(a), other = Object.keys(b);
  return keys.length === other.length && keys.every(key => Object.hasOwn(b,key) && sameValue(a[key],b[key]));
};

// Three-way merge: incoming photographs must not erase locally dictated fields.
export function mergeCaptureDraft(local, base, remote) {
  if (!base || local.id !== remote.id || base.id !== local.id) throw new Error('Draft identity changed. Reopen the intended product.');
  if (remote.status !== 'draft') throw new Error('This draft was published on another device. Reopen the product before editing.');
  const data = {...remote.data}, conflicts = [];
  for (const key of new Set([...Object.keys(base.data), ...Object.keys(local.data)])) {
    if (sameValue(local.data[key],base.data[key])) continue;
    if (key !== 'step' && !sameValue(remote.data[key],base.data[key]) && !sameValue(local.data[key],remote.data[key])) {
      // Different photo slots can be changed independently.
      if (key === 'photos') {
        const photos = {...remote.data.photos};
        for (const slot of new Set([...Object.keys(base.data.photos||{}),...Object.keys(local.data.photos||{})])) {
          if (sameValue(local.data.photos?.[slot],base.data.photos?.[slot])) continue;
          if (!sameValue(remote.data.photos?.[slot],base.data.photos?.[slot]) && !sameValue(local.data.photos?.[slot],remote.data.photos?.[slot])) conflicts.push(`photo ${slot}`);
          else photos[slot]=local.data.photos?.[slot];
        }
        data.photos=photos;
      } else conflicts.push(key);
    } else data[key]=local.data[key];
  }
  if (conflicts.length) throw new Error(`Both devices changed ${conflicts.join(', ')}. Your unsaved changes are kept; finish on one device before retrying.`);
  return {...remote,data};
}

export async function updateSharedDraft(client, id, update) {
  for (let attempt=0;attempt<4;attempt++) {
    const {data:latest,error:readError}=await client.from('capture_drafts').select('*').eq('id',id).single();
    if(readError)throw readError;
    if(latest.status!=='draft')throw new Error('This product is no longer an editable draft.');
    const next=update(latest);
    const {data,error}=await client.rpc('save_capture_draft_v1',{p_id:id,p_revision:latest.revision,p_product_id:latest.product_id,p_data:next.data});
    if(!error)return data;
    if(!/changed on another device/i.test(error.message))throw error;
  }
  throw new Error('The other device is saving. Wait a moment, then retry; your photo has not been discarded.');
}
