/**
 * V83d Phase 2 — BH-only melody rhythm profile (Barry Harris chord-melody path).
 * Not generalised to other composers this session.
 */

export type BhMelodyRhythmProfileId = 'bebop_step' | 'enclosure_heavy' | 'scalar_embellish';

export interface BhMelodyRhythmProfile {
  id: BhMelodyRhythmProfileId;
  /** 0–1 — share of quarter-grid strong attacks pushed off-grid. */
  syncopationShiftRate: number;
  /** 0–1 — prefer eighth anticipations (±0.5) over weak-quarter slots. */
  anticipationBias: number;
}

export const BH_MELODY_RHYTHM_PROFILES: Record<BhMelodyRhythmProfileId, BhMelodyRhythmProfile> = {
  bebop_step: {
    id: 'bebop_step',
    syncopationShiftRate: 1,
    anticipationBias: 0.7,
  },
  enclosure_heavy: {
    id: 'enclosure_heavy',
    syncopationShiftRate: 0.85,
    anticipationBias: 0.9,
  },
  scalar_embellish: {
    id: 'scalar_embellish',
    syncopationShiftRate: 0.75,
    anticipationBias: 0.45,
  },
};

export const DEFAULT_BH_MELODY_RHYTHM_PROFILE: BhMelodyRhythmProfile =
  BH_MELODY_RHYTHM_PROFILES.bebop_step;

export function resolveBhMelodyRhythmProfile(
  profileId?: string | null
): BhMelodyRhythmProfile {
  const key = (profileId?.trim() ?? 'bebop_step') as BhMelodyRhythmProfileId;
  return BH_MELODY_RHYTHM_PROFILES[key] ?? DEFAULT_BH_MELODY_RHYTHM_PROFILE;
}
