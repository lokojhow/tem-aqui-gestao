(() => {
'use strict';
const scripts=['offline-store.js?v=0.9.5','offline-sync.js?v=0.9.5','app-v094.js?v=0.9.5'];
for(const src of scripts){document.write(`<script src="${src}"><\/script>`);}
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./gestao-sw.js').catch(console.warn));}
})();
