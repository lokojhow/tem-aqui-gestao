const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) app.quit();

const APP_URL = 'https://tem-aqui-gestao.pages.dev/?desktop=1';
const APP_ORIGIN = new URL(APP_URL).origin;
const PARTITION = 'persist:tem-aqui-gestao';

async function ensureDesktopLogin(win) {
  try {
    await win.webContents.executeJavaScript(`
      (async()=>{
        try{
          const s = await window.GestaoBackend?.getSession?.();
          if (!s) {
            const d = document.getElementById('centralLoginDialog');
            if (d && !d.open) d.showModal();
            const status = document.getElementById('centralStatus');
            if (status) status.textContent = 'Entre com sua conta do Tem Aqui Gestão para carregar sua loja e produtos.';
          } else {
            const selected = localStorage.getItem('tag-pref-store') || '';
            if (window.GestaoBackend?.context) {
              const ctx = await window.GestaoBackend.context(selected);
              if (ctx?.store) localStorage.setItem('tag-pref-store', ctx.store.id);
            }
          }
        }catch(e){ console.warn('Desktop login check:',e); }
      })();
    `, true);
  } catch (e) {
    console.warn('Falha ao verificar login do desktop:', e);
  }
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

  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  win.webContents.on('did-finish-load', () => {
    setTimeout(() => ensureDesktopLogin(win), 500);
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.origin === APP_ORIGIN) return { action: 'allow' };
    } catch (_) {}
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    try {
      if (new URL(url).origin === APP_ORIGIN) return;
    } catch (_) {}
    event.preventDefault();
    shell.openExternal(url);
  });

  win.loadURL(APP_URL, { extraHeaders: 'Cache-Control: no-cache\n' });
}

app.whenReady().then(() => {
  const ses = session.fromPartition(PARTITION);

  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (requestingOrigin !== APP_ORIGIN) return false;
    return ['media', 'notifications', 'fullscreen'].includes(permission);
  });

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = (() => {
      try { return new URL(details.requestingUrl || webContents.getURL()).origin; }
      catch (_) { return ''; }
    })();
    const allowed = origin === APP_ORIGIN && ['media', 'notifications', 'fullscreen'].includes(permission);
    callback(allowed);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
