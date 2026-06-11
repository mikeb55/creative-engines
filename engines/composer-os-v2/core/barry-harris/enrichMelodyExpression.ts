/**
 * V85 Phase 3b - BH melody expression adapter.
 * Implementation lives in core/premium-melody/.
 */

import type { Articulation } from '../score-model/scoreModelTypes';
import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import {
  enrichMelodyExpression as sharedEnrichMelodyExpression,
  assertPreserveMelodyTimingGrid,
  distinctArticulationTypes,
  phraseVelocitySpread,
  PreserveMelodyTimingGridError,
  type PremiumMelodyDurationAccentKind,
  type PremiumMelodyExpressionEnrichmentMeta,
  type PremiumMelodyExpressiveNote,
} from '../premium-melody/enrichMelodyExpression';
import type { BhMelodyRhythmProfile } from './bhMelodyRhythmProfile';
import { buildBarryHarrisPremiumMelodyProfile } from './bhPremiumMelodyProfile';
import type { BhRhythmEnrichmentMeta } from './bhRhythmCellLibrary';

export type BhDurationAccentKind = PremiumMelodyDurationAccentKind;

export interface BhExpressiveMelodyNote extends ImportMelodyNote {
  articulation?: Articulation;
  velocity?: number;
  durationAccent?: BhDurationAccentKind;
}

export interface BhExpressionEnrichmentMeta extends PremiumMelodyExpressionEnrichmentMeta {}

export {
  assertPreserveMelodyTimingGrid,
  distinctArticulationTypes,
  phraseVelocitySpread,
  PreserveMelodyTimingGridError,
};

export function enrichMelodyExpression(
  rhythmMelody: readonly ImportMelodyNote[],
  profile: BhMelodyRhythmProfile,
  options?: { seed?: number; rhythmMeta?: BhRhythmEnrichmentMeta; meta?: BhExpressionEnrichmentMeta }
): BhExpressiveMelodyNote[] {
  return sharedEnrichMelodyExpression(
    rhythmMelody,
    buildBarryHarrisPremiumMelodyProfile(profile),
    options
  ) as BhExpressiveMelodyNote[];
}
