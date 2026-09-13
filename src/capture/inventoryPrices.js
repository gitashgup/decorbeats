export function pricePayload(cost, selling) {
  if (cost === '' || cost == null || selling === '' || selling == null || !Number.isFinite(Number(cost)) || Number(cost) < 0 || !Number.isFinite(Number(selling)) || Number(selling) <= 0) {
    throw new Error('Enter cost and selling price.');
  }
  return {cost_price: Number(cost), mrp: Number(selling)};
}

export async function saveInventoryPrices(client, baseline, cost, selling) {
  let query = client.from('products').update(pricePayload(cost, selling)).eq('id', baseline.id).is('archived_at', null);
  for (const key of ['cost_price', 'mrp']) query = baseline[key] == null ? query.is(key, null) : query.eq(key, baseline[key]);
  const {data, error} = await query.select('*').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Prices changed elsewhere. Refresh before editing again.');
  return data;
}
