(() => {
  'use strict';

  function ensureMobileCss(){
    if(document.querySelector('link[data-mobile-pdv-compact]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href='mobile-pdv-compact.css?v=20260820-2307';l.dataset.mobilePdvCompact='1';document.head.appendChild(l);
  }

  function ensureMobileOrdersShortcut(){
    ensureMobileCss();
    const nav=document.querySelector('.mobile-bottom-nav');
    const route=document.getElementById('marketplaceOrdersRoute');
    if(!nav||!route||document.getElementById('mobileMarketplaceOrders'))return;
    const btn=document.createElement('button');
    btn.id='mobileMarketplaceOrders';btn.type='button';btn.className='mobile-orders-shortcut';
    btn.innerHTML='<span>🛍️</span>Pedidos<b id="mobileMarketplaceOrderBadge"></b>';
    btn.addEventListener('click',()=>route.click());
    nav.insertBefore(btn,nav.querySelector('[data-route="settings"]')||null);
    nav.style.gridTemplateColumns='repeat(6,minmax(0,1fr))';
    const css=document.createElement('style');css.textContent=`.mobile-bottom-nav .mobile-orders-shortcut{position:relative;min-width:0;border:0;background:transparent;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font:inherit;padding:4px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mobile-bottom-nav .mobile-orders-shortcut span{font-size:15px}.mobile-bottom-nav .mobile-orders-shortcut b{position:absolute;top:0;right:10%;min-width:17px;height:17px;padding:0 4px;border-radius:999px;background:#ef4444;color:#fff;font-size:10px;line-height:17px}.mobile-bottom-nav .mobile-orders-shortcut b:empty{display:none}@media(max-width:430px){.mobile-bottom-nav button{font-size:10px!important}.mobile-bottom-nav .mobile-orders-shortcut b{right:4%}}`;document.head.appendChild(css);
    syncBadge();
  }
  function syncBadge(){const src=document.getElementById('marketplaceOrderBadge'),dst=document.getElementById('mobileMarketplaceOrderBadge');if(dst)dst.textContent=src?.textContent||'';}
  function openRequestedOrder(){ensureMobileOrdersShortcut();syncBadge();const params=new URLSearchParams(location.search),orderId=params.get('order'),wantsOrders=params.get('route')==='orders'||!!orderId;if(!wantsOrders)return;const route=document.getElementById('marketplaceOrdersRoute');if(route&&!route.hidden&&!route.classList.contains('active'))route.click();if(orderId){const row=document.querySelector(`[data-open-order="${CSS.escape(orderId)}"]`);if(row)row.click();}}
  ensureMobileCss();let tries=0;const timer=setInterval(()=>{openRequestedOrder();if(++tries>30)clearInterval(timer);},400);const observer=new MutationObserver(()=>{ensureMobileOrdersShortcut();syncBadge();});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>observer.observe(document.body,{childList:true,subtree:true,characterData:true}));else observer.observe(document.body,{childList:true,subtree:true,characterData:true});window.addEventListener('pageshow',openRequestedOrder);
})();