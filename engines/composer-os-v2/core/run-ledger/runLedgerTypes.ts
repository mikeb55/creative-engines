/**
 * Composer OS V2 — Run ledger types
 */

/** Run manifest for replay/debug. */
export interface RunManifest {
  composerOsVersion: string;
  seed: number;
  presetId: string;
  /** ECM Chamber only — which chamber mode was active */
  ecmMode?: string;
  /** Title applied to the exported score */
  scoreTitle?: string;
  activeModules: string[];
  /** Optional: categories aligned with module registry (future recording). */
  activeModuleCategories?: string[];
  /** Optional: preset family for manifests (`guitar_bass_duo`, `ecm_chamber`, `song_mode`, …). */
  presetType?: string;
  /** Optional: Song Mode vocal target when preset is song workflow. */
  songModeVoiceType?: string;
  /** Optional: ordered section labels for Song Mode summaries. */
  songSectionSummary?: string[];
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
