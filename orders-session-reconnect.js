(() => {
  'use strict';

  const READY_KEY = 'tag-orders-session-ready-v108';
  let hadSession = false;
  let busy = false;

  async function hasSession(){
    try {
      const backend = window.GestaoBackend;
      if(!backend?.getSession) return false;
      const session = await backend.getSession();
      return !!session?.user;
    } catch (_) { return false; }
  }

  async function check(){
    if(busy) return;
    busy = true;
    try {
      const logged = await hasSession();

      if(!logged){
        hadSession = false;
        sessionStorage.removeItem(READY_KEY);
        return;
      }

      if(!hadSession){
        hadSession = true;
        if(sessionStorage.getItem(READY_KEY) !== '1'){
          sessionStorage.setItem(READY_KEY, '1');
          // O módulo de pedidos pode ter iniciado antes do login. Uma recarga
          // única garante que ele nasça já com a mesma sessão válida do Gestão.
          setTimeout(() => location.reload(), 120);
        }
      }
    } finally { busy = false; }
  }

  function boot(){
    check();
    setInterval(check, 1000);
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible') check();
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
