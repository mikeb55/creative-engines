/**
 * Wyble Etude Generator — Electron Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wyble', {
  generateEtudes: (progression) => ipcRenderer.invoke('generate-etudes', progression),
  openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),
});
