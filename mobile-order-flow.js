(() => {
  'use strict';
  if (window.__TEM_AQUI_MOBILE_ORDER_FLOW__) return;
  window.__TEM_AQUI_MOBILE_ORDER_FLOW__ = true;

  const cfg = () => window.TEM_AQUI_SUPABASE || {};
  let sb = null;
  const trackingCache = new Map();

  function client() {
    if (sb) return sb;
    const c = cfg();
    if (!window.supabase?.createClient || !c.url || !(c.publishableKey || c.anonKey)) return null;
    sb = window.supabase.createClient(c.url, c.publishableKey || c.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return sb;
  }

  function toast(message, error = false) {
    const old = document.getElementById('orderFlowToast');
    old?.remove();
    const el = document.createElement('div');
    el.id = 'orderFlowToast';
    el.textContent = message;
    Object.assign(el.style, {
      position:'fixed', left:'50%', bottom:'92px', transform:'translateX(-50%)', zIndex:'999999',
      background:error?'#991b1b':'#0f172a', color:'#fff', padding:'12px 16px', borderRadius:'12px',
      fontWeight:'800', fontSize:'13px', boxShadow:'0 10px 30px rgba(0,0,0,.25)', maxWidth:'90vw', textAlign:'center'
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2800);
  }

  function injectStyle() {
    if (document.getElementById('mobileOrderFlowStyle')) return;
    const s = document.createElement('style');
    s.id = 'mobileOrderFlowStyle';
    s.textContent = `
      .mobile-order-actions{padding:10px 14px 14px;border-bottom:1px solid #eef2f7;background:#fff;display:flex;gap:8px;flex-wrap:wrap}
      .mobile-order-actions button{border:0;border-radius:12px;padding:10px 13px;font-weight:900;font-size:12px;cursor:pointer;min-height:42px}
      .mobile-order-actions .mo-primary{background:#0b7a3d;color:#fff;flex:1 1 180px}
      .mobile-order-actions .mo-danger{background:#fee2e2;color:#991b1b}
      .mobile-order-actions .mo-info{width:100%;border:1px solid #dbeafe;background:#eff6ff;color:#1e40af;border-radius:12px;padding:10px 12px;font-weight:800;font-size:12px;line-height:1.35}
      .mobile-order-actions .mo-success{width:100%;border:1px solid #bbf7d0;background:#f0fdf4;color:#166534;border-radius:12px;padding:10px 12px;font-weight:900;font-size:12px}
      .mobile-order-actions .mo-muted{width:100%;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;border-radius:12px;padding:10px 12px;font-weight:800;font-size:12px}
      .mobile-order-actions button:disabled{opacity:.65;cursor:wait}
      .mo-tracking{margin-top:7px;font-weight:700;color:#334155}
      .mo-pin{display:inline-block;margin-top:7px;background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:9px;padding:5px 9px;font-weight:900;letter-spacing:.06em}
      @media(min-width:901px){.mobile-order-actions{display:none!important}}
      @media(max-width:900px){.orders-layout{display:block!important}.orders-detail{margin-top:14px}.order-row{border-bottom:0!important}.mobile-order-actions{display:flex}}
    `;
    document.head.appendChild(s);
  }

  function statusOf(row) {
    const badge = row.querySelector('.order-status');
    if (!badge) return '';
    const known = ['pending','confirmed','preparing','ready_for_pickup','out_for_delivery','dispatched','delivered','cancelled'];
    return known.find(x => badge.classList.contains(x)) || '';
  }

  function isPickup(row) {
    const txt = (row.textContent || '').toLowerCase();
    return txt.includes('retirada');
  }

  function baseActions(id, status, pickup) {
    if (status === 'pending') return `<button class="mo-primary" data-mo-status="confirmed" data-mo-order="${id}">✓ Aceitar pedido</button><button class="mo-danger" data-mo-status="cancelled" data-mo-order="${id}">Recusar</button>`;
    if (status === 'confirmed') return `<button class="mo-primary" data-mo-status="preparing" data-mo-order="${id}">👨‍🍳 Colocar em preparação</button><button class="mo-danger" data-mo-status="cancelled" data-mo-order="${id}">Cancelar</button>`;
    if (status === 'preparing') return `<button class="mo-primary" data-mo-status="ready_for_pickup" data-mo-order="${id}">✓ Marcar como pronto</button><button class="mo-danger" data-mo-status="cancelled" data-mo-order="${id}">Cancelar</button>`;
    if (status === 'ready_for_pickup' && pickup) return `<button class="mo-primary" data-mo-status="delivered" data-mo-order="${id}">✓ Entregue ao cliente</button>`;
    if (status === 'ready_for_pickup') return `<div class="mo-info" data-mo-track="${id}">🛵 Aguardando entregador do Tem Aqui…</div>`;
    if (status === 'out_for_delivery' || status === 'dispatched') return `<div class="mo-info" data-mo-track="${id}">🛵 Entregador em rota para o cliente…</div>`;
    if (status === 'delivered') return `<div class="mo-success">✅ Pedido concluído e entregue</div>`;
    if (status === 'cancelled') return `<div class="mo-muted">Pedido cancelado</div>`;
    return '';
  }

  const deliveryStage = {
    searching:'Procurando entregador', offered:'Oferta enviada ao entregador', accepted:'Entregador aceitou a corrida',
    to_pickup:'Entregador a caminho da loja', heading_to_pickup:'Entregador a caminho da loja',
    at_pickup:'Entregador chegou à loja', arrived_pickup:'Entregador chegou à loja',
    picked_up:'Pedido coletado pelo entregador',
    to_dropoff:'Entregador a caminho do cliente', heading_to_customer:'Entregador a caminho do cliente',
    at_dropoff:'Entregador chegou ao cliente', arrived_customer:'Entregador chegou ao cliente',
    delivered:'Entrega confirmada', cancelled:'Corrida cancelada', failed:'Problema na entrega'
  };

  async function enrichTracking(box, orderId) {
    const c = client();
    if (!c || !box?.isConnected) return;
    const cached = trackingCache.get(orderId);
    if (cached && Date.now() - cached.time < 5000) return paintTracking(box, cached.data);
    try {
      const { data, error } = await c.rpc('delivery_store_tracking', { p_order_id: orderId });
      if (error) throw error;
      trackingCache.set(orderId, { time: Date.now(), data });
      paintTracking(box, data);
    } catch (e) {
      console.warn('delivery_store_tracking', e);
    }
  }

  function paintTracking(box, data) {
    if (!box?.isConnected) return;
    if (!data) {
      box.innerHTML = '🛵 Aguardando criação da corrida para o entregador.';
      return;
    }
    const stage = deliveryStage[data.status] || data.status || 'Aguardando atualização';
    const driver = data.driver?.name ? `<div class="mo-tracking">Entregador: ${escapeHtml(data.driver.name)}${data.vehicle?.model ? ` · ${escapeHtml(data.vehicle.model)}` : ''}</div>` : '';
    const pin = data.pickup_pin && !['picked_up','to_dropoff','heading_to_customer','at_dropoff','arrived_customer','delivered'].includes(data.status)
      ? `<span class="mo-pin">PIN DE COLETA: ${escapeHtml(data.pickup_pin)}</span>` : '';
    box.innerHTML = `🛵 ${escapeHtml(stage)}${driver}${pin}`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function enhanceRows() {
    injectStyle();
    const list = document.getElementById('ordersList');
    if (!list) return;
    list.querySelectorAll('.order-row[data-open-order]').forEach(row => {
      const id = row.dataset.openOrder;
      const status = statusOf(row);
      if (!id || !status) return;
      const signature = `${id}:${status}:${isPickup(row)}`;
      let bar = row.nextElementSibling;
      if (!bar?.classList?.contains('mobile-order-actions')) {
        bar = document.createElement('div');
        bar.className = 'mobile-order-actions';
        row.insertAdjacentElement('afterend', bar);
      }
      if (bar.dataset.signature !== signature) {
        bar.dataset.signature = signature;
        bar.innerHTML = baseActions(id, status, isPickup(row));
      }
      const track = bar.querySelector(`[data-mo-track="${CSS.escape(id)}"]`);
      if (track) enrichTracking(track, id);
    });
  }

  async function advance(button) {
    const c = client();
    if (!c) return toast('Conexão com o banco indisponível.', true);
    const orderId = button.dataset.moOrder;
    const status = button.dataset.moStatus;
    let reason = null;
    if (status === 'cancelled') {
      reason = prompt('Informe o motivo do cancelamento:', 'Produto indisponível');
      if (!reason) return;
    }
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'Atualizando…';
    try {
      const { error } = await c.rpc('gestao_update_marketplace_order_status', {
        p_order_id: orderId, p_status: status, p_reason: reason
      });
      if (error) throw error;
      try { await c.functions.invoke('send-order-status-push', { body: { order_id: orderId, status } }); } catch (_) {}
      trackingCache.delete(orderId);
      toast(status === 'confirmed' ? 'Pedido aceito.' : status === 'preparing' ? 'Pedido colocado em preparação.' : status === 'ready_for_pickup' ? 'Pedido marcado como pronto para entrega.' : status === 'delivered' ? 'Pedido concluído.' : status === 'cancelled' ? 'Pedido cancelado.' : 'Pedido atualizado.');
      setTimeout(enhanceRows, 400);
    } catch (e) {
      console.error(e);
      button.disabled = false;
      button.textContent = old;
      toast(e?.message || 'Não foi possível atualizar o pedido.', true);
    }
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-mo-status][data-mo-order]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    advance(btn);
  }, true);

  const observer = new MutationObserver(() => requestAnimationFrame(enhanceRows));
  function start() {
    injectStyle();
    enhanceRows();
    observer.observe(document.body, { childList:true, subtree:true });
    setInterval(() => {
      trackingCache.clear();
      enhanceRows();
    }, 6000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
