/**
 * V85 Phase 3 - BH melody rhythm enrichment adapter.
 * Implementation lives in core/premium-melody/.
 */

import type { ImportMelodyNote } from '../import/mosaicImportTimeline';
import {
  enrichMelodyRhythm as sharedEnrichMelodyRhythm,
  assertPreservePitchSequence,
  PreservePitchSequenceError,
} from '../premium-melody/enrichMelodyRhythm';
import {
  melodySyncopationScore,
  melodyOffbeatRatio,
  melodyStructuralLandingCount,
  distinctMelodyIoiBuckets,
  onsetClassDominance,
  melodyIoiEntropy,
  durationTrigramDiversity,
  phraseDensityArcPresent,
} from '../premium-melody/premiumMelodyMetrics';
import {
  detectPhraseRoles,
  indexInPhrase,
  phraseLengthAt,
  isStructuralLandingIndex,
  type PremiumMelodyPhraseRoles,
} from '../premium-melody/premiumMelodyPhrase';
import type { BhMelodyRhythmProfile } from './bhMelodyRhythmProfile';
import { buildBarryHarrisPremiumMelodyProfile } from './bhPremiumMelodyProfile';
import type { BhRhythmEnrichmentMeta, BhCellFamily } from './bhRhythmCellLibrary';

export {
  assertPreservePitchSequence,
  PreservePitchSequenceError,
  melodySyncopationScore,
  melodyOffbeatRatio,
  melodyStructuralLandingCount,
  distinctMelodyIoiBuckets,
  onsetClassDominance,
  melodyIoiEntropy,
  durationTrigramDiversity,
  phraseDensityArcPresent,
};

export type { BhRhythmEnrichmentMeta, BhCellFamily } from './bhRhythmCellLibrary';

export type BhPhraseRoles = PremiumMelodyPhraseRoles;

export function bhDetectPhraseRoles(melody: readonly ImportMelodyNote[]): BhPhraseRoles {
  const ordered = [...melody].sort(
    (a, b) => a.bar - b.bar || a.onsetBeat - b.onsetBeat || a.midiPitch - b.midiPitch
  );
  return detectPhraseRoles(ordered);
}

export function isBhStructuralLandingIndex(index: number, roles: BhPhraseRoles): boolean {
  return isStructuralLandingIndex(index, roles);
}

export function bhIndexInPhrase(
  melody: readonly ImportMelodyNote[],
  index: number,
  roles: BhPhraseRoles
): number {
  return indexInPhrase(melody, index, roles);
}

export function bhPhraseLengthAt(index: number, roles: BhPhraseRoles, total: number): number {
  return phraseLengthAt(index, roles, total);
}

/**
 * Returns same pitch sequence with BH-profile onsets only (V85 Phase 3 - cell library).
 * Throws if output pitches diverge from input (preservePitchSequence contract).
 */
export function enrichMelodyRhythm(
  melody: readonly ImportMelodyNote[],
  profile: BhMelodyRhythmProfile,
  options?: { seed?: number; meta?: BhRhythmEnrichmentMeta }
): ImportMelodyNote[] {
  return sharedEnrichMelodyRhythm(melody, buildBarryHarrisPremiumMelodyProfile(profile), options);
}
