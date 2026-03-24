/**
 * Composer OS Desktop — preload (safe surface; no legacy launcher hooks)
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { StartupState } from './startupState';

contextBridge.exposeInMainWorld('composerOsDesktop', {
  mode: 'desktop' as const,
  productName: 'Composer OS',
  getStartupState: (): Promise<StartupState> => ipcRenderer.invoke('composer-os:get-startup-state'),
  getDesktopMeta: (): Promise<{ packaged: boolean; version: string; productName: string }> =>
    ipcRenderer.invoke('composer-os:get-desktop-meta'),
  getUiProvenance: (): Promise<{
    verified: boolean;
    productName: string;
    desktopVersion: string;
    uiBundlePath: string;
    uiProductId: string | null;
    uiBuildTimestamp: string | null;
    uiGitCommit: string | null;
    uiAppShellVersion: string | null;
    outputDirectory: string;
  }> => ipcRenderer.invoke('composer-os:get-ui-provenance'),
  onStartupState: (cb: (s: StartupState) => void): void => {
    ipcRenderer.on('composer-os:startup-state', (_e, s: StartupState) => cb(s));
  },
  notifyGenerationPhase: (phase: 'running' | 'succeeded' | 'failed' | 'idle'): void => {
    ipcRenderer.send('composer-os:generation-phase', phase);
  },
});
