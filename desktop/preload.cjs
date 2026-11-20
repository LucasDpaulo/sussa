const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktopStorage', {
  getItem(key) {
    const result = ipcRenderer.sendSync('storage:read', key);
    if (result.error) throw new Error(result.error);
    return result.value;
  },
  setItem(key, value) {
    const result = ipcRenderer.sendSync('storage:write', key, value);
    if (result.error) throw new Error(result.error);
  }
});
contextBridge.exposeInMainWorld('desktopTray', {
  enter: () => ipcRenderer.send('tray:enter'),
  update: info => ipcRenderer.send('tray:update', info),
  setRunning: running => ipcRenderer.send('tray:running', Boolean(running)),
  setMuted: muted => ipcRenderer.send('tray:muted', Boolean(muted)),
  onCommand(callback) { ipcRenderer.on('tray:command', (_event, command) => callback(command)); }
});
contextBridge.exposeInMainWorld('desktopYouTube', {
  page: (id, cursor) => ipcRenderer.invoke('youtube:page', id, cursor),
  channel: id => ipcRenderer.invoke('youtube:channel', id),
  embeddable: id => ipcRenderer.invoke('youtube:embeddable', id)
});
contextBridge.exposeInMainWorld('desktopApp', { openDataFolder: () => ipcRenderer.send('app:open-data') });

contextBridge.exposeInMainWorld('desktopCompact', {
  control: action => ipcRenderer.invoke('window:control', action),
  state: () => ipcRenderer.invoke('compact:state'),
  toggle: () => ipcRenderer.invoke('compact:toggle'),
  pin: value => ipcRenderer.invoke('compact:pin', value),
  onChanged: callback => ipcRenderer.on('compact:changed', (_event, state) => callback(state))
});
