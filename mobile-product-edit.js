(() => {
  'use strict';

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches;

  function openMobileEditor(){
    if(!isMobile()) return;
    document.body.classList.add('mobile-product-editing');
    requestAnimationFrame(() => {
      const editor = document.getElementById('productEditor');
      if(editor) editor.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }

  function closeMobileEditor(){
    if(!isMobile()) return;
    document.body.classList.remove('mobile-product-editing');
    requestAnimationFrame(() => {
      const list = document.getElementById('manageProductList');
      if(list) list.scrollIntoView({behavior:'smooth', block:'start'});
    });
  }

  document.addEventListener('click', event => {
    if(event.target.closest('[data-edit-product]')) {
      setTimeout(openMobileEditor, 0);
      return;
    }
    if(event.target.closest('[data-close-product]')) {
      setTimeout(closeMobileEditor, 0);
    }
  });

  window.addEventListener('resize', () => {
    if(!isMobile()) document.body.classList.remove('mobile-product-editing');
  }, {passive:true});
})();
