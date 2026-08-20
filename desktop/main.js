const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) app.quit();

const DESKTOP_VERSION = '1.0.9';
const DESKTOP_APP_NAME = 'TemAquiGestao';
const DESKTOP_USER_AGENT = `Tem-Aqui-Gestao/${DESKTOP_VERSION}`;
const LOCAL_APP = path.join(__dirname, '..', 'index.html');
const PARTITION = 'persist:tem-aqui-gestao-v109';
const SUPABASE_HOST = 'izbkcdimyfoxikpzefba.supabase.co';

app.setName(DESKTOP_APP_NAME);
app.userAgentFallback = DESKTOP_USER_AGENT;

async function prepareSession(ses) {
  try { await ses.clearCache(); } catch (_) {}
  try { await ses.clearStorageData({ storages: ['serviceworkers', 'cachestorage'] }); } catch (_) {}
  try { ses.setUserAgent(DESKTOP_USER_AGENT); } catch (_) {}
}

function installNetworkConnector(ses) {
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    requestHeaders['User-Agent'] = DESKTOP_USER_AGENT;
    requestHeaders['X-Tem-Aqui-Client'] = `desktop-${DESKTOP_VERSION}`;
    try {
      if (new URL(details.url).host === SUPABASE_HOST) {
        delete requestHeaders.Referer;
        delete requestHeaders.referer;
      }
    } catch (_) {}
    callback({ requestHeaders });
  });
}

async function ensureDesktopContext(win) {
  try {
    await win.webContents.executeJavaScript(`
      (async()=>{
        try {
          document.documentElement.dataset.desktopApp='1';
          window.__TEM_AQUI_DESKTOP__=true;
          window.__TEM_AQUI_DESKTOP_VERSION__='${DESKTOP_VERSION}';

          const ensureDesktopStyle=()=>{
            if(document.getElementById('desktopPdvFix109'))return;
            const style=document.createElement('style');
            style.id='desktopPdvFix109';
            style.textContent='html[data-desktop-app="1"] [data-view="pos"] .product-grid{grid-template-columns:repeat(5,minmax(0,1fr))!important;align-content:start!important;grid-auto-rows:auto!important}'+
              'html[data-desktop-app="1"] [data-view="pos"] .product-card{height:172px!important;min-height:172px!important;max-height:172px!important;overflow:hidden!important;padding:8px!important}'+
              'html[data-desktop-app="1"] [data-view="pos"] .product-icon,html[data-desktop-app="1"] [data-view="pos"] .product-visual{width:100%!important;height:84px!important;min-height:84px!important;max-height:84px!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:hidden!important;background:#fff!important;border-radius:8px!important}'+
              'html[data-desktop-app="1"] [data-view="pos"] .product-icon img,html[data-desktop-app="1"] [data-view="pos"] .product-visual img{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important}'+
              'html[data-desktop-app="1"] [data-view="pos"] .product-card b{font-size:10px!important;line-height:1.15!important;display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow:hidden!important;margin:5px 0 1px!important;width:100%!important}'+
              'html[data-desktop-app="1"] [data-view="pos"] .product-card small{font-size:8px!important;line-height:1.1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;width:100%!important}'+
              'html[data-desktop-app="1"] [data-view="pos"] .product-card strong{margin-top:auto!important;font-size:13px!important;color:#0759c7!important;display:block!important}'+
              '@media(max-width:1250px){html[data-desktop-app="1"] [data-view="pos"] .product-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important}}';
            document.head.appendChild(style);
          };

          const loadLocalScript=(id,src)=>new Promise(resolve=>{
            if(document.getElementById(id))return resolve(true);
            const s=document.createElement('script');s.id=id;s.src=src;s.async=false;
            s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.body.appendChild(s);
          });

          ensureDesktopStyle();
          await loadLocalScript('desktopDialogFix109','./dialog-safety-fix.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopPosEnhancements109','./pos-enhancements.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopOrdersSync109','./orders-desktop-sync.js?v=desktop-${DESKTOP_VERSION}');

          const waitBackend=async()=>{for(let i=0;i<60;i++){if(window.GestaoBackend?.getSession&&window.GestaoBackend?.context)return true;await new Promise(r=>setTimeout(r,150));}return false;};
          if(!await waitBackend()){
            const status=document.getElementById('centralStatus');
            if(status)status.textContent='Não foi possível carregar o conector do Banco Central. Verifique sua internet.';
            return;
          }
          const currentSession=await window.GestaoBackend.getSession();
          if(!currentSession){
            const status=document.getElementById('centralStatus');
            if(status)status.textContent='Banco Central disponível. Entre com sua conta do Tem Aqui.';
            const d=document.getElementById('centralLoginDialog');
            if(d&&!d.open)d.showModal();
            return;
          }
          const preferred=localStorage.getItem('tag-pref-store')||'';
          const ctx=await window.GestaoBackend.context(preferred);
          if(ctx?.store?.id){
            localStorage.setItem('tag-pref-store',ctx.store.id);
            const sync=document.getElementById('centralSyncButton');
            if(sync)setTimeout(()=>sync.click(),250);
            setTimeout(()=>{
              ensureDesktopStyle();
              document.getElementById('marketplaceOrdersRoute')?.removeAttribute('hidden');
            },1000);
          }else{
            const status=document.getElementById('centralStatus');
            if(status)status.textContent='Esta conta não possui uma loja autorizada no Tem Aqui Gestão.';
          }
        }catch(e){console.warn('Desktop connector:',e);}
      })();
    `, true);
  } catch (e) { console.warn('Falha ao preparar connector do desktop:', e); }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f4f7fb',
    icon: path.join(__dirname, '..', 'icon-512.png'),
    webPreferences: {
      partition: PARTITION,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false
    }
  });

  win.webContents.setUserAgent(DESKTOP_USER_AGENT);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.on('did-finish-load', () => { setTimeout(() => ensureDesktopContext(win), 500); });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('file://')) return { action: 'allow' };
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('file://')) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  win.loadFile(LOCAL_APP, { query: { desktop: '1', desktop_build: DESKTOP_VERSION } });
}

app.whenReady().then(async () => {
  const ses = session.fromPartition(PARTITION);
  await prepareSession(ses);
  installNetworkConnector(ses);

  ses.setPermissionCheckHandler((webContents, permission) => {
    const url = webContents?.getURL?.() || '';
    return url.startsWith('file://') && ['media', 'notifications', 'fullscreen'].includes(permission);
  });

  ses.setPermissionRequestHandler((webContents, permission, callback) => {
    const url = webContents?.getURL?.() || '';
    callback(url.startsWith('file://') && ['media', 'notifications', 'fullscreen'].includes(permission));
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
