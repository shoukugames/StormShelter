// StormShelter - preload bridge (exposes a tiny, safe API to the game)
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ssNative', {
  quit: () => ipcRenderer.send('ss:quit'),
  toggleFullscreen: () => ipcRenderer.send('ss:fullscreen'),
  openExternal: (url) => ipcRenderer.send('ss:open', url),
  isElectron: true
});
