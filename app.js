(() => {
'use strict';
const desktop=new URLSearchParams(location.search).get('desktop')==='1';
const scripts=['offline-store.js?v=1.0.0',desktop?'autonomous-desktop.js?v=1.0.0':'offline-sync.js?v=0.9.5','app-v094.js?v=1.0.0'];
for(const src of scripts){document.write(`<script src="${src}"><\/script>`);}
if(!desktop&&'serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./gestao-sw.js').catch(console.warn));}
})();
