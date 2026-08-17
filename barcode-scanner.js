(() => {
  'use strict';

  const LABEL_RE = /c[oó]digo\s*de\s*barras?/i;
  let activeStream = null;
  let scanTimer = null;

  function findBarcodeInput(root=document){
    const labels=[...root.querySelectorAll('label')];
    for(const label of labels){
      if(LABEL_RE.test(label.textContent||'')){
        const input=label.querySelector('input') || (label.htmlFor ? document.getElementById(label.htmlFor) : null);
        if(input) return {label,input};
      }
    }
    const candidates=[...root.querySelectorAll('input')];
    const input=candidates.find(i=>/barcode|codigo.?de.?barra|c[oó]digo.?de.?barra/i.test(`${i.id} ${i.name} ${i.placeholder} ${i.getAttribute('aria-label')||''}`));
    if(input) return {label:input.closest('label'),input};
    return null;
  }

  function stopCamera(){
    if(scanTimer){clearTimeout(scanTimer);scanTimer=null;}
    if(activeStream){activeStream.getTracks().forEach(t=>t.stop());activeStream=null;}
    document.getElementById('barcodeCameraDialog')?.remove();
  }

  function setValue(input,value){
    const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
    if(setter) setter.call(input,String(value)); else input.value=String(value);
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    input.focus();
  }

  async function startCamera(input){
    if(!navigator.mediaDevices?.getUserMedia){alert('A câmera não está disponível neste navegador.');return;}
    if(!('BarcodeDetector' in window)){
      alert('Este navegador não oferece leitura automática de código de barras pela câmera. Use o Chrome atualizado no celular, digite manualmente ou use o leitor USB/Bluetooth.');
      return;
    }
    stopCamera();
    const dialog=document.createElement('div');
    dialog.id='barcodeCameraDialog';
    dialog.className='barcode-camera-overlay';
    dialog.innerHTML=`<div class="barcode-camera-card"><div class="barcode-camera-head"><b>Escanear código de barras</b><button type="button" data-close-barcode>✕</button></div><div class="barcode-camera-frame"><video autoplay playsinline muted></video><div class="barcode-scan-line"></div></div><p>Aponte a câmera para o código de barras do produto.</p><button type="button" class="barcode-cancel" data-close-barcode>Cancelar</button></div>`;
    document.body.appendChild(dialog);
    dialog.querySelectorAll('[data-close-barcode]').forEach(b=>b.addEventListener('click',stopCamera));
    try{
      const formats=await BarcodeDetector.getSupportedFormats().catch(()=>[]);
      const desired=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
      const usable=desired.filter(f=>formats.includes(f));
      const detector=new BarcodeDetector(usable.length?{formats:usable}:undefined);
      activeStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
      const video=dialog.querySelector('video');
      video.srcObject=activeStream;
      await video.play();
      const tick=async()=>{
        if(!document.body.contains(dialog)) return;
        try{
          const codes=await detector.detect(video);
          if(codes?.length){
            const value=codes[0].rawValue||'';
            if(value){setValue(input,value);stopCamera();return;}
          }
        }catch(e){console.warn('barcode detect',e);}
        scanTimer=setTimeout(tick,180);
      };
      tick();
    }catch(err){
      console.error(err);
      stopCamera();
      alert(err?.name==='NotAllowedError'?'Permita o acesso à câmera para escanear o código de barras.':'Não foi possível abrir a câmera.');
    }
  }

  function enhance(){
    const found=findBarcodeInput(document.getElementById('productEditor')||document);
    if(!found) return;
    const {label,input}=found;
    if(input.dataset.barcodeEnhanced==='1') return;
    input.dataset.barcodeEnhanced='1';
    input.setAttribute('inputmode','numeric');
    input.setAttribute('autocomplete','off');
    input.title='Digite manualmente, use leitor USB/Bluetooth ou escaneie pela câmera';

    const host=label || input.parentElement;
    if(!host) return;
    host.classList.add('barcode-field-enhanced');
    const actions=document.createElement('div');
    actions.className='barcode-actions';
    actions.innerHTML=`<button type="button" class="barcode-focus-btn" title="Usar leitor USB/Bluetooth">▥ Leitor</button><button type="button" class="barcode-camera-btn">📷 Escanear</button><small>Manual • USB/Bluetooth • Câmera</small>`;
    host.appendChild(actions);
    actions.querySelector('.barcode-focus-btn').addEventListener('click',()=>{input.focus();input.select?.();});
    actions.querySelector('.barcode-camera-btn').addEventListener('click',()=>startCamera(input));
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        input.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
  }

  const observer=new MutationObserver(()=>enhance());
  function boot(){enhance();observer.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
  window.addEventListener('pagehide',stopCamera);
})();
