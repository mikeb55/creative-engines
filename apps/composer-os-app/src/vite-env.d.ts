/// <reference types="vite/client" />

import type { ComposerOsStartupState } from './types/composerOsDesktop';

interface ImportMetaEnv {
  readonly VITE_COMPOSER_OS_UI_STAMP_JSON?: string;
}

declare global {
  interface Window {
    composerOsDesktop?: {
      mode: 'desktop';
      productName: string;
      getStartupState: () => Promise<ComposerOsStartupState>;
      getDesktopMeta: () => Promise<{ packaged: boolean; version: string; productName: string }>;
      getUiProvenance: () => Promise<{
        verified: boolean;
        productName: string;
        desktopVersion: string;
        uiBundlePath: string;
        uiProductId: string | null;
        uiBuildTimestamp: string | null;
        uiGitCommit: string | null;
        uiAppShellVersion: string | null;
        outputDirectory: string;
      }>;
      onStartupState: (cb: (s: ComposerOsStartupState) => void) => void;
      notifyGenerationPhase: (phase: 'running' | 'succeeded' | 'failed' | 'idle') => void;
    };
  }
}

export {};
