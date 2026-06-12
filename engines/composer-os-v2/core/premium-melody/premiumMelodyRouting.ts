/**
 * Shared premium-melody pipeline helpers.
 * Used by Wayne Shorter (and future non-BH composers) to run rhythm + expression + pin in one call.
 * BH chord-melody path uses applyChordMelodyToScore separately and does NOT use these helpers.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { PremiumMelodyProfile } from './premiumMelodyProfile';
import type { PremiumMelodyRhythmEnrichmentMeta } from './premiumMelodyCellLibrary';
import type { PremiumMelodyExpressiveNote } from './enrichMelodyExpression';
import type { PremiumMelodyPitchTraceEvent } from './premiumMelodyPitchProfile';
import { enrichMelodyRhythm } from './enrichMelodyRhythm';
import { enrichMelodyExpression } from './enrichMelodyExpression';
import { pinPremiumMelodyExport, type PinPremiumMelodyExportOptions } from './premiumMelodyPin';
import {
  applyPremiumMelodySurfaceOrnaments,
  runPremiumMelodyPitchPipeline,
  type PremiumMelodyPitchPipelineOptions,
} from './premiumMelodyPitchPipeline';

export interface PremiumMelodyPipelineOptions extends PremiumMelodyPitchPipelineOptions {
  seed?: number;
}

export function harmonyByBarFromImportTimeline(
  ir: { harmonyByBar: ReadonlyArray<{ bar: number; chordSymbol: string }> }
): Record<number, string> {
  const out: Record<number, string> = {};
  for (const h of ir.harmonyByBar) {
    out[h.bar] = h.chordSymbol;
  }
  return out;
}

export interface PremiumMelodyPipelineResult {
  rhythmMelody: ImportMelodyNote[];
  exportMelody: PremiumMelodyExpressiveNote[];
  rhythmMeta: PremiumMelodyRhythmEnrichmentMeta;
  pitchTrace?: PremiumMelodyPitchTraceEvent[];
}

export function runPremiumMelodyHarmonyRhythmExpressionPipeline(
  melodyLine: readonly ImportMelodyNote[],
  profile: PremiumMelodyProfile,
  seed: number,
  options?: PremiumMelodyPipelineOptions
): PremiumMelodyPipelineResult {
  const normalizedSeed = ((options?.seed ?? seed) >>> 0);
  const rhythmMeta: PremiumMelodyRhythmEnrichmentMeta = { familyCounts: {}, totalNotes: 0 };
  const rhythmMelody = enrichMelodyRhythm(melodyLine, profile, {
    seed: normalizedSeed,
    meta: rhythmMeta,
  });

  let pitchMelody = rhythmMelody;
  let slotList: ReturnType<typeof runPremiumMelodyPitchPipeline>['slotList'] | undefined;
  let pitchTrace: PremiumMelodyPitchTraceEvent[] | undefined;

  const pitchProfile = profile.pitchProfile;
  if (pitchProfile != null) {
    const pitchResult = runPremiumMelodyPitchPipeline(
      rhythmMelody,
      profile,
      pitchProfile,
      normalizedSeed,
      options
    );
    pitchMelody = pitchResult.pitchMelody;
    slotList = pitchResult.slotList;
    pitchTrace = pitchResult.pitchTrace;
  }

  let exportMelody = enrichMelodyExpression(pitchMelody, profile, {
    seed: normalizedSeed,
    rhythmMeta,
  });

  if (pitchProfile != null && pitchProfile.surfaceRules != null && slotList != null) {
    exportMelody = applyPremiumMelodySurfaceOrnaments(
      exportMelody,
      slotList,
      pitchProfile,
      normalizedSeed
    );
  }

  return { rhythmMelody, exportMelody, rhythmMeta, pitchTrace };
}

export interface PremiumMelodyPinResult {
  score: ScoreModel;
  rhythmMelody: ImportMelodyNote[];
  exportMelody: PremiumMelodyExpressiveNote[];
  rhythmMeta: PremiumMelodyRhythmEnrichmentMeta;
  pitchTrace?: PremiumMelodyPitchTraceEvent[];
}

export function applyPremiumMelodyPinExport(
  score: ScoreModel,
  melodyLine: readonly ImportMelodyNote[],
  profile: PremiumMelodyProfile,
  seed: number,
  pinOptions?: PinPremiumMelodyExportOptions,
  pipelineOptions?: PremiumMelodyPipelineOptions
): PremiumMelodyPinResult {
  const { rhythmMelody, exportMelody, rhythmMeta, pitchTrace } =
    runPremiumMelodyHarmonyRhythmExpressionPipeline(melodyLine, profile, seed, pipelineOptions);
  const newScore = pinPremiumMelodyExport(score, exportMelody, pinOptions);
  return { score: newScore, rhythmMelody, exportMelody, rhythmMeta, pitchTrace };
}
