const { app, BrowserWindow, shell, session } = require('electron');

if (require('electron-squirrel-startup')) app.quit();

const APP_URL = 'https://tem-aqui-gestao.pages.dev/';
const APP_ORIGIN = new URL(APP_URL).origin;

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f4f7fb',
    icon: require('path').join(__dirname, '..', 'icon-512.png'),
    webPreferences: {
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

  win.loadURL(APP_URL);
}

app.whenReady().then(() => {
  const ses = session.defaultSession;

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
