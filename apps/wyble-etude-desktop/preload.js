/**
 * Wyble Etude Generator — Electron Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wyble', {
  generateEtudes: (progression, practiceMode) => ipcRenderer.invoke('generate-etudes', progression, practiceMode),
  openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),
});
