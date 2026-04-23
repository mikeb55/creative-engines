/**
 * Composer OS V2 — Run manifest generator
 * Essential for replay/debug.
 */

import type { RunManifest } from './runLedgerTypes';
import type { GuitarVoice2PolyphonyDiagnostics } from '../goldenPath/guitarVoice2PolyphonyDiagnostics';
import type { WybleConsumptionReceipt } from '../wyble/wybleConsumptionReceipt';
import type {
  SongModeSectionBehaviourDescriptor,
  SongModeSectionShapingDiagnosticsV1,
} from '../song-mode/songModeSectionTypes';

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
  validationWarnings?: string[];
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
  harmonySourceUsed?: 'builtin' | 'custom';
  styleGrammarLabel?: string;
  styleStackPrimaryModuleId?: string;
  styleStackPrimaryDisplayName?: string;
  userSelectedStyleDisplayNames?: string[];
  userExplicitPrimaryStyle?: boolean;
  chordProgressionSubmittedRaw?: string;
  parsedChordBarsSnapshot?: string[];
  pipelineTruthInputStage?: 'pass' | 'fail' | 'skip';
  pipelineTruthScoreStage?: 'pass' | 'fail' | 'skip';
  pipelineTruthExportStage?: 'pass' | 'fail' | 'skip';
  songModeRhythmOverlayPhraseDiagnostics?: string;
  songModeJamesBrownFunkReceiptTag?: string;
  rhythmIntentD1Receipt?: string;
  duoModeReceiptLabel?: string;
  voice2PolyphonyDiagnostics?: GuitarVoice2PolyphonyDiagnostics;
  wybleConsumptionReceipt?: WybleConsumptionReceipt;
  songModeStyleSurfaceNotes?: string[];
  songModeDonaldFagenC1Receipt?: string;
  songModeSectionShapingDiagnostics?: SongModeSectionShapingDiagnosticsV1;
  songModeSectionBehaviourDescriptors?: SongModeSectionBehaviourDescriptor[];
  songModeProfileRuleDiagnostics?: RunManifest['songModeProfileRuleDiagnostics'];
  songModeLeadSheetInputApplied?: RunManifest['songModeLeadSheetInputApplied'];
  songModeLeadSheetAnchorStartApplied?: RunManifest['songModeLeadSheetAnchorStartApplied'];
  songModeLeadSheetExpressionStrength?: RunManifest['songModeLeadSheetExpressionStrength'];
  importHarmonyMode?: RunManifest['importHarmonyMode'];
  importHarmonyModeSource?: RunManifest['importHarmonyModeSource'];
  harmonyBlendRaw?: RunManifest['harmonyBlendRaw'];
  importHarmonyLockApplied?: RunManifest['importHarmonyLockApplied'];
  importHarmonyLockFallbackReason?: RunManifest['importHarmonyLockFallbackReason'];
  importHarmonyLockedBarsCount?: RunManifest['importHarmonyLockedBarsCount'];
  motifAuthorityLevel?: RunManifest['motifAuthorityLevel'];
  motifDevelopmentSummary?: RunManifest['motifDevelopmentSummary'];
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
    validationWarnings: input.validationWarnings,
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
    harmonySourceUsed: input.harmonySourceUsed,
    styleGrammarLabel: input.styleGrammarLabel,
    styleStackPrimaryModuleId: input.styleStackPrimaryModuleId,
    styleStackPrimaryDisplayName: input.styleStackPrimaryDisplayName,
    userSelectedStyleDisplayNames: input.userSelectedStyleDisplayNames,
    userExplicitPrimaryStyle: input.userExplicitPrimaryStyle,
    chordProgressionSubmittedRaw: input.chordProgressionSubmittedRaw,
    parsedChordBarsSnapshot: input.parsedChordBarsSnapshot,
    pipelineTruthInputStage: input.pipelineTruthInputStage,
    pipelineTruthScoreStage: input.pipelineTruthScoreStage,
    pipelineTruthExportStage: input.pipelineTruthExportStage,
    songModeRhythmOverlayPhraseDiagnostics: input.songModeRhythmOverlayPhraseDiagnostics,
    songModeJamesBrownFunkReceiptTag: input.songModeJamesBrownFunkReceiptTag,
    rhythmIntentD1Receipt: input.rhythmIntentD1Receipt,
    duoModeReceiptLabel: input.duoModeReceiptLabel,
    voice2PolyphonyDiagnostics: input.voice2PolyphonyDiagnostics,
    wybleConsumptionReceipt: input.wybleConsumptionReceipt,
    songModeStyleSurfaceNotes: input.songModeStyleSurfaceNotes,
    songModeDonaldFagenC1Receipt: input.songModeDonaldFagenC1Receipt,
    songModeSectionShapingDiagnostics: input.songModeSectionShapingDiagnostics,
    songModeSectionBehaviourDescriptors: input.songModeSectionBehaviourDescriptors,
    songModeProfileRuleDiagnostics: input.songModeProfileRuleDiagnostics,
    songModeLeadSheetInputApplied: input.songModeLeadSheetInputApplied,
    songModeLeadSheetAnchorStartApplied: input.songModeLeadSheetAnchorStartApplied,
    songModeLeadSheetExpressionStrength: input.songModeLeadSheetExpressionStrength,
    importHarmonyMode: input.importHarmonyMode,
    importHarmonyModeSource: input.importHarmonyModeSource,
    harmonyBlendRaw: input.harmonyBlendRaw,
    importHarmonyLockApplied: input.importHarmonyLockApplied,
    importHarmonyLockFallbackReason: input.importHarmonyLockFallbackReason,
    importHarmonyLockedBarsCount: input.importHarmonyLockedBarsCount,
    motifAuthorityLevel: input.motifAuthorityLevel,
    motifDevelopmentSummary: input.motifDevelopmentSummary,
  };
}
