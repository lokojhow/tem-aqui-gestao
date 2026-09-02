(()=>{
'use strict';
const cfg=()=>window.TEM_AQUI_SUPABASE||{};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
let client=null,rows=[],busy=false,lastStore='';
async function getClient(){
 const b=window.GestaoBackend;if(!b?.getSession)return null;
 const s=await b.getSession();if(!s?.access_token||!s?.refresh_token)return null;
 const c=cfg();if(!window.supabase?.createClient||!c.url||!(c.publishableKey||c.anonKey))return null;
 if(!client)client=window.supabase.createClient(c.url,c.publishableKey||c.anonKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});
 const cur=await client.auth.getSession();
 if(cur?.data?.session?.access_token!==s.access_token){const r=await client.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});if(r.error)throw r.error;}
 return client;
}
async function getStore(){const b=window.GestaoBackend;if(!b?.context)return null;const ctx=await b.context(localStorage.getItem('tag-pref-store')||'');return ctx?.store||null;}
function addStyles(){if(document.getElementById('orderItemDetailFixStyle'))return;const s=document.createElement('style');s.id='orderItemDetailFixStyle';s.textContent='.order-item-summary{display:block!important;margin-top:6px!important;color:#0f5132!important;font-weight:800!important;line-height:1.3!important}.order-items td:first-child{font-weight:800}.order-items .qty-badge{display:inline-flex;min-width:28px;justify-content:center;border-radius:999px;background:#eef6ff;padding:2px 7px;font-weight:900}';document.head.appendChild(s);}
function decorate(){
 addStyles();const map=new Map(rows.map(o=>[String(o.id),o]));
 document.querySelectorAll('.order-row[data-open-order]').forEach(btn=>{const o=map.get(String(btn.dataset.openOrder));if(!o)return;let sm=btn.querySelector('.order-item-summary');if(!sm){sm=document.createElement('small');sm.className='order-item-summary';const first=btn.querySelector('span');first?.appendChild(sm);}if(sm)sm.textContent=o.item_summary||((o.items||[]).map(i=>`${i.product_name} x${i.quantity}`).join(', '))||'Pedido sem itens';});
 const active=document.querySelector('.order-row.active[data-open-order]');if(!active)return;const o=map.get(String(active.dataset.openOrder));if(!o)return;const tbody=document.querySelector('#ordersDetail .order-items tbody');if(!tbody)return;const items=Array.isArray(o.items)?o.items:[];if(items.length){tbody.innerHTML=items.map(i=>`<tr><td>${esc(i.product_name||'Produto')}</td><td><span class="qty-badge">${Number(i.quantity||0)}</span></td><td>${money(i.unit_price)}</td><td>${money(i.line_total)}</td></tr>`).join('');}
}
async function refresh(){if(busy)return;busy=true;try{const view=document.querySelector('[data-view="orders"]');if(!view||!view.classList.contains('active')){decorate();return;}const c=await getClient(),store=await getStore();if(!c||!store?.id)return;lastStore=store.id;const {data,error}=await c.rpc('gestao_list_marketplace_orders_v2',{p_store_id:store.id,p_limit:300});if(error)throw error;rows=data||[];decorate();}catch(e){console.warn('Detalhes dos itens do pedido:',e);}finally{busy=false;}}
const observer=new MutationObserver(()=>decorate());
window.addEventListener('load',()=>{observer.observe(document.body,{childList:true,subtree:true});setInterval(refresh,1500);setTimeout(refresh,700);});
})();