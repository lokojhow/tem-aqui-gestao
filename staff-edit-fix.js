(()=>{
'use strict';
const PERMS=['sell','products','stock','customers','credit','promotions','reports','cash','staff','settings'];
const LABEL={sell:'PDV e vendas',products:'Produtos',stock:'Estoque',customers:'Clientes / ficha',credit:'Fiado / recebimentos',promotions:'Promoções',reports:'Relatórios',cash:'Caixa',staff:'Funcionários',settings:'Configurações'};
const $=id=>document.getElementById(id);
function defaults(role){const p=Object.fromEntries(PERMS.map(k=>[k,false]));if(role==='manager')PERMS.filter(k=>k!=='staff').forEach(k=>p[k]=true);else if(role==='editor')['sell','products','stock','customers','credit','promotions','reports'].forEach(k=>p[k]=true);return p;}
function drawPermissions(values={}){const box=$('staffPermissions');if(!box)return;box.innerHTML=PERMS.map(k=>`<label class="permission-item"><input type="checkbox" data-staff-perm="${k}" ${values?.[k]?'checked':''}><span><b>${LABEL[k]}</b></span></label>`).join('');}
async function findMember(userId){const B=window.GestaoBackend;if(!B?.members)return null;const storeId=localStorage.getItem('tag-pref-store')||'';if(!storeId)return null;const list=await B.members(storeId);return (list||[]).find(m=>String(m.user_id||m.member_user_id||m.id)===String(userId))||null;}
async function openEdit(btn){const userId=btn.dataset.editStaff;let m=null;try{m=await findMember(userId);}catch(e){console.error('Falha ao carregar funcionário',e);}
 if(!m){alert('Não foi possível carregar os dados deste funcionário. Atualize a equipe e tente novamente.');return;}
 const dialog=$('staffDialog');if(!dialog)return;
 if($('staffDialogTitle'))$('staffDialogTitle').textContent='Editar funcionário';
 if($('staffMemberId'))$('staffMemberId').value=m.member_id||m.id||'';
 if($('staffUserId'))$('staffUserId').value=m.user_id||m.member_user_id||userId||'';
 if($('staffName'))$('staffName').value=m.full_name||m.display_name||m.name||'';
 if($('staffEmail')){$('staffEmail').value=m.email||'';$('staffEmail').readOnly=true;$('staffEmail').disabled=false;}
 if($('staffRole'))$('staffRole').value=m.member_role||m.role||'editor';
 if($('staffActive'))$('staffActive').checked=m.active!==false&&m.status!=='inactive';
 drawPermissions(m.permissions||defaults(m.member_role||m.role||'editor'));
 try{if(!dialog.open)dialog.showModal();}catch(e){console.error(e);}
}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-edit-staff]');if(!btn)return;e.preventDefault();e.stopImmediatePropagation();openEdit(btn);},true);
window.addEventListener('DOMContentLoaded',()=>{
 $('closeStaffDialog')?.addEventListener('click',()=>{try{$('staffDialog')?.close();}catch{}});
 $('applyRolePermissions')?.addEventListener('click',()=>drawPermissions(defaults($('staffRole')?.value||'editor')));
});
})();