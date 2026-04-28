/**
 * Composer OS V2 — App API: write output manifest under `_meta` (MusicXML stays in preset folder).
 */

import type { ChordExportDiagnosticsReceipt } from '../../core/chordExportDiagnostics';
import type { OutputEntry, StyleProfile, ValidationSummary } from './appApiTypes';
import type { GenerationMetadata } from '../core/compositionContext';
import { manifestPathForMusicXml } from './composerOsOutputPaths';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function tryHideMetaFolderOnWindows(metaDir: string): void {
  if (process.platform !== 'win32') return;
  try {
    execSync(`attrib +h "${metaDir.replace(/"/g, '\\"')}"`, { stdio: 'ignore' });
  } catch {
    /* optional */
  }
}

function buildSongModeDiagnosticsSummary(meta: {
  songModeSectionShapingDiagnostics?: GenerationMetadata['songModeSectionShapingDiagnostics'];
  songModeSectionBehaviourDescriptors?: GenerationMetadata['songModeSectionBehaviourDescriptors'];
  songModeProfileRuleDiagnostics?: GenerationMetadata['songModeProfileRuleDiagnostics'];
}): OutputEntry['songModeDiagnosticsSummary'] | undefined {
  const shape = meta.songModeSectionShapingDiagnostics;
  const desc = meta.songModeSectionBehaviourDescriptors ?? [];
  const profile = meta.songModeProfileRuleDiagnostics;
  if (!shape && desc.length === 0 && !profile) return undefined;
  const sectionSources = ['OPENING', 'BRIDGE_LIFT', 'RETURN', 'OUTRO', 'WHOLE']
    .map((role) => {
      const sources = desc
        .filter((d) => {
          const hasDensity = typeof d.densityBiasByRole?.[role as keyof typeof d.densityBiasByRole] === 'number';
          const hasColour = typeof d.harmonicColourBiasByRole?.[role as keyof typeof d.harmonicColourBiasByRole] === 'number';
          const hasRegister = typeof d.registerBiasByRole?.[role as keyof typeof d.registerBiasByRole] === 'number';
          const hasReturn = role === 'RETURN' && typeof d.returnVariationType === 'string';
          return hasDensity || hasColour || hasRegister || hasReturn;
        })
        .map((d) => d.sliceId);
      if (sources.length === 0) return null;
      return `${role}:${sources.join('|')}`;
    })
    .filter((x): x is string => x != null);
  return {
    profile:
      profile != null
        ? `profile=${profile.styleProfile ?? '-'} primary=${profile.primarySongwriterStyleId ?? '-'} secondary=${profile.secondarySongwriterStyleId ?? '-'}`
        : undefined,
    rules:
      profile?.resolvedRuleIds?.length != null && profile.resolvedRuleIds.length > 0
        ? `rules=${profile.resolvedRuleIds.length} comp=${profile.songwriterCompProfileId ?? '-'} bundle=${profile.bacharachSongModeRuleBundleId ?? '-'}`
        : undefined,
    sectionShape:
      shape != null
        ? `dB-A=${shape.densityDeltaBMinusA ?? 'n/a'} cB-A=${shape.colourDeltaBMinusA ?? 'n/a'} openRet=${shape.openingVsReturnDelta ?? 'n/a'} return=${shape.returnVariationType ?? '-'}`
        : undefined,
    sectionSources,
  };
}

