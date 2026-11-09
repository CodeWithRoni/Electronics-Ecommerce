import { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../config';
import { useShop } from '../lib/store';
import { money } from '../lib/format';

const blank = { id:'', name:'', sku:'', description:'', price:0, stock:0, group_id:'', category_id:'', brand_id:'', image:'', unit:'pcs', active:true };
async function request(token,action,payload={}) {
  if (!API_URL) throw Error('API endpoint not configured');
  const res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({action,payload})});
  const data=await res.json();
  if (!res.ok || !data.ok) throw Error(data.error||'Request failed');
  return data.data;
}
export default function Admin(){
  const [token,setToken]=useState('');
  const [ready,setReady]=useState(false);
  const [tab,setTab]=useState('overview');
  const [products,setProducts]=useState([]);
  const [orders,setOrders]=useState([]);
  const [edit,setEdit]=useState(null);
  const [query,setQuery]=useState('');
  const [orderFilter,setOrderFilter]=useState('all');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const refreshShop=useShop(s=>s.load);
  const refresh=async(key=token)=>{
    const [p,o]=await Promise.all([request(key,'admin.products'),request(key,'admin.orders')]);
    setProducts(p);setOrders(o);setReady(true);
  };
  const run=async(fn)=>{
    setBusy(true);setError('');setNotice('');
    try{await fn();}catch(e){setError(e.message);}finally{setBusy(false);}
  };
  const save=()=>run(async()=>{
    const p={...edit,id:edit.id.trim(),name:edit.name.trim(),price:Number(edit.price),stock:Number(edit.stock)};
    if(!p.id||!p.name)throw Error('Product ID and name required');
    await request(token,'admin.product.upsert',{product:p});
    await refresh();await refreshShop();setEdit(null);setNotice('Product saved');
  });
  const status=(o,value)=>run(async()=>{
    if(!window.confirm('Change order '+o.order_no+' to '+value+'?'))return;
    await request(token,'admin.order.status',{order_no:o.order_no,status:value});
    await refresh();setNotice('Order updated');
  });
  const filteredProducts=products.filter(p=>[p.name,p.id,p.sku,p.brand_id,p.group_id].some(x=>String(x||'').toLowerCase().includes(query.toLowerCase())));
  const filteredOrders=orders.filter(o=>(orderFilter==='all'||o.status===orderFilter)&&[o.order_no,o.name,o.phone].some(x=>String(x||'').toLowerCase().includes(query.toLowerCase())));
  const revenue=orders.filter(o=>o.status==='delivered').reduce((n,o)=>n+Number(o.total||0),0);
  const lowStock=products.filter(p=>Number(p.stock)<=5);
  if(!ready)return <section className="admin-login card"><h1>Store administration</h1><p className="muted">Enter the private ADMIN_TOKEN configured in Cloudflare. It stays in memory only and is not saved in your browser.</p><form onSubmit={e=>{e.preventDefault();run(()=>refresh(token));}}><label className="field"><span>Admin access token</span><input type="password" value={token} onChange={e=>setToken(e.target.value)} required autoComplete="off"/></label><button className="btn btn-primary" disabled={busy}>Unlock dashboard</button></form>{error&&<p className="admin-error" role="alert">{error}</p>}</section>;
  return <div className="admin-page">
    <div className="admin-heading"><div><span className="eyebrow">STORE CONTROL CENTER</span><h1>Admin dashboard</h1><p className="muted">Manage your independent inventory and customer orders.</p></div><button className="btn" onClick={()=>{setToken('');setReady(false);setProducts([]);setOrders([]);}}>Lock dashboard</button></div>
    <div className="admin-stats"><div><small>Products</small><b>{products.length}</b></div><div><small>Available units</small><b>{products.reduce((n,p)=>n+Number(p.stock||0),0)}</b></div><div><small>Orders</small><b>{orders.length}</b></div><div><small>Pending orders</small><b>{orders.filter(o=>o.status==='new').length}</b></div></div>
    <div className="admin-tabs"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Overview</button><button className={tab==='products'?'active':''} onClick={()=>setTab('products')}>Products & inventory</button><button className={tab==='orders'?'active':''} onClick={()=>setTab('orders')}>Customer orders</button><button onClick={()=>run(()=>refresh())}>↻ Refresh</button><Link to="/">View storefront ↗</Link></div>
    {error&&<p className="admin-error" role="alert">{error}</p>}{notice&&<p className="admin-success" role="status">{notice}</p>}
    {tab==='overview'?<div className="admin-overview"><div className="admin-insights"><section className="card admin-panel"><h2>Sales summary</h2><p className="muted">Based on the latest {orders.length} orders returned by the API.</p><div className="admin-metric"><small>Delivered order value</small><strong>{money(revenue,'BDT')}</strong></div><div className="admin-metric"><small>Awaiting confirmation</small><strong>{orders.filter(o=>o.status==='new').length}</strong></div><div className="admin-metric"><small>Shipped orders</small><strong>{orders.filter(o=>o.status==='shipped').length}</strong></div></section><section className="card admin-panel"><div className="admin-panel-head"><h2>Low stock alerts</h2><button className="btn" onClick={()=>setTab('products')}>Manage stock</button></div>{lowStock.length?lowStock.slice(0,8).map(p=><div className="admin-alert-row" key={p.id}><span>{p.name}</span><strong>{p.stock} left</strong></div>):<p className="muted">No products at or below 5 units.</p>}</section></div><section className="card admin-panel"><div className="admin-panel-head"><h2>Recent orders</h2><button className="btn" onClick={()=>setTab('orders')}>View all orders</button></div>{orders.slice(0,6).map(o=><div className="admin-alert-row" key={o.order_no}><span>{o.order_no} · {o.name}</span><strong>{o.status}</strong></div>)}{!orders.length&&<p className="muted">No orders yet.</p>}</section></div>:null}
    {tab!=='overview'&&<div className="admin-toolbar"><input type="search" aria-label="Search admin records" placeholder="Search products, orders or customers..." value={query} onChange={e=>setQuery(e.target.value)}/>{tab==='orders'&&<select aria-label="Filter order status" value={orderFilter} onChange={e=>setOrderFilter(e.target.value)}>{['all','new','confirmed','shipped','delivered','cancelled'].map(v=><option key={v} value={v}>{v==='all'?'All statuses':v}</option>)}</select>}</div>}
    {tab==='products'?<section className="card admin-panel"><div className="admin-panel-head"><h2>Product catalog</h2><button className="btn btn-primary" onClick={()=>setEdit({...blank})}>+ Add product</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Visibility</th><th></th></tr></thead><tbody>{filteredProducts.map(p=><tr key={p.id}><td><b>{p.name}</b><small>{p.id}</small></td><td>{p.sku||'—'}</td><td>{money(p.price,'BDT')}</td><td>{p.stock}</td><td>{p.active?'Visible':'Hidden'}</td><td><button className="btn" onClick={()=>setEdit({...p,active:!!p.active})}>Edit</button></td></tr>)}</tbody></table>{!products.length&&<p className="muted">No products yet. Add your first product to publish it on the shop.</p>}</div></section>:<section className="card admin-panel"><div className="admin-panel-head"><h2>Customer orders</h2><span className="muted">{orders.length} recent orders</span></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead><tbody>{filteredOrders.map(o=><tr key={o.order_no}><td><b>{o.order_no}</b><small>{o.created_at}</small></td><td>{o.name}<small>{o.phone} · {o.address}</small></td><td>{o.payment}<small>{o.payment_status}</small></td><td>{money(o.total,'BDT')}</td><td><select aria-label={'Order status '+o.order_no} value={o.status} disabled={busy} onChange={e=>status(o,e.target.value)}>{['new','confirmed','shipped','delivered','cancelled'].map(x=><option key={x}>{x}</option>)}</select></td></tr>)}</tbody></table>{!orders.length&&<p className="muted">No orders received yet.</p>}</div></section>}
    {edit&&<div className="admin-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setEdit(null);}}><div className="card admin-modal" role="dialog" aria-modal="true" aria-label="Edit product"><div className="admin-panel-head"><h2>{products.some(p=>p.id===edit.id)?'Edit product':'Add product'}</h2><button className="btn" onClick={()=>setEdit(null)}>Close</button></div><form onSubmit={e=>{e.preventDefault();save();}} className="form-grid">{[['id','Product ID'],['name','Product name'],['sku','Model / SKU'],['price','Price (BDT)'],['stock','Stock quantity'],['group_id','Category / group'],['category_id','Subcategory'],['brand_id','Brand'],['image','Image URL (https://...)']].map(([k,label])=><label className={'field '+(['name','image'].includes(k)?'wide':'')} key={k}><span>{label}</span><input required={['id','name','price','stock'].includes(k)} type={['price','stock'].includes(k)?'number':'text'} min={['price','stock'].includes(k)?0:undefined} step={k==='price'?'0.01':undefined} value={edit[k]??''} onChange={e=>setEdit(v=>({...v,[k]:e.target.value}))} /></label>)}<label className="field wide"><span>Description / specifications</span><textarea value={edit.description||''} onChange={e=>setEdit(v=>({...v,description:e.target.value}))}/></label><label className="admin-checkbox wide"><input type="checkbox" checked={!!edit.active} onChange={e=>setEdit(v=>({...v,active:e.target.checked}))}/> Show on storefront</label><div className="wide admin-actions"><button className="btn btn-primary" disabled={busy}>Save product</button><button type="button" className="btn" onClick={()=>setEdit(null)}>Cancel</button></div></form></div></div>}
  </div>;
}
