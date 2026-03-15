/**
 * Wyble Etude Generator — Electron Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('wyble', {
  generateEtudes: (progression, practiceMode, musicXmlPath) => ipcRenderer.invoke('generate-etudes', progression, practiceMode, musicXmlPath),
  showMusicXmlPicker: () => ipcRenderer.invoke('show-musicxml-picker'),
  openOutputFolder: () => ipcRenderer.invoke('open-output-folder'),
});
