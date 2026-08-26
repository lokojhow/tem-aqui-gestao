/* Tem Aqui Gestão — banco central compartilhado */
window.TEM_AQUI_SUPABASE = window.TEM_AQUI_SUPABASE || {
  url: 'https://izbkcdimyfoxikpzefba.supabase.co',
  publishableKey: 'sb_publishable_tdAezNylaI1TubgCpDznnQ_3u6AtaiY'
};

/* Extensões de interface carregadas separadamente para preservar o núcleo. */
(() => {
  const loadScript=(src,key)=>{if(document.querySelector(`script[data-${key}]`))return;const s=document.createElement('script');s.src=src;s.defer=true;s.dataset[key]='1';document.head.appendChild(s)};
  const loadCss=(href,key)=>{if(document.querySelector(`link[data-${key}]`))return;const l=document.createElement('link');l.rel='stylesheet';l.href=href;l.dataset[key]='1';document.head.appendChild(l)};
  loadScript('mobile-ui-fixes.js?v=2','temAquiMobileFixes');
  loadCss('customers-layout-fix.css?v=2','temAquiCustomersCss');
  loadScript('customers-credit-v2.js?v=2','temAquiCustomersCredit');
})();
