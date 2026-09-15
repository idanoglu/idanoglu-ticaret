'use client';
import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';

const money=n=>new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(Number(n||0));
const blankP={name:'',code:'',category:'',stock:0,purchase_price:0,sale_price_vat_included:0,vat_rate:20,min_stock:0,description:''};
const blankC={name:'',contact:'',phone:'',address:''};

export default function Home(){
 const db=supabase();
 const [session,setSession]=useState(null),[tab,setTab]=useState('dashboard'),[products,setProducts]=useState([]),[customers,setCustomers]=useState([]),[orders,setOrders]=useState([]),[items,setItems]=useState([]),[loading,setLoading]=useState(true),[modal,setModal]=useState(null),[pform,setPform]=useState(blankP),[cform,setCform]=useState(blankC),[search,setSearch]=useState(''),[error,setError]=useState('');

 async function load(){
  setLoading(true);
  const [p,c,o,i]=await Promise.all([
   db.from('products').select('*').order('name'),
   db.from('customers').select('*').order('name'),
   db.from('orders').select('*').order('order_date',{ascending:false}),
   db.from('order_items').select('*')
  ]);
  if(p.error||c.error||o.error||i.error)setError((p.error||c.error||o.error||i.error).message);
  setProducts(p.data||[]);setCustomers(c.data||[]);setOrders(o.data||[]);setItems(i.data||[]);setLoading(false);
 }
 useEffect(()=>{db.auth.getSession().then(({data})=>setSession(data.session));const {data}=db.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[]);
 useEffect(()=>{if(session)load()},[session]);

 async function login(e){e.preventDefault();setError('');const f=new FormData(e.currentTarget);const r=await db.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(r.error)setError(r.error.message)}
 async function logout(){await db.auth.signOut()}
 function metric(start){
  const os=orders.filter(o=>new Date(o.order_date)>=start),ids=new Set(os.map(o=>o.id)),its=items.filter(i=>ids.has(i.order_id));
  return {qty:its.reduce((a,i)=>a+Number(i.qty),0),turn:os.reduce((a,o)=>a+Number(o.total_vat_included),0),profit:its.reduce((a,i)=>a+(Number(i.unit_price_vat_included)-Number(i.purchase_price_snapshot))*Number(i.qty),0)}
 }
 const today=new Date();today.setHours(0,0,0,0);
 const week=new Date(today);week.setDate(today.getDate()-((today.getDay()+6)%7));
 const month=new Date(today.getFullYear(),today.getMonth(),1);
 const md=metric(today),mw=metric(week),mm=metric(month);
 const filtered=useMemo(()=>products.filter(p=>(p.name+' '+p.code+' '+(p.category||'')).toLowerCase().includes(search.toLowerCase())),[products,search]);

 async function saveProduct(){
  const payload={...pform,stock:Number(pform.stock),purchase_price:Number(pform.purchase_price),sale_price_vat_included:Number(pform.sale_price_vat_included),vat_rate:Number(pform.vat_rate),min_stock:Number(pform.min_stock)};
  const r=pform.id?await db.from('products').update(payload).eq('id',pform.id):await db.from('products').insert(payload);
  if(r.error)setError(r.error.message);else{setModal(null);setPform(blankP);load()}
 }
 async function removeProduct(id){if(!confirm('Ürün silinsin mi?'))return;const r=await db.from('products').delete().eq('id',id);if(r.error)setError(r.error.message);else load()}
 async function saveCustomer(){const r=cform.id?await db.from('customers').update(cform).eq('id',cform.id):await db.from('customers').insert(cform);if(r.error)setError(r.error.message);else{setModal(null);setCform(blankC);load()}}
 async function removeCustomer(id){if(!confirm('Müşteri silinsin mi?'))return;const r=await db.from('customers').delete().eq('id',id);if(r.error)setError(r.error.message);else load()}

 if(!session)return <div className="login"><form className="loginbox" onSubmit={login}><h1>İDANOĞLU TİCARET</h1><p className="muted">Online Toptancı Yönetim Sistemi</p>{error&&<div className="error">{error}</div>}<div className="field"><label>E-posta</label><input className="input" name="email" type="email" required/></div><br/><div className="field"><label>Şifre</label><input className="input" name="password" type="password" required/></div><br/><button className="btn" style={{width:'100%'}}>Giriş Yap</button></form></div>;

 const nav=[['dashboard','Ana Panel'],['products','Ürünler / Stok'],['customers','Müşteriler'],['orders','Siparişler'],['reports','Raporlar']];
 return <div className="shell"><aside className="side"><div className="brand">İDANOĞLU TİCARET</div><nav className="nav">{nav.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>{label}</button>)}<button onClick={logout}>Çıkış</button></nav></aside>
 <main className="main"><div className="top"><h1>{nav.find(x=>x[0]===tab)?.[1]}</h1><span className="muted">{session.user.email}</span></div>{error&&<div className="error">{error}</div>}{loading?<div className="card">Yükleniyor...</div>:<>
 {tab==='dashboard'&&<><div className="grid">{[['Bugün',md],['Bu Hafta',mw],['Bu Ay',mm]].map(([x,m])=><div className="card" key={x}><b>{x}</b><div className="metric">{money(m.turn)}</div><span className="muted">{m.qty} adet satış · Kâr {money(m.profit)}</span></div>)}</div><br/><div className="card"><h3>Kritik Stoklar</h3>{products.filter(p=>Number(p.stock)<=Number(p.min_stock)).length===0?<span className="muted">Kritik stok yok.</span>:products.filter(p=>Number(p.stock)<=Number(p.min_stock)).map(p=><p key={p.id}><b>{p.name}</b> — <span className="low">{p.stock} adet</span></p>)}</div></>}
 {tab==='products'&&<><div className="toolbar"><input className="input" placeholder="Ürün adı, kod veya kategori ara..." value={search} onChange={e=>setSearch(e.target.value)}/><button className="btn" onClick={()=>{setPform(blankP);setModal('product')}}>+ Ürün Aç</button></div><div className="tablewrap"><table className="table"><thead><tr><th>Ürün</th><th>Kod</th><th>Stok</th><th>Alış</th><th>Satış KDV Dahil</th><th>KDV</th><th></th></tr></thead><tbody>{filtered.map(p=><tr key={p.id}><td><b>{p.name}</b><br/><span className="muted">{p.category}</span></td><td>{p.code}</td><td className={Number(p.stock)<=Number(p.min_stock)?'low':''}>{p.stock}</td><td>{money(p.purchase_price)}</td><td>{money(p.sale_price_vat_included)}</td><td>%{p.vat_rate}</td><td className="rowactions"><button className="btn secondary" onClick={()=>{setPform(p);setModal('product')}}>Düzenle</button><button className="btn danger" onClick={()=>removeProduct(p.id)}>Sil</button></td></tr>)}</tbody></table></div></>}
 {tab==='customers'&&<><div className="toolbar"><input className="input" placeholder="Müşteri ara..." value={search} onChange={e=>setSearch(e.target.value)}/><button className="btn" onClick={()=>{setCform(blankC);setModal('customer')}}>+ Müşteri Ekle</button></div><div className="tablewrap"><table className="table"><thead><tr><th>Müşteri</th><th>Yetkili</th><th>Telefon</th><th>Adres</th><th></th></tr></thead><tbody>{customers.filter(c=>(c.name+' '+c.contact+' '+c.phone).toLowerCase().includes(search.toLowerCase())).map(c=><tr key={c.id}><td><b>{c.name}</b></td><td>{c.contact}</td><td>{c.phone}</td><td>{c.address}</td><td className="rowactions"><button className="btn secondary" onClick={()=>{setCform(c);setModal('customer')}}>Düzenle</button><button className="btn danger" onClick={()=>removeCustomer(c.id)}>Sil</button></td></tr>)}</tbody></table></div></>}
 {tab==='orders'&&<Orders db={db} products={products} customers={customers} orders={orders} items={items} reload={load} setError={setError}/>}
 {tab==='reports'&&<Reports orders={orders} items={items}/>}
 </>}</main>
 {modal==='product'&&<Modal title={pform.id?'Ürün Düzenle':'Yeni Ürün'} close={()=>setModal(null)}><div className="formgrid">{[['name','Ürün adı'],['code','Ürün kodu / barkod'],['category','Kategori'],['stock','Stok'],['purchase_price','Alış fiyatı'],['sale_price_vat_included','Satış fiyatı (KDV dahil)'],['vat_rate','KDV oranı %'],['min_stock','Minimum stok']].map(([k,l])=><div className="field" key={k}><label>{l}</label><input className="input" value={pform[k]??''} type={['stock','purchase_price','sale_price_vat_included','vat_rate','min_stock'].includes(k)?'number':'text'} onChange={e=>setPform({...pform,[k]:e.target.value})}/></div>)}<div className="field full"><label>Açıklama</label><textarea className="textarea" value={pform.description||''} onChange={e=>setPform({...pform,description:e.target.value})}/></div></div><br/><button className="btn" onClick={saveProduct}>Kaydet</button></Modal>}
 {modal==='customer'&&<Modal title={cform.id?'Müşteri Düzenle':'Yeni Müşteri'} close={()=>setModal(null)}><div className="formgrid">{[['name','Müşteri / Firma adı'],['contact','Yetkili'],['phone','Telefon'],['address','Adres']].map(([k,l])=><div className="field full" key={k}><label>{l}</label><input className="input" value={cform[k]||''} onChange={e=>setCform({...cform,[k]:e.target.value})}/></div>)}</div><br/><button className="btn" onClick={saveCustomer}>Kaydet</button></Modal>}
 </div>
}
function Modal({title,close,children}){return <div className="modal"><div className="modalbox"><div className="top"><h2>{title}</h2><button className="btn secondary" onClick={close}>Kapat</button></div>{children}</div></div>}
function Orders({db,products,customers,orders,items,reload,setError}){
 const [customer,setCustomer]=useState(''),[cart,setCart]=useState([]),[prod,setProd]=useState(''),[qty,setQty]=useState(1);
 function add(){const p=products.find(x=>x.id===prod);if(!p)return;setCart(a=>{const old=a.find(x=>x.product_id===p.id);if(old)return a.map(x=>x.product_id===p.id?{...x,qty:x.qty+Number(qty)}:x);return [...a,{product_id:p.id,name:p.name,qty:Number(qty),unit_price_vat_included:Number(p.sale_price_vat_included),purchase_price_snapshot:Number(p.purchase_price),vat_rate:Number(p.vat_rate)}]})}
 const total=cart.reduce((a,x)=>a+x.qty*x.unit_price_vat_included,0),vat=cart.reduce((a,x)=>a+(x.qty*x.unit_price_vat_included-(x.qty*x.unit_price_vat_included/(1+x.vat_rate/100))),0);
 async function save(){if(!customer||!cart.length)return setError('Müşteri ve en az bir ürün seçin.');const r=await db.rpc('create_order',{p_customer_id:customer,p_note:'',p_items:cart});if(r.error)setError(r.error.message);else{setCustomer('');setCart([]);reload()}}
 return <><div className="card"><h3>Yeni Sipariş</h3><div className="formgrid"><div className="field"><label>Müşteri</label><select className="select" value={customer} onChange={e=>setCustomer(e.target.value)}><option value="">Seçiniz</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="field"><label>Ürün</label><select className="select" value={prod} onChange={e=>setProd(e.target.value)}><option value="">Seçiniz</option>{products.map(p=><option key={p.id} value={p.id}>{p.name} — {p.stock} stok — {money(p.sale_price_vat_included)}</option>)}</select></div><div className="field"><label>Miktar</label><input className="input" type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}/></div><div><br/><button className="btn" onClick={add}>Sepete Ekle</button></div></div><br/>{cart.length>0&&<><div className="tablewrap"><table className="table"><thead><tr><th>Ürün</th><th>Adet</th><th>Birim</th><th>Toplam</th><th></th></tr></thead><tbody>{cart.map(x=><tr key={x.product_id}><td>{x.name}</td><td>{x.qty}</td><td>{money(x.unit_price_vat_included)}</td><td>{money(x.qty*x.unit_price_vat_included)}</td><td><button className="btn danger" onClick={()=>setCart(cart.filter(y=>y.product_id!==x.product_id))}>Sil</button></td></tr>)}</tbody></table></div><p><b>Toplam KDV Dahil: {money(total)}</b> · KDV: {money(vat)} · KDV Hariç: {money(total-vat)}</p><button className="btn" onClick={save}>Siparişi Kaydet</button></>}</div><br/><div className="card"><h3>Son Siparişler</h3><div className="tablewrap"><table className="table"><thead><tr><th>Tarih</th><th>Müşteri</th><th>Toplam</th><th>Durum</th></tr></thead><tbody>{orders.slice(0,30).map(o=><tr key={o.id}><td>{new Date(o.order_date).toLocaleString('tr-TR')}</td><td>{customers.find(c=>c.id===o.customer_id)?.name||'-'}</td><td>{money(o.total_vat_included)}</td><td><span className="pill">{o.status}</span></td></tr>)}</tbody></table></div></div></>
}
function Reports({orders,items}){
 const calc=(start,end)=>{const os=orders.filter(o=>new Date(o.order_date)>=start&&(!end||new Date(o.order_date)<end)),ids=new Set(os.map(o=>o.id)),its=items.filter(i=>ids.has(i.order_id));return [its.reduce((a,i)=>a+Number(i.qty),0),os.reduce((a,o)=>a+Number(o.total_vat_included),0),its.reduce((a,i)=>a+(Number(i.unit_price_vat_included)-Number(i.purchase_price_snapshot))*Number(i.qty),0)]};
 const n=new Date(),d=new Date(n.getFullYear(),n.getMonth(),n.getDate()),w=new Date(d);w.setDate(d.getDate()-((d.getDay()+6)%7));const m=new Date(n.getFullYear(),n.getMonth(),1);
 return <div className="grid">{[['Günlük',...calc(d)],['Haftalık',...calc(w)],['Aylık',...calc(m)],['Tüm Zamanlar',...calc(new Date(2000,0,1))]].map(x=><div className="card" key={x[0]}><b>{x[0]}</b><div className="metric">{money(x[2])}</div><span className="muted">Ciro</span><p>Satış adedi: <b>{x[1]}</b></p><p>Kâr: <b>{money(x[3])}</b></p></div>)}</div>
}
