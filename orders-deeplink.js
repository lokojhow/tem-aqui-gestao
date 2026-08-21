(() => {
  'use strict';
  function openRequestedOrder(){
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
  const timer=setInterval(()=>{openRequestedOrder();if(++tries>30)clearInterval(timer);},400);
  window.addEventListener('pageshow',openRequestedOrder);
})();