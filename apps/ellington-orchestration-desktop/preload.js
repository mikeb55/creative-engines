/**
 * Ellington Orchestration Generator — Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ellington', {
  generateOrchestration: (progressionName, musicXmlPath) =>
    ipcRenderer.invoke('generate-orchestration', progressionName, musicXmlPath),
  showMusicXmlPicker: () => ipcRenderer.invoke('show-musicxml-picker'),
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
});
