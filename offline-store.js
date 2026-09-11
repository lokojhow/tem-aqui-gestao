(() => {
'use strict';
const DB_NAME='tem-aqui-gestao-offline';
const DB_VERSION=1;
let dbp=null;
function open(){if(dbp)return dbp;dbp=new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{const db=r.result;if(!db.objectStoreNames.contains('snapshots'))db.createObjectStore('snapshots',{keyPath:'key'});if(!db.objectStoreNames.contains('queue')){const q=db.createObjectStore('queue',{keyPath:'id'});q.createIndex('createdAt','createdAt',{unique:false});}if(!db.objectStoreNames.contains('meta'))db.createObjectStore('meta',{keyPath:'key'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return dbp;}
async function put(store,value){const db=await open();return await new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).put(value);t.oncomplete=()=>resolve(value);t.onerror=()=>reject(t.error);});}
async function get(store,key){const db=await open();return await new Promise((resolve,reject)=>{const t=db.transaction(store,'readonly');const r=t.objectStore(store).get(key);r.onsuccess=()=>resolve(r.result?.value??r.result??null);r.onerror=()=>reject(r.error);});}
async function del(store,key){const db=await open();return await new Promise((resolve,reject)=>{const t=db.transaction(store,'readwrite');t.objectStore(store).delete(key);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}
async function all(store){const db=await open();return await new Promise((resolve,reject)=>{const t=db.transaction(store,'readonly');const r=t.objectStore(store).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
const k=(type,storeId)=>`${type}:${storeId||'global'}`;
async function save(type,storeId,value){return put('snapshots',{key:k(type,storeId),value,updatedAt:new Date().toISOString()});}
async function load(type,storeId,fallback=null){const v=await get('snapshots',k(type,storeId));return v==null?fallback:v;}
async function enqueue(op,storeId,args){const id=crypto.randomUUID();await put('queue',{id,op,storeId,args:Array.from(args||[]),createdAt:new Date().toISOString(),attempts:0});return id;}
async function pending(){return (await all('queue')).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));}
window.GestaoOfflineStore={open,put,get,del,all,save,load,enqueue,pending};
})();
