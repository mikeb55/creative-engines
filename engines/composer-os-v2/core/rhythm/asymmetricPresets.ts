/**
 * Named additive pulse cycles for asymmetric rhythm engine (internal tags only).
 */

import {
  validateCycle,
  type AccentClass,
  type CycleDefinition,
} from './asymmetricRhythmEngine';

const ACCENT: readonly AccentClass[] = ['strong', 'halfStrong', 'weak'];
function isPulseUnit(x: unknown): x is CycleDefinition['pulseUnit'] {
  return x === 'sixteenth' || x === 'eighth';
}
function isAccentMap(x: unknown): x is AccentClass[] {
  return Array.isArray(x) && x.length > 0 && x.every((a) => ACCENT.includes(a as AccentClass));
}

/** API / slice contract — preset catalogue id or validated custom cycle. */
export type AsymmetricRhythmRequest =
  | { presetId: string }
  | { custom: CycleDefinition };

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
  /** Fripp/KC — *Discipline* family (sixteenth pulses). */
  {
    id: 'discipline_a',
    pulsesPerCycle: 15,
    grouping: [3, 3, 3, 3, 3],
    accentMap: ['strong', 'weak', 'halfStrong', 'weak', 'halfStrong'],
    pulseUnit: 'sixteenth',
    tags: ['odd-meter', 'fripp-adjacent', 'discipline'],
  },
  {
    id: 'discipline_b',
    pulsesPerCycle: 14,
    grouping: [3, 3, 3, 2, 3],
    accentMap: ['strong', 'weak', 'halfStrong', 'weak', 'halfStrong'],
    pulseUnit: 'sixteenth',
    tags: ['odd-meter', 'fripp-adjacent', 'discipline'],
  },
  /** *Frame by Frame* — 7/8 additive ([2+2+3]). */
  {
    id: 'frame_by_frame',
    pulsesPerCycle: 7,
    grouping: [2, 2, 3],
    accentMap: ['strong', 'weak', 'halfStrong'],
    pulseUnit: 'eighth',
    tags: ['odd-meter', 'fripp-adjacent', 'kc-classic'],
  },
  /** *Fracture*-style 9/8. */
  {
    id: 'fracture',
    pulsesPerCycle: 9,
    grouping: [2, 2, 2, 3],
    accentMap: ['strong', 'weak', 'halfStrong', 'weak'],
    pulseUnit: 'eighth',
    tags: ['odd-meter', 'fripp-adjacent', 'kc-classic'],
  },
  /**
   * *Red* accent layer — 12 sixteenth pulses [3+2+3+2+2]; polymeter vs 4/4 (see Fripp slice polymeter receipt).
   */
  {
    id: 'red',
    pulsesPerCycle: 12,
    grouping: [3, 2, 3, 2, 2],
    accentMap: ['strong', 'halfStrong', 'weak', 'halfStrong', 'weak'],
    pulseUnit: 'sixteenth',
    tags: ['odd-meter', 'fripp-adjacent', 'kc-red', 'polymeter-layer'],
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

/**
 * Resolve a request to a concrete cycle; defaults to **`seven_three`** when preset id omitted (caller-dependent).
 */
export function resolveCycleDefinitionFromAsymmetricRhythmRequest(
  req: AsymmetricRhythmRequest,
  fallbackPresetId = 'seven_three'
): CycleDefinition {
  if ('custom' in req && req.custom) {
    validateCycle(req.custom);
    return req.custom;
  }
  const pid = ('presetId' in req && req.presetId?.trim() ? req.presetId.trim() : fallbackPresetId);
  const preset = getAsymmetricPreset(pid);
  if (!preset) {
    throw new Error(`Unknown asymmetric rhythm preset: ${pid}`);
  }
  return cycleDefinitionFromPreset(preset);
}

/**
 * API / IPC: accept `{ presetId }` (catalogue id) or `{ custom: CycleDefinition }` when valid.
 * Invalid shapes → `undefined` (no throw).
 */
export function coerceAsymmetricRhythmRequestFromUnknown(raw: unknown): AsymmetricRhythmRequest | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const o = raw as Record<string, unknown>;
  if (typeof o.presetId === 'string') {
    const id = o.presetId.trim();
    if (!id) return undefined;
    return getAsymmetricPreset(id) ? { presetId: id } : undefined;
  }
  if (o.custom && typeof o.custom === 'object' && !Array.isArray(o.custom)) {
    const c = o.custom as Record<string, unknown>;
    const cycle: CycleDefinition = {
      pulsesPerCycle: Number(c.pulsesPerCycle),
      grouping: c.grouping as number[],
      accentMap: c.accentMap as AccentClass[],
      pulseUnit: c.pulseUnit as CycleDefinition['pulseUnit'],
    };
    if (!isPulseUnit(cycle.pulseUnit) || !isAccentMap(cycle.accentMap)) return undefined;
    try {
      validateCycle(cycle);
    } catch {
      return undefined;
    }
    return { custom: cycle };
  }
  return undefined;
}
