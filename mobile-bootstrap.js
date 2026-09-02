(() => {
  'use strict';

  if (location.protocol === 'file:') return;
  if (window.__TAG_MOBILE_BOOTSTRAP__) return;
  window.__TAG_MOBILE_BOOTSTRAP__ = true;

  const modules = [
    './mobile-session-rescue.js?v=1.0.17-order-detail',
    './pos-enhancements.js?v=1.0.17-order-detail',
    './barcode-scanner.js?v=1.0.17-order-detail',
    './mobile-ui-fixes.js?v=1.0.17-order-detail',
    './dialog-safety-fix.js?v=1.0.17-order-detail',
    './storefront-manager.js?v=1.0.17-order-detail',
    './foldable-layout.js?v=1.0.17-order-detail',
    './pwa-install.js?v=1.0.17-order-detail',
    './orders-module.js?v=1.0.17-order-detail',
    './orders-detail-fix.js?v=1.0.17-order-detail',
    './orders-permission-ui.js?v=1.0.17-order-detail',
    './orders-deeplink.js?v=1.0.17-order-detail',
    './orders-delivery-tracking.js?v=1.0.17-order-detail',
    './orders-logistics-enhancements.js?v=1.0.17-order-detail'
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
