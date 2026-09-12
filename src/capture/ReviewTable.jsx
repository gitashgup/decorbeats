import React, {useEffect,useState} from 'react';
import {countTotal} from './model';
import {mergeCaptureDraft, updateSharedDraft} from './sharedDraft';
import {supabase} from '../lib/supabase';

export default function ReviewTable({rows,onOpen,onSaved,onDelete,busy}) {
  return <div className="cs-table-wrap"><table className="cs-inventory-table"><thead><tr>{['Product','Qty','Location','Cost ₹','Selling ₹','Status','Actions'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(row=><PriceRow key={row.id} row={row} onOpen={onOpen} onSaved={onSaved} onDelete={onDelete} busy={busy}/>)}</tbody></table>{!rows.length&&<p className="cs-empty">No products here.</p>}</div>;
}
function PriceRow({row,onOpen,onSaved,onDelete,busy}) {
  const [edit,setEdit]=useState(null),[saving,setSaving]=useState(false),[message,setMessage]=useState('');
  const data=edit?.data||row.data, published=row.status==='published';
  useEffect(()=>{if(!edit)return;const warn=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[edit]);
  function change(key,value){setEdit(old=>({base:old?.base||row,data:{...(old?.data||row.data),[key]:value}}));setMessage('');}
  async function save(){
    if(saving)return;
    if(data.cost_price===''||data.cost_price==null||!Number.isFinite(Number(data.cost_price))||Number(data.cost_price)<0||!Number.isFinite(Number(data.mrp))||Number(data.mrp)<=0){setMessage('Enter cost and selling price.');return;}
    setSaving(true);setMessage('');
    try{
      const base=edit?.base||row;
      const local={...base,data:{...base.data,cost_price:data.cost_price,mrp:data.mrp,pricingApproved:true}};
      const saved=await updateSharedDraft(supabase,row.id,remote=>mergeCaptureDraft(local,base,remote));
      onSaved(saved);setEdit(null);setMessage('Saved ✓');
    }catch(e){setMessage(e.message||'Could not save. Try again.');}finally{setSaving(false);}
  }
  const locked=busy||saving;
  return <tr><td><button className="cs-table-product" disabled={locked} onClick={()=>{if(!edit||window.confirm('Leave unsaved prices?'))onOpen(row);}}><img src={data.photos?.hero?.url||row.baseline?.image_url||'/assets/images/product-fallback.svg'} alt="" loading="lazy"/><span><strong>{data.name||'New product'}</strong><small>{data.sku||'New SKU'} · {data.material||'Material missing'}</small></span></button></td><td>{data.locations?.length&&data.locations.every(x=>x.sellable!==''&&x.sellable!=null)?countTotal(data):'—'}</td><td>{data.locations?.map(x=>x.name).filter(Boolean).join(', ')||'—'}</td>{['cost_price','mrp'].map(key=><td key={key}><input aria-label={`${key==='mrp'?'Selling price':'Cost'} for ${data.name||'new product'}`} type="number" inputMode="decimal" min={key==='mrp'?'0.01':'0'} step="0.01" value={data[key]??''} disabled={published||locked} onChange={e=>change(key,e.target.value)}/></td>)}<td>{published?'Published':edit?'Unsaved':data.pricingApproved?'Price saved':'Needs price'}</td><td><div className="cs-row-actions">{!published&&<button className="cs-primary" disabled={locked} onClick={save}>{saving?'Saving…':'Save'}</button>}<button disabled={locked} onClick={()=>{if(!edit||window.confirm('Leave unsaved prices?'))onOpen(row);}}>Review</button>{!published&&<button disabled={locked} onClick={()=>onDelete(row)}>Delete</button>}</div>{message&&<small role="status">{message}</small>}</td></tr>;
}
