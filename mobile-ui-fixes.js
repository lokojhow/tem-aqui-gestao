(() => {
'use strict';

function loadCss(href){if(document.querySelector(`link[href^="${href}"]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;document.head.appendChild(l);}
loadCss('barcode-scanner.css?v=4');
loadCss('customers-layout-fix.css?v=2');

function enhanceCategoryDialog(){
 const d=document.getElementById('categoryDialog'),form=document.getElementById('categoryForm');if(!d||!form||d.dataset.uiFixed==='1')return;d.dataset.uiFixed='1';form.style.position='relative';
 if(!form.querySelector('.dialog-close-x')){const x=document.createElement('button');x.type='button';x.className='dialog-close-x';x.setAttribute('aria-label','Fechar');x.textContent='×';x.addEventListener('click',()=>d.close('cancel'));form.prepend(x);}
}
function ensureBackButtons(){
 document.querySelectorAll('.view:not([data-view="pos"]) .page-heading').forEach(head=>{if(head.querySelector('.page-back-button'))return;const b=document.createElement('button');b.type='button';b.className='page-back-button';b.innerHTML='← <span>Voltar</span>';b.addEventListener('click',()=>document.querySelector('[data-route="pos"]')?.click());head.prepend(b);});
}
function improveNewProduct(){const btn=document.getElementById('newProductButton');if(!btn||btn.dataset.mobileFixed==='1')return;btn.dataset.mobileFixed='1';btn.addEventListener('click',()=>setTimeout(()=>document.getElementById('productEditor')?.scrollIntoView({behavior:'smooth',block:'start'}),120));}
async function fileToDataUrl(file){const bitmap=await createImageBitmap(file);const max=900,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bitmap.width*scale));c.height=Math.max(1,Math.round(bitmap.height*scale));c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);return c.toDataURL('image/webp',0.78);}
function enhanceProductImage(){
 const editor=document.getElementById('productEditor'),image=document.getElementById('editProductImage');if(!editor||!image||image.dataset.uploadFixed==='1')return;image.dataset.uploadFixed='1';const label=image.closest('label');if(!label)return;label.classList.add('product-image-field');
 const box=document.createElement('div');box.className='product-image-tools';box.innerHTML='<div class="product-image-preview"><span>Sem imagem</span></div><label class="product-image-upload">📷 Escolher foto<input type="file" accept="image/*" capture="environment"></label><small>Você pode tirar uma foto ou escolher da galeria.</small>';label.appendChild(box);
 const preview=box.querySelector('.product-image-preview');const refresh=()=>{const v=image.value.trim();preview.innerHTML=v?`<img src="${v.replace(/"/g,'&quot;')}" alt="Prévia do produto">`:'<span>Sem imagem</span>';};refresh();image.addEventListener('input',refresh);box.querySelector('input[type="file"]').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;try{image.value=await fileToDataUrl(f);image.dispatchEvent(new Event('input',{bubbles:true}));}catch(err){console.error(err);alert('Não foi possível preparar esta imagem.');}});
}
function enhancePdvScanner(){
 const btn=document.getElementById('scanButton');if(!btn)return;btn.innerHTML='📷 Ler Código';btn.title='No celular abre a câmera; leitor Bluetooth/USB funciona sem tocar no campo';
}
const css=document.createElement('style');css.textContent=`.dialog-close-x{position:absolute;right:10px;top:8px;width:38px;height:38px;border:0;border-radius:50%;background:#eef2f6;font-size:26px;line-height:1;color:#344054;z-index:2}.page-back-button{border:0;background:#eef4fb;color:#0b5fc5;border-radius:9px;padding:9px 12px;font-weight:800;margin-right:10px}.product-image-tools{display:grid;gap:8px;margin-top:8px}.product-image-preview{height:150px;border:1px dashed #cfd9e5;border-radius:10px;display:grid;place-items:center;overflow:hidden;background:#fafcff;color:#8794a3}.product-image-preview img{width:100%;height:100%;object-fit:contain}.product-image-upload{display:flex!important;align-items:center;justify-content:center;background:#0b5fc5;color:#fff;border-radius:8px;padding:10px!important;font-weight:800}.product-image-upload input{display:none}.product-image-tools small{color:#718096}@media(max-width:900px){.page-heading{align-items:center!important;flex-wrap:wrap}.page-back-button{order:-2}.page-heading>div{flex:1;min-width:180px}.heading-actions{width:100%}.heading-actions button{flex:1}.management-grid{grid-template-columns:1fr!important}.management-list,.editor-card{min-height:auto!important}.editor-card{scroll-margin-top:16px}.editor-grid{grid-template-columns:1fr!important}}`;document.head.appendChild(css);

function enhance(){enhanceCategoryDialog();ensureBackButtons();improveNewProduct();enhanceProductImage();enhancePdvScanner();}
function boot(){enhance();const obs=new MutationObserver(enhance);obs.observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
