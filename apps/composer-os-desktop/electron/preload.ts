/**
 * Composer OS Desktop — preload (IPC-only integration for packaged app)
 */
import { contextBridge, ipcRenderer } from 'electron';
import type { StartupState } from './startupState';

contextBridge.exposeInMainWorld('composerOsDesktop', {
  mode: 'desktop' as const,
  integration: 'ipc' as const,
  productName: 'Composer OS Desktop',
  getStartupState: (): Promise<StartupState> => ipcRenderer.invoke('composer-os:get-startup-state'),
  getDesktopMeta: (): Promise<{
    packaged: boolean;
    version: string;
    productName: string;
    appId: string;
    exePath: string;
    integration: 'ipc';
  }> => ipcRenderer.invoke('composer-os:get-desktop-meta'),
  getUiProvenance: (): Promise<{
    verified: boolean;
    productName: string;
    appId: string;
    desktopVersion: string;
    uiBundlePath: string;
    uiProductId: string | null;
    uiBuildTimestamp: string | null;
    uiGitCommit: string | null;
    uiAppShellVersion: string | null;
    outputDirectory: string;
    desktopMode: 'ipc';
  }> => ipcRenderer.invoke('composer-os:get-ui-provenance'),
  invokeApi: (channel: string, payload?: unknown): Promise<unknown> =>
    ipcRenderer.invoke(channel, payload),
  getRuntimeBuildInfo: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('composer-os-api:get-runtime-build-info'),
  onStartupState: (cb: (s: StartupState) => void): void => {
    ipcRenderer.on('composer-os:startup-state', (_e, s: StartupState) => cb(s));
  },
  notifyGenerationPhase: (phase: 'running' | 'succeeded' | 'failed' | 'idle'): void => {
    ipcRenderer.send('composer-os:generation-phase', phase);
  },
});
