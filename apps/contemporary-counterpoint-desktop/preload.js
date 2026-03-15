/**
 * Contemporary Counterpoint Generator — Electron Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('counterpoint', {
  generate: (progressionName, voiceCount, density) =>
    ipcRenderer.invoke('generate-counterpoint', progressionName, voiceCount, density),
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
});
