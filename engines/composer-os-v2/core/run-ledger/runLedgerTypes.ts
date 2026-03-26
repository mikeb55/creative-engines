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
  /** Optional: Song Mode hook id for manifests. */
  songHookId?: string;
  /** Optional: short hook + section summary string. */
  songHookSummary?: string;
  /** Optional: lead-sheet contract ready (structural) flag. */
  songLeadSheetReady?: boolean;
  /** Optional: songwriting modules used on the run (e.g. song_mode_compile). */
  songwritingModuleIds?: string[];
  /** Optional: Big Band planning run — ordered form phases. */
  bigBandFormSequence?: string[];
  /** Optional: orchestration planning succeeded for Big Band mode. */
  bigBandOrchestrationReady?: boolean;
  /** Optional: Big Band planning modules (e.g. big_band_plan). */
  bigBandModuleIds?: string[];
  /** Optional: String Quartet planning — ordered form phases. */
  stringQuartetFormSequence?: string[];
  /** Optional: orchestration planning succeeded for String Quartet mode. */
  stringQuartetOrchestrationReady?: boolean;
  /** Optional: String Quartet planning modules (e.g. string_quartet_plan). */
  stringQuartetModuleIds?: string[];
  /** Optional: reference import source when a behaviour profile was used as influence. */
  referenceSourceKind?: string;
  /** Optional: one-line summary of reference behaviour (not raw score). */
  referenceBehaviourSummary?: string;
  /** Optional: how reference influence was applied (metadata). */
  referenceInfluenceMode?: string;
  referenceInfluenceStrength?: string;
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
  /** Optional UX variation id (maps to seed). */
  variationId?: string;
  creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
  /** Diagnostics when non-stable creative tier applied. */
  experimentalCreativeLabel?: string;
  /** Big band ensemble selection when applicable. */
  bigBandEnsembleConfigId?: string;
  /** V3.4 — key signature inference (MusicXML export metadata). */
  keySignatureInferredTonic?: string;
  keySignatureConfidence?: number;
  keySignatureOverrideUsed?: boolean;
  keySignatureNoneMode?: boolean;
  keySignatureHide?: boolean;
  keySignatureFifths?: number;
  keySignatureExportMode?: 'major' | 'minor';
  /** V3.4b — full receipt for key export. */
  keySignatureInferredKey?: string;
  keySignatureInferredMode?: 'major' | 'minor' | 'ambiguous';
  keySignatureInferredFifths?: number;
  keySignatureModeApplied?: 'auto' | 'override' | 'none';
  keySignatureExportKeyWritten?: boolean;
  /** V3.6b — Receipt: harmony source (custom progression vs built-in cycle). */
  harmonySourceUsed?: 'builtin' | 'custom';
  /** V3.6b — Honest label for internal duo grammar (Barry Harris–derived default engine). */
  styleGrammarLabel?: string;
  styleStackPrimaryModuleId?: string;
  styleStackPrimaryDisplayName?: string;
  userSelectedStyleDisplayNames?: string[];
  userExplicitPrimaryStyle?: boolean;
}
