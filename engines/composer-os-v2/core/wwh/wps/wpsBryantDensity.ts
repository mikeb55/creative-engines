/**
 * WPS V1.4 density gates: eighth-note streams and 16th-note bursts.
 * Reads note values from a finished part. Does not write MusicXML.
 */

import { solveFretPath, type FretSlice } from '../../performance-composer/pcFretboard';

const MINOR_PENT = [0, 3, 5, 7, 10];

export type RhythmValue = '16th' | 'eighth' | 'quarter' | 'half' | 'other';

export interface RhythmEvent {
  bar: number;
  onset: number;
  end: number;
  /** Absolute onset in quarter notes. */
  time: number;
  quarters: number;
  /** Onset inside the bar, in quarter notes. */
  barQuarter: number;
  midis: number[];
  pcs: number[];
  rest: boolean;
  tieStart: boolean;
  tieStop: boolean;
  value: RhythmValue;
  barQuarters: number;
}

export interface EighthStream {
  bars: number[];
  barCount: number;
  displacedAccents: number;
  enclosures: number;
  fourthLeaps: number;
  arrival: boolean;
  spaceAfterQuarters: number;
}

export interface DensityBurst {
  bars: number[];
  notes: number;
  wideShare: number;
  fieldSwitch: boolean;
  plainScale: boolean;
  stringSkip: boolean;
  legato: boolean;
  isolated: boolean;
  bassGap: boolean;
  fretOk: boolean;
  maxSpan: number;
  hardShifts: number;
  fretDetail: string;
  playability: 'NOT VERIFIED';
}

export interface ScaleRunFinding {
  bars: number[];
  leaps: number;
  fieldChange: boolean;
  exempt: boolean;
  reason: string;
}

function endTime(event: RhythmEvent): number {
  return event.time + event.quarters;
}

function pentatonic(root: number): Set<number> {
  return new Set(MINOR_PENT.map((step) => (root + step) % 12));
}

function fittedField(pcs: number[]): number | null {
  if (pcs.length < 2) return null;
  let best: number | null = null;
  let bestCount = 0;
  for (let root = 0; root < 12; root += 1) {
    const field = pentatonic(root);
    const count = pcs.filter((pc) => field.has(pc)).length;
    if (count > bestCount) {
      bestCount = count;
      best = root;
    }
  }
  if (best == null || bestCount < pcs.length) return null;
  return best;
}

/** A later group sits entirely in the tritone partner of an earlier group. */
export function fieldChange(pcs: number[]): boolean {
  if (pcs.length < 4) return false;
  for (let cut = 2; cut <= pcs.length - 2; cut += 1) {
    const left = fittedField(pcs.slice(0, cut));
    const right = fittedField(pcs.slice(cut));
    if (left == null || right == null) continue;
    if ((right - left + 12) % 12 === 6) return true;
  }
  return false;
}

export function classifyScaleRuns(events: readonly RhythmEvent[]): ScaleRunFinding[] {
  const findings: ScaleRunFinding[] = [];
  let strand: RhythmEvent[] = [];
  const push = () => {
    const notes = strand.filter((event) => !event.rest && event.midis.length === 1);
    if (notes.length > 6) {
      let steps = 0;
      let leaps = 0;
      for (let i = 1; i < notes.length; i += 1) {
        const interval = Math.abs(notes[i]!.midis[0]! - notes[i - 1]!.midis[0]!);
        if (interval === 1 || interval === 2) steps += 1;
        else if (interval >= 3) leaps += 1;
      }
      if (steps > 0) {
        const changed = fieldChange(notes.map((event) => event.pcs[0]!));
        const bars = [...new Set(notes.map((event) => event.bar))].sort((a, b) => a - b);
        const exempt = leaps >= 2 || changed;
        const reason = exempt
          ? `${leaps} leap${leaps === 1 ? '' : 's'}${changed ? ', field change' : ''}`
          : `${leaps} leaps, no field change`;
        findings.push({ bars, leaps, fieldChange: changed, exempt, reason });
      }
    }
    strand = [];
  };
  for (const event of events) {
    if (event.rest || event.midis.length !== 1) {
      push();
      continue;
    }
    strand.push(event);
  }
  push();
  return findings;
}

function lineNotes(events: readonly RhythmEvent[]): RhythmEvent[] {
  return events.filter((event) => !event.rest && event.midis.length === 1);
}

function enclosuresOf(notes: readonly RhythmEvent[]): number {
  let count = 0;
  for (let i = 0; i < notes.length - 2; i += 1) {
    const target = notes[i + 2]!.midis[0]!;
    const first = notes[i]!.midis[0]! - target;
    const second = notes[i + 1]!.midis[0]! - target;
    const step = (gap: number) => Math.abs(gap) >= 1 && Math.abs(gap) <= 2;
    if (step(first) && step(second) && first * second < 0) count += 1;
  }
  return count;
}

function displacedAccents(notes: readonly RhythmEvent[]): number {
  return notes.filter((event) => {
    const offBeat = Math.abs(event.barQuarter - Math.round(event.barQuarter)) > 0.2;
    return offBeat && (event.tieStart || event.quarters > 0.5);
  }).length;
}

function fourthLeaps(notes: readonly RhythmEvent[]): number {
  let count = 0;
  for (let i = 1; i < notes.length; i += 1) {
    if (Math.abs(notes[i]!.midis[0]! - notes[i - 1]!.midis[0]!) >= 5) count += 1;
  }
  return count;
}

