/**
 * Conductor Composer Desktop — Electron Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('conductor', {
  generateComposition: (style, template) => ipcRenderer.invoke('generate-composition', style, template),
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
});
