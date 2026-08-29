const { app, dialog, net, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const VERSION_URL = 'https://github.com/lokojhow/tem-aqui-gestao/releases/download/windows-latest/windows-version.txt';
const INSTALLER_URL = 'https://github.com/lokojhow/tem-aqui-gestao/releases/download/windows-latest/Tem-Aqui-Gestao-Setup.exe';
let checking = false;

function parts(v) {
  return String(v || '0').replace(/^v/i, '').trim().split('.').map(n => parseInt(n, 10) || 0);
}
function newer(remote, local) {
  const a = parts(remote), b = parts(local);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x !== y) return x > y;
  }
  return false;
}
async function latestRelease() {
  const r = await net.fetch(`${VERSION_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Não foi possível consultar atualizações (${r.status}).`);
  const text = (await r.text()).trim();
  const version = text.match(/([0-9]+\.[0-9]+\.[0-9]+)/)?.[1] || '';
  if (!version) throw new Error('A versão publicada não pôde ser identificada.');
  return { version, url: INSTALLER_URL, name: 'Tem-Aqui-Gestao-Setup.exe' };
}
async function injectUpdater(win) {
  try {
    await win.webContents.executeJavaScript(`
      (()=>{
        if(document.getElementById('desktopUpdaterCard'))return;
        const settings=document.querySelector('[data-view="settings"]');
        if(!settings)return;
        const card=document.createElement('section');
        card.id='desktopUpdaterCard';
        card.style.cssText='margin:14px 0;padding:18px;border:1px solid #dbe5ee;border-radius:14px;background:#fff;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap';
        card.innerHTML='<div><small style="font-weight:800;color:#0b7a3d">ATUALIZAÇÕES DO WINDOWS</small><h3 style="margin:5px 0">Tem Aqui Gestão</h3><p id="desktopUpdaterText" style="margin:0;color:#667085">Versão instalada: ${app.getVersion()}</p></div><button id="desktopCheckUpdate" type="button" style="border:0;border-radius:10px;background:#0b7a3d;color:#fff;padding:12px 18px;font-weight:900;cursor:pointer">Procurar atualização</button>';
        const head=settings.querySelector('.page-heading');
        if(head)head.insertAdjacentElement('afterend',card); else settings.prepend(card);
        document.getElementById('desktopCheckUpdate').onclick=()=>{ location.hash='tem-aqui-check-update'; };
      })();
    `, true);
  } catch (_) {}
}
async function injectPdvKeyboardRecovery(win) {
  try {
    await win.webContents.executeJavaScript(`
      (()=>{
        if(window.__temAquiPdvRecoveryInstalled)return;
        window.__temAquiPdvRecoveryInstalled=true;
        const restore=()=>{
          document.querySelectorAll('dialog[open]').forEach(d=>{ try{ d.close(); }catch(_){} });
          document.querySelectorAll('[inert]').forEach(e=>e.removeAttribute('inert'));
          document.body.style.pointerEvents='';
          document.documentElement.style.pointerEvents='';
          const checkout=document.getElementById('checkoutPanel');
          if(checkout){ checkout.style.pointerEvents=''; checkout.removeAttribute('inert'); }
          const fields=['productSearch','looseName','looseQty','loosePrice','cashReceivedInput'];
          fields.forEach(id=>{const el=document.getElementById(id);if(el){el.disabled=false;el.readOnly=false;}});
          const p=document.getElementById('productSearch');
          if(p){ setTimeout(()=>{try{p.focus();p.select?.();}catch(_){}},80); }
        };
        const nativeAlert=window.alert.bind(window);
        window.alert=(msg)=>{
          const text=String(msg??'');
          const out=nativeAlert(msg);
          if(text.includes('Venda concluída')) setTimeout(restore,120);
          return out;
        };
        document.addEventListener('click',e=>{
          if(e.target?.closest?.('#confirmSaleButton')){
            let tries=0;
            const timer=setInterval(()=>{
              tries++;
              const count=Number(document.getElementById('cartCount')?.textContent||0);
              if(count===0){clearInterval(timer);restore();}
              if(tries>80)clearInterval(timer);
            },150);
          }
        },true);
        window.addEventListener('focus',()=>setTimeout(()=>{const a=document.activeElement;if(!a||a===document.body)restore();},100));
      })();
    `, true);
  } catch (_) {}
}
async function setRendererStatus(win, text) {
  try { await win.webContents.executeJavaScript(`(()=>{const e=document.getElementById('desktopUpdaterText');if(e)e.textContent=${JSON.stringify(text)}})()`, true); } catch (_) {}
}
async function check(win, interactive = true) {
  if (checking) return;
  checking = true;
  const local = app.getVersion();
  try {
    await setRendererStatus(win, 'Procurando versão mais recente...');
    const rel = await latestRelease();
    if (!newer(rel.version, local)) {
      await setRendererStatus(win, `Versão instalada: ${local} · Você está atualizado.`);
      if (interactive) await dialog.showMessageBox(win, { type: 'info', title: 'Tem Aqui Gestão', message: 'Seu programa já está atualizado.', detail: `Versão instalada: ${local}` });
      return;
    }
    await setRendererStatus(win, `Nova versão ${rel.version} disponível.`);
    if (!interactive) return;
    const ans = await dialog.showMessageBox(win, {
      type: 'info',
      buttons: ['Baixar e instalar', 'Agora não'],
      defaultId: 0,
      cancelId: 1,
      title: 'Atualização disponível',
      message: `Tem Aqui Gestão ${rel.version} está disponível.`,
      detail: `Versão instalada: ${local}\nO programa baixará o instalador e abrirá a atualização automaticamente.`
    });
    if (ans.response !== 0) return;
    await setRendererStatus(win, `Baixando versão ${rel.version}...`);
    const response = await net.fetch(`${rel.url}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Falha ao baixar o instalador (${response.status}).`);
    const out = path.join(app.getPath('temp'), `Tem-Aqui-Gestao-${rel.version}-Setup.exe`);
    fs.writeFileSync(out, Buffer.from(await response.arrayBuffer()));
    await setRendererStatus(win, 'Download concluído. Abrindo instalador...');
    const err = await shell.openPath(out);
    if (err) throw new Error(err);
    setTimeout(() => app.quit(), 1200);
  } catch (e) {
    await setRendererStatus(win, `Não foi possível verificar: ${e.message}`);
    if (interactive) await dialog.showMessageBox(win, { type: 'error', title: 'Atualização', message: 'Não foi possível verificar ou instalar a atualização.', detail: e.message });
  } finally {
    checking = false;
  }
}

app.on('browser-window-created', (_event, win) => {
  win.webContents.on('did-finish-load', () => {
    setTimeout(() => injectUpdater(win), 1200);
    setTimeout(() => injectPdvKeyboardRecovery(win), 1400);
    setTimeout(() => check(win, false), 7000);
  });
  win.webContents.on('did-navigate-in-page', (_e, url) => {
    if (!String(url).includes('#tem-aqui-check-update')) return;
    check(win, true);
    try { win.webContents.executeJavaScript(`history.replaceState(null,'',location.pathname+location.search)`, true); } catch (_) {}
  });
});

require('./main.js');
