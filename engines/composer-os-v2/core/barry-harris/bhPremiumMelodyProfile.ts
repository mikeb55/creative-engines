/**
 * Barry Harris premium-melody profile builder.
 * Maps BH melody rhythm profile (incl. offbeatPassingDimBias for passing-dim path) to shared engine profile.
 */

import type { PremiumMelodyProfile } from '../premium-melody/premiumMelodyProfile';
import type { BhMelodyRhythmProfile } from './bhMelodyRhythmProfile';

export function buildBarryHarrisPremiumMelodyProfile(
  bhProfile: BhMelodyRhythmProfile
): PremiumMelodyProfile {
  return {
    id: bhProfile.id,
    syncopationShiftRate: bhProfile.syncopationShiftRate,
    anticipationBias: bhProfile.anticipationBias,
  };
}
