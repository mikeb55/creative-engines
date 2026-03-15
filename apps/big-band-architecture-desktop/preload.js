/**
 * Big Band Architecture Generator — Preload
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bigBandArch', {
  generateArchitecture: (progressionId, style) =>
    ipcRenderer.invoke('generate-architecture', progressionId, style),
  generateScoreSkeleton: (progressionId, style) =>
    ipcRenderer.invoke('generate-score-skeleton', progressionId, style),
  generateArrangerAssist: (progressionId, style) =>
    ipcRenderer.invoke('generate-arranger-assist', progressionId, style),
  generateSelectiveMaterial: (progressionId, style, targetType) =>
    ipcRenderer.invoke('generate-selective-material', progressionId, style, targetType),
  openOutputFolder: (folderPath) => ipcRenderer.invoke('open-output-folder', folderPath),
});
