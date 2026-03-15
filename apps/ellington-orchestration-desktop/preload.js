/**
 * Ellington Orchestration Generator — Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ellington', {
  generateOrchestration: (progressionName, musicXmlPath, arrangementMode) =>
    ipcRenderer.invoke('generate-orchestration', progressionName, musicXmlPath, arrangementMode),
  showMusicXmlPicker: () => ipcRenderer.invoke('show-musicxml-picker'),
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
});
