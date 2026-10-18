/**
 * Piano V1.1 Stage A meter plan.
 * Group numbers are denominator-note units. 9/16 defaults to 4+2+3,
 * the same cell Bartók B1 uses, without calling that duo-only engine.
 */

import type { BarMeterMap } from '../rhythm/barMeterTypes';
import { measureDivisionsForMeter } from '../rhythm/oddMeterQuantiser';
import type { ExactQuarter } from '../score-model/scoreModelTypes';
import { PIANO_V11_EXPORT_PPQ, integralTicks, q, qAdd, qCmp, qEq, qMul, qToNumber } from './pianoExactTiming';

export interface PianoMeterBarPlan {
  bar: number;
  numerator: number;
  denominator: number;
  groups: number[];
}

export interface PianoTimelineBar extends PianoMeterBarPlan {
  start: ExactQuarter;
  span: ExactQuarter;
}

export const PIANO_V11_METRES: readonly {
  numerator: number;
  denominator: number;
  groups: readonly number[];
}[] = [
  { numerator: 4, denominator: 4, groups: [2, 2] },
  { numerator: 3, denominator: 4, groups: [1, 1, 1] },
  { numerator: 5, denominator: 4, groups: [3, 2] },
  { numerator: 6, denominator: 8, groups: [3, 3] },
  { numerator: 7, denominator: 8, groups: [2, 2, 3] },
  { numerator: 9, denominator: 16, groups: [4, 2, 3] },
];

export function defaultGroups(numerator: number, denominator: number): number[] | null {
  const found = PIANO_V11_METRES.find((meter) => meter.numerator === numerator && meter.denominator === denominator);
  return found ? [...found.groups] : null;
}

export function meterSupported(numerator: number, denominator: number): boolean {
  return defaultGroups(numerator, denominator) !== null;
}

export function spanQuarters(numerator: number, denominator: number): ExactQuarter {
  return q(numerator * 4, denominator);
}

export function validatePianoMeterPlan(plan: readonly PianoMeterBarPlan[], barCount: number): string[] {
  const errors: string[] = [];
  if (!Array.isArray(plan)) return ['meter plan must be an array'];
  if (!Number.isInteger(barCount) || barCount < 1) errors.push('bar count must be a positive integer');
  const seen = new Set<number>();
  for (const bar of plan) {
    if (!bar || typeof bar !== 'object') {
      errors.push('meter plan entries must be objects');
      continue;
    }
    if (!Number.isInteger(bar.bar) || bar.bar < 1) {
      errors.push('meter plan bar numbers must be positive integers');
      continue;
    }
    if (seen.has(bar.bar)) errors.push(`bar ${bar.bar} is duplicated`);
    else seen.add(bar.bar);
    if (!Number.isInteger(bar.numerator) || bar.numerator <= 0) {
      errors.push(`bar ${bar.bar} numerator must be a positive integer`);
    }
    if (!Number.isInteger(bar.denominator) || bar.denominator <= 0) {
      errors.push(`bar ${bar.bar} denominator must be a positive integer`);
    } else if (!meterSupported(bar.numerator, bar.denominator)) {
      errors.push(`unsupported meter ${bar.numerator}/${bar.denominator}`);
    }
    if (!Array.isArray(bar.groups) || bar.groups.length === 0 || bar.groups.some((group) => !Number.isInteger(group) || group <= 0)) {
      errors.push(`bar ${bar.bar} grouping must be positive integers`);
      continue;
    }
    const sum = bar.groups.reduce((total, group) => total + group, 0);
    if (sum !== bar.numerator) errors.push(`bar ${bar.bar} groups ${bar.groups.join('+')} do not equal ${bar.numerator}`);
  }
  for (let bar = 1; bar <= barCount; bar += 1) {
    if (!seen.has(bar)) errors.push(`bar ${bar} has no meter plan`);
  }
  for (const bar of seen.keys()) {
    if (bar > barCount) errors.push(`bar ${bar} is outside the ${barCount}-bar plan`);
  }
  return errors;
}

export function buildPianoTimeline(plan: readonly PianoMeterBarPlan[]): PianoTimelineBar[] {
  const ordered = [...plan].sort((a, b) => a.bar - b.bar);
  let cursor = q(0, 1);
  return ordered.map((bar) => {
    const span = spanQuarters(bar.numerator, bar.denominator);
    const row: PianoTimelineBar = { ...bar, groups: [...bar.groups], start: cursor, span };
    cursor = qAdd(cursor, span);
    return row;
  });
}

