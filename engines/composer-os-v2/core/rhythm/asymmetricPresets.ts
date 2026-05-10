/**
 * Named additive pulse cycles for asymmetric rhythm engine (internal tags only).
 */

import type { AccentClass, CycleDefinition } from './asymmetricRhythmEngine';

export interface AsymmetricPreset {
  id: string;
  pulsesPerCycle: number;
  grouping: number[];
  accentMap: AccentClass[];
  pulseUnit: 'sixteenth' | 'eighth';
  tags: string[];
}

function presetToCycle(p: AsymmetricPreset): CycleDefinition {
  return {
    pulsesPerCycle: p.pulsesPerCycle,
    grouping: p.grouping,
    accentMap: p.accentMap,
    pulseUnit: p.pulseUnit,
  };
}

/** All shipped presets (eighth-note pulses; pair with 5/8, 7/8, 9/8, 11/8, 13/8 bar meters as needed). */
export const ASYMMETRIC_PRESETS: readonly AsymmetricPreset[] = [
  {
    id: 'five_two',
    pulsesPerCycle: 5,
    grouping: [3, 2],
    accentMap: ['strong', 'halfStrong'],
    pulseUnit: 'eighth',
    tags: ['odd-meter', 'experimental', 'fripp-adjacent'],
  },
  {
    id: 'seven_three',
    pulsesPerCycle: 7,
    grouping: [2, 2, 3],
    accentMap: ['strong', 'weak', 'halfStrong'],
    pulseUnit: 'eighth',
    tags: ['odd-meter', 'experimental', 'fripp-adjacent'],
  },
  {
    id: 'seven_two',
    pulsesPerCycle: 7,
    grouping: [3, 2, 2],
    accentMap: ['strong', 'halfStrong', 'weak'],
    pulseUnit: 'eighth',
    tags: ['odd-meter', 'experimental', 'fripp-adjacent'],
  },
  {
    id: 'nine_two',
    pulsesPerCycle: 9,
    grouping: [2, 2, 2, 3],
    accentMap: ['strong', 'weak', 'halfStrong', 'weak'],
    pulseUnit: 'eighth',
    tags: ['odd-meter', 'experimental', 'ligeti-adjacent', 'fripp-adjacent'],
  },
  {
    id: 'eleven_four',
    pulsesPerCycle: 11,
    grouping: [3, 2, 3, 3],
    accentMap: ['strong', 'halfStrong', 'weak', 'halfStrong'],
    pulseUnit: 'eighth',
    tags: ['odd-meter', 'experimental', 'ligeti-adjacent'],
  },
  {
    id: 'thirteen_five',
    pulsesPerCycle: 13,
    grouping: [3, 3, 2, 3, 2],
    accentMap: ['strong', 'weak', 'halfStrong', 'weak', 'weak'],
    pulseUnit: 'eighth',
    tags: ['odd-meter', 'experimental', 'ligeti-adjacent', 'fripp-adjacent'],
  },
];

const PRESET_BY_ID: Record<string, AsymmetricPreset> = Object.fromEntries(
  ASYMMETRIC_PRESETS.map((p) => [p.id, p])
);

export function getAsymmetricPreset(id: string): AsymmetricPreset | undefined {
  return PRESET_BY_ID[id];
}

export function cycleDefinitionFromPreset(preset: AsymmetricPreset): CycleDefinition {
  return presetToCycle(preset);
}
