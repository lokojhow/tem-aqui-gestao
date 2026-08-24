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

  function mapsUrl(address) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || '')}`;
  }

  function setHtmlIfChanged(el, html) {
    if (el && el.innerHTML !== html) el.innerHTML = html;
  }

  function enhanceRows() {
    document.querySelectorAll('#ordersList [data-open-order]').forEach(row => {
      const o = orders.find(x => String(x.id) === String(row.dataset.openOrder));
      if (!o || o.delivery_type === 'pickup') return;
      const host = row.querySelector('.order-main');
      if (!host) return;
      let address = host.querySelector('.order-address-preview');
      if (!address) {
        address = document.createElement('small');
        address.className = 'order-address-preview';
        host.appendChild(address);
      }
      const text = `📍 Entrega: ${o.delivery_address || 'Endereço não informado — confirme antes de aceitar'}`;
      if (address.textContent !== text) address.textContent = text;
    });
  }

  function enhanceDetail() {
    const o = selectedOrder();
    const detail = document.querySelector('#ordersDetail .order-detail-wrap');
    if (!o || !detail) return;

    const grid = detail.querySelector('.order-info-grid');
    if (grid && o.delivery_type !== 'pickup') {
      let card = grid.querySelector('.order-address-alert');
      if (!card) {
        card = document.createElement('div');
        card.className = 'order-address-alert';
        grid.appendChild(card);
      }
      const address = o.delivery_address || 'Endereço não informado';
      const html = `<span>📍 LOCAL DA ENTREGA — confira antes de aceitar</span><b>${esc(address)}</b>${o.delivery_address ? `<a target="_blank" rel="noopener" href="${mapsUrl(o.delivery_address)}">Abrir localização no mapa</a>` : ''}`;
      setHtmlIfChanged(card, html);
    }

    const whatsapp = detail.querySelector('[data-whatsapp]');
    if (whatsapp) {
      if (whatsapp.textContent !== '💬 Falar com cliente no WhatsApp') whatsapp.textContent = '💬 Falar com cliente no WhatsApp';
      whatsapp.title = 'Abrir conversa com o cliente';
    }

    if (o.delivery_type !== 'pickup' && ['ready_for_pickup','confirmed','preparing'].includes(o.status)) {
      let box = detail.querySelector('.gestao-online-drivers');
      if (!box) {
        box = document.createElement('div');
        box.className = 'gestao-online-drivers';
        const actions = detail.querySelector('.order-actions');
        (actions?.parentElement || detail).insertBefore(box, actions || null);
      }
      const n = Number(online.online_count || 0);
      box.classList.toggle('zero', n === 0);
      const html = n > 0
        ? `🛵 <b>${n} entregador${n === 1 ? '' : 'es'} online</b>${online.city ? ` em ${esc(online.city)}` : ''}<small>Há entregadores disponíveis para receber a corrida.</small>`
        : `⚠️ <b>Nenhum entregador online${online.city ? ` em ${esc(online.city)}` : ''}</b><small>Considere combinar retirada com o cliente ou organizar uma entrega própria para não perder a venda.</small>`;
      setHtmlIfChanged(box, html);
    }
  }

  function normalizeWhatsApp(number) {
    let n = String(number || '').replace(/\D/g, '');
    if (n.length === 10 || n.length === 11) n = '55' + n;
    return n;
  }

  document.addEventListener('click', e => {
    const w = e.target.closest?.('#ordersDetail [data-whatsapp]');
    if (!w) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const n = normalizeWhatsApp(w.dataset.whatsapp);
    if (!n) return alert('WhatsApp do cliente não informado.');
    window.open(`https://wa.me/${n}?text=${encodeURIComponent('Olá! Estou entrando em contato sobre seu pedido no Tem Aqui.')}`, '_blank', 'noopener');
  }, true);

  async function refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      style();
      await loadData();
      enhanceRows();
      enhanceDetail();
    } catch (e) {
      console.warn('Logística Gestão:', e);
    } finally {
      refreshing = false;
    }
  }

  function start() {
    refresh();
    clearInterval(timer);
    timer = setInterval(() => { if (document.visibilityState !== 'hidden') refresh(); }, 5000);
    document.addEventListener('click', e => {
      if (e.target.closest?.('[data-open-order],[data-set-status],[data-order-filter]')) setTimeout(() => { enhanceRows(); enhanceDetail(); }, 120);
    });
    window.addEventListener('pageshow', refresh);
    window.addEventListener('storage', e => { if (e.key === 'tag-pref-store') { store = null; refresh(); } });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
