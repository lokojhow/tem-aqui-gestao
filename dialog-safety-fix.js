(() => {
  'use strict';

  function closeDialog(dialog){
    if(!dialog) return;
    try { if(dialog.open && typeof dialog.close === 'function') dialog.close('cancel'); }
    catch (_) { try { dialog.removeAttribute('open'); } catch(__){} }
  }

  function enhanceDialog(dialog){
    if(!dialog || dialog.dataset.safeCloseFixed==='1') return;
    dialog.dataset.safeCloseFixed='1';

    const form=dialog.querySelector('form');
    if(form) form.style.position=form.style.position||'relative';

    // Todo botão Cancelar deve fechar sem disparar validação HTML5.
    dialog.querySelectorAll('button').forEach(btn=>{
      const text=(btn.textContent||'').trim().toLocaleLowerCase('pt-BR');
      const isCancel=btn.value==='cancel' || btn.dataset.action==='cancel' || text==='cancelar' || text==='fechar';
      if(!isCancel || btn.dataset.safeCancelFixed==='1') return;
      btn.dataset.safeCancelFixed='1';
      btn.type='button';
      btn.setAttribute('formnovalidate','');
      btn.addEventListener('click',e=>{
        e.preventDefault();
        e.stopPropagation();
        closeDialog(dialog);
      },true);
    });

    // Garante um X em modais que ainda não possuem botão de fechamento.
    const hasClose=[...dialog.querySelectorAll('button')].some(btn=>{
      const t=(btn.textContent||'').trim();
      return btn.classList.contains('dialog-close-x') || btn.classList.contains('modal-close') || t==='×' || t==='✕';
    });
    if(!hasClose && form){
      const x=document.createElement('button');
      x.type='button';
      x.className='dialog-close-x universal-dialog-close';
      x.setAttribute('aria-label','Fechar');
      x.textContent='×';
      x.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();closeDialog(dialog);},true);
      form.prepend(x);
    }

    // ESC e clique no fundo fecham o modal.
    dialog.addEventListener('cancel',e=>{e.preventDefault();closeDialog(dialog);});
    dialog.addEventListener('click',e=>{if(e.target===dialog) closeDialog(dialog);});
  }

  function enhanceAll(){document.querySelectorAll('dialog').forEach(enhanceDialog);}

  const style=document.createElement('style');
  style.textContent='.universal-dialog-close{position:absolute;right:10px;top:8px;width:38px;height:38px;border:0;border-radius:50%;background:#eef2f6;color:#344054;font-size:26px;line-height:1;z-index:30;cursor:pointer}';
  document.head.appendChild(style);

  const obs=new MutationObserver(enhanceAll);
  function boot(){enhanceAll();obs.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
