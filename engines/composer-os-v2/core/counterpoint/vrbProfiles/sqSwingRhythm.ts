/**
 * SQ swing rhythm presets — per-VRB swingStyle / swingIntensity / tempo curve / anticipation caps.
 * Used by VoiceRuleBundles, buildSwingPolicy fallbacks, and GCE rhythm expectations.
 */

import type { SqSwingRhythmEnginePolicy } from '../../rhythm/sqSwingRhythmEngine';

export type SqSwingRhythmPreset = Pick<
  SqSwingRhythmEnginePolicy,
  'swingStyle' | 'swingIntensity'
> & {
  anticipationRateMax?: number;
  /** Reference BPM where effective intensity equals swingIntensity (default 120). */
  refBpm: number;
  /** Friberg-inspired log2 curve steepness (per-composer). */
  curveK: number;
  intensityFloor: number;
  intensityCeiling: number;
};

/** @alias SqSwingRhythmPreset */
export type SqSwingPreset = SqSwingRhythmPreset;

/** Canonical sq_swing values for shipped jazz-classical VRB ids. */
export const SQ_SWING_RHYTHM_BY_VRB_ID: Readonly<Record<string, SqSwingRhythmPreset>> = {
  cole_porter: {
    swingStyle: 'concert',
    swingIntensity: 0.52,
    anticipationRateMax: 0.1,
    refBpm: 120,
    curveK: 0.1,
    intensityFloor: 0.35,
    intensityCeiling: 0.72,
  },
  porter: {
    swingStyle: 'concert',
    swingIntensity: 0.52,
    anticipationRateMax: 0.1,
    refBpm: 120,
    curveK: 0.1,
    intensityFloor: 0.35,
    intensityCeiling: 0.72,
  },
  gershwin: {
    swingStyle: 'concert',
    swingIntensity: 0.65,
    anticipationRateMax: 0.14,
    refBpm: 120,
    curveK: 0.12,
    intensityFloor: 0.4,
    intensityCeiling: 0.85,
  },
  george_gershwin: {
    swingStyle: 'concert',
    swingIntensity: 0.65,
    anticipationRateMax: 0.14,
    refBpm: 120,
    curveK: 0.12,
    intensityFloor: 0.4,
    intensityCeiling: 0.85,
  },
  turtle_island: {
    swingStyle: 'jazz',
    swingIntensity: 0.8,
    refBpm: 120,
    curveK: 0.15,
    intensityFloor: 0.55,
    intensityCeiling: 0.92,
  },
  turtle_island_quartet: {
    swingStyle: 'jazz',
    swingIntensity: 0.8,
    refBpm: 120,
    curveK: 0.15,
    intensityFloor: 0.55,
    intensityCeiling: 0.92,
  },
  turtleisland: {
    swingStyle: 'jazz',
    swingIntensity: 0.8,
    refBpm: 120,
    curveK: 0.15,
    intensityFloor: 0.55,
    intensityCeiling: 0.92,
  },
  ti: {
    swingStyle: 'jazz',
    swingIntensity: 0.8,
    refBpm: 120,
    curveK: 0.15,
    intensityFloor: 0.55,
    intensityCeiling: 0.92,
  },
};

/**
 * Tempo-adaptive swing intensity (Friberg–Sundström inspired):
 * base * (1 - k * log2(bpm / refBpm)), clamped to preset floor/ceiling.
 * At refBpm returns base swingIntensity exactly.
 */
export function computeSwingIntensityForTempo(preset: SqSwingPreset, bpm: number): number {
  const base = preset.swingIntensity;
  const ref = preset.refBpm > 0 ? preset.refBpm : 120;
  const k = preset.curveK;
  const safeBpm = Math.max(1, bpm);
  const logFactor = Math.log2(safeBpm / ref);
  const raw = base * (1 - k * logFactor);
  return Math.max(preset.intensityFloor, Math.min(preset.intensityCeiling, raw));
}

export function sqSwingRhythmPresetForVrb(vrbId: string): SqSwingRhythmPreset | undefined {
  const id = vrbId.trim().toLowerCase();
  return SQ_SWING_RHYTHM_BY_VRB_ID[id];
}
