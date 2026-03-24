/// <reference types="vite/client" />

import type { ComposerOsStartupState } from './types/composerOsDesktop';

declare global {
  interface Window {
    composerOsDesktop?: {
      mode: 'desktop';
      productName: string;
      getStartupState: () => Promise<ComposerOsStartupState>;
      getDesktopMeta: () => Promise<{ packaged: boolean; version: string; productName: string }>;
      onStartupState: (cb: (s: ComposerOsStartupState) => void) => void;
      notifyGenerationPhase: (phase: 'running' | 'succeeded' | 'failed' | 'idle') => void;
    };
  }
}

export {};
