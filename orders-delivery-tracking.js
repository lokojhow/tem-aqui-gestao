(() => {
  'use strict';
  if(window.__GESTAO_DELIVERY_TRACKING__) return;
  window.__GESTAO_DELIVERY_TRACKING__=true;

  const cfg=()=>window.TEM_AQUI_SUPABASE||{};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const STATUS={searching:'Procurando entregador',accepted:'Entregador aceitou',to_pickup:'A caminho da loja',at_pickup:'Entregador chegou à loja',picked_up:'Coleta confirmada',to_dropoff:'A caminho do cliente',at_dropoff:'No endereço do cliente',delivered:'Entrega concluída'};
  let client=null,store=null,orders=[],current=null,timer=null;

  async function getClient(){
    if(client)return client;
    const b=window.GestaoBackend;if(!b?.getSession)throw Error('Sessão do Gestão indisponível.');
    const s=await b.getSession();if(!s?.access_token||!s?.refresh_token)throw Error('Faça login no Gestão.');
    const c=cfg();if(!window.supabase?.createClient||!c.url||!(c.publishableKey||c.anonKey))throw Error('Banco central não configurado.');
    client=window.supabase.createClient(c.url,c.publishableKey||c.anonKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});
    const r=await client.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});if(r.error)throw r.error;
    return client;
  }
  async function getStore(){
    if(store)return store;
    const ctx=await window.GestaoBackend.context(localStorage.getItem('tag-pref-store')||'');
    store=ctx?.store||null;return store;
  }
  function style(){if(document.getElementById('gestaoDeliveryTrackingStyle'))return;const s=document.createElement('style');s.id='gestaoDeliveryTrackingStyle';s.textContent='.gestao-delivery-track{margin:14px 0;padding:13px;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff}.gestao-delivery-track h3{margin:0;color:#0b4dbb}.gestao-delivery-track p{margin:6px 0}.gestao-delivery-track small{color:#64748b}.gestao-delivery-track a{display:inline-flex;margin-top:8px;padding:8px 11px;border-radius:10px;background:#0759f8;color:#fff;text-decoration:none;font-weight:800}.gestao-delivery-lock{margin-top:10px;padding:10px;border-radius:12px;background:#f0fdf4;color:#166534;font-weight:800}';document.head.appendChild(s);}

  async function loadOrders(){
    const c=await getClient(),s=await getStore();if(!s?.id)return [];
    const r=await c.rpc('gestao_list_marketplace_orders',{p_store_id:s.id,p_limit:300});if(r.error)throw r.error;orders=r.data||[];return orders;
  }
  function selectedShort(){const h=document.querySelector('#ordersDetail .order-detail-head h2');const m=(h?.textContent||'').match(/#([A-F0-9]{8})/i);return m?.[1]?.toUpperCase()||'';}
  function findSelected(){const code=selectedShort();return code?orders.find(o=>String(o.id).slice(0,8).toUpperCase()===code):null;}
  function removeUnsafeButtons(o,row){
    if(!o||o.delivery_type==='pickup')return;
    document.querySelector('#ordersDetail [data-set-status="out_for_delivery"]')?.remove();
    document.querySelector('#ordersDetail [data-set-status="delivered"]')?.remove();
    const actions=document.querySelector('#ordersDetail .order-actions');if(!actions)return;
    let info=actions.querySelector('.gestao-delivery-lock');
    if(!info){info=document.createElement('div');info.className='gestao-delivery-lock';actions.prepend(info);}
    if(o.status==='ready_for_pickup') info.textContent=row?`🛵 ${STATUS[row.job_status]||row.job_status}`:'🛵 Pedido pronto. Aguardando entregador.';
    else if(['dispatched','out_for_delivery'].includes(o.status)) info.textContent='🛵 Entrega em andamento. A conclusão será feita pelo PIN do cliente.';
    else info.remove();
  }
  function render(o,row){
    const wrap=document.querySelector('#ordersDetail .order-detail-wrap');if(!wrap||!o)return;
    let box=wrap.querySelector('.gestao-delivery-track');if(!box){box=document.createElement('div');box.className='gestao-delivery-track';const actions=wrap.querySelector('.order-actions');wrap.insertBefore(box,actions||null);}
    if(!row){box.innerHTML='<h3>🛵 Entrega Tem Aqui</h3><p>Aguardando um entregador aceitar a corrida.</p><small>O rastreio aparecerá aqui automaticamente.</small>';removeUnsafeButtons(o,null);return;}
    const lat=Number(row.latitude),lng=Number(row.longitude),has=Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)>0.000001&&Math.abs(lng)>0.000001;
    const time=row.recorded_at?new Date(row.recorded_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';
    box.innerHTML=`<h3>🛵 ${esc(STATUS[row.job_status]||row.job_status||'Entrega')}</h3><p><b>${esc(row.driver_name||'Entregador')}</b>${has?' · localização ativa':' · aguardando GPS'}</p><small>${time?`Última posição: ${time}`:'Ainda sem posição recebida.'}</small>${has?`<br><a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}">📍 Ver entregador no mapa</a>`:''}`;
    removeUnsafeButtons(o,row);
  }
  async function refresh(){
    try{style();await loadOrders();current=findSelected();if(!current||current.delivery_type==='pickup')return;const c=await getClient();const r=await c.rpc('delivery_tracking_for_order',{p_order_id:current.id});if(r.error)throw r.error;render(current,Array.isArray(r.data)?r.data[0]:r.data);}catch(e){console.warn('Rastreio Gestão',e);}
  }
  document.addEventListener('click',e=>{
    const b=e.target.closest('#ordersDetail [data-set-status="out_for_delivery"],#ordersDetail [data-set-status="delivered"]');
    if(!b||!current||current.delivery_type==='pickup')return;
    e.preventDefault();e.stopImmediatePropagation();alert('Nesta entrega, a saída e a conclusão são controladas pelo Tem Aqui Entregas e pelos PINs de coleta/entrega.');
  },true);
  function start(){refresh();clearInterval(timer);timer=setInterval(refresh,4000);window.addEventListener('pageshow',refresh);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();