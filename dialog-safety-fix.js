(() => {
  'use strict';

  function forceClose(dialog){
    if(!dialog) return;
    try { if(typeof dialog.close === 'function' && dialog.open) dialog.close('cancel'); } catch (_) {}
    requestAnimationFrame(()=>{
      try { if(dialog.open) dialog.removeAttribute('open'); } catch (_) {}
    });
  }

  function isCancelButton(btn){
    if(!btn || btn.tagName !== 'BUTTON') return false;
    const text=(btn.textContent||'').trim().toLocaleLowerCase('pt-BR');
    return btn.value==='cancel' || btn.dataset.action==='cancel' || btn.dataset.close==='dialog' || text==='cancelar' || text==='fechar';
  }

  function prepareCancelButton(btn,dialog){
    if(!btn || !dialog) return;
    btn.type='button';
    btn.setAttribute('formnovalidate','');
    btn.dataset.safeCancelFixed='1';
  }

  function enhanceDialog(dialog){
    if(!dialog) return;
    dialog.dataset.safeCloseFixed='1';
    const form=dialog.querySelector('form');
    if(form) form.style.position=form.style.position||'relative';

    dialog.querySelectorAll('button').forEach(btn=>{
      if(isCancelButton(btn)) prepareCancelButton(btn,dialog);
    });

    const hasClose=[...dialog.querySelectorAll('button')].some(btn=>{
      const t=(btn.textContent||'').trim();
      return btn.classList.contains('dialog-close-x') || btn.classList.contains('modal-close') || t==='×' || t==='✕';
    });
    if(!hasClose && form){
      const x=document.createElement('button');
      x.type='button';
      x.className='dialog-close-x universal-dialog-close';
      x.dataset.close='dialog';
      x.setAttribute('aria-label','Fechar');
      x.textContent='×';
      form.prepend(x);
    }

    if(dialog.dataset.safeDialogEvents!=='1'){
      dialog.dataset.safeDialogEvents='1';
      dialog.addEventListener('cancel',e=>{e.preventDefault();forceClose(dialog);},true);
      dialog.addEventListener('click',e=>{if(e.target===dialog){e.preventDefault();forceClose(dialog);}},true);
      if(form){
        form.addEventListener('submit',e=>{
          if(isCancelButton(e.submitter)){
            e.preventDefault();
            e.stopImmediatePropagation();
            forceClose(dialog);
          }
        },true);
      }
    }
  }

  function enhanceAll(){document.querySelectorAll('dialog').forEach(enhanceDialog);}

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('button');
    if(!isCancelButton(btn)) return;
    const dialog=btn.closest('dialog');
    if(!dialog) return;
    prepareCancelButton(btn,dialog);
    e.preventDefault();
    e.stopImmediatePropagation();
    forceClose(dialog);
  },true);

  const style=document.createElement('style');
  style.textContent='.universal-dialog-close{position:absolute;right:10px;top:8px;width:38px;height:38px;border:0;border-radius:50%;background:#eef2f6;color:#344054;font-size:26px;line-height:1;z-index:30;cursor:pointer}';
  document.head.appendChild(style);

  function ensureHidScanner(){
    if(document.getElementById('temAquiHidScanner')) return;
    const s=document.createElement('script');
    s.id='temAquiHidScanner';
    s.src='./pos-hid-scanner.js?v=1.0.10';
    s.async=false;
    document.body.appendChild(s);
  }

  const obs=new MutationObserver(enhanceAll);
  function boot(){enhanceAll();obs.observe(document.body,{childList:true,subtree:true});ensureHidScanner();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
