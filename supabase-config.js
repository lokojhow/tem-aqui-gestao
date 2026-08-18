/* Tem Aqui Gestão V0.9.1
   Usa o mesmo banco central do Tem Aqui.
   IMPORTANTE: nunca coloque service_role ou senha de administrador neste arquivo.
*/
window.TEM_AQUI_SUPABASE = window.TEM_AQUI_SUPABASE || {
  url: 'https://izbkcdimyfoxikpzefba.supabase.co',
  publishableKey: 'sb_publishable_tdAezNylaI1TubgCpDznnQ_3u6AtaiY'
};

/* Correções de interface carregadas separadamente para preservar o app principal. */
(() => {
  if (document.querySelector('script[data-tem-aqui-mobile-fixes]')) return;
  const script = document.createElement('script');
  script.src = 'mobile-ui-fixes.js?v=1';
  script.defer = true;
  script.dataset.temAquiMobileFixes = '1';
  document.head.appendChild(script);
})();
