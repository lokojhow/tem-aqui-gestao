const CACHE='tem-aqui-gestao-v1-0-15-mobile-unlock';
const CORE=['./','./index.html','./styles.css','./responsive.css','./product-uniform.css','./header-cleanup.css','./barcode-scanner.css','./storefront-manager.css','./foldable.css','./pwa-install.css','./mobile-bootstrap.js','./mobile-session-rescue.js','./pos-enhancements.js','./barcode-scanner.js','./mobile-ui-fixes.js','./dialog-safety-fix.js','./storefront-manager.js','./foldable-layout.js','./pwa-install.js','./orders-module.js','./orders-permission-ui.js','./orders-deeplink.js','./sound1.txt','./app.js','./manifest.json','./supabase-config.js','./gestao-backend.js','./logo-tem-aqui-gestao.png','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));

function base64AudioResponse(text){const b64=String(text||'').replace(/\s+/g,'');const raw=atob(b64);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return new Response(bytes,{status:200,headers:{'Content-Type':'audio/ogg','Cache-Control':'public,max-age=31536000,immutable'}});}
async function networkFirst(request,fallback){try{const response=await fetch(request,{cache:'no-store'});if(response&&response.ok)caches.open(CACHE).then(c=>c.put(request,response.clone()));return response;}catch(_){return (await caches.match(request))||(fallback?await caches.match(fallback):null)||new Response('',{status:503});}}

async function navigationResponse(request){
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(!response.ok)return response;
    let html=await response.text();
    if(!html.includes('mobile-bootstrap.js')) html=html.replace('</body>','<script src="mobile-bootstrap.js?v=1.0.15-mobile-unlock"></script>\n</body>');
    const out=new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate'}});
    caches.open(CACHE).then(c=>c.put('./index.html',out.clone()));
    return out;
  }catch(_){
    const cached=await caches.match('./index.html');
    if(!cached)return new Response('',{status:503});
    let html=await cached.text();
    if(!html.includes('mobile-bootstrap.js')) html=html.replace('</body>','<script src="mobile-bootstrap.js?v=1.0.15-mobile-unlock"></script>\n</body>');
    return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.pathname.endsWith('/tem-aqui-pedido.ogg')){
    event.respondWith(fetch(new URL('./sound1.txt',self.location),{cache:'no-store'}).then(r=>r.text()).then(base64AudioResponse).catch(async()=>{const cached=await caches.match('./sound1.txt');return cached?base64AudioResponse(await cached.text()):new Response('',{status:404});}));return;
  }
  if(event.request.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')){event.respondWith(navigationResponse(event.request));return;}
  if(/\.(?:js|css|html)$/.test(url.pathname)){event.respondWith(networkFirst(event.request));return;}
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response&&response.ok)caches.open(CACHE).then(c=>c.put(event.request,response.clone()));return response;})));
});

self.addEventListener('push',event=>{let data={};try{data=event.data?event.data.json():{};}catch(_){try{data={body:event.data?.text()||''};}catch(__){}}let orderId=data.order_id||null;if(!orderId&&data.url){try{orderId=new URL(data.url,self.location.origin).searchParams.get('order');}catch(_){}}const target=orderId?`./?route=orders&order=${encodeURIComponent(orderId)}`:'./?route=orders';event.waitUntil(self.registration.showNotification(data.title||'Tem Aqui Gestão',{body:data.body||'Você recebeu uma nova atualização.',icon:'./icon-192.png',badge:'./icon-192.png',tag:data.tag||('tem-aqui-'+(orderId||Date.now())),renotify:true,vibrate:[0,180,90,260],data:{url:target,order_id:orderId}}));});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=new URL(event.notification?.data?.url||'./?route=orders',self.location.origin).href;event.waitUntil((async()=>{const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of list){if(new URL(client.url).origin===self.location.origin){await client.focus();if('navigate'in client)await client.navigate(url);return;}}await self.clients.openWindow(url);})());});
