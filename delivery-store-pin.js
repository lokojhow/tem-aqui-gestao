(() => {
'use strict';
if(window.__TEM_AQUI_STORE_PIN_UI__)return;
window.__TEM_AQUI_STORE_PIN_UI__=true;
let client=null,timer=null;

function cfg(){return window.TEM_AQUI_SUPABASE||{};}
async function getClient(){
  const b=window.GestaoBackend;if(!b?.getSession)return null;
  const s=await b.getSession();if(!s?.access_token||!s?.refresh_token)return null;
  const c=cfg();if(!window.supabase?.createClient||!c.url||!(c.publishableKey||c.anonKey))return null;
  if(!client)client=window.supabase.createClient(c.url,c.publishableKey||c.anonKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});
  const current=await client.auth.getSession();
  if(current?.data?.session?.access_token!==s.access_token){const r=await client.auth.setSession({access_token:s.access_token,refresh_token:s.refresh_token});if(r.error)throw r.error;}
  return client;
}
function style(){if(document.getElementById('storePickupPinStyle'))return;const s=document.createElement('style');s.id='storePickupPinStyle';s.textContent=`.store-pickup-pin{margin:12px 0;padding:14px;border:1px solid #bfdbfe;border-radius:12px;background:#eff6ff}.store-pickup-pin small{display:block;color:#64748b}.store-pickup-pin strong{display:block;font-size:28px;letter-spacing:.16em;color:#0759c7;margin-top:4px}.store-pickup-pin span{display:block;font-size:12px;color:#475569;margin-top:5px}`;document.head.appendChild(s);}
function selectedOrderId(){return document.querySelector('.order-row.active[data-open-order]')?.dataset.openOrder||'';}
function render(pin){const host=document.querySelector('#ordersDetail .order-detail-wrap');if(!host)return;let box=host.querySelector('.store-pickup-pin');if(!pin){box?.remove();return;}if(!box){box=document.createElement('div');box.className='store-pickup-pin';const actions=host.querySelector('.order-actions');host.insertBefore(box,actions||host.firstChild);}box.innerHTML=`<small>PIN DE COLETA</small><strong>${String(pin).replace(/[^0-9]/g,'')}</strong><span>Informe este código ao entregador somente quando ele estiver na loja para retirar o pedido.</span>`;}
async function refresh(){try{style();const id=selectedOrderId();if(!id){render('');return;}const c=await getClient();if(!c)return;const{data,error}=await c.rpc('delivery_pickup_pin_for_order',{p_order_id:id});if(error)throw error;const row=Array.isArray(data)?data[0]:data;render(row?.pickup_pin||'');}catch(e){console.warn('PIN coleta lojista',e);}}
function boot(){refresh();document.addEventListener('click',e=>{if(e.target.closest?.('[data-open-order],#ordersRefresh,[data-set-status]'))setTimeout(refresh,250);},true);clearInterval(timer);timer=setInterval(refresh,5000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
