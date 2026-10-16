/// <reference types="vite/client" />

import type { ComposerOsStartupState } from './types/composerOsDesktop';

interface ImportMetaEnv {
  readonly VITE_COMPOSER_OS_UI_STAMP_JSON?: string;
}

declare global {
  interface Window {
    composerOsDesktop?: {
      mode: 'desktop';
      integration?: 'ipc';
      productName: string;
      getStartupState: () => Promise<ComposerOsStartupState>;
      getDesktopMeta: () => Promise<{
        packaged: boolean;
        version: string;
        productName: string;
        appId: string;
        exePath: string;
        integration: 'ipc';
        channel?: 'stable' | 'dev';
        releaseLabel?: string;
        displayTitle?: string;
        gitCommit?: string | null;
      }>;
      getUiProvenance: () => Promise<{
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
      }>;
      invokeApi: (channel: string, payload?: unknown) => Promise<unknown>;
      showItemInFolder?: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
      openFileDefaultApp?: (path: string) => Promise<{ ok: boolean; error?: string }>;
      getRuntimeBuildInfo?: () => Promise<Record<string, unknown>>;
      /** Desktop: persist Anthropic key with OS DPAPI (`safeStorage`); enables PDF vision without User env vars. */
      saveAnthropicApiKey?: (apiKey: string) => Promise<{ ok: boolean; error?: string }>;
      /** Desktop: write rhythm/export XML under Documents/`relativePath`. */
      saveExportFile?: (payload: {
        relativePath: string;
        contents: string;
      }) => Promise<{ ok: boolean; fullPath?: string; error?: string }>;
      openExportFolder?: (
        engine: 'fela-kuti' | 'greek' | 'blended' | 'brazilian' | 'second-line' | 'cuban'
      ) => Promise<void>;
      pickAudioFile?: () => Promise<{ path: string | null }>;
      onStartupState: (cb: (s: ComposerOsStartupState) => void) => void;
      notifyGenerationPhase: (phase: 'running' | 'succeeded' | 'failed' | 'idle') => void;
      /** Persistent pairing enablement override (userData JSON via main). */
      getPairingOverride?: (id: string) => Promise<{ id: string; value: boolean | undefined }>;
      setPairingOverride?: (
        id: string,
        value: boolean | undefined
      ) => Promise<{ ok: boolean; id: string; value: boolean | undefined; error?: string }>;
    };
  }
}

export {};
