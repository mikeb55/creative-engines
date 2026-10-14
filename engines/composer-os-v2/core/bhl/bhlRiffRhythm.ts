/**
 * BHL adapter for riff rhythm.
 * Reads generateRiffCoreMotif and buildMultiBarRhythm. Does not change those engines.
 */

import { generateRiffCoreMotif } from '../motif/songModeMotifEngine';
import { mulberry32 } from '../riff-generator/riffRandom';
import { buildMultiBarRhythm, hasSyncopation } from '../riff-generator/riffRhythm';
import type { RiffRhythmSegment } from '../riff-generator/riffTypes';
import type { BhlBassBar, BhlOnsetPlan } from './bhlRhythm';

export type BhlRiffTransform =
  | 'original'
  | 'displace'
  | 'augment'
  | 'diminish'
  | 'fragment'
  | 'rest'
  | 'continue';

export type BhlRiffRhythmSource = 'bhl' | 'riff' | 'other-riff';

export interface BhlRiffRequest {
  pitchSource: 'world' | 'riff';
  rhythmSource: BhlRiffRhythmSource;
  pitchSeed?: number;
  rhythmSeed?: number;
  transform?: BhlRiffTransform;
  displacementQuarters?: number;
}

export interface BhlRiffSlot {
  startBeat: number;
  duration: number;
  rest: boolean;
}

export interface BhlRiffBar {
  quarters: number;
  slots: BhlRiffSlot[];
}

export interface BhlRiffCell {
  source: 'generateRiffCoreMotif' | 'buildMultiBarRhythm';
  seed: number;
  bars: BhlRiffBar[];
  /** Off-integer attacks, using the riff engine's own syncopation test. */
  syncopated: boolean;
  /** Contiguous played attacks. Rests already in the source split the groups. */
  groups: string[];
  /** CoreMotif rhythm and RiffRhythmSegment do not store accents. */
  accents: null;
  /** Neither riff interface stores articulations. */
  articulations: null;
  unavailable: string[];
  /** 1-based bar inside the imported cell where the engine varies the phrase. */
  phraseBoundaryBars: number[];
}

export interface BhlRiffPlacement {
  plans: BhlOnsetPlan[];
  limitations: string[];
  placed: number;
  withheld: string[];
  cell: BhlRiffCell;
  transform: BhlRiffTransform;
}

const EPS = 1e-4;

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function onGrid(value: number, divisions: number): boolean {
  const ticks = value * divisions;
  return Math.abs(ticks - Math.round(ticks)) < 1e-3;
}

function segmentsToBar(segments: readonly RiffRhythmSegment[], quarters = 4): BhlRiffBar {
  return {
    quarters,
    slots: segments.map((slot) => ({
      startBeat: round4(slot.startBeat),
      duration: round4(slot.duration),
      rest: slot.rest,
    })),
  };
}

/** Gaps in a CoreMotif rhythm are rests. The motif contract is one 4/4 bar. */
function coreBar(seed: number): BhlRiffBar {
  const motif = generateRiffCoreMotif(seed);
  const notes = motif.rhythmPattern
    .map((slot) => ({ startBeat: round4(slot.startBeat), duration: round4(slot.duration), rest: false }))
    .sort((a, b) => a.startBeat - b.startBeat);
  const slots: BhlRiffSlot[] = [];
  let cursor = 0;
  for (const note of notes) {
    if (note.startBeat > cursor + EPS) {
      slots.push({ startBeat: round4(cursor), duration: round4(note.startBeat - cursor), rest: true });
    }
    slots.push(note);
    cursor = note.startBeat + note.duration;
  }
  if (cursor < 4 - EPS) slots.push({ startBeat: round4(cursor), duration: round4(4 - cursor), rest: true });
  return { quarters: 4, slots };
}

function groupsOf(bar: BhlRiffBar, index: number): string {
  const sizes: number[] = [];
  let run = 0;
  for (const slot of bar.slots) {
    if (slot.rest) {
      if (run) sizes.push(run);
      run = 0;
    } else run += 1;
  }
  if (run) sizes.push(run);
  return `bar ${index + 1}: ${sizes.join('+') || 'rest'}`;
}

