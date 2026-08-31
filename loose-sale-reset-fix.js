(()=>{'use strict';
function resetLooseDialog(){
  const d=document.getElementById('looseDialog');
  const f=document.getElementById('looseForm');
  if(f){
    try{f.reset()}catch(_e){}
    [...f.querySelectorAll('input,select,textarea,button')].forEach(el=>{
      if(el.id!=='saveLooseButton' || true){el.disabled=false;el.removeAttribute('readonly');el.removeAttribute('aria-disabled');}
    });
  }
  const name=document.getElementById('looseName'),qty=document.getElementById('looseQty'),price=document.getElementById('loosePrice');
  if(name){name.value='';name.disabled=false;name.readOnly=false;}
  if(qty){qty.value='1';qty.disabled=false;qty.readOnly=false;}
  if(price){price.value='';price.disabled=false;price.readOnly=false;}
  if(d){d.removeAttribute('aria-busy');d.classList.remove('busy','loading','saving');}
}
function focusLoose(){setTimeout(()=>{const x=document.getElementById('looseName');if(x&&!x.disabled&&!x.readOnly){try{x.focus();x.select()}catch(_e){}}},60)}
function install(){
  const d=document.getElementById('looseDialog'); if(!d||d.dataset.resetFix==='1')return; d.dataset.resetFix='1';
  d.addEventListener('close',resetLooseDialog);
  d.addEventListener('cancel',()=>setTimeout(resetLooseDialog,0));
  d.addEventListener('toggle',()=>{if(d.open){resetLooseDialog();focusLoose();}});
  const add=document.getElementById('addLooseButton');
  add?.addEventListener('click',()=>{resetLooseDialog();focusLoose();},true);
  const save=document.getElementById('saveLooseButton');
  save?.addEventListener('click',()=>{setTimeout(()=>{if(!d.open)resetLooseDialog();},100)},false);
}
window.addEventListener('load',()=>{install();setInterval(install,1000)});
})();