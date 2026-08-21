(() => {
  'use strict';

  function ensureMobileOrdersShortcut(){
    const nav=document.querySelector('.mobile-bottom-nav');
    const route=document.getElementById('marketplaceOrdersRoute');
    if(!nav||!route||document.getElementById('mobileMarketplaceOrders'))return false;
    const btn=document.createElement('button');
    btn.id='mobileMarketplaceOrders';
    btn.type='button';
    btn.className='mobile-orders-shortcut';
    btn.innerHTML='<span>🛍️</span>Pedidos<b id="mobileMarketplaceOrderBadge"></b>';
    btn.addEventListener('click',()=>route.click());
    nav.insertBefore(btn,nav.querySelector('[data-route="settings"]')||null);
    nav.style.gridTemplateColumns='repeat(6,minmax(0,1fr))';
    const style=document.createElement('style');
    style.id='mobileOrdersShortcutStyle';
    style.textContent='.mobile-bottom-nav .mobile-orders-shortcut{position:relative;min-width:0;border:0;background:transparent;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:inherit;padding:4px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mobile-bottom-nav .mobile-orders-shortcut span{font-size:15px}.mobile-bottom-nav .mobile-orders-shortcut b{position:absolute;top:0;right:7%;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#ef4444;color:#fff;font-size:10px;line-height:17px}.mobile-bottom-nav .mobile-orders-shortcut b:empty{display:none}@media(max-width:430px){.mobile-bottom-nav button{font-size:10px!important}}';
    document.head.appendChild(style);
    return true;
  }

  function ensureMobileCashShortcut(){
    const settings=document.querySelector('[data-view="settings"] .settings-layout');
    const cashRoute=document.querySelector('.side-route[data-route="cash"]');
    if(!settings||!cashRoute||document.getElementById('mobileCashShortcut'))return false;
    const card=document.createElement('div');
    card.id='mobileCashShortcut';
    card.className='data-card settings-card';
    card.innerHTML='<h2>💰 Caixa</h2><p style="margin:0 0 12px;color:#667085">Abra, consulte ou feche o caixa deste ponto de venda.</p><button type="button" class="green full">💰 Abrir / Fechar Caixa</button>';
    card.querySelector('button').addEventListener('click',()=>cashRoute.click());
    settings.appendChild(card);
    return true;
  }

  function syncMobileBadge(){
    const src=document.getElementById('marketplaceOrderBadge');
    const dst=document.getElementById('mobileMarketplaceOrderBadge');
    if(dst)dst.textContent=src?.textContent||'';
  }

  function openRequestedOrder(){
    ensureMobileOrdersShortcut();
    ensureMobileCashShortcut();
    syncMobileBadge();
    const params=new URLSearchParams(location.search);
    const orderId=params.get('order');
    const wantsOrders=params.get('route')==='orders'||!!orderId;
    if(!wantsOrders)return;
    const route=document.getElementById('marketplaceOrdersRoute');
    if(route&&!route.hidden&&!route.classList.contains('active'))route.click();
    if(orderId){
      const row=document.querySelector(`[data-open-order="${CSS.escape(orderId)}"]`);
      if(row)row.click();
    }
  }

  let tries=0;
  const timer=setInterval(()=>{
    openRequestedOrder();
    if((document.getElementById('mobileMarketplaceOrders')&&document.getElementById('mobileCashShortcut'))||++tries>30)clearInterval(timer);
  },400);
  window.addEventListener('pageshow',openRequestedOrder);

  if(!document.getElementById('gestaoDeliveryTrackingLoader')){
    const script=document.createElement('script');
    script.id='gestaoDeliveryTrackingLoader';
    script.src='./orders-delivery-tracking.js?v=1.0.0';
    script.defer=true;
    document.body.appendChild(script);
  }
})();