(() => {
'use strict';
if(window.__TEM_AQUI_UNIVERSAL_SHARE__)return;
window.__TEM_AQUI_UNIVERSAL_SHARE__=true;

const APP_NAME='Tem Aqui Gestão';
const APP_URL=location.origin+location.pathname;
const SUPPORT_PHONE='5587999902257';
const SUPPORT_PHONE_LABEL='(87) 99990-2257';
const SUPPORT_INSTAGRAM='https://www.instagram.com/temaquitupanatinga?igsi=MW10aGI3cWh0ejZlYg==';

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

function openExternal(url){
  try{const w=window.open(url,'_blank','noopener');if(w)return;}catch(_){}
  location.href=url;
}
function openWhatsApp(){
  openExternal(`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent('Olá! Preciso de atendimento sobre o Tem Aqui Gestão.')}`);
}
function closeSupport(){document.getElementById('temAquiGestaoSupportOverlay')?.remove();}
function openSupport(){
  closeSupport();
  const overlay=document.createElement('div');overlay.id='temAquiGestaoSupportOverlay';
  overlay.innerHTML=`<div class="tag-support-card" role="dialog" aria-modal="true"><button class="tag-support-close" type="button">×</button><div style="font-size:34px">🎧</div><h2>Atendimento Tem Aqui</h2><p>Entre em contato com o suporte oficial.</p><button class="tag-support-action tag-wa"><span>💬</span><div><b>WhatsApp</b><small>${SUPPORT_PHONE_LABEL}</small></div></button><button class="tag-support-action tag-ig"><span>📸</span><div><b>Instagram</b><small>@temaquitupanatinga</small></div></button><button class="tag-support-action tag-share"><span>↗</span><div><b>Compartilhar aplicativo</b><small>Envie o Tem Aqui Gestão</small></div></button></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('.tag-support-close'))closeSupport();else if(e.target.closest('.tag-wa'))openWhatsApp();else if(e.target.closest('.tag-ig'))openExternal(SUPPORT_INSTAGRAM);else if(e.target.closest('.tag-share'))window.TemAquiShareApp();});
}
window.TemAquiSupport={open:openSupport,whatsapp:openWhatsApp,instagram:()=>openExternal(SUPPORT_INSTAGRAM),phone:SUPPORT_PHONE_LABEL};

function injectStyle(){
  if(document.getElementById('temAquiSupportShareStyle'))return;
  const s=document.createElement('style');s.id='temAquiSupportShareStyle';s.textContent=`
  #temAquiGestaoSupportOverlay{position:fixed;inset:0;z-index:1000000;background:rgba(15,23,42,.48);display:grid;place-items:end center;padding:18px}.tag-support-card{width:min(520px,100%);background:#fff;border-radius:24px;padding:20px;box-shadow:0 25px 70px rgba(0,0,0,.28);position:relative;color:#0f172a}.tag-support-card h2{margin:8px 0 5px}.tag-support-card p{margin:0 0 16px;color:#64748b}.tag-support-close{position:absolute;right:14px;top:12px;border:0;background:#eef2f7;width:38px;height:38px;border-radius:50%;font-size:24px}.tag-support-action{width:100%;display:flex;align-items:center;gap:12px;text-align:left;border:1px solid #e2e8f0;background:#fff;border-radius:16px;padding:14px;margin-top:10px;color:#0f172a}.tag-support-action>span{font-size:25px}.tag-support-action div{display:flex;flex-direction:column}.tag-support-action b{font-size:16px}.tag-support-action small{color:#64748b;margin-top:2px}.tag-support-settings{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.tag-support-settings button{border:1px solid #dbe2ea;background:#fff;border-radius:12px;padding:12px;font-weight:800}.tag-support-settings button:first-child{background:#ecfdf5;color:#047857}.tag-support-settings button:nth-child(2){background:#fff1f2;color:#be185d}@media(max-width:700px){.tag-support-settings{grid-template-columns:1fr}}`;
  document.head.appendChild(s);
}

function ensureSettingsCard(){
  injectStyle();
  const layout=document.querySelector('[data-view="settings"] .settings-layout');
  if(!layout||document.getElementById('temAquiSupportSettingsCard'))return;
  const card=document.createElement('div');card.id='temAquiSupportSettingsCard';card.className='data-card settings-card';
  card.innerHTML=`<h2>Atendimento e compartilhamento</h2><p style="color:#64748b;margin:0">Suporte oficial do Tem Aqui.</p><div class="tag-support-settings"><button type="button" data-tag-support>💬 Atendimento</button><button type="button" data-tag-instagram>📸 Instagram</button><button type="button" data-tag-share style="grid-column:1/-1">↗ Compartilhar aplicativo</button></div><small style="display:block;margin-top:10px;color:#64748b">WhatsApp: ${SUPPORT_PHONE_LABEL} · Instagram: @temaquitupanatinga</small>`;
  layout.appendChild(card);
}

function candidate(target){return target?.closest?.('[data-share],[data-share-url],.share-button,[aria-label*="Compartilhar" i],[title*="Compartilhar" i],button,a,[role="button"]');}
function text(el){return (el?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();}
function isShareText(el){const t=text(el);return t.includes('compartilhar aplicativo')||t==='compartilhar'||t.startsWith('compartilhar ');}
function isSupportText(el){const t=text(el);return t.includes('atendimento')||t.includes('ajuda e suporte')||t==='suporte';}

document.addEventListener('click',e=>{
  if(e.target.closest?.('[data-tag-support]')){e.preventDefault();openSupport();return;}
  if(e.target.closest?.('[data-tag-instagram]')){e.preventDefault();openExternal(SUPPORT_INSTAGRAM);return;}
  if(e.target.closest?.('[data-tag-share]')){e.preventDefault();window.TemAquiShareApp();return;}
  const el=candidate(e.target);if(!el)return;
  if(isSupportText(el)){e.preventDefault();e.stopImmediatePropagation();openSupport();return;}
  const explicit=el.matches?.('[data-share],[data-share-url],.share-button,[aria-label*="Compartilhar" i],[title*="Compartilhar" i]');
  if(!explicit&&!isShareText(el))return;
  e.preventDefault();e.stopImmediatePropagation();
  const url=el.dataset?.shareUrl||el.href||APP_URL;
  const title=el.dataset?.shareTitle||APP_NAME;
  const txt=el.dataset?.shareText||'Confira no Tem Aqui Gestão.';
  share({title,text:txt,url});
},true);

function boot(){injectStyle();ensureSettingsCard();const obs=new MutationObserver(ensureSettingsCard);obs.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
