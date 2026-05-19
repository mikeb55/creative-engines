/**
 * SQ swing rhythm presets — per-VRB swingStyle / swingIntensity / anticipation caps.
 * Used by VoiceRuleBundles, buildSwingPolicy fallbacks, and GCE rhythm expectations.
 */

import type { SqSwingRhythmEnginePolicy } from '../../rhythm/sqSwingRhythmEngine';

export type SqSwingRhythmPreset = Pick<
  SqSwingRhythmEnginePolicy,
  'swingStyle' | 'swingIntensity'
> & {
  anticipationRateMax?: number;
};

/** Canonical sq_swing values for shipped jazz-classical VRB ids. */
export const SQ_SWING_RHYTHM_BY_VRB_ID: Readonly<Record<string, SqSwingRhythmPreset>> = {
  cole_porter: {
    swingStyle: 'concert',
    swingIntensity: 0.52,
    anticipationRateMax: 0.1,
  },
  porter: {
    swingStyle: 'concert',
    swingIntensity: 0.52,
    anticipationRateMax: 0.1,
  },
  gershwin: {
    swingStyle: 'concert',
    swingIntensity: 0.65,
    anticipationRateMax: 0.14,
  },
  george_gershwin: {
    swingStyle: 'concert',
    swingIntensity: 0.65,
    anticipationRateMax: 0.14,
  },
  turtle_island: {
    swingStyle: 'jazz',
    swingIntensity: 0.8,
  },
  turtle_island_quartet: {
    swingStyle: 'jazz',
    swingIntensity: 0.8,
  },
  turtleisland: {
    swingStyle: 'jazz',
    swingIntensity: 0.8,
  },
  ti: {
    swingStyle: 'jazz',
    swingIntensity: 0.8,
  },
};

export function sqSwingRhythmPresetForVrb(vrbId: string): SqSwingRhythmPreset | undefined {
  const id = vrbId.trim().toLowerCase();
  return SQ_SWING_RHYTHM_BY_VRB_ID[id];
}
