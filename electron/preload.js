const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('avDownloader', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  openExternal: (url) => ipcRenderer.invoke('shell-open-external', url),
  getClipboardText: () => ipcRenderer.invoke('clipboard-read-text'),
  getPendingDeepLink: () => ipcRenderer.invoke('get-pending-deep-link'),
  setClipboardWatch: (enabled) => ipcRenderer.send('set-clipboard-watch', Boolean(enabled)),
  onDeepLink: (cb) => {
    const listener = (_event, data) => cb(data);
    ipcRenderer.on('deep-link', listener);
    return () => ipcRenderer.removeListener('deep-link', listener);
  },
  onBinaryStatus: (cb) => ipcRenderer.on('bin-status', (_event, data) => cb(data)),
});