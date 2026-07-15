/* American Muffler & Towing — admin dashboard */
const $ = (id) => document.getElementById(id);
const H = { 'Content-Type': 'application/json', 'X-AMT-Admin': '1' };
const HX = { 'X-AMT-Admin': '1' };
let PRODUCTS = [], LEADS = [], POSTS = [], CONFIG = null, deferredPrompt = null, pendingImageUrl = '', pendingCover = '';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const money = (n) => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fmtDate(iso){ if(!iso) return ''; const d=new Date(iso); return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
function fmtDateTime(iso){ if(!iso) return ''; return new Date(iso).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); }

function toast(msg, type='ok'){ const el=document.createElement('div'); el.className='toast '+type; el.textContent=msg; $('toasts').appendChild(el); setTimeout(()=>{el.style.opacity='0';el.style.transition='opacity .3s';setTimeout(()=>el.remove(),300);},2900); }

async function fetchJSON(url, opts={}){
  const r = await fetch(url, opts);
  if(r.status===401){ showLogin(); throw new Error('Session expired'); }
  const d = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(d.error || 'Request failed');
  return d;
}

/* ---------------- auth ---------------- */
async function boot(){
  registerSW();
  try{ const d=await fetch('/api/session').then(r=>r.json()); if(d.authenticated) showApp(d.username); else showLogin(); }
  catch{ showLogin(); }
}
function showLogin(){ $('boot').classList.add('hidden'); $('app').classList.add('hidden'); $('login').classList.remove('hidden'); $('u')?.focus(); }
function showApp(username){
  $('boot').classList.add('hidden'); $('login').classList.add('hidden'); $('app').classList.remove('hidden');
  $('hello').textContent = 'Signed in as ' + username;
  route();
  loadAll();
}
$('loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault(); $('loginErr').classList.add('hidden'); $('loginBtn').textContent='Signing in…'; $('loginBtn').disabled=true;
  try{
    const d = await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:$('u').value,password:$('p').value})}).then(async r=>{const j=await r.json(); if(!r.ok) throw new Error(j.error||'Sign in failed'); return j;});
    showApp(d.username);
  }catch(err){ $('loginErr').textContent=err.message; $('loginErr').classList.remove('hidden'); }
  finally{ $('loginBtn').textContent='Sign in'; $('loginBtn').disabled=false; }
});
$('logoutBtn').addEventListener('click', async ()=>{ await fetch('/api/logout',{method:'POST',headers:HX}); location.reload(); });

/* ---------------- routing ---------------- */
const SECTIONS=['dashboard','products','blog','leads','integrations','settings'];
function route(){
  let sec=(location.hash||'#dashboard').slice(1); if(!SECTIONS.includes(sec)) sec='dashboard';
  document.querySelectorAll('[data-view]').forEach(v=>v.classList.toggle('hidden', v.dataset.view!==sec));
  document.querySelectorAll('#sideNav a').forEach(a=>a.classList.toggle('active', a.dataset.sec===sec));
  closeSidebar();
  if(sec==='integrations') loadConfig().then(renderIntegrations);
  if(sec==='settings') loadConfig().then(renderSettings);
}
window.addEventListener('hashchange', route);

/* mobile sidebar */
function openSidebar(){ $('sidebar').classList.add('open'); if(!document.getElementById('sbBack')){const b=document.createElement('div');b.id='sbBack';b.className='backdrop';b.onclick=closeSidebar;document.body.appendChild(b);} }
function closeSidebar(){ $('sidebar').classList.remove('open'); document.getElementById('sbBack')?.remove(); }
$('ham')?.addEventListener('click', openSidebar);

/* ---------------- data ---------------- */
async function loadAll(){ await Promise.all([loadProducts(), loadLeads(), loadPosts()]); renderDashboard(); }
async function loadProducts(){ try{ const d=await fetchJSON('/api/products?all=1'); PRODUCTS=d.products||[]; $('c-products').textContent=PRODUCTS.length; renderProducts(); renderDashboard(); }catch(e){} }
async function loadPosts(){ try{ const d=await fetchJSON('/api/posts'); POSTS=d.posts||[]; const el=$('c-posts'); const n=POSTS.filter(p=>p.status==='published').length; el.textContent=n; el.style.display=n?'':'none'; renderPosts(); }catch(e){} }
async function loadLeads(){ try{ const d=await fetchJSON('/api/leads'); LEADS=d.leads||[]; updateLeadCount(); renderLeads(); renderDashboard(); }catch(e){} }
async function loadConfig(){ try{ CONFIG=await fetchJSON('/api/config'); }catch(e){} return CONFIG; }
function updateLeadCount(){ const n=LEADS.filter(l=>l.status==='new').length; const el=$('c-leads'); el.textContent=n; el.style.display=n?'':'none'; }

