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
