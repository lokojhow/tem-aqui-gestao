const { app, BrowserWindow, shell, session } = require('electron');
const path = require('path');

if (require('electron-squirrel-startup')) app.quit();

const DESKTOP_VERSION = '1.0.15';
const DESKTOP_APP_NAME = 'TemAquiGestao';
const DESKTOP_USER_AGENT = `Tem-Aqui-Gestao/${DESKTOP_VERSION}`;
const LOCAL_APP = path.join(__dirname, '..', 'index.html');
const PARTITION = 'persist:tem-aqui-gestao-v115';
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
    try { if (new URL(details.url).host === SUPABASE_HOST) { delete requestHeaders.Referer; delete requestHeaders.referer; } } catch (_) {}
    callback({ requestHeaders });
  });
}

async function ensureDesktopContext(win) {
  try {
    await win.webContents.executeJavaScript(`
      (async()=>{
        try {
          document.documentElement.dataset.desktopApp='1'; window.__TEM_AQUI_DESKTOP__=true; window.__TEM_AQUI_DESKTOP_VERSION__='${DESKTOP_VERSION}';
          const loadLocalScript=(id,src)=>new Promise(resolve=>{if(document.getElementById(id))return resolve(true);const s=document.createElement('script');s.id=id;s.src=src;s.async=false;s.onload=()=>resolve(true);s.onerror=()=>resolve(false);document.body.appendChild(s);});
          await loadLocalScript('desktopDialogFix115','./dialog-safety-fix.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopPosEnhancements115','./pos-enhancements.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopLooseSaleReset115','./loose-sale-reset-fix.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopStaffEditFix115','./staff-edit-fix.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopPosScanner115','./pos-hid-scanner.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopUniversalRuntime115','./universal-runtime.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopOrdersSync115','./orders-desktop-sync.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopDeliveryTracking115','./orders-delivery-tracking.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopOrdersLogistics115','./orders-logistics-enhancements.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopCashDashboard115','./cash-dashboard-v2.js?v=desktop-${DESKTOP_VERSION}');
          await loadLocalScript('desktopCashCloseStatus115','./cash-close-status-fix.js?v=desktop-${DESKTOP_VERSION}');
        }catch(e){console.warn('Desktop connector:',e);}
      })();
    `, true);
  } catch (e) { console.warn('Falha ao preparar connector do desktop:', e); }
}

function createWindow() {
  const win = new BrowserWindow({width:1440,height:900,minWidth:1024,minHeight:700,show:false,autoHideMenuBar:true,backgroundColor:'#f4f7fb',icon:path.join(__dirname,'..','icon-512.png'),webPreferences:{partition:PARTITION,nodeIntegration:false,contextIsolation:true,sandbox:true,spellcheck:false}});
  win.webContents.setUserAgent(DESKTOP_USER_AGENT);
  win.once('ready-to-show',()=>{win.maximize();win.show();});
  win.webContents.on('did-finish-load',()=>{setTimeout(()=>ensureDesktopContext(win),500);});
  win.webContents.setWindowOpenHandler(({url})=>{if(url.startsWith('file://'))return{action:'allow'};shell.openExternal(url);return{action:'deny'};});
  win.webContents.on('will-navigate',(event,url)=>{if(url.startsWith('file://'))return;event.preventDefault();shell.openExternal(url);});
  win.loadFile(LOCAL_APP,{query:{desktop:'1',desktop_build:DESKTOP_VERSION}});
}

app.whenReady().then(async()=>{const ses=session.fromPartition(PARTITION);await prepareSession(ses);installNetworkConnector(ses);ses.setPermissionCheckHandler((webContents,permission)=>{const url=webContents?.getURL?.()||'';return url.startsWith('file://')&&['media','notifications','fullscreen'].includes(permission);});ses.setPermissionRequestHandler((webContents,permission,callback)=>{const url=webContents?.getURL?.()||'';callback(url.startsWith('file://')&&['media','notifications','fullscreen'].includes(permission));});createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