/* ---------------- dashboard ---------------- */
function renderDashboard(){
  $('d-products').textContent=PRODUCTS.length;
  $('d-live').textContent=PRODUCTS.filter(p=>p.active).length;
  $('d-totalleads').textContent=LEADS.length;
  $('d-newleads').textContent=LEADS.filter(l=>l.status==='new').length;
  const recent=LEADS.slice(0,5);
  if(!recent.length){ $('d-recent').innerHTML='<div class="empty"><h3>No leads yet</h3><p>When someone submits a form on your site, it shows up here.</p></div>'; return; }
  $('d-recent').innerHTML='<table><tbody>'+recent.map(l=>`<tr class="clickable" data-open="${l.id}"><td><div class="pname">${esc(l.name)}</div><div class="psku">${esc(l.service||l.source||'')}</div></td><td>${esc(l.phone||l.email||'')}</td><td><span class="status ${l.status}">${l.status}</span></td><td style="text-align:right;color:var(--muted);font-size:13px">${fmtDate(l.createdAt)}</td></tr>`).join('')+'</tbody></table>';
  $('d-recent').querySelectorAll('[data-open]').forEach(r=>r.onclick=()=>{location.hash='#leads';setTimeout(()=>openLead(r.dataset.open),60);});
}

/* ---------------- products ---------------- */
const PH_THUMB='<div class="thumb ph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>';
function stockCell(p){ if(p.stock==null) return '<span class="stock-c">—</span>'; let c=''; if(p.stock<=0)c='out'; else if(p.stock<=3)c='low'; return `<span class="stock-c ${c}">${p.stock}</span>`; }
function renderProdCats(){ const cur=$('pcat').value; const cats=[...new Set(PRODUCTS.map(p=>p.category||'Other'))].sort(); $('pcat').innerHTML='<option value="">All categories</option>'+cats.map(c=>`<option>${esc(c)}</option>`).join(''); $('pcat').value=cur; }
function renderProducts(){
  renderProdCats();
  const q=$('pq').value.trim().toLowerCase(), cat=$('pcat').value;
  let items=PRODUCTS.slice();
  if(cat) items=items.filter(p=>(p.category||'Other')===cat);
  if(q) items=items.filter(p=>(p.name+' '+(p.description||'')+' '+(p.sku||'')+' '+(p.category||'')).toLowerCase().includes(q));
  items.sort((a,b)=>(a.category||'').localeCompare(b.category||'')||(a.name||'').localeCompare(b.name||''));
  const empty=$('pEmpty');
  if(!PRODUCTS.length){ $('prows').innerHTML=''; empty.classList.remove('hidden'); empty.innerHTML='<h3>No products yet</h3><p>Add your first product — tires, mufflers, parts, anything you sell.</p>'; return; }
  if(!items.length){ $('prows').innerHTML=''; empty.classList.remove('hidden'); empty.innerHTML='<h3>No matches</h3><p>Try a different search or category.</p>'; return; }
  empty.classList.add('hidden');
  $('prows').innerHTML=items.map(p=>{
    const thumb=p.imageUrl?`<img class="thumb" src="${esc(p.imageUrl)}" alt="">`:PH_THUMB;
    const price=p.price>0?money(p.price):'<span style="color:var(--muted);font-weight:600">Call</span>';
    return `<tr><td>${thumb}</td><td><div class="pname">${esc(p.name)}</div>${p.sku?`<div class="psku">${esc(p.sku)}</div>`:''}</td><td><span class="cat-pill">${esc(p.category||'Other')}</span></td><td class="price-c">${price}</td><td>${stockCell(p)}</td><td><button class="toggle ${p.active?'on':'off'}" data-ptoggle="${p.id}"><span class="dot"></span>${p.active?'Live':'Hidden'}</button></td><td><div class="row-actions"><button class="icon-btn" data-pedit="${p.id}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button><button class="icon-btn danger" data-pdel="${p.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button></div></td></tr>`;
  }).join('');
}
$('pq').addEventListener('input', renderProducts);
$('pcat').addEventListener('change', renderProducts);
$('prows').addEventListener('click', (e)=>{
  const ed=e.target.closest('[data-pedit]'), dl=e.target.closest('[data-pdel]'), tg=e.target.closest('[data-ptoggle]');
  if(ed) return openProd(PRODUCTS.find(p=>p.id===ed.dataset.pedit));
  if(dl) return delProd(dl.dataset.pdel);
  if(tg) return toggleProd(tg.dataset.ptoggle);
});
async function toggleProd(id){ const p=PRODUCTS.find(x=>x.id===id); if(!p) return; try{ const d=await fetchJSON('/api/products/'+id,{method:'PUT',headers:H,body:JSON.stringify({active:!p.active})}); p.active=d.product.active; renderProducts(); renderDashboard(); toast(p.active?'Product is now live':'Product hidden'); }catch(err){ toast(err.message,'err'); } }
async function delProd(id){ const p=PRODUCTS.find(x=>x.id===id); if(!p||!confirm(`Delete "${p.name}"?`)) return; try{ await fetchJSON('/api/products/'+id,{method:'DELETE',headers:HX}); PRODUCTS=PRODUCTS.filter(x=>x.id!==id); $('c-products').textContent=PRODUCTS.length; renderProducts(); renderDashboard(); toast('Product deleted'); }catch(err){ toast(err.message,'err'); } }

