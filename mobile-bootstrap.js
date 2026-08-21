(() => {
  'use strict';

  if (location.protocol === 'file:') return;
  if (window.__TAG_MOBILE_BOOTSTRAP__) return;
  window.__TAG_MOBILE_BOOTSTRAP__ = true;

  const modules = [
    './pos-enhancements.js?v=1.0.14-mobile-safe',
    './barcode-scanner.js?v=1.0.14-mobile-safe',
    './mobile-ui-fixes.js?v=1.0.14-mobile-safe',
    './dialog-safety-fix.js?v=1.0.14-mobile-safe',
    './storefront-manager.js?v=1.0.14-mobile-safe',
    './foldable-layout.js?v=1.0.14-mobile-safe',
    './pwa-install.js?v=1.0.14-mobile-safe',
    './orders-module.js?v=1.0.14-mobile-safe',
    './orders-permission-ui.js?v=1.0.14-mobile-safe',
    './orders-deeplink.js?v=1.0.14-mobile-safe'
  ];

  function load(src) {
    return new Promise((resolve) => {
      const id = 'tag-mobile-' + src.split('/').pop().split('?')[0].replace(/\W+/g, '-');
      if (document.getElementById(id)) return resolve(true);
      const s = document.createElement('script');
      s.id = id;
      s.src = src;
      s.async = false;
      s.onload = () => resolve(true);
      s.onerror = () => { console.warn('Falha ao carregar módulo móvel:', src); resolve(false); };
      document.body.appendChild(s);
    });
  }

  async function boot() {
    for (const src of modules) await load(src);
    window.dispatchEvent(new CustomEvent('tem-aqui-mobile-ready'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
