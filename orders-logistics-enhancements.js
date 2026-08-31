(() => {
  'use strict';
  if (window.__GESTAO_LOGISTICS_ENHANCEMENTS__) return;
  window.__GESTAO_LOGISTICS_ENHANCEMENTS__ = true;

  const cfg = () => window.TEM_AQUI_SUPABASE || {};
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let client = null;
  let store = null;
  let orders = [];
  let online = { online_count: 0, city: '' };
  let timer = null;
  let refreshing = false;
  let actionBusy = false;

  async function getClient() {
    if (client) return client;
    const b = window.GestaoBackend;
    const session = await b?.getSession?.();
    if (!session?.access_token || !session?.refresh_token) throw new Error('Faça login no Gestão.');
    const c = cfg();
    if (!window.supabase?.createClient || !c.url || !(c.publishableKey || c.anonKey)) throw new Error('Banco central não configurado.');
    client = window.supabase.createClient(c.url, c.publishableKey || c.anonKey, { auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false } });
    const r = await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (r.error) throw r.error;
    return client;
  }

  async function resolveStore() {
    const ctx = await window.GestaoBackend?.context?.(localStorage.getItem('tag-pref-store') || '');
    store = ctx?.store || null;
    return store;
  }

  function style() {
    if (document.getElementById('gestaoLogisticsEnhancementStyle')) return;
    const s = document.createElement('style');
    s.id = 'gestaoLogisticsEnhancementStyle';
    s.textContent = `
      .order-address-preview{display:block!important;margin-top:6px!important;padding:7px 9px;border-radius:9px;background:#eff6ff;color:#0f3d78!important;font-weight:800;line-height:1.3}
      .order-address-alert{grid-column:1/-1!important;background:#eff6ff!important;border:1px solid #bfdbfe!important}.order-address-alert span{color:#1d4ed8!important}.order-address-alert b{font-size:16px!important}.order-address-alert a{display:inline-flex;margin-top:8px;color:#0759f8;font-weight:900;text-decoration:none}
      .gestao-online-drivers{margin-top:10px;padding:11px 12px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-weight:850}.gestao-online-drivers.zero{background:#fff7ed;border-color:#fed7aa;color:#9a3412}.gestao-online-drivers small{display:block;margin-top:4px;color:inherit;font-weight:600}
      .order-actions [data-whatsapp]{background:#16a34a!important;color:#fff!important}
      .gestao-fulfillment-box{margin-top:14px;padding:14px;border:1px solid #dbe5ee;border-radius:15px;background:#f8fafc}.gestao-fulfillment-box>span{display:block;font-size:11px;color:#64748b;font-weight:900;letter-spacing:.05em}.gestao-fulfillment-box>strong{display:block;margin:3px 0 10px;font-size:16px;color:#172033}.gestao-fulfillment-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px}.gestao-fulfillment-actions button{border:0;border-radius:12px;padding:12px 10px;font-weight:900;cursor:pointer}.gestao-own-delivery{background:#0f172a;color:#fff}.gestao-call-driver{background:#0759f8;color:#fff}.gestao-call-driver:disabled,.gestao-own-delivery:disabled{opacity:.55}.gestao-fulfillment-note{display:block;margin-top:9px;color:#64748b;font-size:11px;line-height:1.4}.gestao-driver-requested{margin-top:10px;padding:10px 11px;border-radius:11px;background:#eef7ff;color:#0759f8;font-weight:850}
      @media(max-width:520px){.gestao-fulfillment-actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  async function loadData() {
    const c = await getClient();
    if (!store) await resolveStore();
    if (!store?.id) return;
    const [orderRes, onlineRes] = await Promise.all([
      c.rpc('gestao_list_marketplace_orders', { p_store_id: store.id, p_limit: 300 }),
      c.rpc('gestao_online_delivery_drivers', { p_store_id: store.id })
    ]);
    if (!orderRes.error) orders = orderRes.data || [];
    if (!onlineRes.error) {
      const row = Array.isArray(onlineRes.data) ? onlineRes.data[0] : onlineRes.data;
      online = row || { online_count: 0, city: store.city || '' };
    }
  }

  function selectedOrder() {
    const h = document.querySelector('#ordersDetail .order-detail-head h2');
    const code = (h?.textContent || '').match(/#([A-F0-9]{8})/i)?.[1]?.toUpperCase();
    return code ? orders.find(o => String(o.id).slice(0,8).toUpperCase() === code) : null;
  }

  function mapsUrl(address) { return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`; }
  function setHtmlIfChanged(el, html) { if (el && el.innerHTML !== html) el.innerHTML = html; }

  function enhanceRows() {
    document.querySelectorAll('#ordersList [data-open-order]').forEach(row => {
      const o = orders.find(x => String(x.id) === String(row.dataset.openOrder));
      if (!o || o.delivery_type === 'pickup') return;
      const host = row.querySelector('.order-main');
      if (!host) return;
      let address = host.querySelector('.order-address-preview');
      if (!address) { address = document.createElement('small'); address.className = 'order-address-preview'; host.appendChild(address); }
      const text = `📍 Entrega: ${o.delivery_address || 'Endereço não informado — confirme antes de aceitar'}`;
      if (address.textContent !== text) address.textContent = text;
    });
  }

  async function hasActiveDeliveryJob(orderId) {
    try {
      const c = await getClient();
      const { data, error } = await c.from('delivery_jobs').select('id,status,driver_id').eq('order_id', orderId).not('status','in','(cancelled,delivered)').order('created_at',{ascending:false}).limit(1);
      if (error) return null;
      return data?.[0] || null;
    } catch (_) { return null; }
  }

  async function renderFulfillmentState(box, o) {
    if (!box || box.dataset.loading === '1') return;
    box.dataset.loading = '1';
    try {
      const job = await hasActiveDeliveryJob(o.id);
      if (job) {
        const status = job.driver_id ? 'Entregador aceitou a corrida' : 'Procurando entregador no Tem Aqui Entregas';
        box.innerHTML = `<span>FORMA DE ENTREGA</span><strong>Tem Aqui Entregas</strong><div class="gestao-driver-requested">🛵 ${esc(status)}</div><small class="gestao-fulfillment-note">Acompanhe o pedido; o status será atualizado conforme a corrida avançar.</small>`;
      }
    } finally { box.dataset.loading = '0'; }
  }

  function enhanceDetail() {
    const o = selectedOrder();
    const detail = document.querySelector('#ordersDetail .order-detail-wrap');
    if (!o || !detail) return;

    const grid = detail.querySelector('.order-info-grid');
    if (grid && o.delivery_type !== 'pickup') {
      let card = grid.querySelector('.order-address-alert');
      if (!card) { card = document.createElement('div'); card.className = 'order-address-alert'; grid.appendChild(card); }
      const address = o.delivery_address || 'Endereço não informado';
      const html = `<span>📍 LOCAL DA ENTREGA — confira antes de aceitar</span><b>${esc(address)}</b>${o.delivery_address ? `<a target="_blank" rel="noopener" href="${mapsUrl(o.delivery_address)}">Abrir localização no mapa</a>` : ''}`;
      setHtmlIfChanged(card, html);
    }

    const whatsapp = detail.querySelector('[data-whatsapp]');
    if (whatsapp) { if (whatsapp.textContent !== '💬 Falar com cliente no WhatsApp') whatsapp.textContent = '💬 Falar com cliente no WhatsApp'; whatsapp.title = 'Abrir conversa com o cliente'; }

    if (o.delivery_type !== 'pickup' && ['ready_for_pickup','confirmed','preparing'].includes(o.status)) {
      let box = detail.querySelector('.gestao-online-drivers');
      if (!box) { box = document.createElement('div'); box.className = 'gestao-online-drivers'; const actions = detail.querySelector('.order-actions'); (actions?.parentElement || detail).insertBefore(box, actions || null); }
      const n = Number(online.online_count || 0);
      box.classList.toggle('zero', n === 0);
      const html = n > 0 ? `🛵 <b>${n} entregador${n === 1 ? '' : 'es'} online</b>${online.city ? ` em ${esc(online.city)}` : ''}<small>Há entregadores disponíveis para receber a corrida.</small>` : `⚠️ <b>Nenhum entregador online${online.city ? ` em ${esc(online.city)}` : ''}</b><small>A loja ainda pode fazer a entrega por conta própria.</small>`;
      setHtmlIfChanged(box, html);
    }

    if (o.delivery_type !== 'pickup' && o.status === 'ready_for_pickup') {
      let fulfill = detail.querySelector('.gestao-fulfillment-box');
      if (!fulfill) {
        fulfill = document.createElement('div'); fulfill.className = 'gestao-fulfillment-box';
        const actions = detail.querySelector('.order-actions');
        (actions?.parentElement || detail).insertBefore(fulfill, actions || null);
      }
      if (!fulfill.querySelector('.gestao-driver-requested')) {
        fulfill.innerHTML = `<span>COMO ESTE PEDIDO SERÁ ENTREGUE?</span><strong>Escolha a logística</strong><div class="gestao-fulfillment-actions"><button class="gestao-own-delivery" type="button" data-gestao-own-delivery="${o.id}">🚚 Entrega pela loja</button><button class="gestao-call-driver" type="button" data-gestao-call-driver="${o.id}">🛵 Chamar entregador</button></div><small class="gestao-fulfillment-note">Entrega pela loja marca o pedido como saiu para entrega. Chamar entregador envia a corrida ao Tem Aqui Entregas.</small>`;
        renderFulfillmentState(fulfill, o);
      }
    }
  }

  function normalizeWhatsApp(number) { let n = String(number || '').replace(/\D/g, ''); if (n.length === 10 || n.length === 11) n = '55' + n; return n; }

  async function ownDelivery(orderId, button) {
    if (actionBusy) return; actionBusy = true; if (button) button.disabled = true;
    try {
      const c = await getClient();
      const { error } = await c.rpc('gestao_update_marketplace_order_status', { p_order_id: orderId, p_status: 'out_for_delivery', p_reason: null });
      if (error) throw error;
      alert('Entrega pela loja selecionada. O pedido foi marcado como saiu para entrega.');
      await refresh();
    } catch (e) { alert(e.message || 'Não foi possível iniciar a entrega pela loja.'); if (button) button.disabled = false; }
    finally { actionBusy = false; }
  }

  async function callDriver(orderId, button) {
    if (actionBusy) return; actionBusy = true; if (button) { button.disabled = true; button.textContent = '🛵 Chamando...'; }
    try {
      const c = await getClient();
      const { data, error } = await c.rpc('delivery_create_job_from_order', { p_order_id: orderId, p_driver_share_percent: 85 });
      if (error) throw error;
      const job = Array.isArray(data) ? data[0] : data;
      alert(job?.job_id ? 'Corrida criada no Tem Aqui Entregas. Os entregadores disponíveis serão avisados.' : 'Solicitação de entregador enviada.');
      await refresh();
    } catch (e) { alert(e.message || 'Não foi possível chamar um entregador.'); if (button) { button.disabled = false; button.textContent = '🛵 Chamar entregador'; } }
    finally { actionBusy = false; }
  }

  document.addEventListener('click', e => {
    const own = e.target.closest?.('[data-gestao-own-delivery]');
    if (own) { e.preventDefault(); e.stopImmediatePropagation(); ownDelivery(own.dataset.gestaoOwnDelivery, own); return; }
    const driver = e.target.closest?.('[data-gestao-call-driver]');
    if (driver) { e.preventDefault(); e.stopImmediatePropagation(); callDriver(driver.dataset.gestaoCallDriver, driver); return; }
    const w = e.target.closest?.('#ordersDetail [data-whatsapp]');
    if (!w) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const n = normalizeWhatsApp(w.dataset.whatsapp);
    if (!n) return alert('WhatsApp do cliente não informado.');
    window.open(`https://wa.me/${n}?text=${encodeURIComponent('Olá! Estou entrando em contato sobre seu pedido no Tem Aqui.')}`, '_blank', 'noopener');
  }, true);

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try { style(); await loadData(); enhanceRows(); enhanceDetail(); }
    catch (e) { console.warn('Logística Gestão:', e); }
    finally { refreshing = false; }
  }

  function start() {
    refresh(); clearInterval(timer);
    timer = setInterval(() => { if (document.visibilityState !== 'hidden') refresh(); }, 5000);
    document.addEventListener('click', e => { if (e.target.closest?.('[data-open-order],[data-set-status],[data-order-filter]')) setTimeout(() => { enhanceRows(); enhanceDetail(); }, 120); });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('storage', e => { if (e.key === 'tag-pref-store') { store = null; refresh(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
