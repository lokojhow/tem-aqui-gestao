(() => {
'use strict';
if(window.__TEM_AQUI_UNIVERSAL_SHARE__)return;
window.__TEM_AQUI_UNIVERSAL_SHARE__=true;

const APP_NAME='Tem Aqui Gestão';
const APP_URL=location.origin+location.pathname;

function notify(msg){
  try{if(typeof window.toast==='function')return window.toast(msg);}catch(_){}
  const old=document.getElementById('temAquiShareToast');old?.remove();
  const el=document.createElement('div');el.id='temAquiShareToast';el.textContent=msg;
  Object.assign(el.style,{position:'fixed',left:'50%',bottom:'86px',transform:'translateX(-50%)',zIndex:'999999',background:'#0f172a',color:'#fff',padding:'11px 16px',borderRadius:'12px',fontWeight:'800',fontSize:'13px',boxShadow:'0 8px 30px rgba(0,0,0,.22)',maxWidth:'88vw',textAlign:'center'});
  document.body.appendChild(el);setTimeout(()=>el.remove(),2500);
}
async function copy(text){
  try{await navigator.clipboard.writeText(text);return true;}catch(_){}
  try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;}catch(_){return false;}
}
async function share(payload={}){
  const title=payload.title||APP_NAME;
  const text=payload.text||'Conheça o Tem Aqui Gestão.';
  const url=payload.url||APP_URL;
  try{if(navigator.share){await navigator.share({title,text,url});return true;}}catch(e){if(e?.name==='AbortError')return false;}
  const joined=`${text}\n${url}`.trim();
  if(await copy(joined)){notify('Link copiado. Agora é só colar onde quiser compartilhar.');return true;}
  try{window.open(`https://wa.me/?text=${encodeURIComponent(joined)}`,'_blank','noopener');return true;}catch(_){}
  notify('Não foi possível compartilhar agora.');return false;
}
window.TemAquiShare=share;
window.TemAquiShareApp=()=>share({title:APP_NAME,text:'Use o Tem Aqui Gestão para administrar produtos, estoque, vendas e pedidos.',url:APP_URL});

function candidate(target){
  return target?.closest?.('[data-share],[data-share-url],.share-button,[aria-label*="Compartilhar" i],[title*="Compartilhar" i],button,a,[role="button"]');
}
function isShareText(el){
  if(!el)return false;
  const txt=(el.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
  return txt.includes('compartilhar aplicativo')||txt==='compartilhar'||txt.startsWith('compartilhar ');
}
document.addEventListener('click',e=>{
  const el=candidate(e.target);if(!el)return;
  const explicit=el.matches?.('[data-share],[data-share-url],.share-button,[aria-label*="Compartilhar" i],[title*="Compartilhar" i]');
  if(!explicit&&!isShareText(el))return;
  e.preventDefault();e.stopImmediatePropagation();
  const url=el.dataset?.shareUrl||el.href||APP_URL;
  const title=el.dataset?.shareTitle||APP_NAME;
  const text=el.dataset?.shareText||'Confira no Tem Aqui Gestão.';
  share({title,text,url});
},true);
})();
