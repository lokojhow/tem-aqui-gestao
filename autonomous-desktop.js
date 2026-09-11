(() => {
'use strict';
if(new URLSearchParams(location.search).get('desktop')!=='1') return;
const Cloud=window.GestaoBackend;
const S=window.GestaoOfflineStore;
if(!Cloud||!S) return;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const now=()=>new Date().toISOString();
const uid=(p='local')=>`${p}-${crypto.randomUUID()}`;
const clone=v=>v==null?v:JSON.parse(JSON.stringify(v));
const load=(t,s,f)=>S.load(`autonomous:${t}`,s,f);
const save=(t,s,v)=>S.save(`autonomous:${t}`,s,v);
const metaGet=k=>S.get('meta',`autonomous:${k}`);
const metaSet=(k,v)=>S.put('meta',{key:`autonomous:${k}`,value:v,updatedAt:now()});
const cloudStore=id=>UUID.test(String(id||''));
let syncing=false;

async function hashPassword(password,saltB64=''){
  const enc=new TextEncoder();
  const salt=saltB64?Uint8Array.from(atob(saltB64),c=>c.charCodeAt(0)):crypto.getRandomValues(new Uint8Array(16));
  const key=await crypto.subtle.importKey('raw',enc.encode(String(password||'')),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt,iterations:180000,hash:'SHA-256'},key,256);
  const bytes=new Uint8Array(bits);
  return {salt:btoa(String.fromCharCode(...salt)),hash:btoa(String.fromCharCode(...bytes))};
}
async function verifyPassword(password,user){if(!user?.passwordHash||!user?.salt)return false;const h=await hashPassword(password,user.salt);return h.hash===user.passwordHash;}
async function users(){return await load('users','global',[]);}
async function saveUsers(v){return save('users','global',v);}
async function localSession(){return await load('session','global',null);}
async function setLocalSession(v){return save('session','global',v);}
async function stores(){return await load('stores','global',[]);}
async function saveStores(v){return save('stores','global',v);}
async function currentStore(preferred=''){const ss=await stores();return ss.find(x=>String(x.id)===String(preferred))||ss[0]||null;}
function ownerMembership(){return {isOwner:true,isAdmin:false,role:'owner',permissions:null};}
async function ensureOwner(email,password='',cloudUserId=''){
  const list=await users(); let u=list.find(x=>String(x.email).toLowerCase()===String(email||'').toLowerCase());
  if(!u){u={id:cloudUserId||uid('user'),email:String(email||'proprietario@local').toLowerCase(),name:'Proprietário',role:'owner',active:true,createdAt:now()};list.push(u);}
  if(password){const h=await hashPassword(password);u.salt=h.salt;u.passwordHash=h.hash;}
  if(cloudUserId&&!u.cloudUserId)u.cloudUserId=cloudUserId;
  await saveUsers(list);return u;
}
async function createStandalone(email,password){
  const u=await ensureOwner(email,password);
  let ss=await stores();
  if(!ss.length){const st={id:uid('store'),name:'Minha Empresa',slug:'minha-empresa',city:'',whatsapp:'',_role:'owner',_owner:true,_permissions:null,localOnly:true,created_at:now()};ss=[st];await saveStores(ss);await save('categories',st.id,[]);await save('products',st.id,[]);await save('customers',st.id,[]);await save('sales',st.id,[]);await save('promotions',st.id,[]);await save('inventory',st.id,[]);await save('members',st.id,[{user_id:u.id,email:u.email,display_name:u.name,role:'owner',status:'active'}]);}
  const session={user:{id:u.id,email:u.email},local:true,created_at:now()};await setLocalSession(session);return session;
}
async function importStore(st){
  const id=st.id;
  const done=await metaGet(`seeded:${id}`); if(done)return;
  const calls=[['products',()=>Cloud.products(id,{force:true})],['categories',()=>Cloud.categories(id,{force:true})],['customers',()=>Cloud.customers(id)],['sales',()=>Cloud.sales(id,1000)],['promotions',()=>Cloud.promotions(id)],['cash',()=>Cloud.openCashInfo(id)],['inventory',()=>Cloud.inventory(id,500)],['members',()=>Cloud.members(id)]];
  for(const [name,fn] of calls){try{const v=await fn();await save(name,id,v??(name==='cash'?null:[]));}catch(e){console.warn('Importação local',name,e);}}
  await metaSet(`seeded:${id}`,true);await metaSet(`seededAt:${id}`,now());
}
async function bootstrapCloud(password=''){
  try{
    const ctx=await Cloud.context(''); if(!ctx?.session?.user||!ctx?.stores?.length)return null;
    const email=ctx.session.user.email||'proprietario@local';
    const u=await ensureOwner(email,password,ctx.session.user.id);
    const existing=await stores();const map=new Map(existing.map(x=>[String(x.id),x]));
    for(const st of ctx.stores){map.set(String(st.id),{...map.get(String(st.id)),...clone(st),cloudId:st.id});}
    const ss=[...map.values()];await saveStores(ss);
    for(const st of ss.filter(x=>cloudStore(x.id)))await importStore(st);
    const session={user:{id:u.id,email:u.email,cloudUserId:ctx.session.user.id},local:true,cloudLinked:true,created_at:now()};await setLocalSession(session);return session;
  }catch(e){console.warn('Nuvem indisponível; usando banco local.',e);return null;}
}
async function getSession(){return await localSession()||await bootstrapCloud();}
async function signIn(email,password){
  const list=await users();const u=list.find(x=>String(x.email).toLowerCase()===String(email||'').toLowerCase()&&x.active!==false);
  if(u&&await verifyPassword(password,u)){const s={user:{id:u.id,email:u.email,cloudUserId:u.cloudUserId||null},local:true,cloudLinked:!!u.cloudUserId,created_at:now()};await setLocalSession(s);return s;}
  try{const cs=await Cloud.signIn(email,password);if(cs?.user){await bootstrapCloud(password);return await localSession();}}catch(e){if(list.length)throw new Error('Login local inválido e a nuvem está indisponível.');}
  if(!list.length){const ok=window.confirm('Este computador ainda não possui empresa local. Deseja criar agora uma instalação autônoma com este login?');if(ok)return createStandalone(email,password);}
  throw new Error('E-mail ou senha inválidos.');
}
async function signOut(){await setLocalSession(null);}
async function myStores(){return stores();}
async function context(preferred=''){
  let s=await localSession();if(!s)s=await bootstrapCloud();
  if(!s)return {session:null,stores:[],store:null};
  const ss=await stores(),st=ss.find(x=>String(x.id)===String(preferred))||ss[0]||null;
  return {session:s,stores:ss,store:st,membership:st?ownerMembership():null,autonomous:true};
}
async function getList(type,storeId){return clone(await load(type,storeId,[]));}
async function setList(type,storeId,v){await save(type,storeId,v);return v;}
async function queue(op,storeId,args){if(!cloudStore(storeId))return null;return S.enqueue(`cloud:${op}`,storeId,args);}
async function idMap(id){return await metaGet(`idmap:${id}`)||id;}
async function rewrite(v){if(Array.isArray(v))return Promise.all(v.map(rewrite));if(v&&typeof v==='object'){const o={};for(const [k,x] of Object.entries(v))o[k]=await rewrite(x);return o;}if(typeof v==='string'&&v.startsWith('local-'))return idMap(v);return v;}
async function syncCloudQueue(){
  if(syncing||!navigator.onLine)return;syncing=true;
  try{const all=await S.pending();for(const item of all.filter(x=>String(x.op).startsWith('cloud:'))){const op=String(item.op).slice(6);const fn=Cloud[op];if(typeof fn!=='function')continue;try{const args=await rewrite(item.args||[]);const result=await fn(...args);if(op==='saveProduct'&&item.args?.[1]?.id?.startsWith?.('local-')&&result?.id)await metaSet(`idmap:${item.args[1].id}`,result.id);if(op==='saveCustomer'&&item.args?.[1]?.id?.startsWith?.('local-')&&result)await metaSet(`idmap:${item.args[1].id}`,typeof result==='string'?result:result.id);if(op==='createCategory'&&item.args?.[1]?.startsWith?.('local-')&&result?.id)await metaSet(`idmap:${item.args[1]}`,result.id);await S.del('queue',item.id);}catch(e){item.attempts=Number(item.attempts||0)+1;item.lastError=String(e?.message||e);await S.put('queue',item);break;}}}finally{syncing=false;}
}
async function categories(storeId){return getList('categories',storeId);}
async function products(storeId){return getList('products',storeId);}
async function createCategory(storeId,name){const list=await categories(storeId);let c=list.find(x=>String(x.name).toLowerCase()===String(name).toLowerCase());if(!c){c={id:uid('local-cat'),name:String(name).trim(),slug:String(name).toLowerCase().replace(/[^a-z0-9]+/g,'-'),active:true,sort_order:list.length};list.push(c);await setList('categories',storeId,list);await queue('createCategory',storeId,[storeId,name]);}return c;}
async function renameCategory(storeId,oldName,name){const list=await categories(storeId),c=list.find(x=>x.name===oldName);if(c)c.name=name;await setList('categories',storeId,list);const pp=await products(storeId);pp.forEach(p=>{if(p.category===oldName)p.category=name;});await setList('products',storeId,pp);await queue('renameCategory',storeId,[storeId,oldName,name]);return c||null;}
async function saveProduct(storeId,p){const pp=await products(storeId);const cats=await categories(storeId);let cat=cats.find(x=>x.name===p.category);if(!cat)cat=await createCategory(storeId,p.category||'Outros');let x=pp.find(z=>String(z.id)===String(p.id));if(!x){x={id:p.id||uid('local-product')};pp.push(x);}Object.assign(x,{name:p.name||'Produto',category:cat.name,categoryId:cat.id,barcode:p.barcode||'',sku:p.sku||'',price:Number(p.price||0),cost:Number(p.cost||0),stock:Number(p.stock||0),minimumStock:Number(p.minimumStock||0),unit:p.unit||'un.',showcase:p.showcase!==false,active:p.active!==false,image:p.image||''});await setList('products',storeId,pp);await queue('saveProduct',storeId,[storeId,clone(x)]);return clone(x);}
async function adjustStock(productId,quantity,type='adjustment',note=''){const ss=await stores();for(const st of ss){const pp=await products(st.id);const p=pp.find(x=>String(x.id)===String(productId));if(!p)continue;const prev=Number(p.stock||0);p.stock=Math.max(0,prev+Number(quantity||0));await setList('products',st.id,pp);const inv=await getList('inventory',st.id);inv.unshift({id:uid('local-mov'),product_id:p.id,movement_type:type,quantity:Number(quantity||0),previous_stock:prev,new_stock:p.stock,note,created_at:now(),products:{name:p.name}});await setList('inventory',st.id,inv.slice(0,1000));await queue('adjustStock',st.id,[productId,Number(quantity),type,note]);return p.stock;}throw new Error('Produto não encontrado no banco local.');}
async function inventory(storeId,limit=300){return (await getList('inventory',storeId)).slice(0,limit);}
async function members(storeId){return getList('members',storeId);}
async function saveMember(storeId,m){const mm=await members(storeId);let x=mm.find(z=>String(z.email).toLowerCase()===String(m.email).toLowerCase());if(!x){x={user_id:uid('local-user'),email:m.email};mm.push(x);}Object.assign(x,{display_name:m.name||m.email,role:m.role||'employee',status:m.active===false?'inactive':'active',...(m.permissions||{})});await setList('members',storeId,mm);await queue('saveMember',storeId,[storeId,m]);return x.user_id;}
async function setMemberActive(storeId,userId,active){const mm=await members(storeId);const x=mm.find(z=>String(z.user_id)===String(userId));if(x)x.status=active?'active':'inactive';await setList('members',storeId,mm);await queue('setMemberActive',storeId,[storeId,userId,active]);return true;}
async function customers(storeId,search=''){const cc=await getList('customers',storeId);const t=String(search||'').toLowerCase();return !t?cc:cc.filter(c=>`${c.customer_name||c.name||''} ${c.whatsapp||''}`.toLowerCase().includes(t));}
async function saveCustomer(storeId,c){const cc=await getList('customers',storeId);let x=cc.find(z=>String(z.id)===String(c.id));if(!x){x={id:c.id||uid('local-customer'),current_debt:0,total_spent:0,last_purchase:null};cc.push(x);}Object.assign(x,{customer_name:c.name,whatsapp:c.whatsapp||'',credit_limit:Number(c.limit||0),notes:c.notes||''});await setList('customers',storeId,cc);await queue('saveCustomer',storeId,[storeId,{...c,id:x.id}]);return x.id;}
async function customerCredit(storeId,customerId){return (await getList('credit',storeId)).filter(x=>String(x.customer_id)===String(customerId));}
async function receivePayment(storeId,customerId,amount,note=''){const cc=await getList('customers',storeId),c=cc.find(x=>String(x.id)===String(customerId));if(!c)throw new Error('Cliente não encontrado.');c.current_debt=Math.max(0,Number(c.current_debt||0)-Number(amount||0));await setList('customers',storeId,cc);const mov=await getList('credit',storeId);mov.unshift({id:uid('local-credit'),customer_id:customerId,movement_type:'payment',amount:Number(amount),note:note||'Pagamento',created_at:now()});await setList('credit',storeId,mov);await queue('receivePayment',storeId,[storeId,customerId,amount,note]);return c.current_debt;}
async function openCash(storeId,opening=0,note=''){const x={id:uid('local-cash'),store_id:storeId,opening_amount:Number(opening),opened_at:now(),status:'open',notes:note||''};await save('cash',storeId,x);await queue('openCash',storeId,[storeId,opening,note]);return x.id;}
async function openCashInfo(storeId){return load('cash',storeId,null);}
async function closeCash(cashId,counted,note=''){const ss=await stores();for(const st of ss){const x=await openCashInfo(st.id);if(x&&String(x.id)===String(cashId)){x.status='closed';x.closed_at=now();x.counted_amount=Number(counted);x.close_notes=note||'';await save('cash-history',st.id,[x,...await getList('cash-history',st.id)]);await save('cash',st.id,null);await queue('closeCash',st.id,[cashId,counted,note]);return true;}}return false;}
async function cashReport(storeId,start,end){const rows=await getList('cash-history',storeId);return rows.filter(x=>(!start||x.opened_at>=start)&&(!end||x.opened_at<=end));}
async function finalizeSale(storeId,data){const pp=await products(storeId);for(const i of data.items||[]){if(!i.productId)continue;const p=pp.find(x=>String(x.id)===String(i.productId));if(!p)continue;if(Number(p.stock||0)<Number(i.qty||0))throw new Error(`Estoque insuficiente: ${p.name}`);p.stock=Number(p.stock||0)-Number(i.qty||0);}await setList('products',storeId,pp);const subtotal=(data.items||[]).reduce((a,i)=>a+Number(i.qty||0)*Number(i.price||0),0);const total=Math.max(0,subtotal-Number(data.discount||0)+Number(data.surcharge||0));const id=uid('local-sale');const sale={id,store_id:storeId,total,subtotal,discount:Number(data.discount||0),surcharge:Number(data.surcharge||0),payment_detail:data.payment,status:'completed',item_count:(data.items||[]).reduce((a,i)=>a+Number(i.qty||0),0),customer_id:data.customerId||null,created_at:now(),items:clone(data.items||[]),offline_local:true};const ss=await getList('sales',storeId);ss.unshift(sale);await setList('sales',storeId,ss);if(data.payment==='ficha'&&data.customerId){const cc=await getList('customers',storeId),c=cc.find(x=>String(x.id)===String(data.customerId));if(c){c.current_debt=Number(c.current_debt||0)+total;c.total_spent=Number(c.total_spent||0)+total;c.last_purchase=sale.created_at;await setList('customers',storeId,cc);const mov=await getList('credit',storeId);mov.unshift({id:uid('local-credit'),customer_id:c.id,movement_type:'purchase',amount:total,note:data.note||'Venda na ficha',created_at:sale.created_at,sale_id:id});await setList('credit',storeId,mov);}}await queue('finalizeSale',storeId,[storeId,{...clone(data),localOperationId:id}]);return id;}
async function sales(storeId,limit=500){return (await getList('sales',storeId)).slice(0,limit);}
async function saleItems(saleId){const ss=await stores();for(const st of ss){const s=(await getList('sales',st.id)).find(x=>String(x.id)===String(saleId));if(s)return (s.items||[]).map((x,i)=>({id:`${saleId}-${i}`,sale_id:saleId,product_id:x.productId||null,product_name:x.name,quantity:Number(x.qty||0),unit_price:Number(x.price||0),subtotal:Number(x.qty||0)*Number(x.price||0)}));}return [];}
async function promotions(storeId){return getList('promotions',storeId);}
async function savePromotion(storeId,p){const rows=await promotions(storeId);let x=rows.find(z=>String(z.campaign_key||z.id)===String(p.id));if(!x){x={id:p.id||uid('local-promo'),campaign_key:p.id||uid('local-campaign')};rows.push(x);}Object.assign(x,{title:p.name,discount_percent:Number(p.discountPercent||0),starts_at:p.startAt,ends_at:p.endAt,product_ids:p.productIds||[],publish:!!p.publish,active:p.active!==false});await setList('promotions',storeId,rows);await queue('savePromotion',storeId,[storeId,{...p,id:x.campaign_key}]);return x.campaign_key;}
async function setPromotionActive(storeId,id,active){const rows=await promotions(storeId),x=rows.find(z=>String(z.campaign_key||z.id)===String(id));if(x)x.active=!!active;await setList('promotions',storeId,rows);await queue('setPromotionActive',storeId,[storeId,id,active]);return true;}
function invalidateStore(){}
const Local={init:()=>true,isConfigured:()=>true,getSession,signIn,signOut,myStores,categories,products,createCategory,renameCategory,saveProduct,adjustStock,inventory,members,saveMember,setMemberActive,customers,saveCustomer,customerCredit,receivePayment,openCash,openCashInfo,closeCash,cashReport,finalizeSale,sales,saleItems,promotions,savePromotion,setPromotionActive,context,invalidateStore,syncCloud:syncCloudQueue,isAutonomous:true};
window.GestaoCloudBackend=Cloud;window.GestaoBackend=Local;window.GestaoAutonomous={sync:syncCloudQueue,bootstrapCloud};
window.addEventListener('online',()=>setTimeout(syncCloudQueue,1200));setInterval(()=>{if(navigator.onLine)syncCloudQueue();},30000);setTimeout(()=>{if(navigator.onLine)syncCloudQueue();},4000);
})();
