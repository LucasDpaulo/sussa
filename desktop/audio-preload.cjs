const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('audioControls', {
  set: (kind, value) => ipcRenderer.send('audio:set', { kind, value }),
  onState: callback => ipcRenderer.on('audio:state', (_event, state) => callback(state))
});
