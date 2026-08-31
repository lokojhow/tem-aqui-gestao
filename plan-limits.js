(()=>{
  const $=s=>document.querySelector(s);
  let usage=null;
  const getStoreId=()=>localStorage.getItem('tag-pref-store')||window.GestaoBackend?.currentStoreId||window.GestaoBackend?.storeId||null;
  const supa=()=>window.GestaoBackend?.client||window.supabaseClient||window.supabase;

  async function loadUsage(){
    const storeId=getStoreId();
    if(!storeId)return null;
    try{
      const client=supa();
      if(!client?.rpc)return null;
      const {data,error}=await client.rpc('gestao_get_plan_usage',{p_store_id:storeId});
      if(error)throw error;
      usage=data; render();
      return usage;
    }catch(e){console.warn('Plano Gestão:',e);return null;}
  }

  function upgrade(){
    const url='https://github.com/lokojhow/tem-aqui-tupanatinga';
    const msg='Você atingiu o limite do Tem Sabor Básico. Para cadastrar mais produtos, faça upgrade para um plano Tem Aqui Parceiro/Negócios.';
    if(window.showToast)window.showToast(msg); else alert(msg);
    window.dispatchEvent(new CustomEvent('tem-aqui-upgrade-request',{detail:{source:'gestao',plan:usage?.plan_code||'sabor_basic'}}));
  }

  function cardHtml(){
    if(!usage)return '';
    const unlimited=usage.is_unlimited||usage.product_limit==null;
    const count=Number(usage.product_count||0),limit=Number(usage.product_limit||0);
    const pct=unlimited?0:Math.min(100,Math.round((count/Math.max(limit,1))*100));
    return `<section id="managementPlanCard" style="margin:14px 0;padding:18px;border:1px solid #dbe5ee;border-radius:14px;background:#fff">
      <div style="display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap">
        <div><small style="font-weight:900;color:#0759f8">MEU PLANO</small><h3 style="margin:5px 0">${usage.plan_name||'Tem Aqui Gestão'}</h3>
        <p style="margin:0;color:#667085">${unlimited?`${count} produtos cadastrados · Produtos ilimitados`:`${count} de ${limit} produtos utilizados`}</p></div>
        ${unlimited?'':`<button id="managementUpgradeBtn" type="button" class="green" style="padding:10px 16px">Fazer upgrade</button>`}
      </div>
      ${unlimited?'':`<div style="height:9px;background:#edf2f7;border-radius:99px;margin-top:14px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#0759f8;border-radius:99px"></div></div><small style="display:block;margin-top:7px;color:#667085">${Math.max(limit-count,0)} produto(s) disponível(is) no plano atual.</small>`}
    </section>`;
  }

  function render(){
    if(!usage)return;
    const settings=$('[data-view="settings"]');
    if(settings){
      let card=$('#managementPlanCard');
      if(card)card.remove();
      const head=settings.querySelector('.page-heading');
      if(head)head.insertAdjacentHTML('afterend',cardHtml()); else settings.insertAdjacentHTML('afterbegin',cardHtml());
      $('#managementUpgradeBtn')?.addEventListener('click',upgrade);
    }
    const products=$('[data-view="products"] .page-heading');
    if(products){
      let badge=$('#productPlanUsage');
      if(!badge){badge=document.createElement('div');badge.id='productPlanUsage';badge.style.cssText='font-size:12px;font-weight:800;color:#667085;margin-top:6px';products.querySelector('div')?.appendChild(badge);}
      badge.textContent=usage.product_limit==null?`${usage.product_count||0} produtos · plano ilimitado`:`${usage.product_count||0} de ${usage.product_limit} produtos do plano`;
    }
  }

  document.addEventListener('click',async e=>{
    const btn=e.target.closest?.('#newProductButton');
    if(btn){
      const u=usage||await loadUsage();
      if(u && u.product_limit!=null && !u.can_add){
        e.preventDefault();e.stopImmediatePropagation();upgrade();return false;
      }
    }
  },true);

  const nativeAlert=window.alert?.bind(window);
  if(nativeAlert){
    window.alert=(msg)=>{
      const t=String(msg??'');
      if(t.includes('LIMIT_PRODUCTS_REACHED')){
        nativeAlert(t.replace('LIMIT_PRODUCTS_REACHED:','').trim());
        loadUsage();return;
      }
      return nativeAlert(msg);
    };
  }
  window.addEventListener('tem-aqui-product-saved',loadUsage);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadUsage();});
  setTimeout(loadUsage,1200);setInterval(loadUsage,30000);
})();