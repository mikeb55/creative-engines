/**
 * Rock riff policy primitive — research passes 5 (Iommi) and 6 (Hendrix).
 * Extends {@link ../counterpoint/abstractLineSet}'s `riff_layer` texture tag without replacing it.
 *
 * Maps into {@link ../composer/riffProfileTypes.RiffProfile} via {@link riffProfileSliceFromRockRiff}
 * (including {@link RiffProfile.allowPitchStreak} for future musicality-gate reads).
 */

import type {
  RiffHomeChordType,
  RiffProfile,
  RiffRegisterAnchor,
  RiffSilencePolicy,
  RiffSubdivisionGrid,
  RiffThumbBassPolicy,
  RiffVariationOperator,
} from '../composer/riffProfileTypes';

export const ROCK_RIFF_SLOTS_8TH = 8 as const;
export const ROCK_RIFF_SLOTS_16TH = 16 as const;

export type RockRiffPolicyStyle = 'iommi' | 'hendrix' | 'generic';

export type RockRiffPrimarySubdivision = '8th' | '16th';

export type RockRiffHomeChordType = 'power5' | 'dom7#9' | 'min7' | 'maj';

export type RockRiffRegisterAnchor = RiffRegisterAnchor;

export type RockRiffDetuningOption = 'standard' | 'Csharp' | 'C' | 'B' | 'dropD';

export type RockRiffB5Role = 'passing' | 'structural';

export type RockRiffFillCellType = 'pentatonic' | 'blues' | 'chromatic-enclosure';

export type RockRiffVariationOperator =
  | 'tailFill'
  | 'chromaticTag'
  | 'articulationSwap'
  | 'targetToneShift'
  | 'startOffsetShift'
  | 'finalChordSubstitution';

export interface RockRiffPedalTonePolicy {
  enabled: boolean;
  pedalDurationBars: number;
  upperMotionIntervals: number[];
  openStringBias: number;
}

export interface RockRiffPowerChordPolicy {
  fifthWeight: number;
  octaveWeight: number;
  movementSemitones: number[];
  parallelMotionAllowed: boolean;
}

export interface RockRiffLowStringAnchor {
  stringNumber: 6 | 5 | 4;
  openStringBias: number;
  detuningOptions: RockRiffDetuningOption[];
}

export interface RockRiffIntervalFunctionPolicy {
  tritoneStable: boolean;
  b5Role: RockRiffB5Role;
  chromaticNeighbourAllowed: boolean;
}

export interface RockRiffRestPolicy {
  preEntryRestAllowed: boolean;
  intraBarRestProb: number;
}

export interface RockRiffRegisterBand {
  floor: number;
  ceiling: number;
}

export interface RockRiffRhythmLeadBlendPolicy {
  minChordsPerBar: number;
  minFillsPerBar: number;
  fillCellTypes: RockRiffFillCellType[];
}

export interface RockRiffThumbBassPolicy {
  rootString: number;
  upperVoiceStrings: number[];
  embellishmentAllowed: boolean;
}

export interface RockRiffDoubleStopPolicy {
  intervalsAllowed: number[];
  stringPairs: number[][];
}

/**
 * Declarative rock riff posture — Iommi (8th pedal riffs) vs Hendrix (16th chord-lead blend).
 * Consumers: riff VRB profiles, future riff generator (read-only until gate commit 5).
 */
export interface RockRiffPolicy {
  styleId: RockRiffPolicyStyle;
  allowPitchStreak: boolean;
  primarySubdivision: RockRiffPrimarySubdivision;
  swingRatio8?: number;
  pedalTonePolicy: RockRiffPedalTonePolicy;
  powerChordPolicy: RockRiffPowerChordPolicy;
  lowStringAnchor: RockRiffLowStringAnchor;
  scalePool: Record<string, number>;
  tritoneStable: boolean;
  intervalFunctionPolicy: RockRiffIntervalFunctionPolicy;
  homeChordType: RockRiffHomeChordType;
  /** Length {@link ROCK_RIFF_SLOTS_8TH} or {@link ROCK_RIFF_SLOTS_16TH} per {@link primarySubdivision}. */
  accentMap: number[];
  sustainProb: number;
  restPolicy: RockRiffRestPolicy;
  anticipationSlots?: number[];
  riffRegisterBand: RockRiffRegisterBand;
  registerAnchor: RockRiffRegisterAnchor;
  minExactRepetitions: number;
  variationOperators: RockRiffVariationOperator[];
  variationRate: number;
  rhythmLeadBlendPolicy?: RockRiffRhythmLeadBlendPolicy;
  thumbBassPolicy?: RockRiffThumbBassPolicy;
  doubleStopPolicy?: RockRiffDoubleStopPolicy;
}

