/**
 * V85 Phase 3 - BH melody rhythm cell library (re-export facade).
 * Implementation lives in core/premium-melody/.
 */

import {
  BEATS_PER_BAR,
  type PremiumMelodyCellFamily,
  type PremiumMelodyCellTemplate,
  type PremiumMelodyRhythmEnrichmentMeta,
  familyWeightForPhase,
  interiorOnsetFromCellLibrary,
  pickWeightedTemplate,
  selectRhythmCellForNote,
} from '../premium-melody/premiumMelodyCellLibrary';
import { resolvePremiumMelodyOnsetCollisionsSmart } from '../premium-melody/premiumMelodyCollision';
import {
  onsetClassDominance,
  melodyIoiEntropy,
  durationTrigramDiversity,
  phraseDensityArcPresent,
} from '../premium-melody/premiumMelodyMetrics';
import { deriveMelodyRhythmSeed, mulberry32 } from '../premium-melody/premiumMelodyPrng';

export { BEATS_PER_BAR };

export type BhCellFamily = PremiumMelodyCellFamily;
export type CellTemplate = PremiumMelodyCellTemplate;
export type BhRhythmEnrichmentMeta = PremiumMelodyRhythmEnrichmentMeta;

export {
  mulberry32,
  familyWeightForPhase,
  pickWeightedTemplate,
  selectRhythmCellForNote,
  interiorOnsetFromCellLibrary,
  onsetClassDominance,
  melodyIoiEntropy,
  durationTrigramDiversity,
  phraseDensityArcPresent,
};

/** Deterministic per-note seed derived from generation seed and note index. */
export function deriveBhMelodyRhythmSeed(baseSeed: number, noteIndex: number): number {
  return deriveMelodyRhythmSeed(baseSeed, noteIndex);
}

export function resolveBhMelodyOnsetCollisionsSmart(
  notes: Parameters<typeof resolvePremiumMelodyOnsetCollisionsSmart>[0]
): ReturnType<typeof resolvePremiumMelodyOnsetCollisionsSmart> {
  return resolvePremiumMelodyOnsetCollisionsSmart(notes);
}
