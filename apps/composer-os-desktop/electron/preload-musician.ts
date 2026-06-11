/**
 * Musician shell preload - typed bridge only.
 */
import { contextBridge, ipcRenderer } from 'electron';
import type {
  MusicianGenerateRequest,
  MusicianGenerateResponse,
  MusicianStatusEvent,
} from './musicianTypes';

contextBridge.exposeInMainWorld('composerOsMusician', {
  generate(request: MusicianGenerateRequest): Promise<MusicianGenerateResponse> {
    return ipcRenderer.invoke('composer-os-musician:generate', request);
  },
  onStatus(listener: (event: MusicianStatusEvent) => void): () => void {
    const handler = (_e: Electron.IpcRendererEvent, payload: MusicianStatusEvent) => {
      listener(payload);
    };
    ipcRenderer.on('composer-os-musician:status', handler);
    return () => {
      ipcRenderer.removeListener('composer-os-musician:status', handler);
    };
  },
});
