(() => {
  'use strict';
  if (window.__TAG_ORDER_DETAIL_FIX__) return;
  window.__TAG_ORDER_DETAIL_FIX__ = true;

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const fmt = v => v ? new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}) : '—';
  const cache = new Map();

  async function getClient(){
    const b=window.GestaoBackend;
    if(!b?.getSession) throw new Error('Sessão do Gestão indisponível.');
    const s=await b.getSession();
    if(!s?.access_token||!s?.refresh_token) throw new Error('Faça login novamente.');
    if(window.__TAG_ORDER_DETAIL_CLIENT__) return window.__TAG_ORDER_DETAIL_CLIENT__;
    const cfg=window.TEM_AQUI_SUPABASE||{};
    const c=window.supabase.createClient(cfg.url,cfg.publishableKey||cfg.anonKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});
    const r=await c.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});
    if(r.error) throw r.error;
    window.__TAG_ORDER_DETAIL_CLIENT__=c;
    return c;
  }

  function coordKey(lat,lon){return `${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`;}
  async function reverseAddress(lat,lon){
    if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))) return '';
    const key=coordKey(lat,lon);
    if(cache.has(key)) return cache.get(key);
    const stored=localStorage.getItem('tag-geocode-'+key);
    if(stored){cache.set(key,stored);return stored;}
    try{
      const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
      const r=await fetch(u,{headers:{'Accept':'application/json','Accept-Language':'pt-BR,pt;q=0.9'}});
      if(!r.ok) return '';
      const j=await r.json(); const a=j.address||{};
      const road=a.road||a.residential||a.pedestrian||a.path||a.neighbourhood||a.suburb||'';
      const num=a.house_number||''; const hood=a.neighbourhood||a.suburb||a.village||a.town||a.city_district||''; const city=a.city||a.town||a.village||a.municipality||'';
      const text=[road,num,hood,city].filter(Boolean).join(', ') || j.display_name || '';
      if(text){cache.set(key,text);localStorage.setItem('tag-geocode-'+key,text);}
      return text;
    }catch(_){return '';}
  }

  function ensureModal(){
    let d=document.getElementById('orderFullDetailDialog'); if(d) return d;
    d=document.createElement('dialog'); d.id='orderFullDetailDialog';
    d.innerHTML='<div id="orderFullDetailBody"></div>';
    document.body.appendChild(d);
    const st=document.createElement('style'); st.textContent=`
      #orderFullDetailDialog{width:min(760px,94vw);max-height:88vh;border:0;border-radius:20px;padding:0;box-shadow:0 24px 80px #0004}#orderFullDetailDialog::backdrop{background:#0f172a99}.ofd{padding:20px}.ofd-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #e5e7eb;padding-bottom:14px}.ofd-head h2{margin:0}.ofd-close{border:0;background:#eef2f7;border-radius:10px;width:38px;height:38px;font-size:24px}.ofd-products{margin:16px 0}.ofd-item{display:grid;grid-template-columns:1fr auto;gap:8px;padding:11px 0;border-bottom:1px solid #edf2f7}.ofd-item b,.ofd-item small{display:block}.ofd-item small{color:#64748b;margin-top:3px}.ofd-card{background:#f8fafc;border-radius:14px;padding:13px;margin-top:10px}.ofd-card span{display:block;color:#64748b;font-size:11px}.ofd-card b{display:block;margin-top:4px;line-height:1.35}.ofd-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}.ofd-actions a,.ofd-actions button{border:0;border-radius:12px;padding:11px 14px;font-weight:800;text-decoration:none}.ofd-whats{background:#16a34a;color:#fff}.ofd-map{background:#0f172a;color:#fff}.ofd-total{font-size:22px;font-weight:900}.order-item-summary{display:block;margin-top:5px;color:#0f5132;font-weight:800;font-size:12px}`;
    document.head.appendChild(st); return d;
  }

  async function openDetail(id){
    const d=ensureModal(), body=document.getElementById('orderFullDetailBody');
    body.innerHTML='<div class="ofd">Carregando detalhes do pedido...</div>'; d.showModal();
    try{
      const c=await getClient(); const {data,error}=await c.rpc('gestao_get_marketplace_order_detail_v2',{p_order_id:id}); if(error) throw error;
      const x=data||{}; let address=x.profile_address||'';
      if(!address || /localiza[cç][aã]o marcada no mapa/i.test(address)) address='';
      if(!address) address=await reverseAddress(Number(x.delivery_latitude),Number(x.delivery_longitude));
      if(!address && x.delivery_address && !/localiza[cç][aã]o marcada no mapa/i.test(x.delivery_address)) address=x.delivery_address;
      const coords=Number.isFinite(Number(x.delivery_latitude))&&Number.isFinite(Number(x.delivery_longitude))?`${x.delivery_latitude},${x.delivery_longitude}`:'';
      const whats=String(x.customer_whatsapp||'').replace(/\D/g,''); const wa=whats?`https://wa.me/55${whats.replace(/^55/,'')}`:'';
      const map=coords?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coords)}`:'';
      body.innerHTML=`<div class="ofd"><div class="ofd-head"><div><small>PEDIDO #${esc(String(x.id||'').slice(0,8).toUpperCase())}</small><h2>${esc(x.customer_name||'Cliente')}</h2><div>${fmt(x.created_at)}</div></div><button class="ofd-close" type="button">×</button></div><div class="ofd-products"><h3>Itens do pedido</h3>${(x.items||[]).map(i=>`<div class="ofd-item"><div><b>${esc(i.product_name||'Produto')}</b><small>${Number(i.quantity||0)} × ${money(i.unit_price)}</small></div><b>${money(i.line_total)}</b></div>`).join('')||'<div>Nenhum item encontrado.</div>'}</div><div class="ofd-card"><span>Valor total</span><b class="ofd-total">${money(x.total)}</b></div><div class="ofd-card"><span>WhatsApp do cliente</span><b>${esc(x.customer_whatsapp||'Não informado')}</b></div><div class="ofd-card"><span>Endereço de entrega</span><b>${esc(address||'Endereço por rua ainda não identificado')}</b>${coords?`<small>Coordenadas: ${esc(coords)}</small>`:''}</div>${x.notes?`<div class="ofd-card"><span>Observação do cliente</span><b>${esc(x.notes)}</b></div>`:''}<div class="ofd-actions">${wa?`<a class="ofd-whats" href="${wa}" target="_blank" rel="noopener">Abrir WhatsApp</a>`:''}${map?`<a class="ofd-map" href="${map}" target="_blank" rel="noopener">Abrir no mapa</a>`:''}</div></div>`;
      body.querySelector('.ofd-close')?.addEventListener('click',()=>d.close());
    }catch(e){body.innerHTML=`<div class="ofd"><button class="ofd-close" type="button">×</button><p>Não foi possível carregar os detalhes.</p><small>${esc(e.message||String(e))}</small></div>`;body.querySelector('.ofd-close')?.addEventListener('click',()=>d.close());}
  }

  function enrichRows(){
    document.querySelectorAll('.order-row[data-open-order]').forEach(row=>{
      if(row.dataset.detailFix==='1') return; row.dataset.detailFix='1';
      row.addEventListener('click',e=>{if(e.target.closest('[data-set-status],a,button:not(.order-row)'))return;e.preventDefault();e.stopImmediatePropagation();openDetail(row.dataset.openOrder);},true);
    });
  }

  const obs=new MutationObserver(enrichRows); obs.observe(document.documentElement,{subtree:true,childList:true});
  document.addEventListener('click',e=>{const row=e.target.closest('.order-row[data-open-order]');if(row && !e.target.closest('[data-set-status]')){e.preventDefault();openDetail(row.dataset.openOrder);}},true);
  setInterval(enrichRows,1200); enrichRows();
})();