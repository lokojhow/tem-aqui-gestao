(() => {
  'use strict';
  if (location.protocol === 'file:') return;
  if (window.__TAG_MOBILE_SESSION_RESCUE__) return;
  window.__TAG_MOBILE_SESSION_RESCUE__ = true;

  const $ = id => document.getElementById(id);

  function injectStyle(){
    if ($('mobileSessionRescueStyle')) return;
    const s=document.createElement('style');
    s.id='mobileSessionRescueStyle';
    s.textContent=`
      #centralLoginDialog[open]{
        display:block!important;
        position:fixed!important;
        inset:50% auto auto 50%!important;
        transform:translate(-50%,-50%)!important;
        width:min(92vw,460px)!important;
        max-width:460px!important;
        max-height:88vh!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:16px!important;
        background:#fff!important;
        color:#172033!important;
        box-shadow:0 24px 80px rgba(0,0,0,.32)!important;
        z-index:2147483647!important;
        overflow:auto!important;
        opacity:1!important;
        visibility:visible!important;
        pointer-events:auto!important;
      }
      #centralLoginDialog[open] form{display:grid!important;gap:14px!important;padding:22px!important;background:#fff!important;color:#172033!important;min-height:0!important;}
      #centralLoginDialog[open] h2{margin:0!important;font-size:22px!important;color:#172033!important;}
      #centralLoginDialog[open] .login-help{margin:0!important;color:#64748b!important;}
      #centralLoginDialog[open] label{display:grid!important;gap:6px!important;font-weight:700!important;}
      #centralLoginDialog[open] input{width:100%!important;min-height:46px!important;font-size:16px!important;padding:10px 12px!important;}
      #centralLoginDialog[open] .dialog-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:10px!important;margin-top:4px!important;}
      #centralLoginDialog[open] .dialog-actions button{min-height:46px!important;border-radius:10px!important;font-weight:800!important;}
      #centralLoginDialog::backdrop{background:rgba(5,18,40,.58)!important;}
    `;
    document.head.appendChild(s);
  }

  function dialogActuallyVisible(d){
    if(!d?.open) return false;
    const r=d.getBoundingClientRect();
    const cs=getComputedStyle(d);
    return r.width>80 && r.height>80 && cs.display!=='none' && cs.visibility!=='hidden' && Number(cs.opacity||1)>0;
  }

  async function heal(){
    injectStyle();
    const d=$('centralLoginDialog');
    const backend=window.GestaoBackend;
    if(!d || !backend) return;

    let session=null;
    try{ session=await backend.getSession?.(); }catch(e){ console.warn('mobile session rescue getSession',e); }

    if(session){
      if(d.open){ try{d.close();}catch(_){} }
      setTimeout(()=>$('centralSyncButton')?.click(),120);
      return;
    }

    if(!d.open){
      try{ d.showModal(); }catch(_){ d.setAttribute('open',''); }
    }
    requestAnimationFrame(()=>{
      if(!dialogActuallyVisible(d)){
        d.style.display='block';
        d.style.visibility='visible';
        d.style.opacity='1';
        d.style.pointerEvents='auto';
      }
      $('centralEmail')?.focus({preventScroll:true});
    });
  }

  document.addEventListener('close',e=>{
    if(e.target?.id==='centralLoginDialog') setTimeout(heal,150);
  },true);

  window.addEventListener('pageshow',()=>setTimeout(heal,150));
  window.addEventListener('focus',()=>setTimeout(heal,150));
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(heal,180),{once:true});
  else setTimeout(heal,180);
})();
