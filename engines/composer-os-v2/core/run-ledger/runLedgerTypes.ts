/**
 * Composer OS V2 — Run ledger types
 */

/** Run manifest for replay/debug. */
export interface RunManifest {
  composerOsVersion: string;
  seed: number;
  presetId: string;
  /** Title applied to the exported score */
  scoreTitle?: string;
  activeModules: string[];
  feelMode: string;
  instrumentProfiles: string[];
  readinessScores: {
    release: number;
    mx: number;
  };
  validationPassed: boolean;
  validationErrors?: string[];
  exportTarget?: string;
  timestamp: string;
}