/** MIDI register anchors (rock guitar riff bands). */
const MIDI = {
  E1: 28,
  A2: 45,
  A4: 69,
  D5: 74,
} as const;

function expectedAccentLen(sub: RockRiffPrimarySubdivision): number {
  return sub === '8th' ? ROCK_RIFF_SLOTS_8TH : ROCK_RIFF_SLOTS_16TH;
}

function assertAccentMap(policy: RockRiffPolicy): void {
  const len = expectedAccentLen(policy.primarySubdivision);
  if (policy.accentMap.length !== len) {
    throw new Error(
      `rockRiffPolicy: accentMap must have length ${len} for ${policy.primarySubdivision}, got ${policy.accentMap.length}`
    );
  }
}

function slotMap8(
  strong: readonly number[],
  medium: readonly number[],
  weak = 0.1,
  strongWeight = 1,
  mediumWeight = 0.55
): number[] {
  const out = new Array<number>(ROCK_RIFF_SLOTS_8TH).fill(weak);
  for (const s of medium) out[s] = Math.max(out[s]!, mediumWeight);
  for (const s of strong) out[s] = Math.max(out[s]!, strongWeight);
  return out;
}

function slotMap16(
  strong: readonly number[],
  medium: readonly number[],
  weak = 0.1,
  strongWeight = 1,
  mediumWeight = 0.55
): number[] {
  const out = new Array<number>(ROCK_RIFF_SLOTS_16TH).fill(weak);
  for (const s of medium) out[s] = Math.max(out[s]!, mediumWeight);
  for (const s of strong) out[s] = Math.max(out[s]!, strongWeight);
  return out;
}

function uniformRestMap(len: number, prob: number): number[] {
  return new Array<number>(len).fill(prob);
}

function validatePolicy(p: RockRiffPolicy): void {
  assertAccentMap(p);
  if (p.anticipationSlots?.some((s) => s < 0 || s >= expectedAccentLen(p.primarySubdivision))) {
    throw new Error(`rockRiffPolicy: anticipationSlots out of range for ${p.styleId}`);
  }
}

function toRiffHomeChord(h: RockRiffHomeChordType): RiffHomeChordType {
  if (h === 'maj') return 'maj7';
  return h;
}

function toRiffVariationOps(ops: RockRiffVariationOperator[]): RiffVariationOperator[] {
  return ops as RiffVariationOperator[];
}

function toRiffThumbBass(t: RockRiffThumbBassPolicy | undefined): RiffThumbBassPolicy | undefined {
  if (!t) return undefined;
  return { ...t, upperVoiceStrings: [...t.upperVoiceStrings] };
}

function iommiPolicy(): RockRiffPolicy {
  const policy: RockRiffPolicy = {
    styleId: 'iommi',
    allowPitchStreak: true,
    primarySubdivision: '8th',
    swingRatio8: 1.0,
    pedalTonePolicy: {
      enabled: true,
      pedalDurationBars: 2,
      upperMotionIntervals: [0, 1, 2, 3, 6],
      openStringBias: 0.8,
    },
    powerChordPolicy: {
      fifthWeight: 0.9,
      octaveWeight: 0.5,
      movementSemitones: [1, 2, 3, 6],
      parallelMotionAllowed: true,
    },
    lowStringAnchor: {
      stringNumber: 6,
      openStringBias: 0.8,
      detuningOptions: ['Csharp', 'C', 'B'],
    },
    scalePool: { Aeolian: 0.8, harmonicMinor: 0.7, Phrygian: 0.4, chromatic: 0.3 },
    tritoneStable: true,
    intervalFunctionPolicy: {
      tritoneStable: true,
      b5Role: 'structural',
      chromaticNeighbourAllowed: false,
    },
    homeChordType: 'power5',
    accentMap: slotMap8([0, 4], [2, 6]),
    sustainProb: 0.7,
    restPolicy: { preEntryRestAllowed: true, intraBarRestProb: 0.2 },
    riffRegisterBand: { floor: MIDI.E1, ceiling: MIDI.A4 },
    registerAnchor: 'low_string',
    minExactRepetitions: 2,
    variationRate: 0.25,
    variationOperators: ['tailFill', 'chromaticTag', 'finalChordSubstitution'],
  };
  validatePolicy(policy);
  return policy;
}

