/**
 * Odd-meter grouping engine — research passes 2 (odd-meter theory) and 10 (Mahavishnu).
 * Additive primitive; does not replace {@link oddMeterQuantiser}, Bartók aksak, Reich phasing,
 * or {@link asymmetricPresets} / {@link asymmetricRhythmEngine}.
 *
 * Maps into {@link ../composer/riffProfileTypes.RiffProfile} via {@link riffProfileSliceFromOddMeter}.
 */

import type {
  RiffDensityCurve,
  RiffOddMeterTemplate,
  RiffPhaseOffsetPolicy,
  RiffProcessLoopPolicy,
  RiffProfile,
  RiffSilencePolicy,
  RiffVariationOperator,
} from '../composer/riffProfileTypes';

export type OddMeterPolicyStyle =
  | 'meter5'
  | 'meter7'
  | 'meter9'
  | 'meter10'
  | 'mahavishnu'
  | 'fripp'
  | 'weatherReport';

export type OddMeterDenominator = 4 | 8;

export interface OddMeterSignature {
  numerator: number;
  denominator: OddMeterDenominator;
}

export type OddMeterCadenceGroupBehavior = 'simplify' | 'lengthen' | 'fill';

export type OddMeterDensityCurve = RiffDensityCurve;

export type OddMeterLoopUnit = 'bar' | 'groupSequence' | 'hyperBar';

export type OddMeterLongNotePolicy = 'groupStart' | 'lastGroup' | 'distributed';

export type OddMeterEnsembleAccentPolicy = 'aligned' | 'displaced' | 'polyrhythmic';

export interface OddMeterTihaiCadence {
  phraseLength: number;
  cellLength: number;
}

export interface OddMeterPhaseOffsetPolicy {
  loopLengthBeats: number;
  barLengthBeats: number;
  startOffsetBeats: number;
  driftPerCycleBeats?: number;
  lockBackEveryCycles?: number;
}

export interface OddMeterMeterVariant {
  meter: OddMeterSignature;
  allowedGroupings: number[][];
  defaultGrouping: number[];
  accentTopologyPerGrouping: Record<string, number[]>;
}

/**
 * Declarative odd-meter / aksak posture for riff VRBs and future generators.
 */
export interface OddMeterGroupingPolicy {
  styleId: OddMeterPolicyStyle;
  meter: OddMeterSignature;
  defaultGrouping: number[];
  allowedGroupings: number[][];
  accentTopologyPerGrouping: Record<string, number[]>;
  phraseGroupLength: number;
  cadenceGroupBehavior: OddMeterCadenceGroupBehavior;
  tihaiCadence?: OddMeterTihaiCadence;
  talaCycleLength?: number;
  densityCurve: OddMeterDensityCurve;
  loopUnit: OddMeterLoopUnit;
  syncopationBudget: number;
  minAccentDensity: number;
  longNotePolicy: OddMeterLongNotePolicy;
  phaseOffsetPolicy?: OddMeterPhaseOffsetPolicy;
  polyGroupingMode?: boolean;
  ensembleAccentPolicy?: OddMeterEnsembleAccentPolicy;
  /** Advisory for VRB harmonic layer (Mahavishnu high chromaticism). */
  chromaticBudgetHint?: number;
  processLoopPolicy?: RiffProcessLoopPolicy;
  variationOperators?: RiffVariationOperator[];
  /** Internal metric groupings over a simple meter surface (Weather Report). */
  groupingPatterns?: number[][];
  /** Mahavishnu composite — meters 7, 9, 10, 12, 18, 20. */
  meterCatalog?: OddMeterMeterVariant[];
}

/** Grouping vector → accent map key (e.g. `[2,2,3]` → `'2,2,3'`). */
export function groupingKey(grouping: readonly number[]): string {
  return grouping.join(',');
}

/** Cumulative pulse indices where each group begins (includes 0). */
export function getAccentSlots(grouping: readonly number[]): number[] {
  const spans = getGroupSpans(grouping);
  const slots: number[] = [0];
  let acc = 0;
  for (let i = 0; i < spans.length - 1; i++) {
    acc += spans[i]!;
    slots.push(acc);
  }
  return slots;
}

/** Group lengths in pulses (alias of grouping vector). */
export function getGroupSpans(grouping: readonly number[]): number[] {
  return [...grouping];
}

/**
 * Riff identity hook positions — group onsets plus terminal pulse of each group.
 */
