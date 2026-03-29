/**
 * Composer OS V2 — App API: write output manifest under `_meta` (MusicXML stays in preset folder).
 */

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

export function writeOutputManifest(
  xmlFilepath: string,
  meta: {
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
  }
): void {
  const manifestPath = manifestPathForMusicXml(xmlFilepath);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  tryHideMetaFolderOnWindows(path.dirname(manifestPath));
  const entry: Partial<OutputEntry> = {
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
  };
  fs.writeFileSync(manifestPath, JSON.stringify(entry, null, 0), 'utf-8');
}
