const { app, BrowserWindow, protocol, net, ipcMain, Menu, shell, Tray, nativeImage, Notification } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { mkdirSync } = require('node:fs');
const { openStore } = require('./store.cjs');
const youtube = require('./youtube.cjs');
const { createGoogle } = require('./google.cjs');
const origin = 'app://workspace';
const root = path.resolve(__dirname, '..');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
// A stable directory preserves data when the application is updated.
app.setPath('userData', path.join(app.getPath('appData'), 'sussa'));
let window, store, google, tray = null, trayInfo = null, trayMenuKey = '', trayIcons = 0, timerRunning = false, quitting = false, closeHintShown = false;
// Modo na barra: a janela fica escondida (sem desenhar nada) e o timer aparece como ícone.
function sendTray(command) { window?.webContents.send('tray:command', command); }
function volumeBar({ volume, muted }) {
  const filled = muted ? 0 : Math.round(volume / 10);
  return `${muted ? '🔇' : volume < 40 ? '🔈' : volume < 75 ? '🔉' : '🔊'}  ${'▰'.repeat(filled)}${'▱'.repeat(10 - filled)}  ${muted ? 'Mudo' : `${volume}%`}`;
}
function refreshTrayMenu() {
  if (!tray) return;
  const info = trayInfo ?? { title: 'Sussa', detail: '', action: '', volume: 0, muted: false };
  const audio = window.webContents.isCurrentlyAudible() || info.muted;
  const key = JSON.stringify([info.title, info.detail, info.action, info.volume, info.muted, audio]);
  if (key === trayMenuKey) return;
  trayMenuKey = key;
  tray.setToolTip(info.detail ? `Sussa · ${info.title} · ${info.detail}` : 'Sussa');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: info.title, enabled: false },
    ...(info.detail ? [{ label: info.detail, enabled: false }] : []),
    ...(info.action ? [{ label: info.action, click: () => sendTray('toggle') }] : []),
    ...(audio ? [
      { type: 'separator' },
      // Menus de bandeja são só texto (sem controle deslizante): a barra é desenhada com caracteres
      // e clicar nela silencia ou devolve o som.
      { label: volumeBar(info), toolTip: info.muted ? 'Ativar o som' : 'Silenciar', click: () => sendTray('mute') },
      { label: '＋  Aumentar volume', enabled: !info.muted && info.volume < 100, click: () => sendTray('volume-up') },
      { label: '－  Diminuir volume', enabled: !info.muted && info.volume > 0, click: () => sendTray('volume-down') }
    ] : []),
    { type: 'separator' },
    { label: 'Abrir Sussa (duplo clique no tempo)', click: leaveTray },
    { label: 'Sair', click: () => app.quit() }
  ]));
}
function enterTray() {
  if (!window || tray) return;
  tray = new Tray(nativeImage.createFromPath(path.join(root, 'assets', 'icon.png')).resize({ width: 32, height: 32 }));
  // Linux: um clique abre o menu e o duplo clique chega como "ativar", que reabre a janela.
  tray.on('click', () => process.platform === 'linux' ? leaveTray() : tray.popUpContextMenu());
  tray.on('double-click', leaveTray);
  trayMenuKey = ''; refreshTrayMenu();
  window.hide();
  sendTray('entered');
}
function leaveTray() {
  if (!tray) return;
  tray.destroy(); tray = null; trayInfo = null;
  window.show(); window.focus();
  sendTray('exited');
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (tray) leaveTray(); else if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(async () => {
    mkdirSync(app.getPath('userData'), { recursive: true });
    store = openStore(path.join(app.getPath('userData'), 'workspace.sqlite'));
    google = createGoogle(app.getPath('userData'));
    protocol.handle('app', async request => {
      const url = new URL(request.url);
      const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (url.host !== 'workspace' || !(/^\/index\.html$/.test(name) || /^\/(src|assets)\/[\w./-]+$/.test(name))) return new Response('Não encontrado', { status: 404 });
      const file = path.resolve(root, '.' + name);
      if (!file.startsWith(root + path.sep)) return new Response('Não encontrado', { status: 404 });
      const response = await net.fetch(pathToFileURL(file).href);
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://i.ytimg.com; media-src 'self' blob: https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com https://embed.music.apple.com; connect-src 'self'; object-src 'none'; base-uri 'none'");
      return new Response(response.body, { status: response.status, headers });
    });
    function trusted(event) { return event.senderFrame === window?.webContents.mainFrame && event.senderFrame.url === origin + '/'; }
    ipcMain.on('storage:read', (event, key) => {
      try { if (!trusted(event) || key !== 'meu-espaco-v1') throw new Error('Acesso inválido'); event.returnValue = { value: store.getItem(key) }; }
      catch { event.returnValue = { error: 'Não foi possível ler os dados locais' }; }
    });
    ipcMain.on('storage:write', (event, key, value) => {
      try { if (!trusted(event)) throw new Error('Acesso inválido'); store.setItem(key, value); event.returnValue = { ok: true }; }
      catch { event.returnValue = { error: 'Não foi possível salvar os dados locais' }; }
    });
    const guarded = fn => (event, ...args) => { if (!trusted(event)) throw new Error('Acesso inválido'); return fn(...args); };
    ipcMain.handle('google:status', guarded(() => google.status()));
    ipcMain.handle('google:configure', guarded(credentials => google.configure(credentials || {})));
    ipcMain.handle('google:connect', guarded(service => google.connect(String(service))));
    ipcMain.handle('google:disconnect', guarded(() => google.disconnect()));
    ipcMain.handle('google:calendar', guarded((date, calendarId) => google.calendarEvents(String(date), calendarId)));
    ipcMain.handle('google:youtube-library', guarded(() => google.youtubeLibrary()));
    ipcMain.handle('google:youtube-collection', guarded((kind, id) => google.youtubeCollection(String(kind), id)));
    ipcMain.handle('youtube:channel', (event, id) => { if (!trusted(event)) throw new Error('Acesso inválido'); return youtube.channelVideos(String(id)); });
    ipcMain.handle('youtube:embeddable', (event, id) => { if (!trusted(event)) throw new Error('Acesso inválido'); return youtube.embeddable(String(id)); });
    ipcMain.on('app:open-data', event => { if (trusted(event)) shell.openPath(app.getPath('userData')); });
    ipcMain.on('tray:running', (event, running) => { if (trusted(event)) timerRunning = running === true; });
    ipcMain.on('tray:enter', event => { if (trusted(event)) enterTray(); });
    ipcMain.on('tray:muted', (event, muted) => { if (trusted(event)) { window.webContents.setAudioMuted(muted === true); refreshTrayMenu(); } });
    ipcMain.on('tray:update', (event, info) => {
      if (!trusted(event) || !tray || !info || typeof info !== 'object') return;
      const text = value => typeof value === 'string' ? value.slice(0, 80) : '';
      trayInfo = { title: text(info.title) || 'Sussa', detail: text(info.detail), action: text(info.action), volume: Math.max(0, Math.min(100, Math.round(Number(info.volume)) || 0)), muted: info.muted === true };
      if (info.icon instanceof Uint8Array && info.icon.byteLength < 100_000) {
        const image = nativeImage.createFromBuffer(Buffer.from(info.icon));
        if (!image.isEmpty()) { tray.setImage(image); trayIcons++; }
      }
      refreshTrayMenu();
    });
    window = new BrowserWindow({ width: 1280, height: 850, minWidth: 390, minHeight: 600, title: 'Sussa', icon: path.join(root, 'assets', 'icon.png'), backgroundColor: '#191c22', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
    // X com o timer rodando: vai para a barra. Parado: fecha. "Sair" (barra, menu ou Ctrl+Q) sempre fecha.
    window.on('close', event => {
      if (quitting || !timerRunning) return;
      event.preventDefault();
      enterTray();
      if (!closeHintShown && Notification.isSupported()) {
        closeHintShown = true;
        new Notification({ title: 'O Sussa continua na barra', body: 'O timer segue rodando. Para fechar de vez, clique no número e escolha Sair.', icon: path.join(root, 'assets', 'icon.png'), silent: true }).show();
      }
    });
    // O player incorporado do YouTube exige que apps se identifiquem pelo Referer com o ID do app
    // (developers.google.com/youtube/terms/required-minimum-functionality); sem isso, dá "Erro 153".
    window.webContents.session.webRequest.onBeforeSendHeaders({ urls: ['https://www.youtube-nocookie.com/embed/*', 'https://www.youtube.com/embed/*'] }, (details, callback) => {
      callback({ requestHeaders: { ...details.requestHeaders, Referer: 'https://io.github.lucasdpaulo.sussa/' } });
    });
    window.webContents.on('audio-state-changed', () => refreshTrayMenu());
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.session.setPermissionRequestHandler((contents, permission, callback) => callback(contents === window.webContents && permission === 'notifications'));
    // Sem barra de menu: os atalhos que ela oferecia continuam valendo direto na janela.
    Menu.setApplicationMenu(null);
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const key = input.key.toLowerCase(), ctrl = input.control || input.meta, contents = window.webContents;
      const actions = {
        m: ctrl && enterTray, q: ctrl && (() => app.quit()), f11: () => window.setFullScreen(!window.isFullScreen()),
        '=': ctrl && (() => contents.setZoomLevel(contents.getZoomLevel() + 0.5)), '+': ctrl && (() => contents.setZoomLevel(contents.getZoomLevel() + 0.5)),
        '-': ctrl && (() => contents.setZoomLevel(contents.getZoomLevel() - 0.5)), 0: ctrl && (() => contents.setZoomLevel(0))
      };
      if (actions[key]) { event.preventDefault(); actions[key](); }
    });
    await window.loadURL(origin + '/');
  }).catch(error => { console.error(error); app.exit(1); });
  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => store?.close());
}
// Usado pelo teste de fumaça do desktop.
module.exports = { trayState: () => ({ running: timerRunning, active: Boolean(tray), info: trayInfo, icons: trayIcons, visible: Boolean(window?.isVisible()), muted: Boolean(window?.webContents.isAudioMuted()) }), leaveTray };