export function getHookSlots(grouping: readonly number[]): number[] {
  const hooks = new Set<number>(getAccentSlots(grouping));
  let idx = 0;
  for (const span of grouping) {
    hooks.add(idx + span - 1);
    idx += span;
  }
  return [...hooks].sort((a, b) => a - b);
}

/**
 * Tihai: three cell repetitions resolve on sam (downbeat).
 * Valid when `3 * cellLength` equals phrase length or immediately precedes it.
 */
export function validateTihaiCadence(phraseLength: number, cellLength: number): boolean {
  if (phraseLength <= 0 || cellLength <= 0) return false;
  const span = 3 * cellLength;
  return span % phraseLength === 0 || (span + 1) % phraseLength === 0;
}

/** LCM beat cycle for phase-loop alignment (Fripp / Reich family). */
export function computeAlignmentCycle(loopBeats: number, barBeats: number): number {
  if (loopBeats <= 0 || barBeats <= 0) return 0;
  const a = Math.abs(loopBeats);
  const b = Math.abs(barBeats);
  return (a / gcd(a, b)) * b;
}

function gcd(x: number, y: number): number {
  let a = x;
  let b = y;
  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

function pulseCount(grouping: readonly number[]): number {
  return grouping.reduce((s, g) => s + g, 0);
}

function assertGroupingSum(meter: OddMeterSignature, grouping: readonly number[]): void {
  if (pulseCount(grouping) !== meter.numerator) {
    throw new Error(
      `oddMeterEngine: grouping [${grouping.join(',')}] sums to ${pulseCount(grouping)}, expected ${meter.numerator}`
    );
  }
}

function accentFromGrouping(
  grouping: readonly number[],
  strong = 2,
  mid = 1,
  weak = 0
): number[] {
  const len = pulseCount(grouping);
  const out = new Array<number>(len).fill(weak);
  let idx = 0;
  for (const span of grouping) {
    out[idx] = Math.max(out[idx]!, strong);
    if (span >= 3) {
      const midSlot = idx + Math.floor(span / 2);
      if (midSlot < len) out[midSlot] = Math.max(out[midSlot]!, mid);
    }
    if (span >= 2) {
      const tail = idx + span - 1;
      if (tail < len && tail !== idx) out[tail] = Math.max(out[tail]!, mid);
    }
    idx += span;
  }
  return out;
}

function buildAccentMap(
  meter: OddMeterSignature,
  groupings: readonly (readonly number[])[],
  overrides?: Record<string, number[]>
): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const g of groupings) {
    assertGroupingSum(meter, g);
    const key = groupingKey(g);
    map[key] = overrides?.[key] ? [...overrides[key]!] : accentFromGrouping(g);
    if (map[key]!.length !== meter.numerator) {
      throw new Error(`oddMeterEngine: accent map "${key}" length ${map[key]!.length} !== ${meter.numerator}`);
    }
  }
  return map;
}

function validatePolicy(p: OddMeterGroupingPolicy): void {
  assertGroupingSum(p.meter, p.defaultGrouping);
  for (const g of p.allowedGroupings) assertGroupingSum(p.meter, g);
  const defaultKey = groupingKey(p.defaultGrouping);
  if (!p.accentTopologyPerGrouping[defaultKey]) {
    throw new Error(`oddMeterEngine: missing accent map for default grouping "${defaultKey}"`);
  }
  if (p.tihaiCadence && !validateTihaiCadence(p.tihaiCadence.phraseLength, p.tihaiCadence.cellLength)) {
    throw new Error(
      `oddMeterEngine: invalid tihai cadence phrase=${p.tihaiCadence.phraseLength} cell=${p.tihaiCadence.cellLength}`
    );
  }
  if (p.meterCatalog) {
    for (const v of p.meterCatalog) {
      assertGroupingSum(v.meter, v.defaultGrouping);
    }
  }
  if (p.groupingPatterns) {
    const maxSpan = p.meter.numerator * 2;
    for (const g of p.groupingPatterns) {
      if (g.reduce((s, n) => s + n, 0) > maxSpan) {
        throw new Error(`oddMeterEngine: grouping pattern exceeds ${maxSpan} pulses for meter surface`);
      }
    }
  }
}

function toRiffPhase(p: OddMeterPhaseOffsetPolicy | undefined): RiffPhaseOffsetPolicy | undefined {
  if (!p) return undefined;
  return { ...p };
}

