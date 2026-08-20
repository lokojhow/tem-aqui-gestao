(() => {
  'use strict';

  const MIN_LENGTH = 6;
  const MAX_GAP_MS = 90;
  const RESET_MS = 180;
  let buffer = '';
  let lastKeyAt = 0;
  let resetTimer = 0;
  let processing = false;
  let cameraStream = null;
  let cameraTimer = null;

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
    el._timer = setTimeout(()=>{el.style.opacity='0';}, 1000);
  }

  async function addByBarcode(raw){
    if(processing) return false;
    processing = true;
    try{
      const code = String(raw || '').trim();
      const search = $('productSearch');
      const grid = $('productGrid');
      if(!code || !search || !grid) return false;

      dispatchInput(search, code);
      await new Promise(r=>setTimeout(r, 55));
      let cards = [...grid.querySelectorAll('[data-add-product]')];
      let card = cards.length === 1 ? cards[0] : null;
      if(!card){
        await new Promise(r=>setTimeout(r, 100));
        cards = [...grid.querySelectorAll('[data-add-product]')];
        card = cards.length === 1 ? cards[0] : null;
      }

      if(card){
        card.click();
        flash(`Produto adicionado · ${code}`);
        return true;
      }
      flash(`Código não encontrado · ${code}`, true);
      return false;
    } finally {
      dispatchInput($('productSearch'), '');
      try { $('productSearch')?.blur(); } catch(_) {}
      processing = false;
      reset();
    }
  }

  function stopCamera(){
    clearTimeout(cameraTimer);cameraTimer=null;
    if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
    document.getElementById('posBarcodeCamera')?.remove();
  }

  async function startCamera(){
    if(!navigator.mediaDevices?.getUserMedia){flash('Câmera não disponível neste aparelho.',true);return;}
    if(!('BarcodeDetector' in window)){
      flash('Leitura pela câmera não é suportada neste navegador. Use leitor Bluetooth/USB ou digite o código.',true);
      $('productSearch')?.focus();
      return;
    }
    stopCamera();
    const overlay=document.createElement('div');overlay.id='posBarcodeCamera';overlay.className='barcode-camera-overlay';
    overlay.innerHTML='<div class="barcode-camera-card"><div class="barcode-camera-head"><b>Ler código de barras</b><button type="button" data-pos-camera-close>✕</button></div><div class="barcode-camera-frame"><video autoplay playsinline muted style="width:100%;height:100%;object-fit:cover"></video><div class="barcode-scan-line"></div></div><p>Aponte a câmera para o código. O produto será adicionado automaticamente.</p><button type="button" class="barcode-cancel" data-pos-camera-close>Cancelar</button></div>';
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-pos-camera-close]').forEach(b=>b.addEventListener('click',stopCamera));
    try{
      const formats=await BarcodeDetector.getSupportedFormats().catch(()=>[]);
      const desired=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
      const usable=desired.filter(f=>formats.includes(f));
      const detector=new BarcodeDetector(usable.length?{formats:usable}:undefined);
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
      const video=overlay.querySelector('video');video.srcObject=cameraStream;await video.play();
      const tick=async()=>{
        if(!document.body.contains(overlay))return;
        try{
          const codes=await detector.detect(video);
          const value=codes?.[0]?.rawValue||'';
          if(value){
            const ok=await addByBarcode(value);
            if(ok){stopCamera();return;}
          }
        }catch(e){console.warn('POS barcode camera',e);}
        cameraTimer=setTimeout(tick,180);
      };
      tick();
    }catch(err){
      stopCamera();
      flash(err?.name==='NotAllowedError'?'Permita o acesso à câmera para ler o código.':'Não foi possível abrir a câmera.',true);
    }
  }

  document.addEventListener('keydown', e => {
    if(!posActive() || modalOpen() || e.ctrlKey || e.altKey || e.metaKey) return;
    const now = performance.now();
    const key = e.key;
    if(key === 'Enter'){
      if(buffer.length >= MIN_LENGTH){e.preventDefault();e.stopPropagation();addByBarcode(buffer);} else reset();
      return;
    }
    if(key.length !== 1 || !/[0-9A-Za-z\-_.]/.test(key)) return;
    if(lastKeyAt && now - lastKeyAt > MAX_GAP_MS) buffer = '';
    buffer += key;lastKeyAt = now;scheduleReset();
  }, true);

  function bindSearch(){
    const input = $('productSearch');
    if(input && input.dataset.hidScannerBound !== '1'){
      input.dataset.hidScannerBound = '1';
      input.addEventListener('keydown', e => {
        if(e.key !== 'Enter') return;
        const code = String(input.value || '').trim();
        if(code.length < MIN_LENGTH) return;
        e.preventDefault();e.stopPropagation();addByBarcode(code);
      }, true);
    }
    const btn=$('scanButton');
    if(btn && btn.dataset.posCameraBound!=='1'){
      btn.dataset.posCameraBound='1';
      btn.addEventListener('click',e=>{
        const isTouch=('ontouchstart' in window)||navigator.maxTouchPoints>0;
        if(isTouch && navigator.mediaDevices?.getUserMedia){e.preventDefault();e.stopImmediatePropagation();startCamera();}
      },true);
    }
  }

  window.TemAquiPosScanner={addByBarcode,startCamera,stopCamera};
  const obs = new MutationObserver(bindSearch);
  function boot(){bindSearch();obs.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
  window.addEventListener('pagehide',stopCamera);
})();
