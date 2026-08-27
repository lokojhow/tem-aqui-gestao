(()=>{'use strict';
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let busy=false,lastStoreId='',timer=null;
const $=id=>document.getElementById(id);
function cacheKey(storeId){return `tag-receivable-total-${storeId||'default'}`}
function readCache(storeId){const raw=localStorage.getItem(cacheKey(storeId));const n=Number(raw);return Number.isFinite(n)?n:0}
function writeCache(storeId,total){try{localStorage.setItem(cacheKey(storeId),String(total))}catch{}}
function ensureCard(){
  const view=document.querySelector('[data-view="customers"]');
  const heading=view?.querySelector('.page-heading');
  if(!view||!heading)return null;
  let card=$('customerReceivableStable');
  if(!card){
    card=document.createElement('section');
    card.id='customerReceivableStable';
    card.className='customer-receivable-stable';
    card.innerHTML='<div><span>CONTAS A RECEBER</span><strong id="customerReceivableStableValue">R$ 0,00</strong><small id="customerReceivableStableCount">Carregando fichas…</small></div><div class="customer-receivable-icon">R$</div>';
    heading.insertAdjacentElement('afterend',card);
  }
  const old=$('customerDebtOverview')?.firstElementChild;
  if(old)old.style.display='none';
  return card;
}
function showCached(){
  ensureCard();
  if(!lastStoreId)return;
  const total=readCache(lastStoreId);
  const el=$('customerReceivableStableValue');
  if(el&&total>0)el.textContent=money(total);
}
async function refresh(){
  if(busy||!window.GestaoBackend)return;
  const view=document.querySelector('[data-view="customers"]');
  if(!view)return;
  busy=true;
  try{
    const ctx=await window.GestaoBackend.context();
    const storeId=ctx?.store?.id||'';
    if(!storeId)return;
    lastStoreId=storeId;
    ensureCard();
    const cached=readCache(storeId);
    if(cached>0&&$('customerReceivableStableValue'))$('customerReceivableStableValue').textContent=money(cached);
    const customers=await window.GestaoBackend.customers(storeId)||[];
    const open=customers.filter(c=>Number(c.current_debt||0)>0);
    const total=open.reduce((sum,c)=>sum+Math.max(0,Number(c.current_debt||0)),0);
    writeCache(storeId,total);
    const value=$('customerReceivableStableValue'),count=$('customerReceivableStableCount');
    if(value)value.textContent=money(total);
    if(count)count.textContent=`${open.length} ${open.length===1?'ficha em aberto':'fichas em aberto'}`;
  }catch(err){
    console.warn('total a receber',err);
    showCached();
    const count=$('customerReceivableStableCount');
    if(count&&!count.textContent)count.textContent='Último valor disponível';
  }finally{busy=false}
}
function boot(){
  ensureCard();
  refresh();
  const root=document.querySelector('[data-view="customers"]');
  if(root)new MutationObserver(()=>{ensureCard();const old=$('customerDebtOverview')?.firstElementChild;if(old)old.style.display='none'}).observe(root,{childList:true,subtree:true});
  document.addEventListener('click',e=>{if(e.target.closest('[data-route="customers"],[data-cft],[data-old-debt],#saveCreditEntry,[data-receive-payment]'))setTimeout(refresh,250)});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  timer=setInterval(()=>{const v=document.querySelector('[data-view="customers"].active');if(v)refresh()},8000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer)});
})();