import React, {useEffect, useState} from 'react';
import {supabase} from '../lib/supabase';
import {saveInventoryPrices} from './inventoryPrices';

export default function InventoryTable({products, pending, busy, onOpen, onSaved}) {
  return <div className="cs-table-wrap"><table className="cs-inventory-table"><thead><tr>{['Product','Category','In stock','Cost ₹','Selling ₹','Status','Actions'].map(title=><th key={title}>{title}</th>)}</tr></thead><tbody>{products.map(product=><InventoryRow key={product.id} product={product} hasDraft={pending.some(d=>d.product_id===product.id)} busy={busy} onOpen={onOpen} onSaved={onSaved}/>)}</tbody></table>{!products.length&&<p className="cs-empty">No matching products.</p>}</div>;
}

function InventoryRow({product, hasDraft, busy, onOpen, onSaved}) {
  const [edit,setEdit]=useState(null), [saving,setSaving]=useState(false), [message,setMessage]=useState('');
  const prices=edit||product;
  useEffect(()=>{if(!edit)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[edit]);
  const change=(key,value)=>{setEdit(old=>({...old,baseline:old?.baseline||product,cost_price:old?.cost_price??product.cost_price,mrp:old?.mrp??product.mrp,[key]:value}));setMessage('');};
  const open=()=>{if(!edit||window.confirm('Leave unsaved prices?'))onOpen(product);};
  async function save(){
    if(!edit||saving)return;
    setSaving(true);setMessage('');
    try {const saved=await saveInventoryPrices(supabase,edit.baseline,edit.cost_price,edit.mrp);onSaved(saved);setEdit(null);setMessage('Saved ✓');}
    catch(e){setMessage(e.message||'Could not save. Try again.');}
    finally{setSaving(false);}
  }
  const locked=busy||saving;
  return <tr><td><button className="cs-table-product" disabled={locked} onClick={open}><img src={product.image_url||'/assets/images/product-fallback.svg'} alt="" loading="lazy"/><span><strong>{product.name}</strong><small>{product.sku} · {product.material||'—'}</small></span></button></td><td>{product.category||'—'}</td><td>{product.quantity??'—'}</td>{['cost_price','mrp'].map(key=><td key={key}><input aria-label={`${key==='mrp'?'Selling price':'Cost'} for ${product.name}`} type="number" inputMode="decimal" min={key==='mrp'?'0.01':'0'} step="0.01" value={prices[key]??''} disabled={locked} onChange={e=>change(key,e.target.value)}/></td>)}<td>{edit?'Unsaved':hasDraft?'Capture in progress':'Inventory'}</td><td><div className="cs-row-actions"><button className="cs-primary" disabled={locked||!edit} onClick={save}>{saving?'Saving…':'Save'}</button><button disabled={locked} onClick={open}>{hasDraft?'Continue':'Capture'}</button></div>{message&&<small role="status">{message}</small>}</td></tr>;
}
