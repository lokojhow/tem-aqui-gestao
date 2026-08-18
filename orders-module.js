(() => {
  'use strict';

  const cfg = () => window.TEM_AQUI_SUPABASE || {};
  const money = v => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt = v => v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
  const STATUS = {
    pending: ['Novo', 'Novo pedido'],
    confirmed: ['Aceito', 'Pedido aceito'],
    preparing: ['Preparando', 'Em preparação'],
    ready_for_pickup: ['Pronto', 'Pronto para retirada'],
    out_for_delivery: ['Em entrega', 'Saiu para entrega'],
    dispatched: ['Despachado', 'Pedido despachado'],
    delivered: ['Concluído', 'Pedido entregue'],
    cancelled: ['Cancelado', 'Pedido cancelado']
  };
  const state = { client: null, store: null, orders: [], selected: null, items: [], initial: true, timer: null, channel: null, lastIds: new Set() };

  function client() {
    if (state.client) return state.client;
    const c = cfg();
    if (!window.supabase?.createClient || !c.url || !(c.publishableKey || c.anonKey)) return null;
    state.client = window.supabase.createClient(c.url, c.publishableKey || c.anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    return state.client;
  }

  function injectStyle() {
    if (document.getElementById('gestaoOrdersStyle')) return;
    const s = document.createElement('style');
    s.id = 'gestaoOrdersStyle';
    s.textContent = `
      .orders-route-badge{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#dc2626;color:#fff;font-size:11px;font-weight:900;margin-left:auto}.orders-route-badge:empty{display:none}
      .orders-dashboard{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.orders-kpi{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:15px}.orders-kpi span{display:block;color:#64748b;font-size:12px}.orders-kpi strong{display:block;font-size:24px;margin-top:4px}
      .orders-toolbar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}.orders-filter{border:1px solid #dbe2ea;background:#fff;border-radius:999px;padding:9px 13px;font-weight:800;cursor:pointer}.orders-filter.active{background:#0b7a3d;color:#fff;border-color:#0b7a3d}.orders-toolbar .push-enable{margin-left:auto;background:#0b7a3d;color:#fff;border:0;border-radius:12px;padding:10px 14px;font-weight:800}
      .orders-layout{display:grid;grid-template-columns:minmax(300px,0.9fr) minmax(360px,1.3fr);gap:14px}.orders-list,.orders-detail{background:#fff;border:1px solid #e5e7eb;border-radius:18px;min-height:460px;overflow:hidden}.orders-list-head{padding:14px;border-bottom:1px solid #eef2f7;display:flex;gap:8px}.orders-list-head input{width:100%;border:1px solid #dbe2ea;border-radius:12px;padding:11px}.order-row{width:100%;border:0;border-bottom:1px solid #eef2f7;background:#fff;padding:14px;text-align:left;display:grid;grid-template-columns:1fr auto;gap:8px;cursor:pointer}.order-row:hover,.order-row.active{background:#f0fdf4}.order-row .order-main b{display:block;font-size:14px}.order-row .order-main small{display:block;color:#64748b;margin-top:3px}.order-row .order-value{text-align:right}.order-status{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900;background:#eef2ff;color:#334155;margin-top:5px}.order-status.pending{background:#fff7ed;color:#c2410c}.order-status.confirmed{background:#ecfdf5;color:#047857}.order-status.preparing{background:#fef9c3;color:#854d0e}.order-status.delivered{background:#dcfce7;color:#166534}.order-status.cancelled{background:#fee2e2;color:#991b1b}
      .orders-empty{padding:40px 20px;text-align:center;color:#64748b}.order-detail-wrap{padding:18px}.order-detail-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid #eef2f7;padding-bottom:14px}.order-detail-head h2{margin:0}.order-detail-head p{margin:5px 0 0;color:#64748b}.order-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:14px 0}.order-info-grid div{background:#f8fafc;border-radius:12px;padding:11px}.order-info-grid span{display:block;color:#64748b;font-size:11px}.order-info-grid b{display:block;margin-top:3px}.order-items{width:100%;border-collapse:collapse}.order-items th,.order-items td{padding:10px;border-bottom:1px solid #eef2f7;text-align:left}.order-items td:last-child,.order-items th:last-child{text-align:right}.order-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px}.order-actions button{border:0;border-radius:12px;padding:11px 14px;font-weight:900;cursor:pointer}.order-actions .primary{background:#0b7a3d;color:#fff}.order-actions .secondary{background:#0f172a;color:#fff}.order-actions .danger{background:#dc2626;color:#fff}.order-note{margin-top:12px;background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:11px}.orders-live{display:inline-flex;align-items:center;gap:6px;color:#15803d;font-weight:800;font-size:12px}.orders-live:before{content:'';width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px #dcfce7}
      @media(max-width:900px){.orders-dashboard{grid-template-columns:repeat(2,1fr)}.orders-layout{grid-template-columns:1fr}.orders-detail{min-height:300px}}@media(max-width:520px){.orders-dashboard{grid-template-columns:1fr 1fr}.order-info-grid{grid-template-columns:1fr}.orders-toolbar .push-enable{width:100%;margin-left:0}}
    `;
    document.head.appendChild(s);
  }

  function injectUI() {
    injectStyle();
    const nav = document.querySelector('.side-nav');
    if (nav && !document.getElementById('marketplaceOrdersRoute')) {
      const b = document.createElement('button');
      b.id = 'marketplaceOrdersRoute';
      b.className = 'side-route';
      b.dataset.route = 'orders';
      b.innerHTML = '<span>🛍️</span> Pedidos do Tem Aqui <b id="marketplaceOrderBadge" class="orders-route-badge"></b>';
      const history = nav.querySelector('[data-route="history"]');
      nav.insertBefore(b, history || nav.firstChild);
      b.addEventListener('click', () => setTimeout(render, 0));
    }
    const main = document.querySelector('.workspace main');
    if (main && !document.querySelector('[data-view="orders"]')) {
      const section = document.createElement('section');
      section.className = 'view'; section.dataset.view = 'orders';
      section.innerHTML = `
        <div class="page-heading"><div><span>PEDIDOS DO TEM AQUI</span><h1>Pedidos do marketplace</h1></div><div class="orders-live">Sincronizado</div></div>
        <div id="ordersDashboard" class="orders-dashboard"></div>
        <div class="orders-toolbar">
          <button class="orders-filter active" data-order-filter="open">Em andamento</button>
          <button class="orders-filter" data-order-filter="pending">Novos</button>
          <button class="orders-filter" data-order-filter="delivered">Concluídos</button>
          <button class="orders-filter" data-order-filter="cancelled">Cancelados</button>
          <button class="orders-filter" data-order-filter="all">Todos</button>
          <button id="ordersEnableNotifications" class="push-enable" type="button">🔔 Ativar notificações</button>
        </div>
        <div class="orders-layout"><article class="orders-list"><div class="orders-list-head"><input id="ordersSearch" placeholder="Buscar cliente ou pedido..."></div><div id="ordersList"></div></article><article id="ordersDetail" class="orders-detail"><div class="orders-empty">Selecione um pedido.</div></article></div>`;
      main.appendChild(section);
      section.addEventListener('click', handleClick);
      section.addEventListener('input', e => { if (e.target.id === 'ordersSearch') renderList(); });
    }
  }

  let filter = 'open';
  function statusLabel(s){ return (STATUS[s] || [s,s])[0]; }
  function filteredOrders(){
    const term = String(document.getElementById('ordersSearch')?.value || '').toLowerCase();
    return state.orders.filter(o => {
      if (filter === 'open' && ['delivered','cancelled'].includes(o.status)) return false;
      if (filter !== 'open' && filter !== 'all' && o.status !== filter) return false;
      if (term && !`${o.id} ${o.customer_name||''} ${o.customer_whatsapp||''}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }

  function renderDashboard(){
    const open = state.orders.filter(o => !['delivered','cancelled'].includes(o.status));
    const pending = state.orders.filter(o => o.status === 'pending');
    const today = new Date().toISOString().slice(0,10);
    const delivered = state.orders.filter(o => o.status === 'delivered' && String(o.updated_at||'').slice(0,10) === today);
    const sales = delivered.reduce((a,o)=>a+Number(o.total||0),0);
    const el = document.getElementById('ordersDashboard'); if(!el) return;
    el.innerHTML = `<div class="orders-kpi"><span>Novos</span><strong>${pending.length}</strong></div><div class="orders-kpi"><span>Em andamento</span><strong>${open.length}</strong></div><div class="orders-kpi"><span>Concluídos hoje</span><strong>${delivered.length}</strong></div><div class="orders-kpi"><span>Valor concluído hoje</span><strong>${money(sales)}</strong></div>`;
    const badge = document.getElementById('marketplaceOrderBadge'); if(badge) badge.textContent = pending.length ? String(pending.length) : '';
    const side = document.getElementById('sideOrders'); if(side) side.textContent = String(open.length);
  }

  function renderList(){
    const el = document.getElementById('ordersList'); if(!el) return;
    const list = filteredOrders();
    el.innerHTML = list.map(o => `<button class="order-row ${state.selected===o.id?'active':''}" data-open-order="${o.id}"><span class="order-main"><b>${esc(o.customer_name||'Cliente')} · #${String(o.id).slice(0,8).toUpperCase()}</b><small>${fmt(o.created_at)} · ${Number(o.item_count||0)} item(ns)</small><span class="order-status ${esc(o.status)}">${esc(statusLabel(o.status))}</span></span><span class="order-value"><b>${money(o.total)}</b><small>${esc(o.delivery_type==='pickup'?'Retirada':'Entrega')}</small></span></button>`).join('') || '<div class="orders-empty">Nenhum pedido neste filtro.</div>';
  }

  function actionButtons(o){
    if(o.status==='pending') return `<button class="primary" data-set-status="confirmed">✓ Aceitar pedido</button><button class="danger" data-set-status="cancelled">✕ Recusar</button>`;
    if(o.status==='confirmed') return `<button class="primary" data-set-status="preparing">👨‍🍳 Iniciar preparação</button><button class="danger" data-set-status="cancelled">Cancelar</button>`;
    if(o.status==='preparing') return `<button class="primary" data-set-status="ready_for_pickup">✓ Marcar como pronto</button><button class="danger" data-set-status="cancelled">Cancelar</button>`;
    if(o.status==='ready_for_pickup') return o.delivery_type==='pickup' ? `<button class="primary" data-set-status="delivered">✓ Entregue ao cliente</button>` : `<button class="primary" data-set-status="out_for_delivery">🛵 Saiu para entrega</button>`;
    if(['out_for_delivery','dispatched'].includes(o.status)) return `<button class="primary" data-set-status="delivered">✓ Pedido entregue</button>`;
    return '';
  }

  function renderDetail(){
    const el = document.getElementById('ordersDetail'); if(!el) return;
    const o = state.orders.find(x=>x.id===state.selected);
    if(!o){el.innerHTML='<div class="orders-empty">Selecione um pedido.</div>';return;}
    el.innerHTML = `<div class="order-detail-wrap"><div class="order-detail-head"><div><h2>Pedido #${String(o.id).slice(0,8).toUpperCase()}</h2><p>${esc(o.customer_name||'Cliente')} · ${fmt(o.created_at)}</p></div><span class="order-status ${esc(o.status)}">${esc(statusLabel(o.status))}</span></div><div class="order-info-grid"><div><span>Total</span><b>${money(o.total)}</b></div><div><span>Pagamento</span><b>${esc(o.payment_method||'A combinar')}</b></div><div><span>Recebimento</span><b>${esc(o.delivery_type==='pickup'?'Retirada no comércio':'Entrega')}</b></div><div><span>WhatsApp</span><b>${esc(o.customer_whatsapp||'Não informado')}</b></div>${o.delivery_address?`<div style="grid-column:1/-1"><span>Endereço</span><b>${esc(o.delivery_address)}</b></div>`:''}</div><table class="order-items"><thead><tr><th>Item</th><th>Qtd.</th><th>Unit.</th><th>Total</th></tr></thead><tbody>${state.items.map(i=>`<tr><td>${esc(i.product_name)}</td><td>${i.quantity}</td><td>${money(i.unit_price)}</td><td>${money(i.line_total)}</td></tr>`).join('')||'<tr><td colspan="4">Carregando itens...</td></tr>'}</tbody></table>${o.notes?`<div class="order-note"><b>Observações do cliente</b><br>${esc(o.notes)}</div>`:''}${o.rejection_reason?`<div class="order-note"><b>Motivo do cancelamento</b><br>${esc(o.rejection_reason)}</div>`:''}<div class="order-actions">${actionButtons(o)}${o.customer_whatsapp?`<button class="secondary" data-whatsapp="${esc(o.customer_whatsapp)}">WhatsApp</button>`:''}</div></div>`;
  }

  function render(){ injectUI(); renderDashboard(); renderList(); renderDetail(); updateNotificationButton(); }

  async function openOrder(id){
    state.selected=id; state.items=[]; renderList(); renderDetail();
    const c=client(); if(!c)return;
    const {data,error}=await c.rpc('gestao_get_marketplace_order_items',{p_order_id:id});
    if(error){console.warn(error);return;}
    state.items=data||[]; renderDetail();
  }

  async function setStatus(status){
    const o=state.orders.find(x=>x.id===state.selected); if(!o)return;
    let reason=null;
    if(status==='cancelled'){ reason=prompt('Informe o motivo do cancelamento:','Produto indisponível'); if(!reason)return; }
    const c=client();
    const {error}=await c.rpc('gestao_update_marketplace_order_status',{p_order_id:o.id,p_status:status,p_reason:reason});
    if(error){alert(error.message||'Não foi possível atualizar o pedido.');return;}
    try{await c.functions.invoke('send-order-status-push',{body:{order_id:o.id,status}});}catch(e){console.warn('status push',e);}
    await loadOrders(false); await openOrder(o.id);
  }

  function handleClick(e){
    const f=e.target.closest('[data-order-filter]'); if(f){filter=f.dataset.orderFilter; document.querySelectorAll('[data-order-filter]').forEach(x=>x.classList.toggle('active',x===f)); renderList(); return;}
    const r=e.target.closest('[data-open-order]'); if(r){openOrder(r.dataset.openOrder);return;}
    const s=e.target.closest('[data-set-status]'); if(s){setStatus(s.dataset.setStatus);return;}
    const w=e.target.closest('[data-whatsapp]'); if(w){window.open(`https://wa.me/${String(w.dataset.whatsapp).replace(/\D/g,'')}`,'_blank','noopener');return;}
    if(e.target.closest('#ordersEnableNotifications')) enableNotifications(true);
  }

  function playOfficialSound(){
    try{const a=new Audio('./tem-aqui-pedido.ogg?v=1'); a.volume=1; a.play().catch(()=>{});}catch(_){}
  }
  function showLocalNotification(order){
    if(!('Notification' in window) || Notification.permission!=='granted')return;
    try{new Notification('Novo pedido recebido',{body:`${order.customer_name||'Cliente'} · ${money(order.total)}`,tag:`gestao-order-${order.id}`,icon:'./icon-192.png'});}catch(_){}
  }

  async function loadOrders(notify=true){
    const c=client(); if(!c||!state.store)return;
    const {data,error}=await c.rpc('gestao_list_marketplace_orders',{p_store_id:state.store.id,p_limit:300});
    if(error){ if(/ORDER_ACCESS_DENIED/i.test(error.message||'')){document.getElementById('marketplaceOrdersRoute')?.setAttribute('hidden','');} console.warn(error); return; }
    const rows=data||[];
    if(notify && !state.initial){
      const fresh=rows.filter(o=>o.status==='pending'&&!state.lastIds.has(o.id));
      if(fresh.length){ playOfficialSound(); showLocalNotification(fresh[0]); }
    }
    state.orders=rows; state.lastIds=new Set(rows.map(o=>o.id)); state.initial=false;
    render();
  }

  function b64ToU8(value){const pad='='.repeat((4-value.length%4)%4),b=(value+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
  function abToB64(buffer){let raw='';for(const b of new Uint8Array(buffer))raw+=String.fromCharCode(b);return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
  const VAPID_PUBLIC='BNSHhHzfMX6D_wGEvEt5GD8EtuzOMB736EUp0hNbotcSCGvtQ7-JoRPr41zRg8XJCphk3xTcBhlKeXcxbDsAZp0';
  async function enableNotifications(ask=false){
    const c=client(); if(!c||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return;
    const {data:{session}}=await c.auth.getSession(); if(!session?.user)return;
    let perm=Notification.permission; if(ask&&perm==='default')perm=await Notification.requestPermission(); if(perm!=='granted'){updateNotificationButton();return;}
    const reg=await navigator.serviceWorker.ready; let sub=await reg.pushManager.getSubscription();
    if(!sub) sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(VAPID_PUBLIC)});
    const p256=sub.getKey('p256dh'),auth=sub.getKey('auth');
    const {error}=await c.rpc('register_push_subscription_v84181',{p_endpoint:sub.endpoint,p_p256dh:abToB64(p256),p_auth:abToB64(auth),p_user_agent:`Tem Aqui Gestão · ${navigator.userAgent}`});
    if(error)console.warn(error); updateNotificationButton();
  }
  function updateNotificationButton(){const b=document.getElementById('ordersEnableNotifications');if(!b)return;if(!('Notification'in window)){b.hidden=true;return;}b.textContent=Notification.permission==='granted'?'✅ Notificações ativadas':Notification.permission==='denied'?'🔕 Notificações bloqueadas':'🔔 Ativar notificações';b.disabled=Notification.permission==='denied';}

  async function resolveStore(){
    try{
      const b=window.GestaoBackend; const stores=b?.myStores?await b.myStores():[]; const preferred=localStorage.getItem('tag-pref-store')||''; state.store=stores.find(s=>String(s.id)===String(preferred))||stores[0]||null;
      if(!state.store)return false;
      const c=client(); const {data,error}=await c.rpc('gestao_can_manage_store_orders',{p_store_id:state.store.id});
      if(error||!data){document.getElementById('marketplaceOrdersRoute')?.setAttribute('hidden','');return false;}
      document.getElementById('marketplaceOrdersRoute')?.removeAttribute('hidden'); return true;
    }catch(e){console.warn(e);return false;}
  }

  function subscribeRealtime(){
    const c=client(); if(!c||!state.store)return;
    try{state.channel?.unsubscribe?.();}catch(_){}
    state.channel=c.channel(`gestao-orders-${state.store.id}`).on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:`store_id=eq.${state.store.id}`},()=>loadOrders(true)).subscribe();
  }

  async function start(){
    injectUI();
    if(!client())return;
    const ok=await resolveStore(); if(!ok)return;
    await loadOrders(false); subscribeRealtime(); enableNotifications(false).catch(()=>{});
    clearInterval(state.timer); state.timer=setInterval(()=>{if(document.visibilityState!=='hidden')loadOrders(true);},12000);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')loadOrders(true);});
    window.addEventListener('storage',async e=>{if(e.key==='tag-pref-store'){state.initial=true;await resolveStore();await loadOrders(false);subscribeRealtime();}});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,500),{once:true});else setTimeout(start,500);
})();
