/**
 * FROZEN — Wayne Shorter premium-melody profile (V86 Commit 2c).
 * Calibrated on native modal benchmark WS_Benchmark_ModalMelody.musicxml seed 90217.
 * Golden master ws-modal-seed90217 — byte-identical oracle; regenerate only when changing Wayne.
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
    // 2c: boost long_gap + delayed for modal benchmark variety (>=35% combined on seed 90217)
    cellFamilyWeightScale: {
      long_gap: 2.0,
      delayed: 1.65,
    },
  };
}
