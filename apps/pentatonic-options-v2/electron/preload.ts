import { contextBridge, ipcRenderer } from 'electron';

const api = {
  generate: (request: unknown) => ipcRenderer.invoke('practice:generate', request),
  next: (request: unknown) => ipcRenderer.invoke('practice:next', request),
  analyse: (request: unknown) => ipcRenderer.invoke('practice:analyse', request),
  analyseScore: () => ipcRenderer.invoke('practice:analyseScore'),
  autoColor: (request: unknown) => ipcRenderer.invoke('practice:autoColor', request),
  compare: (example: unknown) => ipcRenderer.invoke('practice:compare', example),
  fields: (centre: string) => ipcRenderer.invoke('practice:fields', centre),
  wheel: (centre: string) => ipcRenderer.invoke('practice:wheel', centre),
  custom: (notes: string, centre: string) => ipcRenderer.invoke('practice:custom', notes, centre),
  motif: (payload: unknown) => ipcRenderer.invoke('practice:motif', payload),
  exportXml: (example: unknown) => ipcRenderer.invoke('practice:export', example),
  exportSheet: (examples: unknown) => ipcRenderer.invoke('practice:sheet', examples),
  openMuseScore: (filePath: string) => ipcRenderer.invoke('practice:open', filePath),
  reveal: (filePath: string) => ipcRenderer.invoke('practice:reveal', filePath),
  intentions: () => ipcRenderer.invoke('practice:intentions'),
  moveOut: (request: unknown, outness: string) => ipcRenderer.invoke('practice:moveOut', request, outness),
  pivot: (request: unknown) => ipcRenderer.invoke('practice:pivot', request),
  extract: (request: unknown) => ipcRenderer.invoke('practice:extract', request),
  layered: (request: unknown) => ipcRenderer.invoke('practice:layered', request),
  fieldDistance: (payload: unknown) => ipcRenderer.invoke('practice:fieldDistance', payload),
  outness: (request: unknown, outness: string) => ipcRenderer.invoke('practice:outness', request, outness),
  pivotCheck: (payload: unknown) => ipcRenderer.invoke('practice:pivotCheck', payload),
  deriveCheck: (request: unknown) => ipcRenderer.invoke('practice:deriveCheck', request),
  duoCheck: (request: unknown) => ipcRenderer.invoke('practice:duoCheck', request),
};

contextBridge.exposeInMainWorld('practice', api);
