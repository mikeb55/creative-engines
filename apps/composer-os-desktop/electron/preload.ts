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
    channel: 'stable' | 'dev';
    releaseLabel: string;
    displayTitle: string;
    gitCommit: string | null;
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
  showItemInFolder: (filePath: string) =>
    ipcRenderer.invoke('show-item-in-folder', filePath) as Promise<{ ok: boolean; error?: string }>,
  openFileDefaultApp: (path: string) =>
    ipcRenderer.invoke('composer-os-api:open-file-default-app', path) as Promise<{
      ok: boolean;
      error?: string;
    }>,
  getRuntimeBuildInfo: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('composer-os-api:get-runtime-build-info'),
  saveAnthropicApiKey: (apiKey: string) =>
    ipcRenderer.invoke('composer-os-api:save-anthropic-api-key', { apiKey }) as Promise<{
      ok: boolean;
      error?: string;
    }>,
  /** Writes UTF-8 MusicXML under Documents (mkdir -p). Payload paths must stay inside Documents. */
  saveExportFile: (payload: { relativePath: string; contents: string }) =>
    ipcRenderer.invoke('composer-os:save-export-file', payload) as Promise<{
      ok: boolean;
      fullPath?: string;
      error?: string;
    }>,
  openExportFolder: (engine: 'fela-kuti' | 'greek' | 'blended' | 'brazilian' | 'second-line' | 'cuban') =>
    ipcRenderer.invoke('composer-os:open-export-folder', { engine }) as Promise<void>,
  pickAudioFile: (): Promise<{ path: string | null }> =>
    ipcRenderer.invoke('composer-os:pick-audio-file') as Promise<{ path: string | null }>,
  onStartupState: (cb: (s: StartupState) => void): void => {
    ipcRenderer.on('composer-os:startup-state', (_e, s: StartupState) => cb(s));
  },
  notifyGenerationPhase: (phase: 'running' | 'succeeded' | 'failed' | 'idle'): void => {
    ipcRenderer.send('composer-os:generation-phase', phase);
  },
  getPairingOverride: (id: string): Promise<{ id: string; value: boolean | undefined }> =>
    ipcRenderer.invoke('composer-os:get-pairing-override', { id }) as Promise<{
      id: string;
      value: boolean | undefined;
    }>,
  setPairingOverride: (
    id: string,
    value: boolean | undefined
  ): Promise<{ ok: boolean; id: string; value: boolean | undefined; error?: string }> =>
    ipcRenderer.invoke('composer-os:set-pairing-override', { id, value }) as Promise<{
      ok: boolean;
      id: string;
      value: boolean | undefined;
      error?: string;
    }>,
  martino: {
    generate: (tuneConfig: Record<string, unknown>) =>
      ipcRenderer.invoke('martino:generate', tuneConfig) as Promise<Record<string, unknown>>,
  },
});
