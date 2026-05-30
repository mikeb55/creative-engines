/**
 * Sonic Youth dual-guitar custom tuning types (V106p3) — always-on, no feature flag.
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';
import type { LowerGuitarRoleDistribution, DuoRealisedLowerGuitarBar } from '../duo/duoTypes';

export type SYTuningPresetId =
  | 'f_sharp_unison'
  | 'doubled_fifths'
  | 'narrow_consonant'
  | 'cluster_friction'
  | 'drone_melody';

export const SY_TUNING_PRESET_IDS: readonly SYTuningPresetId[] = [
  'f_sharp_unison',
  'doubled_fifths',
  'narrow_consonant',
  'cluster_friction',
  'drone_melody',
];

/** Dual-guitar pairing archetype — maps to guitar A / B tuning selection. */
export type SYDualGuitarArchetype = 'mass_mass' | 'mass_knife' | 'drone_shard';

export const SY_DUAL_GUITAR_ARCHETYPES: readonly SYDualGuitarArchetype[] = [
  'mass_mass',
  'mass_knife',
  'drone_shard',
];

export type SYSixStringMidi = readonly [number, number, number, number, number, number];

export type SYTuningDefinition = {
  id: SYTuningPresetId;
  label: string;
  /** Open-string MIDI low → high. */
  strings: SYSixStringMidi;
  description: string;
};

export type SYShapeBarPlan = {
  barIndex: number;
  fretOffset: number;
  ringingMask: readonly boolean[];
  guitar1Midis: readonly number[];
  guitar2Midis: readonly number[];
  exportSymbol: string;
  wybleAnchor?: string;
};

/** Preset surface for SY tuning MusicContext producer. */
export interface SYTuningPreset {
  tuningId: SYTuningPresetId;
  archetype: SYDualGuitarArchetype;
  seed?: number;
  bpm?: number;
  totalBars?: number;
  key?: PitchClass;
  /** Wyble abstract harmonic targets — shape engine translates, never copies tertian cadences. */
  wybleAnchorBars?: readonly string[];
}

export type SYTuningRealisationReceipt = {
  openStringResonanceRatio: number;
  shapeRedundancyScore: number;
  clusterIdentityScore: number;
  retuneDependenceIndex: number;
  resonanceContinuityMetric: number;
  parallelShapeUsage: number;
  tertianNormalizationPenalty: number;
  tuningId: SYTuningPresetId;
  archetype: SYDualGuitarArchetype;
  guitar1TuningId: SYTuningPresetId;
  guitar2TuningId: SYTuningPresetId;
  barCount: number;
  harmonyChecksum: string;
  lowerGuitarRoleDistribution: LowerGuitarRoleDistribution;
};

export type SYTuningRealisationResult = {
  harmonyBars: readonly string[];
  shapePlans: readonly SYShapeBarPlan[];
  lowerGuitarBars: readonly DuoRealisedLowerGuitarBar[];
  receipt: SYTuningRealisationReceipt;
  guitar1Tuning: SYTuningDefinition;
  guitar2Tuning: SYTuningDefinition;
};