export function timelineTotals(timeline: readonly PianoTimelineBar[]): { quarters: ExactQuarter; ticks: number } {
  let quarters = q(0, 1);
  for (const bar of timeline) quarters = qAdd(quarters, bar.span);
  const ticks = integralTicks(quarters, PIANO_V11_EXPORT_PPQ);
  if (ticks === null) throw new Error(`timeline ${quarters.n}/${quarters.d} is not integral at PPQ 480`);
  return { quarters, ticks };
}

export function barMeterMapFromPlan(plan: readonly PianoMeterBarPlan[]): BarMeterMap {
  const map: BarMeterMap = {};
  for (const bar of plan) map[bar.bar] = { numerator: bar.numerator, denominator: bar.denominator };
  return map;
}

export function groupBoundaries(bar: PianoTimelineBar): ExactQuarter[] {
  const unit = q(4, bar.denominator);
  const marks = [q(0, 1)];
  let cursor = q(0, 1);
  for (const group of bar.groups) {
    cursor = qAdd(cursor, qMul(q(group, 1), unit));
    marks.push(cursor);
  }
  return marks;
}

export function isGroupBoundary(onset: ExactQuarter, bar: PianoTimelineBar): boolean {
  return groupBoundaries(bar).some((mark) => qEq(mark, onset));
}

export function formatTimeXml(numerator: number, denominator: number, groups?: readonly number[]): string {
  if (!groups || groups.length === 0) {
    return `<time><beats>${numerator}</beats><beat-type>${denominator}</beat-type></time>`;
  }
  const sum = groups.reduce((total, group) => total + group, 0);
  if (sum !== numerator) {
    throw new Error(`Piano V1.1 grouping ${groups.join('+')} does not equal ${numerator}`);
  }
  const body = groups.map((group) => `<beats>${group}</beats><beat-type>${denominator}</beat-type>`).join('');
  return `<time>${body}</time>`;
}

export function cyclePlan(repeats: number): PianoMeterBarPlan[] {
  const pattern = PIANO_V11_METRES;
  const plan: PianoMeterBarPlan[] = [];
  for (let index = 0; index < pattern.length * repeats; index += 1) {
    const meter = pattern[index % pattern.length]!;
    plan.push({
      bar: index + 1,
      numerator: meter.numerator,
      denominator: meter.denominator,
      groups: [...meter.groups],
    });
  }
  return plan;
}

export function uniformPlan(bars: number, numerator: number, denominator: number, groups?: number[]): PianoMeterBarPlan[] {
  const chosen = groups ?? defaultGroups(numerator, denominator);
  if (!chosen) throw new Error(`unsupported meter ${numerator}/${denominator}`);
  return Array.from({ length: bars }, (_, index) => ({
    bar: index + 1,
    numerator,
    denominator,
    groups: [...chosen],
  }));
}

export function barLengthTicks(bar: PianoTimelineBar): number {
  const fromRational = integralTicks(bar.span, PIANO_V11_EXPORT_PPQ);
  const fromMeter = measureDivisionsForMeter(bar.numerator, bar.denominator);
  if (fromRational !== fromMeter) {
    throw new Error(`bar ${bar.bar} rational ticks ${fromRational} disagree with meter ticks ${fromMeter}`);
  }
  return fromMeter;
}

export function quartersToSeconds(quarters: ExactQuarter, quarterBpm: number): number {
  return qToNumber(quarters) * (60 / quarterBpm);
}

export function findTimelineBar(timeline: readonly PianoTimelineBar[], absolute: ExactQuarter): PianoTimelineBar | null {
  for (const bar of timeline) {
    const end = qAdd(bar.start, bar.span);
    if (qCmp(absolute, bar.start) >= 0 && qCmp(absolute, end) < 0) return bar;
  }
  return null;
}

export function stageAAcceptanceExpectation(): { quarters: number; ticks: number; seconds: number } {
  const totals = timelineTotals(buildPianoTimeline(cyclePlan(4)));
  return {
    quarters: qToNumber(totals.quarters),
    ticks: totals.ticks,
    seconds: quartersToSeconds(totals.quarters, 48),
  };
}
