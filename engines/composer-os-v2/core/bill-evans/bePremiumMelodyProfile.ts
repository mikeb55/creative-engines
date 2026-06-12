/**
 * PROVISIONAL — Bill Evans isolation profile (V87 Commit 2a).
 * Reuses BH benchmark pitches for isolation/determinism only — native benchmark in 2c.
 * Fixture freezes for real only after 2c native benchmark + threshold calibration.
 */

import type { PremiumMelodyProfile } from '../premium-melody/premiumMelodyProfile';

export const BE_ISOLATION_PROVISIONAL_PROFILE_ID = 'be_isolation_provisional';

export function buildBillEvansIsolationProvisionalProfile(): PremiumMelodyProfile {
  return {
    id: BE_ISOLATION_PROVISIONAL_PROFILE_ID,
    syncopationShiftRate: 0.4,
    anticipationBias: 0.3,
    offbeatTrimCeiling: 0.52,
    barSlotNudgesEnabled: false,
    structuralLandingMode: 'float_preserve',
    expressionCharacter: 'modal_lyric',
    rhythmSeedSalt: 90301,
    // projectedOffbeatBlockThreshold, restPhraseBreakBeats, longNotePhraseBreakBeats: omit -> BH defaults
    // 2b: add cellFamilyWeightScale when tuning
  };
}
