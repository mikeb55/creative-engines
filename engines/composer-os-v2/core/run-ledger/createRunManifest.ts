/**
 * Composer OS V2 — Run manifest generator
 * Essential for replay/debug.
 */

import type { RunManifest } from './runLedgerTypes';

export interface CreateRunManifestInput {
  version: string;
  seed: number;
  presetId: string;
  ecmMode?: string;
  scoreTitle?: string;
  activeModules: string[];
  activeModuleCategories?: string[];
  presetType?: string;
  songModeVoiceType?: string;
  songSectionSummary?: string[];
  songHookId?: string;
  songHookSummary?: string;
  songLeadSheetReady?: boolean;
  songwritingModuleIds?: string[];
  bigBandFormSequence?: string[];
  bigBandOrchestrationReady?: boolean;
  bigBandModuleIds?: string[];
  stringQuartetFormSequence?: string[];
  stringQuartetOrchestrationReady?: boolean;
  stringQuartetModuleIds?: string[];
  referenceSourceKind?: string;
  referenceBehaviourSummary?: string;
  referenceInfluenceMode?: string;
  referenceInfluenceStrength?: string;
  feelMode: string;
  instrumentProfiles: string[];
  readinessScores: { release: number; mx: number };
  validationPassed: boolean;
  validationErrors?: string[];
  exportTarget?: string;
  timestamp: string;
  variationId?: string;
  creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
  experimentalCreativeLabel?: string;
  bigBandEnsembleConfigId?: string;
  keySignatureInferredTonic?: string;
  keySignatureConfidence?: number;
  keySignatureOverrideUsed?: boolean;
  keySignatureNoneMode?: boolean;
  keySignatureHide?: boolean;
  keySignatureFifths?: number;
  keySignatureExportMode?: 'major' | 'minor';
  keySignatureInferredKey?: string;
  keySignatureInferredMode?: 'major' | 'minor' | 'ambiguous';
  keySignatureInferredFifths?: number;
  keySignatureModeApplied?: 'auto' | 'override' | 'none';
  keySignatureExportKeyWritten?: boolean;
}

/** Create run manifest. */
export function createRunManifest(input: CreateRunManifestInput): RunManifest {
  return {
    composerOsVersion: input.version,
    seed: input.seed,
    presetId: input.presetId,
    ecmMode: input.ecmMode,
    scoreTitle: input.scoreTitle,
    activeModules: input.activeModules,
    activeModuleCategories: input.activeModuleCategories,
    presetType: input.presetType,
    songModeVoiceType: input.songModeVoiceType,
    songSectionSummary: input.songSectionSummary,
    songHookId: input.songHookId,
    songHookSummary: input.songHookSummary,
    songLeadSheetReady: input.songLeadSheetReady,
    songwritingModuleIds: input.songwritingModuleIds,
    bigBandFormSequence: input.bigBandFormSequence,
    bigBandOrchestrationReady: input.bigBandOrchestrationReady,
    bigBandModuleIds: input.bigBandModuleIds,
    stringQuartetFormSequence: input.stringQuartetFormSequence,
    stringQuartetOrchestrationReady: input.stringQuartetOrchestrationReady,
    stringQuartetModuleIds: input.stringQuartetModuleIds,
    referenceSourceKind: input.referenceSourceKind,
    referenceBehaviourSummary: input.referenceBehaviourSummary,
    referenceInfluenceMode: input.referenceInfluenceMode,
    referenceInfluenceStrength: input.referenceInfluenceStrength,
    feelMode: input.feelMode,
    instrumentProfiles: input.instrumentProfiles,
    readinessScores: input.readinessScores,
    validationPassed: input.validationPassed,
    validationErrors: input.validationErrors,
    exportTarget: input.exportTarget,
    timestamp: input.timestamp,
    variationId: input.variationId,
    creativeControlLevel: input.creativeControlLevel,
    experimentalCreativeLabel: input.experimentalCreativeLabel,
    bigBandEnsembleConfigId: input.bigBandEnsembleConfigId,
    keySignatureInferredTonic: input.keySignatureInferredTonic,
    keySignatureConfidence: input.keySignatureConfidence,
    keySignatureOverrideUsed: input.keySignatureOverrideUsed,
    keySignatureNoneMode: input.keySignatureNoneMode,
    keySignatureHide: input.keySignatureHide,
    keySignatureFifths: input.keySignatureFifths,
    keySignatureExportMode: input.keySignatureExportMode,
    keySignatureInferredKey: input.keySignatureInferredKey,
    keySignatureInferredMode: input.keySignatureInferredMode,
    keySignatureInferredFifths: input.keySignatureInferredFifths,
    keySignatureModeApplied: input.keySignatureModeApplied,
    keySignatureExportKeyWritten: input.keySignatureExportKeyWritten,
  };
}
