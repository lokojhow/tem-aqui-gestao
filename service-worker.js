const CACHE='tem-aqui-gestao-mobile-product-edit-v2';
const CORE=['./','./index.html','./styles.css','./responsive.css','./product-uniform.css','./header-cleanup.css','./barcode-scanner.css','./storefront-manager.css','./foldable.css','./pwa-install.css','./mobile-product-edit.css','./pos-enhancements.js','./barcode-scanner.js','./mobile-ui-fixes.js','./dialog-safety-fix.js','./storefront-manager.js','./foldable-layout.js','./pwa-install.js','./orders-module.js','./orders-permission-ui.js','./orders-deeplink.js','./mobile-product-edit.js','./share-universal.js','./sound1.txt','./app.js','./manifest.json','./supabase-config.js','./gestao-backend.js','./logo-tem-aqui-gestao.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

function base64AudioResponse(text){
  const b64=String(text||'').replace(/\s+/g,'');
  const raw=atob(b64);
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  return new Response(bytes,{status:200,headers:{'Content-Type':'audio/ogg','Cache-Control':'public,max-age=31536000,immutable'}});
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.pathname.endsWith('/tem-aqui-pedido.ogg')){
    e.respondWith(fetch(new URL('./sound1.txt',self.location),{cache:'no-store'}).then(r=>r.text()).then(base64AudioResponse).catch(async()=>{
      const cached=await caches.match('./sound1.txt');
      return cached?base64AudioResponse(await cached.text()):new Response('',{status:404});
    }));
    return;
  }
  if(u.pathname.endsWith('/styles.css')){
    e.respondWith(Promise.all([
      fetch(e.request,{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./responsive.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./product-uniform.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./header-cleanup.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./barcode-scanner.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./storefront-manager.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./foldable.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./pwa-install.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./mobile-product-edit.css',self.location),{cache:'no-store'}).then(r=>r.text())
    ]).then(([base,responsive,uniform,cleanup,barcode,storefront,foldable,installCss,productEditCss])=>{
      const nr=new Response(base+'\n'+responsive+'\n'+uniform+'\n'+cleanup+'\n'+barcode+'\n'+storefront+'\n'+foldable+'\n'+installCss+'\n'+productEditCss,{status:200,headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store'}});
      caches.open(CACHE).then(c=>c.put(e.request,nr.clone()));return nr;
    }).catch(()=>caches.match(e.request)));return;
  }
  if(u.pathname.endsWith('/app.js')){
    e.respondWith(Promise.all([
      fetch(e.request,{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./pos-enhancements.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./barcode-scanner.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./mobile-ui-fixes.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./dialog-safety-fix.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./storefront-manager.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./foldable-layout.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./pwa-install.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./orders-module.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./orders-permission-ui.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./orders-deeplink.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./mobile-product-edit.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./share-universal.js',self.location),{cache:'no-store'}).then(r=>r.text())
    ]).then(([base,enh,barcode,mobileFixes,dialogFixes,storefront,foldable,installJs,orders,orderPerms,deepLink,productEdit,shareUniversal])=>{
      const nr=new Response(base+'\n'+enh+'\n'+barcode+'\n'+mobileFixes+'\n'+dialogFixes+'\n'+storefront+'\n'+foldable+'\n'+installJs+'\n'+orders+'\n'+orderPerms+'\n'+deepLink+'\n'+productEdit+'\n'+shareUniversal,{status:200,headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}});
      caches.open(CACHE).then(c=>c.put(e.request,nr.clone()));return nr;
    }).catch(()=>caches.match(e.request)));return;
  }
  if(e.request.mode==='navigate'||/\.(?:js|html|css)$/.test(u.pathname)){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n&&n.ok)caches.open(CACHE).then(c=>c.put(e.request,n.clone()));return n;})));
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch(_){try{data={body:event.data?.text()||''};}catch(__){}}
  let orderId=data.order_id||null;
  if(!orderId&&data.url){try{orderId=new URL(data.url,self.location.origin).searchParams.get('order');}catch(_){}}
  const target=orderId?`./?route=orders&order=${encodeURIComponent(orderId)}`:'./?route=orders';
  const title=data.title||'Tem Aqui Gestão';
  const options={body:data.body||'Você recebeu uma nova atualização.',icon:'./icon-192.png',badge:'./icon-192.png',tag:data.tag||('tem-aqui-'+(orderId||Date.now())),renotify:true,vibrate:[0,180,90,260],data:{url:target,order_id:orderId}};
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const raw=event.notification?.data?.url||'./?route=orders';
  const url=new URL(raw,self.location.origin).href;
  event.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of list){if(new URL(c.url).origin===self.location.origin){await c.focus();if('navigate'in c)await c.navigate(url);return;}}
    await self.clients.openWindow(url);
  })());
});