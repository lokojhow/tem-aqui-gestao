(() => {
  'use strict';
  let busy=false;
  async function ensure(){
    const box=document.getElementById('staffPermissions');
    if(!box||box.querySelector('[data-staff-perm="orders"]')||busy)return;
    busy=true;
    try{
      let checked=true;
      const uid=document.getElementById('staffId')?.value||'';
      const storeId=localStorage.getItem('tag-pref-store')||'';
      if(uid&&storeId&&window.GestaoBackend?.members){
        try{
          const members=await window.GestaoBackend.members(storeId);
          const member=(members||[]).find(m=>String(m.user_id)===String(uid));
          if(member?.permissions && Object.prototype.hasOwnProperty.call(member.permissions,'orders')) checked=member.permissions.orders===true;
        }catch(e){console.warn('Pedidos: permissão da equipe',e);}
      } else {
        checked=(document.getElementById('staffRole')?.value||'editor')==='manager' || true;
      }
      const label=document.createElement('label');
      label.className='permission-item';
      label.innerHTML=`<input type="checkbox" data-staff-perm="orders" ${checked?'checked':''}><span><b>Pedidos do Tem Aqui</b></span>`;
      box.prepend(label);
    }finally{busy=false;}
  }
  const observer=new MutationObserver(()=>setTimeout(ensure,0));
  function start(){
    const box=document.getElementById('staffPermissions');
    if(box)observer.observe(box,{childList:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target.closest('[data-edit-staff],#newStaffButton,#applyRolePermissions'))setTimeout(ensure,50);});
    document.getElementById('staffRole')?.addEventListener('change',()=>setTimeout(ensure,50));
    ensure();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
