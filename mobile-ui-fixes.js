(() => {
  'use strict';

  function loadCss(href){
    if(document.querySelector(`link[href^="${href}"]`)) return;
    const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l);
  }
  loadCss('barcode-scanner.css?v=3');
  loadCss('customers-layout-fix.css?v=2');

  function closeDialog(id){
    const d=document.getElementById(id);
    if(d?.open) d.close('cancel');
  }

  function enhanceCategoryDialog(){
    const d=document.getElementById('categoryDialog');
    const form=document.getElementById('categoryForm');
    if(!d||!form||d.dataset.uiFixed==='1') return;
    d.dataset.uiFixed='1';
    form.style.position='relative';
    const x=document.createElement('button');
    x.type='button';x.className='dialog-close-x';x.setAttribute('aria-label','Fechar');x.textContent='×';
    x.addEventListener('click',()=>d.close('cancel'));
    form.prepend(x);
    const cancel=form.querySelector('.dialog-actions button[value="cancel"]');
    if(cancel){cancel.type='button';cancel.setAttribute('formnovalidate','');cancel.addEventListener('click',e=>{e.preventDefault();d.close('cancel');});}
    d.addEventListener('click',e=>{if(e.target===d)d.close('cancel');});
  }

  function ensureBackButtons(){
    document.querySelectorAll('.view:not([data-view="pos"]) .page-heading').forEach(head=>{
      if(head.querySelector('.page-back-button')) return;
      const b=document.createElement('button');
      b.type='button';b.className='page-back-button';b.innerHTML='← <span>Voltar</span>';
      b.addEventListener('click',()=>document.querySelector('[data-route="pos"]')?.click());
      head.prepend(b);
    });
  }

  function improveNewProduct(){
    const btn=document.getElementById('newProductButton');
    if(!btn||btn.dataset.mobileFixed==='1') return;
    btn.dataset.mobileFixed='1';
    btn.addEventListener('click',()=>setTimeout(()=>{
      const ed=document.getElementById('productEditor');
      ed?.scrollIntoView({behavior:'smooth',block:'start'});
    },120));
  }

  async function fileToDataUrl(file){
    const bitmap=await createImageBitmap(file);
    const max=900, scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
    const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));
    c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);
    return c.toDataURL('image/webp',0.78);
  }

  function enhanceProductImage(){
    const editor=document.getElementById('productEditor');
    const image=document.getElementById('editProductImage');
    if(!editor||!image||image.dataset.uploadFixed==='1') return;
    image.dataset.uploadFixed='1';
    const label=image.closest('label');if(!label)return;
    label.classList.add('product-image-field');
    const box=document.createElement('div');box.className='product-image-tools';
    box.innerHTML='<div class="product-image-preview"><span>Sem imagem</span></div><label class="product-image-upload">📷 Escolher foto<input type="file" accept="image/*" capture="environment"></label><small>Você pode tirar uma foto ou escolher da galeria. A URL continua disponível para uso manual.</small>';
    label.appendChild(box);
    const preview=box.querySelector('.product-image-preview');
    const refresh=()=>{const v=image.value.trim();preview.innerHTML=v?`<img src="${v.replace(/"/g,'&quot;')}" alt="Prévia do produto">`:'<span>Sem imagem</span>';};
    refresh();image.addEventListener('input',refresh);
    box.querySelector('input[type="file"]').addEventListener('change',async e=>{
      const f=e.target.files?.[0];if(!f)return;
      try{image.value=await fileToDataUrl(f);image.dispatchEvent(new Event('input',{bubbles:true}));}
      catch(err){console.error(err);alert('Não foi possível preparar esta imagem. Tente outra foto.');}
    });
  }

  let stream=null,timer=null;
  function stopTracks(){if(timer){clearTimeout(timer);timer=null;}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}}
  function stopScan(){stopTracks();document.getElementById('pdvCameraOverlay')?.remove();}

  async function makeDetector(){
    if(!('BarcodeDetector' in window)) return null;
    const formats=await BarcodeDetector.getSupportedFormats().catch(()=>[]);
    const wanted=['ean_13','ean_8','upc_a','upc_e','code_128','code_39','itf'];
    const use=wanted.filter(x=>formats.includes(x));
    return new BarcodeDetector(use.length?{formats:use}:undefined);
  }

  function applyBarcode(input,value){
    value=String(value||'').trim();if(!value)return false;
    input.value=value;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    input.dispatchEvent(new Event('change',{bubbles:true}));
    input.focus();
    return true;
  }

  async function scanPhoto(input,detector,overlay){
    const picker=document.createElement('input');
    picker.type='file';picker.accept='image/*';picker.capture='environment';picker.style.display='none';
    document.body.appendChild(picker);
    picker.addEventListener('change',async()=>{
      const file=picker.files?.[0];picker.remove();if(!file)return;
      const status=overlay?.querySelector('.camera-fallback-status');
      if(status)status.textContent='Lendo o código da foto…';
      try{
        const bmp=await createImageBitmap(file);
        const codes=await detector.detect(bmp);
        bmp.close?.();
        if(codes?.[0]?.rawValue){applyBarcode(input,codes[0].rawValue);stopScan();return;}
        if(status)status.textContent='Não consegui identificar o código. Tire outra foto, com o código inteiro e bem focado.';
      }catch(err){console.error(err);if(status)status.textContent='Não consegui ler essa foto. Tente novamente.';}
    },{once:true});
    picker.click();
  }

  function showCameraFallback(input,detector,overlay,reason='blocked'){
    stopTracks();
    if(!overlay||!document.body.contains(overlay))return;
    const frame=overlay.querySelector('.barcode-camera-frame');
    const text=reason==='blocked'?'O navegador não liberou a câmera ao vivo. Você pode usar a câmera do próprio celular para fotografar o código.':'Não foi possível iniciar a câmera ao vivo.';
    frame.innerHTML=`<div class="camera-permission-card"><div class="camera-permission-icon">📷</div><b>Câmera não liberada</b><p>${text}</p><button type="button" class="camera-native-btn">📷 Abrir câmera do celular</button><button type="button" class="camera-retry-btn">↻ Tentar câmera ao vivo novamente</button><small class="camera-fallback-status">A foto será usada somente para localizar o código de barras.</small></div>`;
    frame.querySelector('.camera-native-btn')?.addEventListener('click',()=>scanPhoto(input,detector,overlay));
    frame.querySelector('.camera-retry-btn')?.addEventListener('click',()=>startLiveCamera(input,detector,overlay));
  }

  async function startLiveCamera(input,detector,overlay){
    stopTracks();
    if(!navigator.mediaDevices?.getUserMedia){showCameraFallback(input,detector,overlay,'unavailable');return;}
    const frame=overlay.querySelector('.barcode-camera-frame');
    frame.innerHTML='<video autoplay playsinline muted></video><div class="barcode-scan-line"></div><div class="camera-loading">Abrindo câmera…</div>';
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
      const v=frame.querySelector('video');v.srcObject=stream;await v.play();frame.querySelector('.camera-loading')?.remove();
      const tick=async()=>{
        if(!document.body.contains(overlay))return;
        try{const codes=await detector.detect(v);if(codes?.[0]?.rawValue){applyBarcode(input,codes[0].rawValue);stopScan();return;}}catch(e){console.warn(e);}
        timer=setTimeout(tick,180);
      };
      tick();
    }catch(e){
      console.error('camera ao vivo',e);
      showCameraFallback(input,detector,overlay,e?.name==='NotAllowedError'?'blocked':'unavailable');
    }
  }

  async function scanTo(input){
    const detector=await makeDetector();
    if(!detector){
      alert('Este navegador não possui leitor automático de código de barras. Abra o Tem Aqui Gestão no Chrome atualizado.');
      return;
    }
    stopScan();
    const o=document.createElement('div');o.id='pdvCameraOverlay';o.className='barcode-camera-overlay';
    o.innerHTML='<div class="barcode-camera-card"><div class="barcode-camera-head"><b>Ler código do produto</b><button type="button" class="camera-close">✕</button></div><div class="barcode-camera-frame"><div class="camera-loading">Preparando câmera…</div></div><p>Aponte a câmera para o código de barras.</p><button type="button" class="barcode-cancel">Cancelar</button></div>';
    document.body.appendChild(o);
    o.querySelector('.camera-close')?.addEventListener('click',stopScan);
    o.querySelector('.barcode-cancel')?.addEventListener('click',stopScan);
    await startLiveCamera(input,detector,o);
  }

  function enhancePdvScanner(){
    const input=document.getElementById('productSearch');const btn=document.getElementById('scanButton');if(!input||!btn||btn.dataset.cameraFixed==='1')return;
    btn.dataset.cameraFixed='1';btn.innerHTML='📷 Ler Código pela Câmera';
    btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();scanTo(input);},true);
  }

  const css=document.createElement('style');css.textContent=`
    .dialog-close-x{position:absolute;right:10px;top:8px;width:38px;height:38px;border:0;border-radius:50%;background:#eef2f6;font-size:26px;line-height:1;color:#344054;z-index:2}
    .page-back-button{border:0;background:#eef4fb;color:#0b5fc5;border-radius:9px;padding:9px 12px;font-weight:800;margin-right:10px}
    .product-image-tools{display:grid;gap:8px;margin-top:8px}.product-image-preview{height:150px;border:1px dashed #cfd9e5;border-radius:10px;display:grid;place-items:center;overflow:hidden;background:#fafcff;color:#8794a3}.product-image-preview img{width:100%;height:100%;object-fit:contain}.product-image-upload{display:flex!important;align-items:center;justify-content:center;background:#0b5fc5;color:#fff;border-radius:8px;padding:10px!important;font-weight:800}.product-image-upload input{display:none}.product-image-tools small{color:#718096}
    .camera-loading{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-weight:800;background:#111827}.camera-permission-card{width:100%;min-height:260px;padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:10px;background:#f8fafc;color:#172033}.camera-permission-icon{font-size:44px}.camera-permission-card b{font-size:18px}.camera-permission-card p{margin:0;max-width:360px;color:#667085;line-height:1.4}.camera-permission-card button{width:min(100%,340px);border:0;border-radius:10px;padding:13px 14px;font-weight:900}.camera-native-btn{background:#0b7a3d;color:#fff}.camera-retry-btn{background:#eaf2fb;color:#0b5fc5}.camera-permission-card small{color:#7b8794;max-width:340px;line-height:1.35}
    @media(max-width:900px){.page-heading{align-items:center!important;flex-wrap:wrap}.page-back-button{order:-2}.page-heading>div{flex:1;min-width:180px}.heading-actions{width:100%}.heading-actions button{flex:1}.management-grid{grid-template-columns:1fr!important}.management-list,.editor-card{min-height:auto!important}.editor-card{scroll-margin-top:16px}.editor-grid{grid-template-columns:1fr!important}}
  `;document.head.appendChild(css);

  function enhance(){enhanceCategoryDialog();ensureBackButtons();improveNewProduct();enhanceProductImage();enhancePdvScanner();}
  const obs=new MutationObserver(()=>enhance());
  function boot(){enhance();obs.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.addEventListener('pagehide',stopScan);
})();
