(() => {
'use strict';
const $=id=>document.getElementById(id);
const B=()=>window.GestaoBackend;
const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const fmt=v=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';

const SHORTCUTS={
  barcode:{label:'Código de Barras',sub:'Leitor / câmera',icon:'▥',action:'barcode'},
  pos:{label:'Venda em aberto',sub:'Acumule itens',icon:'▣',route:'pos'},
  stock:{label:'Estoque',sub:'Produtos e categorias',icon:'▦',route:'stock'},
  customers:{label:'Ficha / Clientes',sub:'Controle de contas',icon:'♙',route:'customers'},
  reports:{label:'Relatórios',sub:'Vendas do dia',icon:'▥',route:'reports'},
  orders:{label:'Pedidos',sub:'Pedidos do Tem Aqui',icon:'🛍',route:'orders'},
  cash:{label:'Caixa',sub:'Abertura / fechamento',icon:'▱',route:'cash'},
  products:{label:'Produtos',sub:'Cadastro e preços',icon:'▧',route:'products'},
  promotions:{label:'Promoções',sub:'Ofertas da loja',icon:'🏷',route:'promotions'},
  history:{label:'Histórico',sub:'Vendas realizadas',icon:'▤',route:'history'}
};
const DEFAULT=['barcode','pos','stock','customers','reports'];

function storeKey(){return localStorage.getItem('tag-pref-store')||'default';}
function storageKey(){return `tag-shortcuts-${storeKey()}`;}
function selected(){
  try{const v=JSON.parse(localStorage.getItem(storageKey())||'null');return Array.isArray(v)&&v.length?v.filter(x=>SHORTCUTS[x]):DEFAULT.slice();}catch{return DEFAULT.slice();}
}
function navigate(route){
  const b=document.querySelector(`.side-route[data-route="${route}"]`)||document.querySelector(`[data-route="${route}"]`);
  if(b){b.click();return true;}
  return false;
}
function runShortcut(key){
  const s=SHORTCUTS[key];if(!s)return;
  if(s.action==='barcode'){
    if(!navigate('pos')) return;
    setTimeout(()=>{const b=$('scanButton');if(b)b.click();else $('productSearch')?.focus();},80);
    return;
  }
  navigate(s.route);
}
function renderStrip(){
  const strip=document.querySelector('.feature-strip');if(!strip)return;
  const list=selected();
  strip.innerHTML=list.map(k=>{const s=SHORTCUTS[k];return `<button type="button" class="feature-shortcut" data-top-shortcut="${k}"><span class="feature-icon">${s.icon}</span><span class="feature-copy"><b>${s.label}</b><small>${s.sub}</small></span></button>`;}).join('');
}
function injectShortcutSettings(){
  const layout=document.querySelector('[data-view="settings"] .settings-layout');
  if(!layout||$('shortcutSettingsCard'))return;
  const card=document.createElement('div');card.id='shortcutSettingsCard';card.className='data-card settings-card';
  card.innerHTML=`<h2>Atalhos da barra superior</h2><p style="margin:0 0 12px;color:#64748b">Escolha o que deve aparecer como atalho no topo do Gestão.</p><div id="shortcutSettingsList" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px"></div><button id="saveShortcutSettings" type="button" class="green" style="margin-top:12px">Salvar atalhos</button>`;
  layout.appendChild(card);
  renderShortcutSettings();
}
function renderShortcutSettings(){
  const host=$('shortcutSettingsList');if(!host)return;const cur=new Set(selected());
  host.innerHTML=Object.entries(SHORTCUTS).map(([k,s])=>`<label style="display:flex;gap:8px;align-items:center;border:1px solid #e2e8f0;border-radius:10px;padding:10px"><input type="checkbox" data-shortcut-choice="${k}" ${cur.has(k)?'checked':''}><span><b>${s.label}</b><small style="display:block;color:#64748b">${s.sub}</small></span></label>`).join('');
}
function saveShortcuts(){
  let v=[...document.querySelectorAll('[data-shortcut-choice]:checked')].map(x=>x.dataset.shortcutChoice);
  if(!v.length)v=DEFAULT.slice();
  localStorage.setItem(storageKey(),JSON.stringify(v));renderStrip();
}

async function resolveStoreId(){
  let id=localStorage.getItem('tag-pref-store')||'';if(id)return id;
  try{const ss=await B()?.myStores?.();id=ss?.[0]?.id||'';if(id)localStorage.setItem('tag-pref-store',id);}catch(_){}
  return id;
}
function renderCashInfo(cash){
  const status=$('cashStatus'),summary=$('cashSummary'),open=$('openCashButton'),close=$('closeCashButton');
  if(status)status.textContent=cash?'Caixa aberto':'Caixa fechado';
  if(open)open.disabled=!!cash;if(close)close.disabled=!cash;
  if(summary)summary.innerHTML=cash?`<div><span>Aberto em</span><strong>${fmt(cash.opened_at)}</strong></div><div><span>Valor inicial</span><strong>${money(cash.opening_amount)}</strong></div><div><span>Vendas em dinheiro</span><strong>${money(cash.cash_sales)}</strong></div><div><span>Esperado</span><strong>${money(cash.expected_amount)}</strong></div>`:'<p>Abra o caixa para iniciar as vendas.</p>';
}
async function refreshCash(){
  try{const sid=await resolveStoreId();if(!sid||!B()?.openCashInfo)return;const c=await B().openCashInfo(sid);window.__TAG_CASH__=c||null;renderCashInfo(c||null);}catch(e){console.warn('cash refresh',e);}
}
async function openCashFixed(){
  const sid=await resolveStoreId();if(!sid)return alert('Loja não identificada.');
  const amount=Number(String($('cashOpening')?.value||0).replace(',','.'));if(!Number.isFinite(amount)||amount<0)return alert('Informe um valor inicial válido.');
  try{await B().openCash(sid,amount);await refreshCash();alert('Caixa aberto com sucesso.');}catch(e){await refreshCash();alert(e?.message||String(e));}
}
async function closeCashFixed(){
  const sid=await resolveStoreId();if(!sid)return alert('Loja não identificada.');
  let cash=window.__TAG_CASH__||await B().openCashInfo(sid);if(!cash)return alert('Não existe caixa aberto nesta loja.');
  const raw=prompt(`Valor contado no caixa (esperado ${money(cash.expected_amount)}):`,Number(cash.expected_amount||0).toFixed(2));if(raw===null)return;
  const counted=Number(String(raw).replace(',','.'));if(!Number.isFinite(counted)||counted<0)return alert('Informe um valor contado válido.');
  const id=cash.cash_session_id||cash.id;if(!id)return alert('Identificador do caixa não encontrado. Atualize e tente novamente.');
  try{const r=await B().closeCash(id,counted,'Fechamento pelo Tem Aqui Gestão');window.__TAG_CASH__=null;renderCashInfo(null);alert(`Caixa fechado com sucesso. Diferença: ${money(r?.difference_amount||0)}`);setTimeout(()=>document.getElementById('centralSyncButton')?.click(),100);}catch(e){await refreshCash();alert(e?.message||String(e));}
}

function injectStyle(){if($('universalRuntimeStyle'))return;const s=document.createElement('style');s.id='universalRuntimeStyle';s.textContent=`.feature-strip .feature-shortcut{appearance:none;border:0;background:transparent;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;min-width:0;color:inherit;padding:8px 10px;border-radius:10px}.feature-strip .feature-shortcut:hover{background:#f1f5f9}.feature-copy{display:flex;flex-direction:column;min-width:0}.feature-copy b,.feature-copy small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@media(max-width:820px){.feature-strip{overflow-x:auto!important;display:flex!important}.feature-strip .feature-shortcut{min-width:155px;flex:0 0 auto}#shortcutSettingsList{grid-template-columns:1fr!important}}`;document.head.appendChild(s);}

document.addEventListener('click',e=>{
  const top=e.target.closest?.('[data-top-shortcut]');if(top){e.preventDefault();runShortcut(top.dataset.topShortcut);return;}
  if(e.target.closest?.('#saveShortcutSettings')){e.preventDefault();saveShortcuts();return;}
  if(e.target.closest?.('#openCashButton')){e.preventDefault();e.stopImmediatePropagation();openCashFixed();return;}
  if(e.target.closest?.('#closeCashButton')){e.preventDefault();e.stopImmediatePropagation();closeCashFixed();return;}
},true);

function boot(){injectStyle();renderStrip();injectShortcutSettings();refreshCash();const obs=new MutationObserver(()=>{injectShortcutSettings();});obs.observe(document.body,{childList:true,subtree:true});window.addEventListener('storage',e=>{if(e.key?.startsWith('tag-shortcuts-'))renderStrip();});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