function meter5Policy(): OddMeterGroupingPolicy {
  const meter: OddMeterSignature = { numerator: 5, denominator: 8 };
  const allowedGroupings = [
    [3, 2],
    [2, 3],
  ] as const;
  const policy: OddMeterGroupingPolicy = {
    styleId: 'meter5',
    meter,
    allowedGroupings: allowedGroupings.map((g) => [...g]),
    defaultGrouping: [3, 2],
    accentTopologyPerGrouping: buildAccentMap(meter, allowedGroupings, {
      '3,2': [2, 0, 0, 1, 0],
      '2,3': [2, 0, 1, 0, 0],
    }),
    phraseGroupLength: 4,
    cadenceGroupBehavior: 'lengthen',
    densityCurve: 'flat',
    loopUnit: 'groupSequence',
    syncopationBudget: 1,
    minAccentDensity: 1,
    longNotePolicy: 'lastGroup',
  };
  validatePolicy(policy);
  return policy;
}

function meter7Policy(): OddMeterGroupingPolicy {
  const meter: OddMeterSignature = { numerator: 7, denominator: 8 };
  const allowedGroupings = [
    [4, 3],
    [3, 4],
    [2, 2, 3],
    [3, 2, 2],
    [2, 3, 2],
  ] as const;
  const policy: OddMeterGroupingPolicy = {
    styleId: 'meter7',
    meter,
    allowedGroupings: allowedGroupings.map((g) => [...g]),
    defaultGrouping: [2, 2, 3],
    accentTopologyPerGrouping: buildAccentMap(meter, allowedGroupings),
    phraseGroupLength: 4,
    cadenceGroupBehavior: 'simplify',
    densityCurve: 'flat',
    loopUnit: 'groupSequence',
    syncopationBudget: 2,
    minAccentDensity: 1,
    longNotePolicy: 'lastGroup',
  };
  validatePolicy(policy);
  return policy;
}

function meter9Policy(): OddMeterGroupingPolicy {
  const meter: OddMeterSignature = { numerator: 9, denominator: 8 };
  const allowedGroupings = [
    [3, 3, 3],
    [2, 2, 2, 3],
    [2, 2, 3, 2],
    [2, 3, 2, 2],
    [3, 2, 2, 2],
  ] as const;
  const policy: OddMeterGroupingPolicy = {
    styleId: 'meter9',
    meter,
    allowedGroupings: allowedGroupings.map((g) => [...g]),
    defaultGrouping: [2, 2, 2, 3],
    accentTopologyPerGrouping: buildAccentMap(meter, allowedGroupings),
    phraseGroupLength: 4,
    cadenceGroupBehavior: 'lengthen',
    densityCurve: 'flat',
    loopUnit: 'groupSequence',
    syncopationBudget: 2,
    minAccentDensity: 1,
    longNotePolicy: 'lastGroup',
  };
  validatePolicy(policy);
  return policy;
}

function meter10Policy(): OddMeterGroupingPolicy {
  const meter: OddMeterSignature = { numerator: 10, denominator: 8 };
  const allowedGroupings = [
    [3, 3, 4],
    [4, 3, 3],
    [3, 4, 3],
    [2, 3, 2, 3],
    [2, 2, 3, 3],
  ] as const;
  const policy: OddMeterGroupingPolicy = {
    styleId: 'meter10',
    meter,
    allowedGroupings: allowedGroupings.map((g) => [...g]),
    defaultGrouping: [3, 3, 4],
    accentTopologyPerGrouping: buildAccentMap(meter, allowedGroupings),
    phraseGroupLength: 4,
    cadenceGroupBehavior: 'lengthen',
    tihaiCadence: { phraseLength: 10, cellLength: 3 },
    talaCycleLength: 10,
    densityCurve: 'crescendo',
    loopUnit: 'hyperBar',
    syncopationBudget: 3,
    minAccentDensity: 1,
    longNotePolicy: 'lastGroup',
  };
  validatePolicy(policy);
  return policy;
}

