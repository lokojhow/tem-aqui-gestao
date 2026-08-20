(() => {
  'use strict';

  // O Electron usa o index.html local (file://) e já possui seu próprio bootstrap.
  // Este arquivo é exclusivo do navegador/PWA para evitar carregamento duplicado.
  if (location.protocol === 'file:') return;
  if (window.__TAG_MOBILE_BOOTSTRAP__) return;
  window.__TAG_MOBILE_BOOTSTRAP__ = true;

  const modules = [
    './pos-enhancements.js?v=1.0.12-mobile',
    './barcode-scanner.js?v=1.0.12-mobile',
    './mobile-ui-fixes.js?v=1.0.12-mobile',
    './dialog-safety-fix.js?v=1.0.12-mobile',
    './storefront-manager.js?v=1.0.12-mobile',
    './foldable-layout.js?v=1.0.12-mobile',
    './pwa-install.js?v=1.0.12-mobile',
    './orders-module.js?v=1.0.12-mobile',
    './orders-permission-ui.js?v=1.0.12-mobile',
    './orders-deeplink.js?v=1.0.12-mobile',
    './pos-hid-scanner.js?v=1.0.12-mobile',
    './universal-runtime.js?v=1.0.12-mobile'
  ];

  function load(src) {
    return new Promise((resolve, reject) => {
      const id = 'tag-mobile-' + src.split('/').pop().split('?')[0].replace(/\W+/g, '-');
      if (document.getElementById(id)) return resolve();
      const s = document.createElement('script');
      s.id = id;
      s.src = src;
      s.async = false;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Falha ao carregar ' + src));
      document.body.appendChild(s);
    });
  }

  async function boot() {
    try {
      for (const src of modules) await load(src);
      window.dispatchEvent(new CustomEvent('tem-aqui-mobile-ready'));
    } catch (err) {
      console.error('Tem Aqui mobile bootstrap:', err);
      const el = document.getElementById('centralStatus');
      if (el) el.textContent = 'Falha ao carregar os módulos do celular. Atualize a página.';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
