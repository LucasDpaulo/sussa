const { app, BrowserWindow, protocol, net, ipcMain, Menu, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { mkdirSync } = require('node:fs');
const { openStore } = require('./store.cjs');
const origin = 'app://workspace';
const root = path.resolve(__dirname, '..');
protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
// A stable directory preserves data when the application is updated.
app.setPath('userData', path.join(app.getPath('appData'), 'sussa'));
let window, store;
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(async () => {
    mkdirSync(app.getPath('userData'), { recursive: true });
    store = openStore(path.join(app.getPath('userData'), 'workspace.sqlite'));
    protocol.handle('app', async request => {
      const url = new URL(request.url);
      const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      if (url.host !== 'workspace' || !(/^\/index\.html$/.test(name) || /^\/(src|assets)\/[\w./-]+$/.test(name))) return new Response('Não encontrado', { status: 404 });
      const file = path.resolve(root, '.' + name);
      if (!file.startsWith(root + path.sep)) return new Response('Não encontrado', { status: 404 });
      const response = await net.fetch(pathToFileURL(file).href);
      const headers = new Headers(response.headers);
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob: https:; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com https://embed.music.apple.com; connect-src 'self'; object-src 'none'; base-uri 'none'");
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
    window = new BrowserWindow({ width: 1280, height: 850, minWidth: 390, minHeight: 600, title: 'Sussa', backgroundColor: '#191c22', webPreferences: { preload: path.join(__dirname, 'preload.cjs'), sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
    window.webContents.on('will-navigate', event => event.preventDefault());
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.session.setPermissionRequestHandler((contents, permission, callback) => callback(contents === window.webContents && permission === 'notifications'));
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'Aplicativo', submenu: [{ label: 'Abrir pasta dos dados', click: () => shell.openPath(app.getPath('userData')) }, { type: 'separator' }, { role: 'quit', label: 'Sair' }] },
      { label: 'Editar', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: 'Exibir', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] }
    ]));
    await window.loadURL(origin + '/');
    // This release is local; Google OAuth requires a separate desktop flow.
    await window.webContents.executeJavaScript("document.querySelector('.task-source').hidden = true");
  }).catch(error => { console.error(error); app.exit(1); });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => store?.close());
}