function mahavishnuMeterCatalog(): OddMeterMeterVariant[] {
  const m7 = meter7Policy();
  const m9 = meter9Policy();
  const m10 = meter10Policy();
  const m12: OddMeterSignature = { numerator: 12, denominator: 8 };
  const g12 = [
    [3, 3, 3, 3],
    [4, 4, 4],
    [3, 3, 2, 2, 2],
  ] as const;
  const m18: OddMeterSignature = { numerator: 18, denominator: 8 };
  const g18 = [
    [3, 3, 3, 3, 3, 3],
    [6, 6, 6],
    [3, 3, 4, 4, 4],
  ] as const;
  const m20: OddMeterSignature = { numerator: 20, denominator: 8 };
  const g20 = [
    [4, 4, 4, 4, 4],
    [5, 5, 5, 5],
    [3, 3, 4, 4, 6],
  ] as const;
  return [
    {
      meter: m7.meter,
      allowedGroupings: m7.allowedGroupings,
      defaultGrouping: m7.defaultGrouping,
      accentTopologyPerGrouping: m7.accentTopologyPerGrouping,
    },
    {
      meter: m9.meter,
      allowedGroupings: m9.allowedGroupings,
      defaultGrouping: m9.defaultGrouping,
      accentTopologyPerGrouping: m9.accentTopologyPerGrouping,
    },
    {
      meter: m10.meter,
      allowedGroupings: m10.allowedGroupings,
      defaultGrouping: m10.defaultGrouping,
      accentTopologyPerGrouping: m10.accentTopologyPerGrouping,
    },
    {
      meter: m12,
      allowedGroupings: g12.map((g) => [...g]),
      defaultGrouping: [3, 3, 3, 3],
      accentTopologyPerGrouping: buildAccentMap(m12, g12),
    },
    {
      meter: m18,
      allowedGroupings: g18.map((g) => [...g]),
      defaultGrouping: [3, 3, 3, 3, 3, 3],
      accentTopologyPerGrouping: buildAccentMap(m18, g18),
    },
    {
      meter: m20,
      allowedGroupings: g20.map((g) => [...g]),
      defaultGrouping: [4, 4, 4, 4, 4],
      accentTopologyPerGrouping: buildAccentMap(m20, g20),
    },
  ];
}

function mahavishnuPolicy(): OddMeterGroupingPolicy {
  const m10 = meter10Policy();
  const policy: OddMeterGroupingPolicy = {
    styleId: 'mahavishnu',
    meter: { numerator: 7, denominator: 8 },
    allowedGroupings: meter7Policy().allowedGroupings,
    defaultGrouping: [2, 2, 3],
    accentTopologyPerGrouping: meter7Policy().accentTopologyPerGrouping,
    phraseGroupLength: 4,
    cadenceGroupBehavior: 'lengthen',
    tihaiCadence: m10.tihaiCadence,
    talaCycleLength: 18,
    densityCurve: 'tihaiCadence',
    loopUnit: 'hyperBar',
    syncopationBudget: 3,
    minAccentDensity: 1,
    longNotePolicy: 'lastGroup',
    polyGroupingMode: true,
    ensembleAccentPolicy: 'polyrhythmic',
    chromaticBudgetHint: 0.5,
    phaseOffsetPolicy: {
      loopLengthBeats: 7,
      barLengthBeats: 4,
      startOffsetBeats: 0,
      driftPerCycleBeats: 0,
    },
    variationOperators: ['rhythmicWarp', 'truncateOrExtend', 'registerShift', 'cellTransposition'],
    meterCatalog: mahavishnuMeterCatalog(),
  };
  validatePolicy(policy);
  return policy;
}

function frippPolicy(): OddMeterGroupingPolicy {
  const meter: OddMeterSignature = { numerator: 5, denominator: 4 };
  const allowedGroupings = [[3, 2], [2, 3]] as const;
  const policy: OddMeterGroupingPolicy = {
    styleId: 'fripp',
    meter,
    allowedGroupings: allowedGroupings.map((g) => [...g]),
    defaultGrouping: [3, 2],
    accentTopologyPerGrouping: buildAccentMap(meter, allowedGroupings),
    phraseGroupLength: 4,
    cadenceGroupBehavior: 'fill',
    densityCurve: 'flat',
    loopUnit: 'groupSequence',
    syncopationBudget: 1,
    minAccentDensity: 1,
    longNotePolicy: 'groupStart',
    polyGroupingMode: false,
    ensembleAccentPolicy: 'displaced',
    phaseOffsetPolicy: {
      loopLengthBeats: 5,
      barLengthBeats: 4,
      startOffsetBeats: 0.5,
      driftPerCycleBeats: 0,
      lockBackEveryCycles: 8,
    },
    processLoopPolicy: {
      baseCellRepeatCount: 8,
      microEditProbPerCycle: 0.1,
      dynamicCurve: 'swell',
    },
  };
  validatePolicy(policy);
  return policy;
}

