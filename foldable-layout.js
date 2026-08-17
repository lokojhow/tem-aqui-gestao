;(() => {
'use strict';
const root=document.documentElement;
let timer=0;
function coarse(){return !!window.matchMedia?.('(pointer: coarse)').matches;}
function mode(){
  const w=Math.round(window.visualViewport?.width||window.innerWidth||root.clientWidth||0);
  if(w<=599)return 'smartphone';
  if(w<=999&&coarse())return 'foldable';
  if(w<=1279)return 'tablet';
  return 'desktop';
}
function sync(){
  const w=Math.round(window.visualViewport?.width||window.innerWidth||root.clientWidth||0);
  const h=Math.round(window.visualViewport?.height||window.innerHeight||root.clientHeight||0);
  const m=mode();
  root.dataset.deviceLayout=m;
  root.style.setProperty('--device-vw',`${w}px`);
  root.style.setProperty('--device-vh',`${h}px`);
  window.dispatchEvent(new CustomEvent('tem-aqui-layout-mode',{detail:{mode:m,width:w,height:h}}));
}
function schedule(){clearTimeout(timer);timer=setTimeout(sync,50);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
window.addEventListener('resize',schedule,{passive:true});
window.addEventListener('orientationchange',schedule,{passive:true});
window.visualViewport?.addEventListener('resize',schedule,{passive:true});
})();