const CACHE='tem-aqui-gestao-v0-9-4-responsive2';
const CORE=['./','./index.html','./styles.css','./responsive.css','./product-uniform.css','./app.js','./manifest.json','./supabase-config.js','./gestao-backend.js','./logo-tem-aqui-gestao.png','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.pathname.endsWith('/styles.css')){
    e.respondWith(Promise.all([
      fetch(e.request,{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./responsive.css',self.location),{cache:'no-store'}).then(r=>r.text()),
      fetch(new URL('./product-uniform.css',self.location),{cache:'no-store'}).then(r=>r.text())
    ]).then(([base,responsive,uniform])=>{
      const nr=new Response(base+'\n'+responsive+'\n'+uniform,{status:200,headers:{'Content-Type':'text/css; charset=utf-8','Cache-Control':'no-store'}});
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