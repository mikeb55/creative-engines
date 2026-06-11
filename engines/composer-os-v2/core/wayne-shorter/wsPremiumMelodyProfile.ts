/**
 * PROVISIONAL — Wayne Shorter isolation baseline for V86 Commit 2a only.
 * Tuned in 2b (feel/thresholds) and 2c (native modal benchmark).
 * NOT Wayne-authentic; reuses BH pitches for determinism/isolation proof only.
 * Fixture freezes for real only after 2c.
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
    // projectedOffbeatBlockThreshold, restPhraseBreakBeats, longNotePhraseBreakBeats: omit -> 2-pre BH defaults
  };
}
