/**
 * Default singer profiles — placeholders reuse tenor-ish ranges until expanded.
 */

import type { SingerRangeProfile, SingerProfileId } from './singerRangeTypes';

const MALE_TENOR: SingerRangeProfile = {
  id: 'male_tenor',
  comfortRangeMidi: [48, 67],
  absoluteRangeMidi: [43, 72],
  maxChorusLiftSemitones: 3,
};

const PLACEHOLDER_ALTO: SingerRangeProfile = {
  id: 'female_alto',
  comfortRangeMidi: [55, 72],
  absoluteRangeMidi: [52, 77],
  maxChorusLiftSemitones: 3,
};

const PLACEHOLDER_BARITONE: SingerRangeProfile = {
  id: 'baritone',
  comfortRangeMidi: [45, 64],
  absoluteRangeMidi: [40, 67],
  maxChorusLiftSemitones: 2,
};

const PLACEHOLDER_SOPRANO: SingerRangeProfile = {
  id: 'soprano',
  comfortRangeMidi: [60, 77],
  absoluteRangeMidi: [55, 84],
  maxChorusLiftSemitones: 4,
};

const BY_ID: Record<string, SingerRangeProfile> = {
  male_tenor: MALE_TENOR,
  female_alto: PLACEHOLDER_ALTO,
  baritone: PLACEHOLDER_BARITONE,
  soprano: PLACEHOLDER_SOPRANO,
};

export function getSingerRangeProfile(id: SingerProfileId): SingerRangeProfile {
  return BY_ID[id] ?? MALE_TENOR;
}