export function findEighthStreams(events: readonly RhythmEvent[]): EighthStream[] {
  const streams: EighthStream[] = [];
  let index = 0;
  while (index < events.length) {
    const start = events[index]!;
    if (start.value !== 'eighth' || start.rest || start.midis.length !== 1) {
      index += 1;
      continue;
    }
    let end = index;
    while (end < events.length) {
      const event = events[end]!;
      const shortRest = event.rest && event.quarters <= 0.5 + 1e-6;
      const eighth = event.value === 'eighth' && !event.rest && event.midis.length === 1;
      if (!shortRest && !eighth) break;
      end += 1;
    }
    const body = events.slice(index, end);
    const arrival = events[end];
    const arrivalOk =
      !!arrival && !arrival.rest && arrival.midis.length === 1 && (arrival.value === 'quarter' || arrival.value === 'half');
    const notes = lineNotes(body);
    const last = arrivalOk && arrival ? arrival : body[body.length - 1]!;
    const counted = arrivalOk && arrival ? [...notes, arrival] : notes;
    const bars = [...new Set(counted.map((event) => event.bar))].sort((a, b) => a - b);
    const after = end + (arrivalOk ? 1 : 0);
    const nextPitch = events.slice(after).find((event) => !event.rest && event.midis.length > 0);
    const spaceAfter = nextPitch
      ? nextPitch.time - endTime(last)
      : Math.max(0, last.barQuarters - (last.barQuarter + last.quarters));
    streams.push({
      bars,
      barCount: bars.length ? bars[bars.length - 1]! - bars[0]! + 1 : 0,
      displacedAccents: displacedAccents(counted),
      enclosures: enclosuresOf(notes),
      fourthLeaps: fourthLeaps(counted),
      arrival: arrivalOk,
      spaceAfterQuarters: Math.max(0, spaceAfter),
    });
    index = Math.max(after, index + 1);
  }
  return streams;
}

function fretOf(events: readonly RhythmEvent[]): Pick<DensityBurst, 'stringSkip' | 'legato' | 'fretOk' | 'maxSpan' | 'hardShifts' | 'fretDetail'> {
  const slices: FretSlice[] = events.map((event) => ({
    time: event.time,
    midis: [event.midis[0]!],
    held: [],
    bar: event.bar,
  }));
  const path = solveFretPath(slices);
  let stringSkip = false;
  if (path.ok) {
    for (let i = 1; i < path.fingerings.length; i += 1) {
      const left = path.fingerings[i - 1]?.[0]?.string;
      const right = path.fingerings[i]?.[0]?.string;
      if (left != null && right != null && Math.abs(left - right) >= 2) stringSkip = true;
    }
  }
  const tied = events.some((event) => event.tieStart || event.tieStop);
  const onePosition = path.ok && path.hardShifts === 0 && new Set(path.positions).size <= 1;
  return {
    stringSkip,
    legato: tied || onePosition,
    fretOk: path.ok && path.maxSpan <= 4 && path.hardShifts === 0,
    maxSpan: path.maxSpan,
    hardShifts: path.hardShifts,
    fretDetail: `solveFretPath ok=${path.ok} maxSpan=${path.maxSpan} hardShifts=${path.hardShifts}`,
  };
}

export function findSixteenthBursts(events: readonly RhythmEvent[], bass: readonly RhythmEvent[]): DensityBurst[] {
  const bursts: DensityBurst[] = [];
  let index = 0;
  while (index < events.length) {
    const event = events[index]!;
    if (event.value !== '16th' || event.rest || event.midis.length !== 1) {
      index += 1;
      continue;
    }
    const group = [event];
    let cursor = index + 1;
    while (cursor < events.length) {
      const next = events[cursor]!;
      const previous = group[group.length - 1]!;
      const joined = Math.abs(next.time - endTime(previous)) < 0.05;
      if (next.value === '16th' && !next.rest && next.midis.length === 1 && next.bar === event.bar && joined) {
        group.push(next);
        cursor += 1;
        continue;
      }
      break;
    }
    const span = endTime(group[group.length - 1]!) - group[0]!.time;
    if (group.length >= 4 && group.length <= 12 && span <= group[0]!.barQuarters + 0.05) {
      let wide = 0;
      let steps = 0;
      for (let i = 1; i < group.length; i += 1) {
        const interval = Math.abs(group[i]!.midis[0]! - group[i - 1]!.midis[0]!);
        if (interval >= 3) wide += 1;
        if (interval === 1 || interval === 2) steps += 1;
      }
      const intervals = Math.max(1, group.length - 1);
      const switched = fieldChange(group.map((item) => item.pcs[0]!));
      const before = events.slice(0, index).reverse().find((item) => !item.rest && item.midis.length > 0);
      const after = events.slice(cursor).find((item) => !item.rest && item.midis.length > 0);
      const silenceBefore = !before || group[0]!.time - endTime(before) >= 2 - 1e-6 || before.value === 'half';
      const silenceAfter =
        !after || after.time - endTime(group[group.length - 1]!) >= 2 - 1e-6 || after.value === 'half';
      const bassAt = bass.some((item) => !item.rest && item.time <= group[0]!.time + 1e-6 && endTime(item) > group[0]!.time + 1e-6);
      const fret = fretOf(group);
      bursts.push({
        bars: [group[0]!.bar],
        notes: group.length,
        wideShare: wide / intervals,
        fieldSwitch: switched,
        plainScale: steps === intervals && !switched,
        isolated: silenceBefore || silenceAfter,
        bassGap: !bassAt,
        ...fret,
        playability: 'NOT VERIFIED',
      });
    }
    index = Math.max(cursor, index + 1);
  }
  return bursts;
}
