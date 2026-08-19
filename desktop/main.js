const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) app.quit();

const DESKTOP_VERSION = '1.0.4';
const DESKTOP_APP_NAME = 'TemAquiGestao';
const DESKTOP_USER_AGENT = `Tem-Aqui-Gestao/${DESKTOP_VERSION}`;
const BASE_URL = 'https://tem-aqui-gestao.pages.dev/';
const APP_URL = `${BASE_URL}?desktop=1&desktop_build=${encodeURIComponent(DESKTOP_VERSION)}`;
const APP_ORIGIN = new URL(BASE_URL).origin;
const PARTITION = 'persist:tem-aqui-gestao-v104';

// Nome interno e identidade de rede ficam 100% ASCII para evitar que o Electron
// gere User-Agent corrompido (ex.: TemAquiGest�o/1.0.2), que faz o Supabase Auth
// falhar ao inserir auth.sessions.user_agent em banco UTF-8.
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
          const waitBackend=async()=>{for(let i=0;i<60;i++){if(window.GestaoBackend?.getSession&&window.GestaoBackend?.context)return true;await new Promise(r=>setTimeout(r,150));}return false;};
          if(!await waitBackend()) return;
          const currentSession=await window.GestaoBackend.getSession();
          if(!currentSession){
            const status=document.getElementById('centralStatus');
            if(status)status.textContent='Banco Central online. Entre com sua conta do Tem Aqui Gestão.';
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
    webPreferences: { partition: PARTITION, nodeIntegration: false, contextIsolation: true, sandbox: true, spellcheck: false }
  });

  win.webContents.setUserAgent(DESKTOP_USER_AGENT);
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  win.webContents.on('did-finish-load', () => { setTimeout(() => ensureDesktopContext(win), 700); });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try { if (new URL(url).origin === APP_ORIGIN) return { action: 'allow' }; } catch (_) {}
    shell.openExternal(url); return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try { if (new URL(url).origin === APP_ORIGIN) return; } catch (_) {}
    event.preventDefault(); shell.openExternal(url);
  });

  win.loadURL(APP_URL, { userAgent: DESKTOP_USER_AGENT, extraHeaders: 'Cache-Control: no-cache, no-store\nPragma: no-cache\nX-Tem-Aqui-Client: desktop-1.0.4\n' });
}

app.whenReady().then(async () => {
  const ses = session.fromPartition(PARTITION);
  await prepareSession(ses);
  installNetworkConnector(ses);

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (requestingOrigin !== APP_ORIGIN) return false;
    return ['media', 'notifications', 'fullscreen'].includes(permission);
  });

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = (() => { try { return new URL(details.requestingUrl || webContents.getURL()).origin; } catch (_) { return ''; } })();
    callback(origin === APP_ORIGIN && ['media', 'notifications', 'fullscreen'].includes(permission));
  });

  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
