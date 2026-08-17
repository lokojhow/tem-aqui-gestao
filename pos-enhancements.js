;(() => {
'use strict';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let products=[],categories=[],promotions=[],storeId='',renderTimer=0,loading=false;

function injectStyles(){
 if(document.getElementById('posEnhancedStyles'))return;
 const s=document.createElement('style');s.id='posEnhancedStyles';s.textContent=`
  /* PDV profissional: somente catálogo rola; checkout permanece visível */
  [data-view="pos"].active{overflow:hidden}
  .pos-category-chips{display:flex;gap:7px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none;flex:0 0 auto}
  .pos-category-chips::-webkit-scrollbar{display:none}
  .pos-category-chip{flex:0 0 auto;border:1px solid #dbe4ee;background:#fff;color:#172033;border-radius:8px;padding:8px 12px;font-weight:800;font-size:10px;white-space:nowrap}
  .pos-category-chip.active{background:#16b72e;border-color:#16b72e;color:#fff;box-shadow:0 4px 12px rgba(22,183,46,.18)}
  .pos-category-heading{grid-column:1/-1;position:sticky;top:0;z-index:3;background:#f4f7fb;border-bottom:1px solid #dfe7f0;padding:8px 4px 6px;color:#0759c7;font-size:11px;font-weight:900;text-align:left}
  .product-grid.enhanced-products{align-content:start;overflow-y:auto!important;overscroll-behavior:contain;padding-right:3px;scrollbar-width:thin;min-height:0!important}
  .enhanced-products .product-card{height:190px!important;min-height:190px!important;max-height:190px!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;padding:8px!important}
  .enhanced-products .product-visual{width:100%!important;height:104px!important;min-height:104px!important;max-height:104px!important;aspect-ratio:auto!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;background:#fff!important;border-radius:7px!important}
  .enhanced-products .product-visual img{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important;display:block!important}
  .enhanced-products .product-card b{font-size:10px;line-height:1.15;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin:5px 0 1px;width:100%}
  .enhanced-products .product-card small{font-size:8px;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%}
  .enhanced-products .product-card strong{margin-top:auto!important;font-size:13px!important;color:#0759c7!important}
  @media(min-width:821px){
    [data-view="pos"].active{height:calc(100vh - 102px)}
    [data-view="pos"]>.sale-panel{height:100%;display:flex;flex-direction:column;overflow:hidden}
    [data-view="pos"] .pdv-grid{flex:1;min-height:0;overflow:hidden;grid-template-columns:minmax(0,1fr) minmax(330px,390px)!important}
    [data-view="pos"] .catalog-pane{min-height:0;display:flex;flex-direction:column;overflow:hidden!important}
    [data-view="pos"] .product-grid.enhanced-products{flex:1;max-height:none!important}
    [data-view="pos"] .cart-pane{position:sticky;top:0;height:100%;max-height:100%;overflow-y:auto!important;align-self:start;background:#fff;z-index:5;border-left:1px solid #dfe7f0}
    [data-view="pos"] .checkout-panel.pos-mounted{display:block!important;margin:10px 0 0!important;padding:0!important;border:0!important;box-shadow:none!important;background:transparent!important}
    [data-view="pos"] .checkout-panel.pos-mounted>h2{display:none!important}
    [data-view="pos"] .checkout-panel.pos-mounted .checkout-grid{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
    [data-view="pos"] .checkout-panel.pos-mounted .checkout-summary{display:none!important}
    [data-view="pos"] .checkout-panel.pos-mounted .payment-card,[data-view="pos"] .checkout-panel.pos-mounted .credit-card{padding:10px!important;background:#fff}
    [data-view="pos"] .checkout-panel.pos-mounted .credit-card{grid-column:auto!important}
    [data-view="pos"] .payment-grid{grid-template-columns:repeat(4,1fr)!important}
    [data-view="pos"] .payment-grid button{min-height:62px!important;padding:5px!important}
    [data-view="pos"] .payment-grid button span{font-size:21px!important}
    [data-view="pos"] .sale-actions.pos-mounted-actions{display:grid!important;grid-template-columns:1fr!important;gap:7px!important;padding:10px 0 0!important;border-top:0!important}
    [data-view="pos"] .sale-actions.pos-mounted-actions .green{order:-1}
  }
  @media(min-width:1100px){.enhanced-products .product-card{height:184px!important;min-height:184px!important;max-height:184px!important}.enhanced-products .product-visual{height:98px!important;min-height:98px!important;max-height:98px!important}}
  @media(max-width:820px){
    .product-grid.enhanced-products{max-height:56vh!important;overflow-y:auto!important}
    .enhanced-products .product-card{height:170px!important;min-height:170px!important;max-height:170px!important}
    .enhanced-products .product-visual{height:88px!important;min-height:88px!important;max-height:88px!important}
    .pos-category-chips{padding-bottom:8px}
  }
  @media(max-width:430px){.enhanced-products .product-card{height:158px!important;min-height:158px!important;max-height:158px!important}.enhanced-products .product-visual{height:78px!important;min-height:78px!important;max-height:78px!important}}
 `;document.head.appendChild(s);
}

function activePromo(product){const now=Date.now();return promotions.find(p=>(p.product_ids||[]).includes(product.id)&&p.active&&new Date(p.starts_at).getTime()<=now&&(!p.ends_at||new Date(p.ends_at).getTime()>=now));}
function salePrice(p){const pr=activePromo(p);return pr?Math.max(0,Number(p.price||0)*(1-Number(pr.discount_percent||0)/100)):Number(p.price||0);}
function categoryName(p){return String(p.category||'Outros').trim()||'Outros';}

function mountCheckout(){
 const cart=document.querySelector('[data-view="pos"] .cart-pane'),checkout=$('checkoutPanel'),actions=document.querySelector('[data-view="pos"] .sale-actions');
 if(!cart||!checkout)return;
 if(checkout.parentElement!==cart){checkout.classList.add('pos-mounted');cart.appendChild(checkout);}
 if(actions&&actions.parentElement!==cart){actions.classList.add('pos-mounted-actions');cart.appendChild(actions);}
}
function mountCategoryChips(){
 const pane=document.querySelector('[data-view="pos"] .catalog-pane'),grid=$('productGrid');if(!pane||!grid)return;
 let bar=document.getElementById('posCategoryChips');if(!bar){bar=document.createElement('div');bar.id='posCategoryChips';bar.className='pos-category-chips';grid.parentNode.insertBefore(bar,grid);}
 const sel=$('categoryFilter');const current=sel?.value||'';
 const names=[...new Set(categories.map(c=>c.name).filter(Boolean).concat(products.map(categoryName)))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
 bar.innerHTML=[`<button class="pos-category-chip ${!current?'active':''}" data-pos-category="">Todos</button>`,...names.map(n=>`<button class="pos-category-chip ${current===n?'active':''}" data-pos-category="${esc(n)}">${esc(n)}</button>`)].join('');
 if(sel)sel.style.display='none';
}
function renderEnhanced(){
 const grid=$('productGrid');if(!grid||!products.length)return;
 const term=String($('productSearch')?.value||'').toLocaleLowerCase('pt-BR').trim();const selected=$('categoryFilter')?.value||'';
 let list=products.filter(p=>p.active!==false&&(!term||`${p.name||''} ${p.barcode||''} ${p.sku||''}`.toLocaleLowerCase('pt-BR').includes(term))&&(!selected||categoryName(p)===selected));
 const groups=selected?[[selected,list]]:[...new Set(list.map(categoryName))].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(c=>[c,list.filter(p=>categoryName(p)===c)]);
 grid.classList.add('enhanced-products');
 grid.innerHTML=groups.map(([cat,items])=>`${selected?'':`<div class="pos-category-heading">${esc(cat)} <span>(${items.length})</span></div>`}${items.map(p=>`<button class="product-card" data-add-product="${esc(p.id)}"><span class="product-visual">${p.image?`<img loading="lazy" decoding="async" src="${esc(p.image)}" alt="${esc(p.name)}">`:'📦'}</span><b>${esc(p.name)}</b><small>${esc(categoryName(p))} · Estoque ${Number(p.stock||0).toLocaleString('pt-BR')}</small><strong>${money(salePrice(p))}</strong></button>`).join('')}`).join('')||'<div class="empty-state">Nenhum produto encontrado.</div>';
 mountCategoryChips();mountCheckout();
}
function scheduleRender(){clearTimeout(renderTimer);renderTimer=setTimeout(renderEnhanced,30);}
async function loadAll(){
 if(loading||!window.GestaoBackend?.isConfigured?.())return;loading=true;
 try{const ctx=await window.GestaoBackend.context(localStorage.getItem('tag-pref-store')||'');if(!ctx?.store)return;storeId=ctx.store.id;[products,categories,promotions]=await Promise.all([window.GestaoBackend.products(storeId),window.GestaoBackend.categories(storeId),window.GestaoBackend.promotions(storeId).catch(()=>[])]);renderEnhanced();}catch(e){console.warn('PDV enhanced:',e);}finally{loading=false;}
}
function bind(){
 document.addEventListener('click',e=>{const b=e.target.closest('[data-pos-category]');if(!b)return;const sel=$('categoryFilter');if(!sel)return;sel.value=b.dataset.posCategory||'';sel.dispatchEvent(new Event('change',{bubbles:true}));scheduleRender();});
 $('productSearch')?.addEventListener('input',scheduleRender);
 $('categoryFilter')?.addEventListener('change',scheduleRender);
 const store=$('storeName');if(store)new MutationObserver(()=>setTimeout(loadAll,100)).observe(store,{childList:true,subtree:true,characterData:true});
 window.addEventListener('resize',mountCheckout);
}
function start(){injectStyles();bind();mountCheckout();setTimeout(loadAll,150);setTimeout(()=>{mountCheckout();scheduleRender();},800);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();