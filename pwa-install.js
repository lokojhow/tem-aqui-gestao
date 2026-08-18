;(() => {
'use strict';
let deferredPrompt=null;
const installed=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
function ensureButton(){
  let b=document.getElementById('pwaInstallButton');
  if(b)return b;
  b=document.createElement('button');
  b.id='pwaInstallButton';
  b.className='pwa-install-button';
  b.type='button';
  b.innerHTML='<span aria-hidden="true">📲</span><span>Instalar aplicativo</span>';
  b.hidden=true;
  document.body.appendChild(b);
  b.addEventListener('click',async()=>{
    if(installed()){b.hidden=true;return;}
    if(deferredPrompt){
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice;}catch{}
      deferredPrompt=null;
      b.hidden=true;
      return;
    }
    const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
    alert(isIOS?'Para instalar: toque em Compartilhar e depois em “Adicionar à Tela de Início”.':'Para instalar, abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.');
  });
  return b;
}
function refresh(){const b=ensureButton();b.hidden=installed()||!deferredPrompt;}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;refresh();});
window.addEventListener('appinstalled',()=>{deferredPrompt=null;refresh();});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change',refresh);
function start(){ensureButton();refresh();setTimeout(refresh,1200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();