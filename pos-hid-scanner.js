(() => {
  'use strict';

  const MIN_LENGTH = 6;
  const MAX_GAP_MS = 90;
  const RESET_MS = 180;
  let buffer = '';
  let lastKeyAt = 0;
  let resetTimer = 0;
  let processing = false;

  const $ = id => document.getElementById(id);

  function posActive(){
    const view = document.querySelector('[data-view="pos"]');
    return !!view?.classList.contains('active');
  }

  function modalOpen(){
    return !!document.querySelector('dialog[open], .barcode-camera-overlay');
  }

  function reset(){
    buffer = '';
    lastKeyAt = 0;
    clearTimeout(resetTimer);
    resetTimer = 0;
  }

  function scheduleReset(){
    clearTimeout(resetTimer);
    resetTimer = setTimeout(reset, RESET_MS);
  }

  function dispatchInput(input, value){
    if(!input) return;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if(setter) setter.call(input, value); else input.value = value;
    input.dispatchEvent(new Event('input', {bubbles:true}));
  }

  function flash(message, error=false){
    let el = document.getElementById('hidScannerStatus');
    if(!el){
      el = document.createElement('div');
      el.id = 'hidScannerStatus';
      el.style.cssText = 'position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:20000;padding:9px 14px;border-radius:999px;color:#fff;font-weight:800;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.22);pointer-events:none;opacity:0;transition:opacity .15s';
      document.body.appendChild(el);
    }
    el.style.background = error ? '#c62828' : '#0b7a3d';
    el.textContent = message;
    el.style.opacity = '1';
    clearTimeout(el._timer);
    el._timer = setTimeout(()=>{el.style.opacity='0';}, 900);
  }

  async function addByBarcode(raw){
    if(processing) return;
    processing = true;
    try{
      const code = String(raw || '').trim();
      const search = $('productSearch');
      const grid = $('productGrid');
      if(!code || !search || !grid) return;

      // Usa o renderizador já existente do PDV para localizar o produto,
      // preservando preço promocional, estoque e regra de soma do carrinho.
      dispatchInput(search, code);
      await new Promise(r=>setTimeout(r, 45));

      let cards = [...grid.querySelectorAll('[data-add-product]')];
      let card = cards.length === 1 ? cards[0] : null;

      // Caso outro módulo tenha atraso na renderização, aguarda mais um ciclo.
      if(!card){
        await new Promise(r=>setTimeout(r, 85));
        cards = [...grid.querySelectorAll('[data-add-product]')];
        card = cards.length === 1 ? cards[0] : null;
      }

      if(card){
        card.click();
        flash(`Produto adicionado · ${code}`);
      }else{
        flash(`Código não encontrado · ${code}`, true);
      }

      // Volta imediatamente ao catálogo completo; não precisa manter foco no campo.
      dispatchInput(search, '');
      try { search.blur(); } catch(_) {}
    } finally {
      processing = false;
      reset();
    }
  }

  // Leitores USB/Bluetooth normalmente se comportam como teclado e terminam com Enter.
  // Capturamos a sequência em qualquer ponto da tela, sem exigir foco no campo de busca.
  document.addEventListener('keydown', e => {
    if(!posActive() || modalOpen() || e.ctrlKey || e.altKey || e.metaKey) return;

    const now = performance.now();
    const key = e.key;

    if(key === 'Enter'){
      if(buffer.length >= MIN_LENGTH){
        e.preventDefault();
        e.stopPropagation();
        addByBarcode(buffer);
      } else reset();
      return;
    }

    if(key.length !== 1 || !/[0-9A-Za-z\-_.]/.test(key)) return;

    // Se a digitação ficou lenta, começa uma nova sequência. Isso evita confundir
    // digitação humana com leitura rápida do scanner.
    if(lastKeyAt && now - lastKeyAt > MAX_GAP_MS) buffer = '';
    buffer += key;
    lastKeyAt = now;
    scheduleReset();
  }, true);

  // Também permite digitar/colar um código no campo e apertar Enter para adicionar direto.
  function bindSearch(){
    const input = $('productSearch');
    if(!input || input.dataset.hidScannerBound === '1') return;
    input.dataset.hidScannerBound = '1';
    input.addEventListener('keydown', e => {
      if(e.key !== 'Enter') return;
      const code = String(input.value || '').trim();
      if(code.length < MIN_LENGTH) return;
      e.preventDefault();
      e.stopPropagation();
      addByBarcode(code);
    }, true);
  }

  const obs = new MutationObserver(bindSearch);
  function boot(){bindSearch();obs.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
