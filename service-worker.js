const CACHE='tem-aqui-gestao-v0-9-5-orders1';
const CORE=['./','./index.html','./styles.css','./responsive.css','./product-uniform.css','./header-cleanup.css','./barcode-scanner.css','./storefront-manager.css','./foldable.css','./pwa-install.css','./pos-enhancements.js','./barcode-scanner.js','./storefront-manager.js','./foldable-layout.js','./pwa-install.js','./orders-module.js','./tem-aqui-pedido.ogg','./app.js','./manifest.json','./supabase-config.js','./gestao-backend.js','./logo-tem-aqui-gestao.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.pathname.endsWith('/styles.css')){
    e.respondWith(Promise.all([
      fetch(e.request,{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./responsive.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./product-uniform.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./header-cleanup.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./barcode-scanner.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./storefront-manager.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./foldable.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./pwa-install.css',self.location),{cache:'no-store'}).then(r=>r.text())
    ]).then(([base,responsive,uniform,cleanup,barcode,storefront,foldable,installCss])=>{
      const nr=new Response(base+'\n'+responsive+'\n'+uniform+'\n'+cleanup+'\n'+barcode+'\n'+storefront+'\n'+foldable+'\n'+installCss,{status:200,headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store'}});
      caches.open(CACHE).then(c=>c.put(e.request,nr.clone()));
      return nr;
    }).catch(()=>caches.match(e.request)));
    return;
  }
  if(u.pathname.endsWith('/app.js')){
    e.respondWith(Promise.all([
      fetch(e.request,{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./pos-enhancements.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./barcode-scanner.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./storefront-manager.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./foldable-layout.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./pwa-install.js',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./orders-module.js',self.location),{cache:'no-store'}).then(r=>r.text())
    ]).then(([base,enh,barcode,storefront,foldable,installJs,orders])=>{
      const nr=new Response(base+'\n'+enh+'\n'+barcode+'\n'+storefront+'\n'+foldable+'\n'+installJs+'\n'+orders,{status:200,headers:{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}});
      caches.open(CACHE).then(c=>c.put(e.request,nr.clone()));
      return nr;
    }).catch(()=>caches.match(e.request)));
    return;
  }
  if(e.request.mode==='navigate'||/\.(?:js|html|css)$/.test(u.pathname)){
    e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok)caches.open(CACHE).then(c=>c.put(e.request,r.clone()));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(n=>{if(n&&n.ok)caches.open(CACHE).then(c=>c.put(e.request,n.clone()));return n;})));
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch(_){try{data={body:event.data?.text()||''};}catch(__){}}
  const title=data.title||'Tem Aqui Gestão';
  const options={
    body:data.body||'Você recebeu uma nova atualização.',
    icon:'./icon-192.png',
    badge:'./icon-192.png',
    tag:data.tag||('tem-aqui-'+(data.order_id||Date.now())),
    renotify:true,
    vibrate:[0,180,90,260],
    data:{url:data.url||'./?route=orders',order_id:data.order_id||null}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const raw=event.notification?.data?.url||'./?route=orders';
  const url=new URL(raw,self.location.origin).href;
  event.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of list){
      if(new URL(c.url).origin===self.location.origin){await c.focus(); if('navigate' in c)await c.navigate(url); return;}
    }
    await self.clients.openWindow(url);
  })());
});