export function writeOutputManifest(
  xmlFilepath: string,
  meta: {
    chordExportDiagnostics?: ChordExportDiagnosticsReceipt;
    presetId: string;
    styleStack: string[];
    seed: number;
    timestamp: string;
    variationId?: string;
    creativeControlLevel?: 'stable' | 'balanced' | 'surprise';
    scoreTitle?: string;
    ecmMode?: string;
    harmonySource?: 'builtin' | 'custom';
    customChordProgressionSummary?: string;
    progressionMode?: 'builtin' | 'custom';
    chordProgressionInputRaw?: string;
    parsedCustomProgressionBars?: string[];
    chordProgressionParseFailed?: boolean;
    builtInHarmonyFallbackOccurred?: boolean;
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
    duoModeReceiptLabel?: string;
    styleProfile?: StyleProfile;
    chordProgressionSubmittedRaw?: string;
    parsedChordBarsSnapshot?: string[];
    pipelineTruthInputStage?: 'pass' | 'fail' | 'skip';
    pipelineTruthScoreStage?: 'pass' | 'fail' | 'skip';
    pipelineTruthExportStage?: 'pass' | 'fail' | 'skip';
    validation: ValidationSummary;
    /** Song Mode Phase C2: compact JSON (same as run manifest). */
    songModeRhythmOverlayPhraseDiagnostics?: string;
    /** Song Mode Phase C2: per-phrase overlay + rhythm intent (optional disk echo). */
    songModeRhythmOverlayByPhrase?: GenerationMetadata['songModeRhythmOverlayByPhrase'];
    rhythmIntentD1Receipt?: string;
    c4_hook_rhythm_applied?: boolean;
    c4_bars_used?: number[];
    songModeStyleSurfaceNotes?: string[];
    songModeDonaldFagenC1Receipt?: string;
    /** Song Mode — resolved primary songwriter id (eval / receipts). */
    songwriterStyleId?: string;
    brianWilsonPetSoundsDiagnostics?: GenerationMetadata['brianWilsonPetSoundsDiagnostics'];
    brianWilsonPetSoundsDeviceReceipts?: GenerationMetadata['brianWilsonPetSoundsDeviceReceipts'];
    brianWilsonPetSoundsSliceReceipt?: GenerationMetadata['brianWilsonPetSoundsSliceReceipt'];
    brianWilsonEffectiveHarmonyBars?: GenerationMetadata['brianWilsonEffectiveHarmonyBars'];
    songModeFagenKeysCompV15Applied?: boolean;
    fagenKeysCompMusicalDiagnostics?: GenerationMetadata['fagenKeysCompMusicalDiagnostics'];
    sophisticatedPopHarmonyDiagnostics?: GenerationMetadata['sophisticatedPopHarmonyDiagnostics'];
    bacharachHarmonyDiagnostics?: GenerationMetadata['bacharachHarmonyDiagnostics'];
    bacharachSongModeRuleBundleId?: string;
    songwriterSyncopationBias?: number;
    songwriterDensityBias?: number;
    songModeSectionShapingDiagnostics?: GenerationMetadata['songModeSectionShapingDiagnostics'];
    songModeSectionBehaviourDescriptors?: GenerationMetadata['songModeSectionBehaviourDescriptors'];
    songModeProfileRuleDiagnostics?: GenerationMetadata['songModeProfileRuleDiagnostics'];
    motifAuthorityLevel?: GenerationMetadata['motifAuthorityLevel'];
    motifDevelopmentSummary?: GenerationMetadata['motifDevelopmentSummary'];
    gceScore?: number;
    gceGatePassed?: boolean;
    riffCompositeScore?: number;
    riffInternalGatePassed?: boolean;
    riffQualityRules?: import('../core/riff-generator/riffQualityRules').RiffQualityManifestCompact;
    /** Stage 4: echoed when import-harmony telemetry is present (`core/importHarmonyPolicy.ts`). */
    importHarmonyPolicyVersion?: number;
  }
): void {
  const manifestPath = manifestPathForMusicXml(xmlFilepath);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  tryHideMetaFolderOnWindows(path.dirname(manifestPath));
  const entry: Partial<OutputEntry> = {
    chordExportDiagnostics: meta.chordExportDiagnostics,
    presetId: meta.presetId,
    styleStack: meta.styleStack,
    seed: meta.seed,
    variationId: meta.variationId,
    creativeControlLevel: meta.creativeControlLevel,
    timestamp: meta.timestamp,
    scoreTitle: meta.scoreTitle,
    ecmMode: meta.ecmMode,
    harmonySource: meta.harmonySource,
    customChordProgressionSummary: meta.customChordProgressionSummary,
    progressionMode: meta.progressionMode,
    chordProgressionInputRaw: meta.chordProgressionInputRaw,
    parsedCustomProgressionBars: meta.parsedCustomProgressionBars,
    chordProgressionParseFailed: meta.chordProgressionParseFailed,
    builtInHarmonyFallbackOccurred: meta.builtInHarmonyFallbackOccurred,
    keySignatureInferredTonic: meta.keySignatureInferredTonic,
    keySignatureConfidence: meta.keySignatureConfidence,
    keySignatureOverrideUsed: meta.keySignatureOverrideUsed,
    keySignatureNoneMode: meta.keySignatureNoneMode,
    keySignatureHide: meta.keySignatureHide,
    keySignatureFifths: meta.keySignatureFifths,
    keySignatureExportMode: meta.keySignatureExportMode,
    keySignatureInferredKey: meta.keySignatureInferredKey,
    keySignatureInferredMode: meta.keySignatureInferredMode,
    keySignatureInferredFifths: meta.keySignatureInferredFifths,
    keySignatureModeApplied: meta.keySignatureModeApplied,
    keySignatureExportKeyWritten: meta.keySignatureExportKeyWritten,
    harmonySourceUsed: meta.harmonySourceUsed,
    styleGrammarLabel: meta.styleGrammarLabel,
    styleStackPrimaryModuleId: meta.styleStackPrimaryModuleId,
    styleStackPrimaryDisplayName: meta.styleStackPrimaryDisplayName,
    userSelectedStyleDisplayNames: meta.userSelectedStyleDisplayNames,
    userExplicitPrimaryStyle: meta.userExplicitPrimaryStyle,
    duoModeReceiptLabel: meta.duoModeReceiptLabel,
    styleProfile: meta.styleProfile,
    chordProgressionSubmittedRaw: meta.chordProgressionSubmittedRaw,
    parsedChordBarsSnapshot: meta.parsedChordBarsSnapshot,
    pipelineTruthInputStage: meta.pipelineTruthInputStage,
    pipelineTruthScoreStage: meta.pipelineTruthScoreStage,
    pipelineTruthExportStage: meta.pipelineTruthExportStage,
    validation: meta.validation,
    songModeRhythmOverlayPhraseDiagnostics: meta.songModeRhythmOverlayPhraseDiagnostics,
    songModeRhythmOverlayByPhrase: meta.songModeRhythmOverlayByPhrase,
    rhythmIntentD1Receipt: meta.rhythmIntentD1Receipt,
    c4_hook_rhythm_applied: meta.c4_hook_rhythm_applied,
    c4_bars_used: meta.c4_bars_used,
    songModeStyleSurfaceNotes: meta.songModeStyleSurfaceNotes,
    songModeDonaldFagenC1Receipt: meta.songModeDonaldFagenC1Receipt,
    songwriterStyleId: meta.songwriterStyleId,
    brianWilsonPetSoundsDiagnostics: meta.brianWilsonPetSoundsDiagnostics,
    brianWilsonPetSoundsDeviceReceipts: meta.brianWilsonPetSoundsDeviceReceipts,
    brianWilsonPetSoundsSliceReceipt: meta.brianWilsonPetSoundsSliceReceipt,
    brianWilsonEffectiveHarmonyBars: meta.brianWilsonEffectiveHarmonyBars,
    songModeFagenKeysCompV15Applied: meta.songModeFagenKeysCompV15Applied,
    fagenKeysCompMusicalDiagnostics: meta.fagenKeysCompMusicalDiagnostics,
    sophisticatedPopHarmonyDiagnostics: meta.sophisticatedPopHarmonyDiagnostics,
    bacharachHarmonyDiagnostics: meta.bacharachHarmonyDiagnostics,
    bacharachSongModeRuleBundleId: meta.bacharachSongModeRuleBundleId,
    songwriterSyncopationBias: meta.songwriterSyncopationBias,
    songwriterDensityBias: meta.songwriterDensityBias,
    songModeSectionShapingDiagnostics: meta.songModeSectionShapingDiagnostics,
    songModeSectionBehaviourDescriptors: meta.songModeSectionBehaviourDescriptors,
    songModeProfileRuleDiagnostics: meta.songModeProfileRuleDiagnostics,
    motifAuthorityLevel: meta.motifAuthorityLevel,
    motifDevelopmentSummary: meta.motifDevelopmentSummary,
    songModeDiagnosticsSummary: buildSongModeDiagnosticsSummary(meta),
    gceScore: meta.gceScore,
    gceGatePassed: meta.gceGatePassed,
    riffCompositeScore: meta.riffCompositeScore,
    riffInternalGatePassed: meta.riffInternalGatePassed,
    riffQualityRules: meta.riffQualityRules,
    importHarmonyPolicyVersion: meta.importHarmonyPolicyVersion,
  };
  fs.writeFileSync(manifestPath, JSON.stringify(entry, null, 0), 'utf-8');
}
