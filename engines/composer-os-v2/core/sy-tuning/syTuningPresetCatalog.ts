/**
 * SY-only tuning catalog (V106p3) — not registered in alternateGuitarTunings.ts.
 */

import type {
  SYDualGuitarArchetype,
  SYTuningDefinition,
  SYTuningPresetId,
} from './syTuningTypes';

export const SY_TUNING_CATALOG: Record<SYTuningPresetId, SYTuningDefinition> = {
  f_sharp_unison: {
    id: 'f_sharp_unison',
    label: 'F# unison grid',
    strings: [42, 42, 54, 54, 64, 71],
    description: 'Brutal unison grid — massive F# drone + dissonant colour',
  },
  doubled_fifths: {
    id: 'doubled_fifths',
    label: 'Doubled 5ths',
    strings: [43, 43, 50, 50, 57, 57],
    description: 'Classic doubled 5ths — blurred chord identity',
  },
  narrow_consonant: {
    id: 'narrow_consonant',
    label: 'Narrow consonant',
    strings: [45, 45, 48, 48, 55, 55],
    description: 'Narrow range — block slides, drone-chord morphing',
  },
  cluster_friction: {
    id: 'cluster_friction',
    label: 'Cluster friction',
    strings: [45, 48, 48, 55, 56, 60],
    description: 'G/G# minor-second friction built in',
  },
  drone_melody: {
    id: 'drone_melody',
    label: 'Drone melody',
    strings: [36, 43, 50, 55, 60, 62],
    description: 'Open drone symmetry — dual-guitar complementary writing',
  },
};

/** Standard EADGBE open-string MIDI (reference for retune / tertian-normalization metrics). */
export const STANDARD_EADGBE_MIDI: readonly number[] = [40, 45, 50, 55, 59, 64];

const MASS_MASS_TUNING: SYTuningPresetId = 'f_sharp_unison';

const MASS_KNIFE_PAIR: readonly [SYTuningPresetId, SYTuningPresetId] = [
  'narrow_consonant',
  'cluster_friction',
];

const DRONE_SHARD_PAIR: readonly [SYTuningPresetId, SYTuningPresetId] = [
  'drone_melody',
  'cluster_friction',
];

export function resolveSYTuningDefinition(id: SYTuningPresetId): SYTuningDefinition {
  return SY_TUNING_CATALOG[id];
}

/** Map archetype → guitar A / guitar B tuning ids. */
export function resolveDualGuitarTuningPair(
  archetype: SYDualGuitarArchetype,
  primaryId: SYTuningPresetId,
): { guitar1: SYTuningDefinition; guitar2: SYTuningDefinition } {
  if (archetype === 'mass_mass') {
    const tuning = resolveSYTuningDefinition(primaryId);
    return { guitar1: tuning, guitar2: tuning };
  }
  if (archetype === 'mass_knife') {
    const [a, b] = MASS_KNIFE_PAIR;
    return {
      guitar1: resolveSYTuningDefinition(a),
      guitar2: resolveSYTuningDefinition(b),
    };
  }
  const [a, b] = DRONE_SHARD_PAIR;
  return {
    guitar1: resolveSYTuningDefinition(a),
    guitar2: resolveSYTuningDefinition(b),
  };
}

export function isNarrowOrUnisonTuning(id: SYTuningPresetId): boolean {
  return id === 'f_sharp_unison' || id === 'narrow_consonant' || id === 'doubled_fifths';
}

export function isPedalHeavyTuning(id: SYTuningPresetId): boolean {
  return id === 'drone_melody' || id === 'doubled_fifths';
}
