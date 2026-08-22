(() => {
'use strict';
if (window.__TAG_MOBILE_ORDER_ACTIONS__) return;
window.__TAG_MOBILE_ORDER_ACTIONS__ = true;

const isMobile = () => window.matchMedia('(max-width: 900px)').matches;
let client = null;
let busy = false;

function injectStyle(){
  if(document.getElementById('mobileOrderActionsStyle')) return;
  const s=document.createElement('style');
  s.id='mobileOrderActionsStyle';
  s.textContent=`
    .mobile-order-actions{display:none}
    @media(max-width:900px){
      .orders-list .order-row{border-bottom:0!important;border-radius:14px 14px 0 0!important;margin-top:10px!important}
      .mobile-order-actions{display:flex;gap:8px;padding:10px 12px 13px;background:#fff;border-bottom:1px solid #e5e7eb;border-radius:0 0 14px 14px;margin-bottom:4px}
      .mobile-order-actions button{flex:1;min-height:46px;border:0;border-radius:12px;font-weight:900;font-size:15px;padding:10px 12px}
      .mobile-order-actions .accept{background:#0b8a43;color:#fff}
      .mobile-order-actions .reject{background:#fee2e2;color:#991b1b}
      .mobile-order-actions .next{background:#0b63ce;color:#fff}
      .mobile-order-actions .waiting{background:#eef2f7;color:#475569;pointer-events:none}
      .orders-detail{scroll-margin-top:12px}
    }
  `;
  document.head.appendChild(s);
}

async function authenticatedClient(){
  const b=window.GestaoBackend;
  if(!b?.getSession) throw new Error('Sessão do Gestão indisponível.');
  const session=await b.getSession();
  if(!session?.access_token||!session?.refresh_token) throw new Error('Faça login novamente no Tem Aqui Gestão.');
  const cfg=window.TEM_AQUI_SUPABASE||{};
  if(!window.supabase?.createClient||!cfg.url||!(cfg.publishableKey||cfg.anonKey)) throw new Error('Banco central não configurado.');
  if(!client) client=window.supabase.createClient(cfg.url,cfg.publishableKey||cfg.anonKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});
  const current=await client.auth.getSession();
  if(current?.data?.session?.access_token!==session.access_token){
    const r=await client.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
    if(r.error) throw r.error;
  }
  return client;
}

function statusOf(row){
  const el=row.querySelector('.order-status');
  return ['pending','confirmed','preparing','ready_for_pickup','out_for_delivery','dispatched','delivered','cancelled'].find(s=>el?.classList.contains(s))||'';
}
function isDelivery(row){
  return [...row.querySelectorAll('small')].some(x=>/Entrega/i.test(x.textContent||''));
}
function actionMarkup(status,delivery){
  if(status==='pending') return '<button class="accept" data-mobile-order-action="confirmed">✓ Aceitar pedido</button><button class="reject" data-mobile-order-action="cancelled">Recusar</button>';
  if(status==='confirmed') return '<button class="next" data-mobile-order-action="preparing">Iniciar preparação</button>';
  if(status==='preparing') return '<button class="accept" data-mobile-order-action="ready_for_pickup">✓ Marcar como pronto</button>';
  if(status==='ready_for_pickup'&&delivery) return '<button class="waiting" type="button">Aguardando entregador</button>';
  if(status==='ready_for_pickup'&&!delivery) return '<button class="accept" data-mobile-order-action="delivered">Entregue ao cliente</button>';
  if(['out_for_delivery','dispatched'].includes(status)) return '<button class="waiting" type="button">Em rota com o entregador</button>';
  return '';
}

function enhanceRows(){
  if(!isMobile()) return;
  const list=document.getElementById('ordersList');
  if(!list) return;
  list.querySelectorAll('.order-row[data-open-order]').forEach(row=>{
    const id=row.dataset.openOrder;
    const status=statusOf(row);
    const html=actionMarkup(status,isDelivery(row));
    let actions=row.nextElementSibling;
    if(!actions?.classList?.contains('mobile-order-actions')||actions.dataset.orderId!==id){
      actions=document.createElement('div');
      actions.className='mobile-order-actions';
      actions.dataset.orderId=id;
      row.insertAdjacentElement('afterend',actions);
    }
    actions.innerHTML=html;
    actions.hidden=!html;
  });
}

async function updateOrder(orderId,status){
  if(busy) return;
  let reason=null;
  if(status==='cancelled'){
    reason=prompt('Informe o motivo do cancelamento:','Produto indisponível');
    if(!reason) return;
  }
  busy=true;
  try{
    const c=await authenticatedClient();
    const {error}=await c.rpc('gestao_update_marketplace_order_status',{p_order_id:orderId,p_status:status,p_reason:reason});
    if(error) throw error;
    document.getElementById('ordersRefresh')?.click();
    setTimeout(enhanceRows,250);
  }catch(e){
    alert(e?.message||'Não foi possível atualizar o pedido.');
  }finally{busy=false;}
}

document.addEventListener('click',e=>{
  const action=e.target.closest?.('[data-mobile-order-action]');
  if(action){
    e.preventDefault();e.stopPropagation();
    const host=action.closest('.mobile-order-actions');
    if(host?.dataset.orderId) updateOrder(host.dataset.orderId,action.dataset.mobileOrderAction);
    return;
  }
  const row=e.target.closest?.('.order-row[data-open-order]');
  if(row&&isMobile()) setTimeout(()=>document.getElementById('ordersDetail')?.scrollIntoView({behavior:'smooth',block:'start'}),120);
},true);

function boot(){
  injectStyle();
  enhanceRows();
  const obs=new MutationObserver(enhanceRows);
  obs.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',enhanceRows);
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
