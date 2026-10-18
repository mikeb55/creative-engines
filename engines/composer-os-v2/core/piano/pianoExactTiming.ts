/**
 * Piano V1.1 Stage A exact timing.
 * Quarter lengths are reduced rationals. PPQ 480 export stays the only export mode.
 * Nested tuplets are rejected. Ordinary 3:2 and 5:4 are integral at 480.
 */

import type { ExactQuarter, PianoExactTiming } from '../score-model/scoreModelTypes';

export const PIANO_V11_EXPORT_PPQ = 480;

export const PIANO_V11_ADAPTIVE_PPQ_LIMIT =
  'Adaptive MIDI/XML export above PPQ 480 is not supported. Ordinary 3:2 and 5:4 remain at 480.';

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a / gcd(a, b) * b);
}

export function q(n: number, d = 1): ExactQuarter {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) {
    throw new Error(`invalid quarter ${n}/${d}`);
  }
  const sign = (n < 0 ? -1 : 1) * (d < 0 ? -1 : 1);
  const nn = Math.abs(n);
  const dd = Math.abs(d);
  const g = gcd(nn, dd);
  return { n: sign * (nn / g), d: dd / g };
}

export function qAdd(a: ExactQuarter, b: ExactQuarter): ExactQuarter {
  return q(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function qSub(a: ExactQuarter, b: ExactQuarter): ExactQuarter {
  return q(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function qMul(a: ExactQuarter, b: ExactQuarter): ExactQuarter {
  return q(a.n * b.n, a.d * b.d);
}

export function qCmp(a: ExactQuarter, b: ExactQuarter): number {
  return a.n * b.d - b.n * a.d;
}

export function qEq(a: ExactQuarter, b: ExactQuarter): boolean {
  return qCmp(a, b) === 0;
}

export function qToNumber(value: ExactQuarter): number {
  return value.n / value.d;
}

/** Dyadic motif floats (multiples of 1/16). Rejects tuplet floats such as 1/3. */
export function dyadicQuarter(value: number): ExactQuarter {
  if (!Number.isFinite(value)) throw new Error(`non-finite quarter ${value}`);
  const sixteenths = Math.round(value * 16);
  if (Math.abs(value * 16 - sixteenths) > 1e-6) {
    throw new Error(`quarter ${value} is not a dyadic 16th-grid value`);
  }
  return q(sixteenths, 16);
}

export function integralTicks(value: ExactQuarter, ppq: number): number | null {
  if (!Number.isInteger(ppq) || ppq <= 0) return null;
  const reduced = q(value.n, value.d);
  if (reduced.n < 0) return null;
  const numerator = reduced.n * ppq;
  if (numerator % reduced.d !== 0) return null;
  return numerator / reduced.d;
}

/**
 * Smallest PPQ that is a multiple of `base` and represents every reduced quarter.
 * 2/9 → 1440, 4/25 → 2400, both → 7200, 1/192 → 960, when base is 480.
 */
export function requiredPpq(values: readonly ExactQuarter[], base = PIANO_V11_EXPORT_PPQ): number {
  let need = 1;
  for (const value of values) {
    const reduced = q(value.n, value.d);
    if (reduced.d > 1_000_000) {
      throw new Error(`exact quarter denominator ${reduced.d} is outside the bounded resolver`);
    }
    need = lcm(need, reduced.d);
  }
  return lcm(base, need);
}

export function exportResolution(values: readonly ExactQuarter[]): { ppq: 480 } | { error: string; required: number } {
  const required = requiredPpq(values, PIANO_V11_EXPORT_PPQ);
  if (required !== PIANO_V11_EXPORT_PPQ) {
    return { error: `${PIANO_V11_ADAPTIVE_PPQ_LIMIT} Required PPQ ${required}.`, required };
  }
  return { ppq: 480 };
}

const WRITTEN: { type: string; dots: 0 | 1 | 2; length: ExactQuarter }[] = [
  ['whole', 0, q(4, 1)],
  ['whole', 1, q(6, 1)],
  ['whole', 2, q(7, 1)],
  ['half', 0, q(2, 1)],
  ['half', 1, q(3, 1)],
  ['half', 2, q(7, 2)],
  ['quarter', 0, q(1, 1)],
  ['quarter', 1, q(3, 2)],
  ['quarter', 2, q(7, 4)],
  ['eighth', 0, q(1, 2)],
  ['eighth', 1, q(3, 4)],
  ['eighth', 2, q(7, 8)],
  ['16th', 0, q(1, 4)],
  ['16th', 1, q(3, 8)],
  ['16th', 2, q(7, 16)],
  ['32nd', 0, q(1, 8)],
  ['32nd', 1, q(3, 16)],
  ['32nd', 2, q(7, 32)],
  ['64th', 0, q(1, 16)],
  ['64th', 1, q(3, 32)],
  ['64th', 2, q(7, 64)],
  ['128th', 0, q(1, 32)],
  ['128th', 1, q(3, 64)],
  ['128th', 2, q(7, 128)],
].map(([type, dots, length]) => ({ type: type as string, dots: dots as 0 | 1 | 2, length: length as ExactQuarter }));

const WRITTEN_DESC = [...WRITTEN].sort((a, b) => qCmp(b.length, a.length));

export function spellStraight(duration: ExactQuarter): { type: string; dots: 0 | 1 | 2; length: ExactQuarter }[] {
  const parts: { type: string; dots: 0 | 1 | 2; length: ExactQuarter }[] = [];
  let remain = q(duration.n, duration.d);
  if (qCmp(remain, q(0, 1)) <= 0) throw new Error('straight duration must be positive');
  while (qCmp(remain, q(0, 1)) > 0) {
    const found = WRITTEN_DESC.find((item) => qCmp(item.length, remain) <= 0);
    if (!found) throw new Error(`cannot spell straight duration ${remain.n}/${remain.d}`);
    parts.push(found);
    remain = qSub(remain, found.length);
  }
  return parts;
}

export function spellTupletFragment(
  sounding: ExactQuarter,
  actualNotes: number,
  normalNotes: number,
): { type: string; dots: 0 | 1 | 2 } {
  const written = qMul(sounding, q(actualNotes, normalNotes));
  const found = WRITTEN.find((item) => qEq(item.length, written));
  if (!found) {
    throw new Error(`cannot spell tuplet fragment ${sounding.n}/${sounding.d} under ${actualNotes}:${normalNotes}`);
  }
  return { type: found.type, dots: found.dots };
}

export interface TupletRatioSpec {
  actualNotes: 3 | 5;
  normalNotes: 2 | 4;
  normalType: 'eighth' | '16th';
  sounding: ExactQuarter;
  count: 3 | 5;
  writtenType: 'eighth' | '16th';
}

export function tupletRatio(ratio: '3:2' | '5:4'): TupletRatioSpec {
  if (ratio === '3:2') {
    return {
      actualNotes: 3,
      normalNotes: 2,
      normalType: 'eighth',
      sounding: q(1, 3),
      count: 3,
      writtenType: 'eighth',
    };
  }
  if (ratio === '5:4') {
    return {
      actualNotes: 5,
      normalNotes: 4,
      normalType: '16th',
      sounding: q(1, 5),
      count: 5,
      writtenType: '16th',
    };
  }
  throw new Error(`unsupported tuplet ratio ${String(ratio)}`);
}

export function rejectNestedTuplet(spec: { nested?: boolean; inner?: unknown }): string | null {
  if (spec.nested === true || spec.inner !== undefined) return 'nested tuplets are unsupported';
  return null;
}

export function floatsAgree(value: number, exact: ExactQuarter): boolean {
  return Math.abs(value - qToNumber(exact)) < 1e-9;
}

export function timingAgrees(startBeat: number, duration: number, exact: PianoExactTiming): boolean {
  return floatsAgree(startBeat, exact.onsetQ) && floatsAgree(duration, exact.durationQ);
}
