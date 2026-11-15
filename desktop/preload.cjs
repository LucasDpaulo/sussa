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
  channel: id => ipcRenderer.invoke('youtube:channel', id),
  embeddable: id => ipcRenderer.invoke('youtube:embeddable', id)
});
contextBridge.exposeInMainWorld('desktopApp', { openDataFolder: () => ipcRenderer.send('app:open-data') });
contextBridge.exposeInMainWorld('desktopGoogle', {
  status: () => ipcRenderer.invoke('google:status'),
  configure: credentials => ipcRenderer.invoke('google:configure', credentials),
  connect: service => ipcRenderer.invoke('google:connect', service),
  disconnect: () => ipcRenderer.invoke('google:disconnect'),
  calendar: (date, calendarId) => ipcRenderer.invoke('google:calendar', date, calendarId),
  youtubeLibrary: () => ipcRenderer.invoke('google:youtube-library'),
  youtubeCollection: (kind, id) => ipcRenderer.invoke('google:youtube-collection', kind, id)
});