/* product modal */
function openProd(p){
  $('prodForm').reset(); pendingImageUrl='';
  $('pModalTitle').textContent=p?'Edit product':'Add product';
  $('f-id').value=p?.id||'';
  if(p){ $('f-name').value=p.name||''; $('f-category').value=p.category||''; $('f-sku').value=p.sku||''; $('f-price').value=p.price||''; $('f-stock').value=(p.stock==null?'':p.stock); $('f-desc').value=p.description||''; $('f-active').checked=p.active!==false; pendingImageUrl=p.imageUrl||''; }
  else { $('f-active').checked=true; }
  renderDrop(); $('pOverlay').classList.remove('hidden'); setTimeout(()=>$('f-name').focus(),50);
}
function renderDrop(){
  const drop=$('drop');
  if(pendingImageUrl){ drop.classList.add('has'); drop.innerHTML=`<img src="${esc(pendingImageUrl)}" alt=""><button type="button" class="rm" id="rmImg">Remove</button>`; $('rmImg').onclick=(e)=>{e.stopPropagation();pendingImageUrl='';renderDrop();}; }
  else { drop.classList.remove('has'); drop.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg><div id="dropText">Click or drag an image here<br><b>JPG, PNG, or WebP</b></div><input type="file" id="fileInput" accept="image/*" class="hidden">`; $('fileInput').onchange=(e)=>{if(e.target.files[0])handleFile(e.target.files[0]);}; }
}
$('drop').addEventListener('click',()=>$('fileInput')?.click());
$('drop').addEventListener('dragover',(e)=>{e.preventDefault();$('drop').style.borderColor='var(--accent)';});
$('drop').addEventListener('dragleave',()=>{$('drop').style.borderColor='';});
$('drop').addEventListener('drop',(e)=>{e.preventDefault();$('drop').style.borderColor='';if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);});
function handleFile(file){
  if(!file.type.startsWith('image/')){ toast('Please choose an image file','err'); return; }
  const reader=new FileReader();
  reader.onload=()=>{ const img=new Image(); img.onload=async()=>{
    const MAX=1400; let {width,height}=img; if(width>MAX||height>MAX){const s=MAX/Math.max(width,height);width=Math.round(width*s);height=Math.round(height*s);}
    const c=document.createElement('canvas'); c.width=width; c.height=height; c.getContext('2d').drawImage(img,0,0,width,height);
    const dataUrl=c.toDataURL('image/jpeg',0.82); if($('dropText'))$('dropText').textContent='Uploading…';
    try{ const d=await fetchJSON('/api/product-image',{method:'POST',headers:H,body:JSON.stringify({dataUrl})}); pendingImageUrl=d.url; renderDrop(); toast('Photo uploaded'); }
    catch(err){ toast(err.message,'err'); renderDrop(); }
  }; img.src=reader.result; };
  reader.readAsDataURL(file);
}
$('prodForm').addEventListener('submit', async(e)=>{
  e.preventDefault(); const id=$('f-id').value;
  const payload={ name:$('f-name').value.trim(), category:$('f-category').value.trim()||'Other', sku:$('f-sku').value.trim(), price:$('f-price').value, stock:$('f-stock').value===''?null:$('f-stock').value, description:$('f-desc').value.trim(), imageUrl:pendingImageUrl, active:$('f-active').checked };
  if(!payload.name){ toast('Product name is required','err'); return; }
  $('pSave').textContent='Saving…'; $('pSave').disabled=true;
  try{
    const d=await fetchJSON(id?'/api/products/'+id:'/api/products',{method:id?'PUT':'POST',headers:H,body:JSON.stringify(payload)});
    if(id){ const i=PRODUCTS.findIndex(p=>p.id===id); if(i>-1)PRODUCTS[i]=d.product; } else PRODUCTS.push(d.product);
    $('c-products').textContent=PRODUCTS.length; renderProducts(); renderDashboard(); closeOverlay('pOverlay'); toast(id?'Product updated':'Product added');
  }catch(err){ toast(err.message,'err'); }
  finally{ $('pSave').textContent='Save product'; $('pSave').disabled=false; }
});
$('addProd').addEventListener('click',()=>openProd(null));

/* ---------------- leads ---------------- */
function renderLeads(){
  const q=$('lq').value.trim().toLowerCase(), st=$('lstatus').value;
  let items=LEADS.slice();
  if(st) items=items.filter(l=>l.status===st);
  if(q) items=items.filter(l=>(l.name+' '+(l.phone||'')+' '+(l.email||'')+' '+(l.service||'')+' '+(l.message||'')).toLowerCase().includes(q));
  const empty=$('lEmpty');
  if(!LEADS.length){ $('lrows').innerHTML=''; empty.classList.remove('hidden'); empty.innerHTML='<h3>No leads yet</h3><p>Form submissions from your website land here automatically. You can also add one manually.</p>'; return; }
  if(!items.length){ $('lrows').innerHTML=''; empty.classList.remove('hidden'); empty.innerHTML='<h3>No matches</h3><p>Try a different search or status.</p>'; return; }
  empty.classList.add('hidden');
  $('lrows').innerHTML=items.map(l=>{
    const src=l.source==='towing'?'towing':''; const srcLabel=(l.source||'form').replace('-',' ');
    return `<tr class="clickable" data-open="${l.id}"><td><div class="pname">${esc(l.name)}</div></td><td>${esc(l.phone||'')}${l.phone&&l.email?'<br>':''}<span style="color:var(--muted);font-size:13px">${esc(l.email||'')}</span></td><td>${esc(l.service||'—')}</td><td><span class="src-pill ${src}">${esc(srcLabel)}</span></td><td><span class="status ${l.status}">${l.status}</span></td><td style="color:var(--muted);font-size:13px">${fmtDate(l.createdAt)}</td></tr>`;
  }).join('');
  $('lrows').querySelectorAll('[data-open]').forEach(r=>r.onclick=()=>openLead(r.dataset.open));
}
$('lq').addEventListener('input', renderLeads);
$('lstatus').addEventListener('change', renderLeads);

/* contact card slideover */
const STATUSES=['new','contacted','quoted','won','lost'];
function openLead(id){
  const l=LEADS.find(x=>x.id===id); if(!l) return;
  const notes=(l.notes||[]).slice().reverse();
  $('leadPanel').innerHTML=`
    <div class="so-head"><div><h2 style="font-size:20px">${esc(l.name)}</h2><div style="color:var(--muted);font-size:13px;margin-top:2px">${esc((l.source||'form').replace('-',' '))} · ${fmtDateTime(l.createdAt)}</div></div><button class="close-x" id="soClose"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>
    <div class="so-body">
      <div style="display:flex;gap:8px;margin-bottom:16px">${l.phone?`<a class="btn btn-primary btn-sm" href="tel:${esc(l.phone)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.86 19.86 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.35 1.84.59 2.8.72A2 2 0 0 1 22 16.92Z"/></svg>Call</a>`:''}${l.email?`<a class="btn btn-light btn-sm" href="mailto:${esc(l.email)}">Email</a>`:''}</div>
      <div style="margin-bottom:18px">
        ${l.phone?`<div class="contact-line"><span class="k">Phone</span><a href="tel:${esc(l.phone)}">${esc(l.phone)}</a></div>`:''}
        ${l.email?`<div class="contact-line"><span class="k">Email</span><a href="mailto:${esc(l.email)}">${esc(l.email)}</a></div>`:''}
        ${l.service?`<div class="contact-line"><span class="k">Service</span>${esc(l.service)}</div>`:''}
        ${l.message?`<div class="contact-line" style="align-items:flex-start"><span class="k">Message</span><span>${esc(l.message)}</span></div>`:''}
      </div>
      <label class="lbl">Status</label>
      <select class="inp" id="soStatus" style="margin-bottom:18px">${STATUSES.map(s=>`<option value="${s}" ${l.status===s?'selected':''}>${s[0].toUpperCase()+s.slice(1)}</option>`).join('')}</select>
      <label class="lbl">Notes &amp; activity</label>
      <div style="display:flex;gap:8px;margin-bottom:12px"><input class="inp" id="soNote" placeholder="Add a note…"><button class="btn btn-dark btn-sm" id="soAddNote">Add</button></div>
      <div id="soNotes">${notes.length?notes.map(n=>`<div class="note"><div class="t">${fmtDateTime(n.ts)}</div>${esc(n.text)}</div>`).join(''):'<div style="color:var(--muted);font-size:13.5px">No notes yet.</div>'}</div>
    </div>
    <div class="so-foot"><button class="btn btn-danger btn-sm" id="soDelete" style="margin-right:auto">Delete lead</button></div>`;
  $('leadPanel').classList.add('open'); $('panelBackdrop').classList.remove('hidden');
  $('soClose').onclick=closeLead; $('panelBackdrop').onclick=closeLead;
  $('soStatus').onchange=async(e)=>{ try{ const d=await fetchJSON('/api/leads/'+id,{method:'PUT',headers:H,body:JSON.stringify({status:e.target.value})}); updateLead(d.lead); toast('Status updated'); }catch(err){toast(err.message,'err');} };
  $('soAddNote').onclick=async()=>{ const t=$('soNote').value.trim(); if(!t) return; try{ const d=await fetchJSON('/api/leads/'+id,{method:'PUT',headers:H,body:JSON.stringify({addNote:t})}); updateLead(d.lead); openLead(id); }catch(err){toast(err.message,'err');} };
  $('soDelete').onclick=async()=>{ if(!confirm('Delete this lead?')) return; try{ await fetchJSON('/api/leads/'+id,{method:'DELETE',headers:HX}); LEADS=LEADS.filter(x=>x.id!==id); updateLeadCount(); renderLeads(); renderDashboard(); closeLead(); toast('Lead deleted'); }catch(err){toast(err.message,'err');} };
}
function closeLead(){ $('leadPanel').classList.remove('open'); $('panelBackdrop').classList.add('hidden'); }
function updateLead(lead){ const i=LEADS.findIndex(x=>x.id===lead.id); if(i>-1)LEADS[i]=lead; updateLeadCount(); renderLeads(); renderDashboard(); }
$('addLead').addEventListener('click',()=>{ $('leadForm').reset(); $('lOverlay').classList.remove('hidden'); setTimeout(()=>$('l-name').focus(),50); });
$('leadForm').addEventListener('submit', async(e)=>{
  e.preventDefault();
  const payload={ name:$('l-name').value.trim(), phone:$('l-phone').value.trim(), email:$('l-email').value.trim(), service:$('l-service').value.trim(), message:$('l-message').value.trim(), source:'manual' };
  if(!payload.name){ toast('Name is required','err'); return; }
  $('lSave').textContent='Saving…'; $('lSave').disabled=true;
  try{ const d=await fetchJSON('/api/leads',{method:'POST',headers:H,body:JSON.stringify(payload)}); LEADS.unshift(d.lead); updateLeadCount(); renderLeads(); renderDashboard(); closeOverlay('lOverlay'); toast('Lead added'); }
  catch(err){ toast(err.message,'err'); }
  finally{ $('lSave').textContent='Add lead'; $('lSave').disabled=false; }
});

/* ---------------- integrations ---------------- */
function renderIntegrations(){
  if(!CONFIG){ return; }
  const p=CONFIG.integrations.push, w=CONFIG.integrations.webhook, e=CONFIG.integrations.email;
  const pushOn = p.subscribers>0;
  $('integWrap').innerHTML=`
    <div class="panel"><div class="panel-body">
      <!-- PUSH -->
      <div class="int-card">
        <div class="int-top">
          <div class="int-ico" style="background:#C8102E"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
          <div><h4>Push notifications</h4><p>Install the dashboard as an app and get a push the instant a lead comes in — perfect for a crew on the road.</p></div>
          <span class="int-badge ${pushOn?'on':'off'}">${p.subscribers} device${p.subscribers===1?'':'s'}</span>
        </div>
        ${p.available?`<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary btn-sm" id="pushEnable">Enable on this device</button><button class="btn btn-light btn-sm" id="pushTest">Send test</button><button class="btn btn-light btn-sm" id="installApp">Install app</button></div><div class="hint" style="margin-top:10px">On iPhone: open this page in Safari, tap Share → “Add to Home Screen”, then open the app and tap Enable.</div>`:'<div class="hint">Push isn\'t configured on the server yet.</div>'}
      </div>
      <!-- WEBHOOK -->
      <div class="int-card">
        <div class="int-top">
          <div class="int-ico" style="background:#4A154B"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 16.98h-5.99c-1.66 0-3.01-1.34-3.01-3s1.34-3 3.01-3H18"/><path d="m21 12-3-3v6l3-3Z"/><circle cx="6" cy="12" r="3"/></svg></div>
          <div><h4>Slack / Discord / Zapier</h4><p>Paste an incoming webhook URL and every lead posts there instantly. Free — works with Slack, Discord, Zapier, or Make.</p></div>
          <span class="int-badge ${w.enabled&&w.urlSet?'on':'off'}">${w.enabled&&w.urlSet?'Connected':'Off'}</span>
        </div>
        <label class="switch" style="margin-bottom:12px"><input type="checkbox" id="whEnabled" ${w.enabled?'checked':''}><span class="track"></span><span>Send leads to a webhook</span></label>
        <label class="lbl">Webhook URL</label>
        <input class="inp" id="whUrl" placeholder="${w.urlSet?'•••• saved ('+esc(w.urlHint)+') — paste a new URL to replace':'https://hooks.slack.com/services/…'}">
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-primary btn-sm" id="whSave">Save</button><button class="btn btn-light btn-sm" id="whTest">Send test</button></div>
      </div>
      <!-- EMAIL -->
      <div class="int-card">
        <div class="int-top">
          <div class="int-ico" style="background:#1d4ed8"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg></div>
          <div><h4>Email</h4><p>Get an email per lead. Uses <a href="https://resend.com" target="_blank" rel="noopener">Resend</a> — create a free account, paste an API key, and set who gets notified.</p></div>
          <span class="int-badge ${e.enabled&&e.apiKeySet?'on':'off'}">${e.enabled&&e.apiKeySet?'Connected':'Off'}</span>
        </div>
        <label class="switch" style="margin-bottom:12px"><input type="checkbox" id="emEnabled" ${e.enabled?'checked':''}><span class="track"></span><span>Email me new leads</span></label>
        <div class="grid2">
          <div class="fg"><label class="lbl">Resend API key</label><input class="inp" id="emKey" placeholder="${e.apiKeySet?'•••• saved — paste new to replace':'re_…'}"></div>
          <div class="fg"><label class="lbl">Send to (comma-separated)</label><input class="inp" id="emTo" value="${esc(e.to)}" placeholder="you@shop.com, crew@shop.com"></div>
        </div>
        <div class="fg"><label class="lbl">From address <span style="font-weight:400;color:var(--muted)">(optional)</span></label><input class="inp" id="emFrom" value="${esc(e.from)}" placeholder="American Muffler & Towing <onboarding@resend.dev>"></div>
        <div style="display:flex;gap:8px"><button class="btn btn-primary btn-sm" id="emSave">Save</button><button class="btn btn-light btn-sm" id="emTest">Send test</button></div>
      </div>
    </div></div>`;
  $('pushEnable') && ($('pushEnable').onclick=enablePush);
  $('pushTest') && ($('pushTest').onclick=async()=>{ try{ await fetchJSON('/api/push/test',{method:'POST',headers:HX}); toast('Test push sent'); }catch(err){ toast(err.message,'err'); } });
  $('installApp') && ($('installApp').onclick=installApp);
  $('whSave').onclick=async()=>{ try{ await fetchJSON('/api/config',{method:'POST',headers:H,body:JSON.stringify({webhook:{enabled:$('whEnabled').checked,url:$('whUrl').value.trim()}})}); toast('Webhook saved'); await loadConfig(); renderIntegrations(); }catch(err){toast(err.message,'err');} };
  $('whTest').onclick=async()=>{ await saveWebhookQuiet(); try{ const d=await fetchJSON('/api/test-integration',{method:'POST',headers:H,body:JSON.stringify({channel:'webhook'})}); toast(d.message||'Test sent'); }catch(err){toast(err.message,'err');} };
  $('emSave').onclick=saveEmail;
  $('emTest').onclick=async()=>{ await saveEmail(true); try{ const d=await fetchJSON('/api/test-integration',{method:'POST',headers:H,body:JSON.stringify({channel:'email'})}); toast(d.message||'Test sent'); }catch(err){toast(err.message,'err');} };
}
async function saveWebhookQuiet(){ try{ await fetchJSON('/api/config',{method:'POST',headers:H,body:JSON.stringify({webhook:{enabled:$('whEnabled').checked,url:$('whUrl').value.trim()}})}); await loadConfig(); }catch(e){} }
async function saveEmail(quiet){ try{ await fetchJSON('/api/config',{method:'POST',headers:H,body:JSON.stringify({email:{enabled:$('emEnabled').checked,apiKey:$('emKey').value.trim(),to:$('emTo').value.trim(),from:$('emFrom').value.trim()}})}); if(!quiet){ toast('Email settings saved'); await loadConfig(); renderIntegrations(); } else { await loadConfig(); } }catch(err){ toast(err.message,'err'); } }

/* ---------------- settings ---------------- */
function renderSettings(){
  if(!CONFIG){ return; }
  const b=CONFIG.business;
  $('settingsWrap').innerHTML=`
    <div class="panel"><div class="panel-head"><div><h3>Business profile</h3><div class="sub">Shown on notifications and used across the dashboard.</div></div></div><div class="panel-body">
      <div class="grid2"><div class="fg"><label class="lbl">Business name</label><input class="inp" id="b-name" value="${esc(b.name)}"></div><div class="fg"><label class="lbl">Phone</label><input class="inp" id="b-phone" value="${esc(b.phone)}"></div></div>
      <div class="grid2"><div class="fg"><label class="lbl">Contact email</label><input class="inp" id="b-email" value="${esc(b.email)}"></div><div class="fg"><label class="lbl">Hours</label><input class="inp" id="b-hours" value="${esc(b.hours)}"></div></div>
      <div class="fg"><label class="lbl">Address</label><input class="inp" id="b-address" value="${esc(b.address)}"></div>
      <button class="btn btn-primary btn-sm" id="bSave">Save profile</button>
    </div></div>
    <div class="panel"><div class="panel-head"><div><h3>Account &amp; password</h3><div class="sub">Change your sign-in details.</div></div></div><div class="panel-body">
      <div class="fg"><label class="lbl">Username</label><input class="inp" id="a-user" value="${esc(CONFIG.admin.user)}"></div>
      <div class="grid2"><div class="fg"><label class="lbl">Current password</label><input class="inp" id="a-cur" type="password" autocomplete="current-password"></div><div class="fg"><label class="lbl">New password</label><input class="inp" id="a-new" type="password" autocomplete="new-password" placeholder="min 8 characters"></div></div>
      <button class="btn btn-primary btn-sm" id="aSave">Update account</button>
      <div class="hint" style="margin-top:8px">You'll stay signed in on this device; new logins use the new details.</div>
    </div></div>
    <div class="panel"><div class="panel-head"><div><h3>Install the app</h3><div class="sub">Add the dashboard to your phone or desktop for one-tap access + push.</div></div></div><div class="panel-body">
      <button class="btn btn-dark btn-sm" id="installApp2">Install dashboard app</button>
      <div class="hint" style="margin-top:8px">On iPhone: Safari → Share → “Add to Home Screen”. On Android/desktop Chrome: use the button above or the install icon in the address bar.</div>
    </div></div>`;
  $('bSave').onclick=async()=>{ try{ await fetchJSON('/api/config',{method:'POST',headers:H,body:JSON.stringify({business:{name:$('b-name').value,phone:$('b-phone').value,email:$('b-email').value,hours:$('b-hours').value,address:$('b-address').value}})}); toast('Profile saved'); await loadConfig(); }catch(err){toast(err.message,'err');} };
  $('aSave').onclick=async()=>{ const cur=$('a-cur').value, nw=$('a-new').value, user=$('a-user').value.trim(); if(!nw){ toast('Enter a new password','err'); return; } try{ const d=await fetchJSON('/api/change-password',{method:'POST',headers:H,body:JSON.stringify({currentPassword:cur,newPassword:nw,newUsername:user})}); toast('Account updated'); $('a-cur').value='';$('a-new').value=''; }catch(err){toast(err.message,'err');} };
  $('installApp2').onclick=installApp;
}

/* ---------------- PWA / push ---------------- */
function registerSW(){ if('serviceWorker' in navigator){ navigator.serviceWorker.register('/admin/sw.js').catch(()=>{}); } }
window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt=e; });
async function installApp(){ if(deferredPrompt){ deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; } else { toast('On iPhone use Safari’s Share → Add to Home Screen'); } }
function urlB64ToUint8(b64){ const pad='='.repeat((4-b64.length%4)%4); const s=(b64+pad).replace(/-/g,'+').replace(/_/g,'/'); const raw=atob(s); const arr=new Uint8Array(raw.length); for(let i=0;i<raw.length;i++)arr[i]=raw.charCodeAt(i); return arr; }
async function enablePush(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window)){ toast('Push isn’t supported on this device/browser','err'); return; }
  try{
    const perm=await Notification.requestPermission();
    if(perm!=='granted'){ toast('Notifications were blocked','err'); return; }
    const reg=await navigator.serviceWorker.ready;
    const key=CONFIG.integrations.push.vapidPublicKey;
    if(!key){ toast('Push not configured on server','err'); return; }
    let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64ToUint8(key)});
    await fetchJSON('/api/push/subscribe',{method:'POST',headers:H,body:JSON.stringify({subscription:sub})});
    toast('This device will now get lead alerts'); await loadConfig(); renderIntegrations();
  }catch(err){ toast('Could not enable push: '+err.message,'err'); }
}

/* ---------------- blog ---------------- */
function slugify(s){ return String(s||'').toLowerCase().trim().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80); }
function faqsToText(faqs){ return (faqs||[]).map(function(f){return 'Q: '+f.q+'\nA: '+f.a;}).join('\n\n'); }
function textToFaqs(text){ return String(text||'').split(/\n\s*\n/).map(function(b){ var qm=b.match(/Q:\s*([\s\S]*?)(?:\nA:|$)/i), am=b.match(/A:\s*([\s\S]*)$/i); return {q:(qm?qm[1]:'').trim(),a:(am?am[1]:'').trim()}; }).filter(function(f){return f.q&&f.a;}); }
function mdPreview(md){
  var lines=String(md||'').replace(/\r\n?/g,'\n').split('\n'), out=[], para=[], list=null, items=[];
  function fp(){ if(para.length){ out.push('<p>'+para.map(inl).join(' ')+'</p>'); para=[]; } }
  function fl(){ if(items.length){ out.push('<'+list+'>'+items.map(function(i){return '<li>'+inl(i)+'</li>';}).join('')+'</'+list+'>'); items=[]; list=null; } }
  function inl(t){ var s=esc(t); s=s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,'<img src="$2" alt="$1">'); s=s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,'<a href="$2">$1</a>'); s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>'); s=s.replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>'); s=s.replace(/`([^`]+)`/g,'<code>$1</code>'); return s; }
  for(var k=0;k<lines.length;k++){ var line=lines[k], m;
    if(line.trim()===''){ fp(); fl(); continue; }
    if((m=line.match(/^(#{1,6})\s+(.*)$/))){ fp(); fl(); out.push('<h'+m[1].length+'>'+inl(m[2])+'</h'+m[1].length+'>'); continue; }
    if(/^(-{3,})\s*$/.test(line)){ fp(); fl(); out.push('<hr>'); continue; }
    if((m=line.match(/^>\s?(.*)$/))){ fp(); fl(); out.push('<blockquote><p>'+inl(m[1])+'</p></blockquote>'); continue; }
    if((m=line.match(/^[-*+]\s+(.*)$/))){ fp(); if(list&&list!=='ul')fl(); list='ul'; items.push(m[1]); continue; }
    if((m=line.match(/^\d+\.\s+(.*)$/))){ fp(); if(list&&list!=='ol')fl(); list='ol'; items.push(m[1]); continue; }
    fl(); para.push(line.trim());
  }
  fp(); fl(); return out.join('\n');
}
function renderPosts(){
  var q=$('bq').value.trim().toLowerCase(), st=$('bstatus').value;
  var items=POSTS.slice();
  if(st) items=items.filter(function(p){return p.status===st;});
  if(q) items=items.filter(function(p){return (p.title+' '+(p.excerpt||'')+' '+(p.tags||[]).join(' ')).toLowerCase().indexOf(q)>-1;});
  var empty=$('bEmpty');
  if(!POSTS.length){ $('brows').innerHTML=''; empty.classList.remove('hidden'); empty.innerHTML='<h3>No posts yet</h3><p>Write your first post — a quick guide or tip ranks for local searches your service pages can\'t.</p>'; return; }
  if(!items.length){ $('brows').innerHTML=''; empty.classList.remove('hidden'); empty.innerHTML='<h3>No matches</h3><p>Try a different search or filter.</p>'; return; }
  empty.classList.add('hidden');
  $('brows').innerHTML=items.map(function(p){
    var st2=p.status==='published'?'won':'lost';
    var label=p.status==='published'?'Published':'Draft';
    return '<tr><td><div class="pname">'+esc(p.title)+'</div><div class="psku">/blog/'+esc(p.slug)+'/</div></td>'+
      '<td><button class="toggle '+(p.status==='published'?'on':'off')+'" data-btoggle="'+p.id+'"><span class="dot"></span>'+label+'</button></td>'+
      '<td style="color:var(--muted);font-size:13px">'+(p.publishedAt?fmtDate(p.publishedAt):'—')+'</td>'+
      '<td><div class="row-actions">'+(p.status==='published'?'<a class="icon-btn" href="/blog/'+esc(p.slug)+'/" target="_blank" rel="noopener" title="View"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></a>':'')+
      '<button class="icon-btn" data-bedit="'+p.id+'" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>'+
      '<button class="icon-btn danger" data-bdel="'+p.id+'" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>'+
      '</div></td></tr>';
  }).join('');
}
$('bq').addEventListener('input', renderPosts);
$('bstatus').addEventListener('change', renderPosts);
$('brows').addEventListener('click', function(e){
  var ed=e.target.closest('[data-bedit]'), dl=e.target.closest('[data-bdel]'), tg=e.target.closest('[data-btoggle]');
  if(ed) return openPost(POSTS.find(function(p){return p.id===ed.dataset.bedit;}));
  if(dl) return delPost(dl.dataset.bdel);
  if(tg) return togglePost(tg.dataset.btoggle);
});
async function togglePost(id){ var p=POSTS.find(function(x){return x.id===id;}); if(!p) return; var next=p.status==='published'?'draft':'published'; try{ var d=await fetchJSON('/api/posts/'+id,{method:'PUT',headers:H,body:JSON.stringify({status:next})}); var i=POSTS.findIndex(function(x){return x.id===id;}); POSTS[i]=d.post; loadPosts(); toast(next==='published'?'Post published':'Moved to draft'); }catch(err){ toast(err.message,'err'); } }
async function delPost(id){ var p=POSTS.find(function(x){return x.id===id;}); if(!p||!confirm('Delete "'+p.title+'"?')) return; try{ await fetchJSON('/api/posts/'+id,{method:'DELETE',headers:HX}); POSTS=POSTS.filter(function(x){return x.id!==id;}); loadPosts(); toast('Post deleted'); }catch(err){ toast(err.message,'err'); } }

function openPost(p){
  $('postForm').reset(); pendingCover=''; setPostTab('write');
  $('bModalTitle').textContent=p?'Edit post':'New post';
  $('b-id').value=p?p.id:'';
  if(p){ $('b-title').value=p.title||''; $('b-slug').value=p.slug||''; $('b-excerpt').value=p.excerpt||''; $('b-content').value=p.content||''; $('b-faqs').value=faqsToText(p.faqs); $('b-tags').value=(p.tags||[]).join(', '); $('b-author').value=p.author||''; $('b-published').checked=p.status==='published'; pendingCover=p.coverImage||''; }
  updateSlugPreview(); renderPostDrop(); $('bOverlay').classList.remove('hidden'); setTimeout(function(){$('b-title').focus();},50);
}
function updateSlugPreview(){ var s=$('b-slug').value.trim()||slugify($('b-title').value); $('b-slugpreview').textContent='/blog/'+(s||'…')+'/'; }
$('b-title').addEventListener('input', updateSlugPreview);
$('b-slug').addEventListener('input', updateSlugPreview);
function setPostTab(which){ var w=which==='write'; $('b-content').classList.toggle('hidden',!w); $('b-preview').classList.toggle('hidden',w); $('tabWrite').classList.toggle('btn-dark',w); $('tabWrite').classList.toggle('btn-light',!w); $('tabPreview').classList.toggle('btn-dark',!w); $('tabPreview').classList.toggle('btn-light',w); if(!w) $('b-preview').innerHTML=mdPreview($('b-content').value)||'<p style="color:var(--muted)">Nothing to preview yet.</p>'; }
$('tabWrite').addEventListener('click', function(){ setPostTab('write'); });
$('tabPreview').addEventListener('click', function(){ setPostTab('preview'); });

function renderPostDrop(){
  var drop=$('postDrop');
  if(pendingCover){ drop.classList.add('has'); drop.innerHTML='<img src="'+esc(pendingCover)+'" alt=""><button type="button" class="rm" id="rmCover">Remove</button>'; $('rmCover').onclick=function(e){ e.stopPropagation(); pendingCover=''; renderPostDrop(); }; }
  else { drop.classList.remove('has'); drop.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg><div id="coverText">Click or drag a cover image<br><b>JPG, PNG, or WebP</b></div><input type="file" id="coverInput" accept="image/*" class="hidden">'; $('coverInput').onchange=function(e){ if(e.target.files[0]) handleCover(e.target.files[0]); }; }
}
$('postDrop').addEventListener('click', function(){ $('coverInput') && $('coverInput').click(); });
function handleCover(file){
  if(!file.type.startsWith('image/')){ toast('Please choose an image file','err'); return; }
  var reader=new FileReader();
  reader.onload=function(){ var img=new Image(); img.onload=async function(){
    var MAX=1600, w=img.width, h=img.height; if(w>MAX||h>MAX){ var s=MAX/Math.max(w,h); w=Math.round(w*s); h=Math.round(h*s); }
    var c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h);
    var dataUrl=c.toDataURL('image/jpeg',0.82); if($('coverText'))$('coverText').textContent='Uploading…';
    try{ var d=await fetchJSON('/api/product-image',{method:'POST',headers:H,body:JSON.stringify({dataUrl:dataUrl})}); pendingCover=d.url; renderPostDrop(); toast('Cover uploaded'); }
    catch(err){ toast(err.message,'err'); renderPostDrop(); }
  }; img.src=reader.result; };
  reader.readAsDataURL(file);
}
$('addPost').addEventListener('click', function(){ openPost(null); });
$('postForm').addEventListener('submit', async function(e){
  e.preventDefault(); var id=$('b-id').value;
  var payload={ title:$('b-title').value.trim(), slug:$('b-slug').value.trim(), excerpt:$('b-excerpt').value.trim(), content:$('b-content').value, coverImage:pendingCover, tags:$('b-tags').value, faqs:textToFaqs($('b-faqs').value), author:$('b-author').value.trim(), status:$('b-published').checked?'published':'draft' };
  if(!payload.title){ toast('Title is required','err'); return; }
  $('bSave').textContent='Saving…'; $('bSave').disabled=true;
  try{
    var d=await fetchJSON(id?'/api/posts/'+id:'/api/posts',{method:id?'PUT':'POST',headers:H,body:JSON.stringify(payload)});
    closeOverlay('bOverlay'); await loadPosts();
    toast(id?'Post saved':(payload.status==='published'?'Post published':'Draft saved'));
  }catch(err){ toast(err.message,'err'); }
  finally{ $('bSave').textContent='Save post'; $('bSave').disabled=false; }
});

/* overlays */
function closeOverlay(id){ $(id).classList.add('hidden'); }
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeOverlay(b.dataset.close));
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',(e)=>{ if(e.target===o) o.classList.add('hidden'); }));
document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'){ document.querySelectorAll('.overlay').forEach(o=>o.classList.add('hidden')); closeLead(); } });

boot();