export function readBhlRiffCell(source: 'core' | 'engine', seed: number): BhlRiffCell {
  if (source === 'core') {
    const bar = coreBar(seed);
    const asEngine: RiffRhythmSegment[][] = [bar.slots.map((slot) => ({ ...slot }))];
    return {
      source: 'generateRiffCoreMotif',
      seed,
      bars: [bar],
      syncopated: hasSyncopation(asEngine),
      groups: [groupsOf(bar, 0)],
      accents: null,
      articulations: null,
      unavailable: [
        'Accents are not on CoreMotif.rhythmPattern.',
        'Articulations are not on CoreMotif.rhythmPattern.',
      ],
      phraseBoundaryBars: [1],
    };
  }
  const perBar = buildMultiBarRhythm(mulberry32(seed), 'sixteenth', 'medium', 4, 'neutral');
  const bars = perBar.map((segments) => segmentsToBar(segments, 4));
  return {
    source: 'buildMultiBarRhythm',
    seed,
    bars,
    syncopated: hasSyncopation(perBar),
    groups: bars.map((bar, index) => groupsOf(bar, index)),
    accents: null,
    articulations: null,
    unavailable: [
      'Accents are not on RiffRhythmSegment.',
      'Articulations are not on RiffRhythmSegment.',
    ],
    phraseBoundaryBars: [bars.length],
  };
}

function notesOf(bar: BhlRiffBar): BhlRiffSlot[] {
  return bar.slots.filter((slot) => !slot.rest).map((slot) => ({ ...slot }));
}

function barFromNotes(notes: readonly BhlRiffSlot[], quarters: number): BhlRiffBar {
  const ordered = notes
    .map((note) => ({ ...note, rest: false }))
    .filter((note) => note.duration > EPS && note.startBeat < quarters - EPS)
    .sort((a, b) => a.startBeat - b.startBeat);
  const slots: BhlRiffSlot[] = [];
  let cursor = 0;
  for (const note of ordered) {
    const start = Math.max(note.startBeat, cursor);
    if (start > cursor + EPS) slots.push({ startBeat: round4(cursor), duration: round4(start - cursor), rest: true });
    const duration = Math.min(note.duration, quarters - start);
    if (duration > EPS) slots.push({ startBeat: round4(start), duration: round4(duration), rest: false });
    cursor = start + Math.max(duration, 0);
  }
  if (cursor < quarters - EPS) slots.push({ startBeat: round4(cursor), duration: round4(quarters - cursor), rest: true });
  return { quarters, slots };
}

export function transformBhlRiffCell(
  cell: BhlRiffCell,
  transform: BhlRiffTransform,
  displacementQuarters: number,
): { cell: BhlRiffCell; notes: string[]; withheld: string[] } {
  const notes: string[] = [];
  const withheld: string[] = [];
  if (transform === 'original' || transform === 'continue') {
    notes.push(transform === 'continue' ? 'The cell repeats across the phrase.' : 'The cell is stated once. Later bars stay silent.');
    return { cell, notes, withheld };
  }
  const bars = cell.bars.map((bar) => {
    const played = notesOf(bar);
    if (transform === 'fragment') {
      const keep = Math.max(1, Math.ceil(played.length / 2));
      const dropped = played.slice(keep);
      for (const note of dropped) {
        withheld.push(`fragment leaves ${note.startBeat}+${note.duration} unstated`);
      }
      const end = played[keep - 1] ? played[keep - 1]!.startBeat + played[keep - 1]!.duration : bar.quarters;
      notes.push('Fragment keeps the opening attacks and names the tail it does not use.');
      return barFromNotes(played.slice(0, keep), Math.min(bar.quarters, Math.max(end, 0.25)));
    }
    if (transform === 'rest') {
      const host = [...played].reverse().find((note) => note.duration >= 0.5 - EPS);
      if (!host) {
        notes.push('Rest insertion needs a note of at least a half beat. None was inserted.');
        return bar;
      }
      const index = played.indexOf(host);
      const half = round4(host.duration / 2);
      const next = played.slice();
      next[index] = { ...host, duration: half };
      notes.push(`A rest of ${half} replaces the second half of the note at ${host.startBeat}.`);
      return barFromNotes(next, bar.quarters);
    }
    if (transform === 'displace') {
      const shift = displacementQuarters;
      const moved = played.map((note) => ({ ...note, startBeat: round4(note.startBeat + shift) }));
      const overflow = moved.filter((note) => note.startBeat + note.duration > bar.quarters + EPS);
      if (overflow.length) {
        const span = Math.max(...moved.map((note) => note.startBeat + note.duration));
        notes.push(`Displacement of ${shift} spills past the bar. The cell is now ${round4(span)} quarters and is not cut.`);
        return barFromNotes(moved, span);
      }
      notes.push(`Displacement of ${shift} stays inside the ${bar.quarters}-quarter cell.`);
      return barFromNotes(moved, bar.quarters);
    }
    const factor = transform === 'augment' ? 2 : 0.5;
    const scaled = played.map((note) => ({
      ...note,
      startBeat: round4(note.startBeat * factor),
      duration: round4(note.duration * factor),
    }));
    notes.push(transform === 'augment' ? 'Augmentation doubles every attack and duration.' : 'Diminution halves every attack and duration.');
    return barFromNotes(scaled, round4(bar.quarters * factor));
  });
  return {
    cell: { ...cell, bars },
    notes,
    withheld,
  };
}