function weatherReportPolicy(): OddMeterGroupingPolicy {
  const meter: OddMeterSignature = { numerator: 4, denominator: 4 };
  const groupingPatterns = [
    [3, 3, 2],
    [2, 2, 3],
    [5, 3],
  ] as const;
  const policy: OddMeterGroupingPolicy = {
    styleId: 'weatherReport',
    meter,
    allowedGroupings: [[4]],
    defaultGrouping: [4],
    accentTopologyPerGrouping: { '4': [2, 0, 1, 0] },
    groupingPatterns: groupingPatterns.map((g) => [...g]),
    phraseGroupLength: 4,
    cadenceGroupBehavior: 'simplify',
    densityCurve: 'arch',
    loopUnit: 'bar',
    syncopationBudget: 1,
    minAccentDensity: 1,
    longNotePolicy: 'distributed',
    ensembleAccentPolicy: 'displaced',
    phaseOffsetPolicy: undefined,
  };
  validatePolicy(policy);
  return policy;
}

/** Named preset factories (research-backed). */
export const oddMeterEngine = {
  meter5: meter5Policy,
  meter7: meter7Policy,
  meter9: meter9Policy,
  meter10: meter10Policy,
  mahavishnu: mahavishnuPolicy,
  fripp: frippPolicy,
  weatherReport: weatherReportPolicy,
} as const;

export function getOddMeterPolicy(style: OddMeterPolicyStyle): OddMeterGroupingPolicy {
  switch (style) {
    case 'meter5':
      return oddMeterEngine.meter5();
    case 'meter7':
      return oddMeterEngine.meter7();
    case 'meter9':
      return oddMeterEngine.meter9();
    case 'meter10':
      return oddMeterEngine.meter10();
    case 'mahavishnu':
      return oddMeterEngine.mahavishnu();
    case 'fripp':
      return oddMeterEngine.fripp();
    case 'weatherReport':
      return oddMeterEngine.weatherReport();
    default: {
      const _exhaustive: never = style;
      return _exhaustive;
    }
  }
}

function toRiffOddMeterTemplate(p: OddMeterGroupingPolicy): RiffOddMeterTemplate {
  return {
    meter: { num: p.meter.numerator, denom: p.meter.denominator },
    groups: p.allowedGroupings.map((g) => [...g]),
  };
}

/**
 * Maps an {@link OddMeterGroupingPolicy} preset into {@link RiffProfile} meter/grouping fields.
 */
export function riffProfileSliceFromOddMeter(style: OddMeterPolicyStyle): Pick<
  RiffProfile,
  | 'meterPolicy'
  | 'oddMeterTemplate'
  | 'talaCycleLength'
  | 'densityCurve'
  | 'groupingPatterns'
  | 'phaseOffsetPolicy'
  | 'polyGroupingMode'
  | 'accentTopology'
  | 'variationOperators'
  | 'processLoopPolicy'
  | 'chromaticBudget'
  | 'silencePolicy'
> {
  const p = getOddMeterPolicy(style);
  const defaultKey = groupingKey(p.defaultGrouping);
  const accentTopology = [...(p.accentTopologyPerGrouping[defaultKey] ?? accentFromGrouping(p.defaultGrouping))];

  const silencePolicy: RiffSilencePolicy = {
    restProbabilityBySlot: new Array<number>(accentTopology.length).fill(0.12),
    styleClass: `odd_meter:${p.styleId}`,
    oddMeterPreset: style,
  };

  return {
    meterPolicy: p.meter.numerator % 2 === 0 && p.allowedGroupings.length === 1 && p.defaultGrouping[0] === p.meter.numerator
      ? 'simple'
      : 'odd_grouped',
    oddMeterTemplate: toRiffOddMeterTemplate(p),
    talaCycleLength: p.talaCycleLength,
    densityCurve: p.densityCurve,
    groupingPatterns: p.groupingPatterns ? p.groupingPatterns.map((g) => [...g]) : undefined,
    phaseOffsetPolicy: toRiffPhase(p.phaseOffsetPolicy),
    polyGroupingMode: p.polyGroupingMode,
    accentTopology,
    variationOperators: p.variationOperators ? [...p.variationOperators] : undefined,
    processLoopPolicy: p.processLoopPolicy ? { ...p.processLoopPolicy } : undefined,
    chromaticBudget: p.chromaticBudgetHint,
    silencePolicy,
  };
}