function hendrixPolicy(): RockRiffPolicy {
  const policy: RockRiffPolicy = {
    styleId: 'hendrix',
    allowPitchStreak: false,
    primarySubdivision: '16th',
    swingRatio8: 1.3,
    pedalTonePolicy: {
      enabled: true,
      pedalDurationBars: 1,
      upperMotionIntervals: [0, 2, 3, 4, 5, 7],
      openStringBias: 0.5,
    },
    powerChordPolicy: {
      fifthWeight: 0.3,
      octaveWeight: 0.4,
      movementSemitones: [2, 3, 4, 5, 7],
      parallelMotionAllowed: false,
    },
    lowStringAnchor: {
      stringNumber: 6,
      openStringBias: 0.6,
      detuningOptions: ['standard'],
    },
    scalePool: { minorPentatonic: 0.9, bluesScale: 0.8, Mixolydian: 0.6, Dorian: 0.4 },
    tritoneStable: false,
    intervalFunctionPolicy: {
      tritoneStable: false,
      b5Role: 'passing',
      chromaticNeighbourAllowed: true,
    },
    homeChordType: 'dom7#9',
    accentMap: slotMap16([5, 13], [0, 8], 0.12, 1, 0.65),
    sustainProb: 0.3,
    restPolicy: { preEntryRestAllowed: false, intraBarRestProb: 0.3 },
    anticipationSlots: [6, 7, 14],
    riffRegisterBand: { floor: MIDI.A2, ceiling: MIDI.D5 },
    registerAnchor: 'mid_register',
    minExactRepetitions: 1,
    variationRate: 0.5,
    variationOperators: ['articulationSwap', 'targetToneShift', 'startOffsetShift'],
    rhythmLeadBlendPolicy: {
      minChordsPerBar: 1,
      minFillsPerBar: 1,
      fillCellTypes: ['pentatonic', 'blues', 'chromatic-enclosure'],
    },
    thumbBassPolicy: {
      rootString: 6,
      upperVoiceStrings: [4, 3, 2],
      embellishmentAllowed: true,
    },
    doubleStopPolicy: {
      intervalsAllowed: [3, 4, 9],
      stringPairs: [
        [3, 2],
        [2, 1],
      ],
    },
  };
  validatePolicy(policy);
  return policy;
}

function genericPolicy(): RockRiffPolicy {
  const policy: RockRiffPolicy = {
    styleId: 'generic',
    allowPitchStreak: true,
    primarySubdivision: '8th',
    swingRatio8: 1.0,
    pedalTonePolicy: {
      enabled: true,
      pedalDurationBars: 2,
      upperMotionIntervals: [0, 2, 3, 5, 7],
      openStringBias: 0.55,
    },
    powerChordPolicy: {
      fifthWeight: 0.65,
      octaveWeight: 0.45,
      movementSemitones: [1, 2, 3, 5, 7],
      parallelMotionAllowed: true,
    },
    lowStringAnchor: {
      stringNumber: 6,
      openStringBias: 0.55,
      detuningOptions: ['standard', 'dropD'],
    },
    scalePool: {
      minorPentatonic: 0.75,
      Aeolian: 0.6,
      Mixolydian: 0.45,
      Dorian: 0.35,
    },
    tritoneStable: true,
    intervalFunctionPolicy: {
      tritoneStable: true,
      b5Role: 'passing',
      chromaticNeighbourAllowed: true,
    },
    homeChordType: 'power5',
    accentMap: slotMap8([0, 4], [2, 6], 0.14),
    sustainProb: 0.45,
    restPolicy: { preEntryRestAllowed: true, intraBarRestProb: 0.22 },
    riffRegisterBand: { floor: MIDI.A2, ceiling: MIDI.A4 },
    registerAnchor: 'mid_register',
    minExactRepetitions: 2,
    variationRate: 0.35,
    variationOperators: ['tailFill', 'articulationSwap', 'targetToneShift'],
  };
  validatePolicy(policy);
  return policy;
}