interface AbsNote {
  onset: number;
  duration: number;
}

function absoluteNotes(bars: readonly BhlRiffBar[]): { notes: AbsNote[]; length: number } {
  const notes: AbsNote[] = [];
  let origin = 0;
  for (const bar of bars) {
    for (const slot of bar.slots) {
      if (!slot.rest) notes.push({ onset: round4(origin + slot.startBeat), duration: slot.duration });
    }
    origin += bar.quarters;
  }
  return { notes, length: origin };
}

function usableEnd(quarters: number, dialogue: string): number {
  if (dialogue !== 'leave-space') return quarters;
  const beat = quarters >= 3 ? 1 : 0.5;
  return Math.max(0, quarters - beat);
}

export function placeBhlRiffRhythm(input: {
  cell: BhlRiffCell;
  transform: BhlRiffTransform;
  displacementQuarters: number;
  bars: readonly BhlBassBar[];
  regions: readonly { id: string; bars: readonly number[]; dialogue: string; rhythmTransform: string }[];
  divisionsByBar: ReadonlyMap<number, number>;
  protectedBars: readonly number[];
}): BhlRiffPlacement {
  const transformed = transformBhlRiffCell(input.cell, input.transform, input.displacementQuarters);
  const limitations = [...transformed.notes];
  const withheld = [...transformed.withheld];
  const regionOf = (bar: number) => input.regions.find((region) => region.bars.includes(bar));
  const targets = input.bars.map((bar) => {
    const region = regionOf(bar.bar);
    return {
      bar: bar.bar,
      quarters: bar.quarters,
      attacks: bar.attacks,
      divisions: input.divisionsByBar.get(bar.bar) ?? 4,
      dialogue: region?.dialogue ?? 'answer-after-bass',
      silence: region?.rhythmTransform === 'silence-window',
      protected: input.protectedBars.includes(bar.bar),
      regionId: region?.id ?? '',
    };
  });
  let cursor = 0;
  const spans = targets.map((target) => {
    const start = cursor;
    cursor += target.quarters;
    return { ...target, start, end: cursor };
  });
  const phraseLength = cursor;
  const source = absoluteNotes(transformed.cell.bars);
  const loop = input.transform === 'continue';
  const copies = loop ? Math.max(1, Math.ceil(phraseLength / Math.max(source.length, EPS))) : 1;
  if (!loop) limitations.push('Bars after the cell are rests. The cell is not restarted.');
  const queue: AbsNote[] = [];
  for (let copy = 0; copy < copies; copy++) {
    for (const note of source.notes) queue.push({ onset: round4(note.onset + copy * source.length), duration: note.duration });
  }
  const byBar = new Map<number, Array<{ onset: number; duration: number }>>();
  for (const target of spans) byBar.set(target.bar, []);
  for (const note of queue) {
    if (note.onset >= phraseLength - EPS) {
      withheld.push(`phrase ends before ${note.onset}+${note.duration}`);
      continue;
    }
    let host = spans.find((target) => note.onset >= target.start - EPS && note.onset < target.end - EPS);
    if (!host) {
      withheld.push(`no bar holds ${note.onset}+${note.duration}`);
      continue;
    }
    let local = round4(note.onset - host.start);
    let duration = note.duration;
    const end = local + duration;
    const room = usableEnd(host.quarters, host.dialogue);
    if (host.dialogue === 'leave-space' && local >= room - EPS) {
      withheld.push(`leave-space keeps the last beat of bar ${host.bar} empty; riff attack ${local} was not placed`);
      continue;
    }
    if (end > room + EPS) {
      const next = spans.find((target) => target.start >= host!.end - EPS && !target.protected && !target.silence);
      if (next && duration <= usableEnd(next.quarters, next.dialogue) + EPS) {
        host = next;
        local = 0;
        limitations.push(`Attack ${note.onset} moves whole into bar ${host.bar} so the barline does not cut it.`);
      } else if (room - local >= 0.25 - EPS) {
        duration = round4(room - local);
        limitations.push(`Bar ${host.bar} shortens the note at ${local} to ${duration} so it stays inside the bar.`);
      } else {
        withheld.push(`bar ${host.bar} cannot hold ${local}+${note.duration} without cutting it`);
        continue;
      }
    }
    if (host.silence) {
      withheld.push(`bar ${host.bar} keeps the bass rest window; riff rhythm stays out`);
      continue;
    }
    if (host.protected) {
      withheld.push(`bar ${host.bar} is a protected guitar bar`);
      continue;
    }
    if (host.dialogue === 'handoff-before-bass') {
      const nextBass = host.attacks.find((attack) => attack > local + EPS);
      if (nextBass !== undefined && local + duration > nextBass + EPS) {
        const capped = round4(nextBass - local);
        if (capped < 0.25 - EPS) {
          withheld.push(`handoff leaves no room at bar ${host.bar} beat ${local}`);
          continue;
        }
        duration = capped;
        limitations.push(`Handoff shortens bar ${host.bar} at ${local} so the bass attack stays clear.`);
      }
    }
    if (!onGrid(local, host.divisions) || !onGrid(duration, host.divisions)) {
      withheld.push(
        `bar ${host.bar} attack ${local}+${duration} is finer than divisions ${host.divisions}. It was not quantised.`,
      );
      continue;
    }
    const list = byBar.get(host.bar)!;
    const previous = list[list.length - 1];
    if (previous && local < previous.onset + previous.duration - EPS) {
      withheld.push(`bar ${host.bar} attack ${local} would overlap ${previous.onset}`);
      continue;
    }
    list.push({ onset: local, duration });
  }
  if (source.notes.length && [...byBar.values()].every((list) => list.length === 0)) {
    throw new Error(
      `Imported riff rhythm did not fit this phrase. ${withheld.slice(0, 6).join('; ') || 'No attack landed on the score grid.'}`,
    );
  }
  if (withheld.length) {
    limitations.push(`Withheld, not dropped quietly: ${withheld.join('; ')}`);
  }
  const repeat = loop;
  const plans: BhlOnsetPlan[] = spans.map((target) => {
    const list = byBar.get(target.bar) ?? [];
    const onsets = list.map((note) => note.onset);
    const durations = list.map((note) => note.duration);
    return {
      bar: target.bar,
      onsets,
      durations,
      signature: onsets.map((onset) => onset.toFixed(2)).join(','),
      transform: repeat ? 'ostinato' : 'state-onsets',
      ostinatoJustified: repeat,
    };
  });
  return {
    plans,
    limitations,
    placed: plans.reduce((sum, plan) => sum + plan.onsets.length, 0),
    withheld,
    cell: input.cell,
    transform: input.transform,
  };
}
