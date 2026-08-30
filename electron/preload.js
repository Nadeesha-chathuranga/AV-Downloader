const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('avDownloader', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  openExternal: (url) => ipcRenderer.invoke('shell-open-external', url),
  onBinaryStatus: (cb) => ipcRenderer.on('bin-status', (_event, data) => cb(data)),
});