/** Named preset factories (research-backed). */
export const rockRiffPolicy = {
  iommi: iommiPolicy,
  hendrix: hendrixPolicy,
  generic: genericPolicy,
} as const;

export function getRockRiffPolicy(style: RockRiffPolicyStyle): RockRiffPolicy {
  switch (style) {
    case 'iommi':
      return rockRiffPolicy.iommi();
    case 'hendrix':
      return rockRiffPolicy.hendrix();
    case 'generic':
      return rockRiffPolicy.generic();
    default: {
      const _exhaustive: never = style;
      return _exhaustive;
    }
  }
}

/**
 * Pitch-streak gate bypass for rock VRBs — mirrors {@link RockRiffPolicy.allowPitchStreak}.
 * Gate evaluation (commit 5) should call this when `riffProfile` carries a rock preset slice.
 */
export function rockRiffAllowsPitchStreak(style: RockRiffPolicyStyle): boolean {
  return getRockRiffPolicy(style).allowPitchStreak;
}

/**
 * Maps a {@link RockRiffPolicy} preset into {@link RiffProfile} fields so VRB builders can
 * reference `rockRiffPreset` by name; {@link RiffProfile.allowPitchStreak} follows the policy flag.
 */
export function riffProfileSliceFromRockRiff(style: RockRiffPolicyStyle): Pick<
  RiffProfile,
  | 'allowPitchStreak'
  | 'subdivisionGrid'
  | 'accentTopology'
  | 'silencePolicy'
  | 'repetitionPolicy'
  | 'variationOperators'
  | 'registerAnchor'
  | 'riffRegisterFloor'
  | 'riffRegisterCeiling'
  | 'pedalBias'
  | 'powerIntervalPolicy'
  | 'tritoneStable'
  | 'homeChordType'
  | 'thumbBassPolicy'
  | 'swingStyle'
> {
  const p = getRockRiffPolicy(style);
  const gridLen: RiffSubdivisionGrid =
    p.primarySubdivision === '8th' ? ROCK_RIFF_SLOTS_8TH : ROCK_RIFF_SLOTS_16TH;
  const silencePolicy: RiffSilencePolicy = {
    restProbabilityBySlot: uniformRestMap(gridLen, p.restPolicy.intraBarRestProb),
    styleClass: `rock_riff:${p.styleId}`,
    rockRiffPreset: p.styleId,
  };

  const swingStyle =
    p.swingRatio8 != null && p.swingRatio8 > 1.05 ? ('shuffle' as const) : ('straight' as const);

  return {
    allowPitchStreak: p.allowPitchStreak,
    subdivisionGrid: gridLen,
    swingStyle,
    accentTopology: [...p.accentMap],
    silencePolicy,
    repetitionPolicy: {
      exactLoopAllowed: true,
      pedalToneAllowed: p.pedalTonePolicy.enabled,
      barIdentityPersistence: p.pedalTonePolicy.pedalDurationBars / 4,
      minExactRepetitions: p.minExactRepetitions,
    },
    variationOperators: toRiffVariationOps(p.variationOperators),
    registerAnchor: p.registerAnchor,
    riffRegisterFloor: p.riffRegisterBand.floor,
    riffRegisterCeiling: p.riffRegisterBand.ceiling,
    pedalBias: p.pedalTonePolicy.openStringBias,
    powerIntervalPolicy: {
      fifthWeight: p.powerChordPolicy.fifthWeight,
      octaveWeight: p.powerChordPolicy.octaveWeight,
      pedalWeight: p.pedalTonePolicy.enabled ? p.pedalTonePolicy.openStringBias : 0.15,
    },
    tritoneStable: p.tritoneStable,
    homeChordType: toRiffHomeChord(p.homeChordType),
    thumbBassPolicy: toRiffThumbBass(p.thumbBassPolicy),
  };
}
