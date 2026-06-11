/**
 * PROVISIONAL — Wayne Shorter isolation profile for V86 Commit 2b (modal float tuning).
 * Re-approved in 2b; fixture regenerated after 2b tuning pass.
 * NOT Wayne-authentic; reuses BH pitches for determinism/isolation proof only.
 * Fixture freezes for real only after 2c (native modal benchmark).
 */

import type { PremiumMelodyProfile } from '../premium-melody/premiumMelodyProfile';

export const WS_ISOLATION_PROVISIONAL_PROFILE_ID = 'ws_isolation_provisional';

export function buildWayneShorterIsolationProvisionalProfile(): PremiumMelodyProfile {
  return {
    id: WS_ISOLATION_PROVISIONAL_PROFILE_ID,
    syncopationShiftRate: 0.4,
    anticipationBias: 0.3,
    offbeatTrimCeiling: 0.52,
    barSlotNudgesEnabled: false,
    structuralLandingMode: 'float_preserve',
    expressionCharacter: 'modal_lyric',
    rhythmSeedSalt: 90217,
    // projectedOffbeatBlockThreshold, restPhraseBreakBeats, longNotePhraseBreakBeats: omit -> BH defaults
    // 2b: boost long_gap + delayed so combined share >= 35% on BH benchmark seed 90217
    cellFamilyWeightScale: {
      long_gap: 1.8,
      delayed: 1.5,
    },
  };
}
