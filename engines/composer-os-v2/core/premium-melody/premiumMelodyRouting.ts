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
import { enrichMelodyRhythm } from './enrichMelodyRhythm';
import { enrichMelodyExpression } from './enrichMelodyExpression';
import { pinPremiumMelodyExport, type PinPremiumMelodyExportOptions } from './premiumMelodyPin';

export interface PremiumMelodyPipelineResult {
  rhythmMelody: ImportMelodyNote[];
  exportMelody: PremiumMelodyExpressiveNote[];
  rhythmMeta: PremiumMelodyRhythmEnrichmentMeta;
}

export function runPremiumMelodyHarmonyRhythmExpressionPipeline(
  melodyLine: readonly ImportMelodyNote[],
  profile: PremiumMelodyProfile,
  seed: number
): PremiumMelodyPipelineResult {
  const rhythmMeta: PremiumMelodyRhythmEnrichmentMeta = { familyCounts: {}, totalNotes: 0 };
  const rhythmMelody = enrichMelodyRhythm(melodyLine, profile, { seed, meta: rhythmMeta });
  const exportMelody = enrichMelodyExpression(rhythmMelody, profile, { seed, rhythmMeta });
  return { rhythmMelody, exportMelody, rhythmMeta };
}

export interface PremiumMelodyPinResult {
  score: ScoreModel;
  rhythmMelody: ImportMelodyNote[];
  exportMelody: PremiumMelodyExpressiveNote[];
  rhythmMeta: PremiumMelodyRhythmEnrichmentMeta;
}

export function applyPremiumMelodyPinExport(
  score: ScoreModel,
  melodyLine: readonly ImportMelodyNote[],
  profile: PremiumMelodyProfile,
  seed: number,
  pinOptions?: PinPremiumMelodyExportOptions
): PremiumMelodyPinResult {
  const { rhythmMelody, exportMelody, rhythmMeta } =
    runPremiumMelodyHarmonyRhythmExpressionPipeline(melodyLine, profile, seed);
  const newScore = pinPremiumMelodyExport(score, exportMelody, pinOptions);
  return { score: newScore, rhythmMelody, exportMelody, rhythmMeta };
}