/**
 * Performance Composer 1B — RESPOND.
 *
 * The guitar answers the source melody in its own gaps: after a phrase ends, or under a held note.
 * Material: the last cell of the phrase being answered (its intervals and rhythm), fitted to the
 * score's chord symbols. Playability: the Barry Harris guitar-feasibility check (existing resource).
 * Most gaps stay silent. Melody, bass and every other source element are locked.
 *
 * Three characters (one resource, three different musical decisions):
 *   A · ECHO         imitation of the cell, developed across the piece; the last answer recalls the first.
 *   B · COUNTERLINE  the cell inverted, starting on a guide tone, moving against the melody; dyad landings.
 *   C · SPACE        few answers; long tones and open dyads built from the cell's own interval.
 */

import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { seededRandom, type PcChord } from './pcChord';
import { chordAt, elementChildren, measureViews, parseScoreDocument, partById, partElements, partNames, type PcMeasureView } from './pcScore';
import { type PcLaneEvent } from './pcLane';

export type RespondCharacter = 'echo' | 'counterline' | 'space';

export const RESPOND_CHARACTERS: ReadonlyArray<{ id: RespondCharacter; label: string }> = [
  { id: 'echo', label: 'A · Echo' },
  { id: 'counterline', label: 'B · Counterline' },
  { id: 'space', label: 'C · Space' },
];

export const RESPOND_ENGINE = 'pc-respond-1b.1';

const GRID = 0.25;
const LOW = 45; // A2 sounding
const HIGH = 76; // E5 sounding
const BREATH = 0.5; // quarters of silence before the melody re-enters

interface Tone {
  start: number;
  dur: number;
  midi: number | null;
}

interface Cell {
  pitches: number[];
  durs: number[];
}

export interface RespondWindow {
  start: number;
  end: number;
  kind: 'after-phrase' | 'held-note';
  phrase: number;
  cell: Cell;
  /** Highest pitch the answer may use (stays under the melody). */
  ceiling: number;
  /** Melody pitch held through the window, if any. */
  held: number | null;
  /** Direction of the melody's next move (+1 up, -1 down, 0 none). */
  nextMove: number;
}

export interface RespondAnswer {
  window: number;
  bar: number;
  start: number;
  notes: Array<{ start: number; dur: number; midis: number[] }>;
  device: string;
}

export interface RespondPlan {
  character: RespondCharacter;
  label: string;
  seed: number;
  partId: string;
  voice: string;
  windows: RespondWindow[];
  answers: RespondAnswer[];
  events: PcLaneEvent[];
  blockedBars: number[];
}

interface Timeline {
  barStart: number[];
  barLen: number[];
  melody: Tone[];
  others: Array<{ start: number; end: number; midi: number }>;
  bass: Array<{ start: number; end: number; midi: number }>;
  chordViews: PcMeasureView[];
  laneViews: PcMeasureView[];
  fifths: number[];
}

const snap = (q: number) => Math.round(q / GRID) * GRID;

function absTimeline(doc: Document, partId: string, melodyVoice: string): Timeline {
  const parts = partElements(doc);
  const names = partNames(doc);
  const laneViews = measureViews(partById(doc, partId));
  const barStart: number[] = [];
  const barLen: number[] = [];
  let t = 0;
  for (const v of laneViews) {
    barStart.push(t);
    barLen.push(v.length / v.divisions);
    t += v.length / v.divisions;
  }
  // Melody: lane part, melody voice, top note, ties merged, rests kept.
  const melody: Tone[] = [];
  laneViews.forEach((v, bi) => {
    for (const n of v.notes) {
      if (n.voice !== melodyVoice) continue;
      const start = barStart[bi]! + n.onset / v.divisions;
      const dur = n.ticks / v.divisions;
      const midi = n.rest || !n.midis.length ? null : Math.max(...n.midis);
      const last = melody[melody.length - 1];
      if (last && n.tieStop && midi !== null && last.midi === midi && Math.abs(last.start + last.dur - start) < 1e-6) {
        last.dur += dur;
      } else if (last && midi === null && last.midi === null && Math.abs(last.start + last.dur - start) < 1e-6) {
        last.dur += dur;
      } else {
        melody.push({ start, dur, midi });
      }
    }
  });
  // Everything else that sounds: other voices of the lane part and every other part.
  const others: Timeline['others'] = [];
  const bassId =
    parts.map((p) => p.getAttribute('id') ?? '').find((id) => id !== partId && /bass|cello|contrabass/i.test(names.get(id) ?? '')) ?? null;
  const bass: Timeline['bass'] = [];
  for (const part of parts) {
    const id = part.getAttribute('id') ?? '';
    const views = id === partId ? laneViews : measureViews(part);
    views.forEach((v, bi) => {
      for (const n of v.notes) {
        // Melody-voice notes are included too: lower notes of melody chords must not be clashed with.
        if (n.rest) continue;
        const start = (barStart[bi] ?? 0) + n.onset / v.divisions;
        const end = start + n.ticks / v.divisions;
        for (const midi of n.midis) {
          others.push({ start, end, midi });
          if (id === bassId) bass.push({ start, end, midi });
        }
      }
    });
  }
  // Harmony source: the lane part, else the first part that has chord symbols.
  let chordViews = laneViews;
  if (!laneViews.some((v) => v.harmony.length)) {
    const withHarmony = parts.map((p) => measureViews(p)).find((vs) => vs.some((v) => v.harmony.length));
    if (withHarmony) chordViews = withHarmony;
  }
  return { barStart, barLen, melody, others, bass, chordViews, laneViews, fifths: laneViews.map((v) => v.fifths) };
}

function barAt(tl: Timeline, time: number): number {
  let bar = 0;
  for (let i = 0; i < tl.barStart.length; i++) if (tl.barStart[i]! <= time + 1e-9) bar = i;
  return bar;
}

function chordAtTime(tl: Timeline, time: number): PcChord | null {
  const bi = barAt(tl, time);
  const v = tl.chordViews[bi];
  if (!v) return null;
  return chordAt(tl.chordViews, bi + 1, (time - tl.barStart[bi]!) * v.divisions);
}

const MAJOR_FROM_FIFTHS = (fifths: number) => {
  const tonic = (((fifths * 7) % 12) + 12) % 12;
  return [0, 2, 4, 5, 7, 9, 11].map((i) => (tonic + i) % 12);
};

/** Pitch-class field at a time: the chord's tones and colours, else the key's scale. */
function fieldAt(tl: Timeline, time: number): { field: number[]; chord: PcChord | null } {
  const chord = chordAtTime(tl, time);
  if (chord) return { field: chord.fieldPcs, chord };
  return { field: MAJOR_FROM_FIFTHS(tl.fifths[barAt(tl, time)] ?? 0), chord: null };
}

function soundingBetween(list: Timeline['others'], start: number, end: number): number[] {
  return list.filter((o) => o.start < end - 1e-9 && o.end > start + 1e-9).map((o) => o.midi);
}

function melodyBetween(tl: Timeline, start: number, end: number): number[] {
  return tl.melody.filter((m) => m.midi !== null && m.start < end - 1e-9 && m.start + m.dur > start + 1e-9).map((m) => m.midi!);
}

/** Find phrases (split at rests of a beat or more) and the gaps the guitar could answer in. */
export function findWindows(tl: Timeline, from: number, to: number, blocked: Set<number>): RespondWindow[] {
  const spanStart = tl.barStart[from - 1]!;
  const spanEnd = tl.barStart[to - 1]! + tl.barLen[to - 1]!;
  const tones = tl.melody;
  const windows: RespondWindow[] = [];
  let phrase = 0;
  let phraseNotes: Tone[] = [];
  const cellOf = (notes: Tone[]): Cell => {
    const pitched = notes.filter((n) => n.midi !== null).slice(-4);
    return { pitches: pitched.map((n) => n.midi!), durs: pitched.map((n) => Math.min(2, Math.max(GRID, snap(n.dur)))) };
  };
  const nextPitched = (i: number) => tones.slice(i + 1).find((n) => n.midi !== null) ?? null;
  for (let i = 0; i < tones.length; i++) {
    const tone = tones[i]!;
    if (tone.midi === null) {
      if (tone.dur >= 1 - 1e-9 && phraseNotes.some((n) => n.midi !== null)) {
        const next = nextPitched(i);
        const end = next ? tone.start + tone.dur - BREATH : tone.start + tone.dur;
        const last = phraseNotes.filter((n) => n.midi !== null).slice(-1)[0]!;
        const phraseTop = Math.max(...phraseNotes.filter((n) => n.midi !== null).map((n) => n.midi!));
        const ceiling = Math.min(HIGH, phraseTop + 2);
        windows.push({
          start: tone.start,
          end,
          kind: 'after-phrase',
          phrase,
          cell: cellOf(phraseNotes),
          ceiling,
          held: null,
          nextMove: next ? Math.sign(next.midi! - last.midi!) : 0,
        });
        phrase += 1;
        phraseNotes = [];
      }
      continue;
    }
    phraseNotes.push(tone);
    if (tone.dur >= 2 - 1e-9) {
      const next = nextPitched(i);
      windows.push({
        start: tone.start + 1,
        end: tone.start + tone.dur,
        kind: 'held-note',
        phrase,
        cell: cellOf(phraseNotes),
        ceiling: tone.midi - 3,
        held: tone.midi,
        nextMove: next ? Math.sign(next.midi! - tone.midi) : 0,
      });
    }
  }
  // Clip to span and to unblocked bars; split at blocked bars.
  const out: RespondWindow[] = [];
  for (const w of windows) {
    let start = Math.max(w.start, spanStart);
    const end = Math.min(w.end, spanEnd);
    while (start < end - 1e-9) {
      const bi = barAt(tl, start);
      if (blocked.has(bi + 1)) {
        start = tl.barStart[bi]! + tl.barLen[bi]!;
        continue;
      }
      let stop = end;
      for (let b = bi + 1; b < tl.barStart.length && tl.barStart[b]! < end; b++) {
        if (blocked.has(b + 1)) {
          stop = tl.barStart[b]!;
          break;
        }
      }
      if (snap(stop) - snap(start) >= 1 - 1e-9 && w.cell.pitches.length) out.push({ ...w, start: snap(start), end: snap(stop) });
      start = stop;
      if (stop === end) break;
    }
  }
  return out;
}

const DENSITY: Record<RespondCharacter, number> = { echo: 0.42, counterline: 0.5, space: 0.25 };
const MAX_RUN: Record<RespondCharacter, number> = { echo: 2, counterline: 2, space: 1 };

/** Rank gaps for one character (best first). Most will stay silent. */
export function rankWindows(windows: readonly RespondWindow[], character: RespondCharacter, rand: () => number, total: number): number[] {
  if (!windows.length) return [];
  const t0 = windows[0]!.start;
  const span = Math.max(1, total - t0);
  const scored = windows.map((w, i) => {
    let score = w.kind === 'after-phrase' ? 3 : character === 'counterline' ? 2.2 : character === 'space' ? 1 : 1.5;
    if (w.end - w.start >= 2) score += character === 'space' ? 1.5 : 0.8;
    const t = (w.start - t0) / span;
    score *= 0.6 + 0.4 * Math.sin(Math.PI * Math.min(1, Math.max(0, t)));
    if (character === 'space' && i === 0) score *= 0.5;
    score *= 0.85 + 0.3 * rand();
    return { i, score };
  });
  return scored.sort((a, b) => b.score - a.score).map((x) => x.i);
}

/** How many gaps a character answers: Counterline most, Echo fewer, Space fewest. */
export function answerTarget(windowCount: number, character: RespondCharacter): number {
  return Math.max(character === 'space' ? 1 : 2, Math.round(windowCount * DENSITY[character]));
}

function runLength(chosen: ReadonlySet<number>, i: number): number {
  let run = 1;
  for (let k = i - 1; chosen.has(k); k--) run++;
  for (let k = i + 1; chosen.has(k); k++) run++;
  return run;
}

function nearestInField(midi: number, field: readonly number[], dir: number): number {
  for (let d = 0; d <= 6; d++) {
    const order = dir >= 0 ? [d, -d] : [-d, d];
    for (const o of order) if (field.includes((((midi + o) % 12) + 12) % 12)) return midi + o;
  }
  return midi;
}

function clashes(midi: number, melody: readonly number[], others: readonly number[]): boolean {
  for (const m of melody) {
    const iv = Math.abs(midi - m) % 12;
    if (midi === m || iv === 1 || iv === 11) return true;
  }
  for (const o of others) {
    const iv = Math.abs(midi - o) % 12;
    if (midi === o || iv === 1 || iv === 11) return true;
  }
  return false;
}

/** Place a pitch: in the field, under the ceiling, above the bass, clear of clashes. Null = leave silence. */
function fitsAt(tl: Timeline, p: number, start: number, end: number, ceiling: number, held: number | null): boolean {
  const melody = melodyBetween(tl, start, end);
  const others = soundingBetween(tl.others, start, end);
  const bassTop = Math.max(LOW - 3, ...soundingBetween(tl.bass, start, end));
  const top = Math.min(HIGH, ceiling, ...melody.map((m) => m - 2));
  if (p > top || p < Math.max(LOW, bassTop + 3)) return false;
  if (!fieldAt(tl, start).field.includes(((p % 12) + 12) % 12)) return false;
  if (clashes(p, melody, others)) return false;
  if (held !== null && !assessGuitarFeasibility([p, held]).feasible) return false;
  return true;
}

/**
 * Realise a motivic shape (intervals) as one transposed line. Every candidate start pitch is tried;
 * a note that does not fit may move by at most a semitone or two in the shape's own direction.
 * Returns null when the shape cannot be kept: silence is better than a broken motif.
 */
function realiseShape(
  tl: Timeline,
  w: RespondWindow,
  intervals: readonly number[],
  slots: ReadonlyArray<{ at: number; dur: number }>,
  starts: readonly number[]
): { pitches: number[]; exact: number } | null {
  let best: { pitches: number[]; exact: number; score: number } | null = null;
  for (const start of starts) {
    const pitches: number[] = [];
    let exact = 0;
    let ok = true;
    for (let k = 0; k < slots.length; k++) {
      const a = w.start + slots[k]!.at;
      const b = a + slots[k]!.dur;
      const ideal = k === 0 ? start : pitches[k - 1]! + (intervals[k - 1] ?? 0);
      const dir = Math.sign(intervals[k - 1] ?? 0);
      const tries = [0, dir || 1, -(dir || 1), 2 * (dir || 1), -2 * (dir || 1)];
      const found = tries.map((t) => ideal + t).find((p) => {
        if (!fitsAt(tl, p, a, b, w.ceiling, w.held)) return false;
        if (k > 0) {
          const moved = p - pitches[k - 1]!;
          if (dir !== 0 && Math.sign(moved) !== dir) return false; // contour is kept
          if (Math.abs(moved) > 9) return false;
        }
        return true;
      });
      if (found === undefined) {
        ok = false;
        break;
      }
      if (found === ideal) exact++;
      pitches.push(found);
    }
    if (!ok) continue;
    const score = exact * 2 - Math.abs(start - starts[0]!) / 12;
    if (!best || score > best.score) best = { pitches, exact, score };
  }
  return best ? { pitches: best.pitches, exact: best.exact } : null;
}

/** Fit a rhythm into a window: keep it, or halve it (diminution), so at least minNotes fit. */
function fitShapeRhythm(durs: readonly number[], length: number, minNotes: number, offset = 0): Array<{ at: number; dur: number }> | null {
  for (const scale of [1, 0.5]) {
    const scaled = durs.map((d, i) => Math.max(GRID, snap(Math.min(i === durs.length - 1 ? 2 : 1, d) * scale)));
    const slots = fitRhythm(scaled, length, offset);
    if (slots.length >= Math.min(minNotes, durs.length) && slots.length >= 2) return slots;
  }
  return null;
}

function placePitch(tl: Timeline, want: number, start: number, end: number, ceiling: number, dir: number): number | null {
  const { field } = fieldAt(tl, start);
  const melody = melodyBetween(tl, start, end);
  const others = soundingBetween(tl.others, start, end);
  const bassTop = Math.max(LOW - 3, ...soundingBetween(tl.bass, start, end));
  const top = Math.min(HIGH, ceiling, ...melody.map((m) => m - 2));
  const floor = Math.max(LOW, bassTop + 3);
  if (top < floor) return null;
  const candidates: number[] = [];
  let base = want;
  while (base > top) base -= 12;
  while (base < floor) base += 12;
  for (const shift of [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5]) {
    const p = nearestInField(base + shift, field, dir);
    if (p >= floor && p <= top) candidates.push(p);
  }
  for (const p of candidates) if (!clashes(p, melody, others)) return p;
  return null;
}

function addDyadBelow(tl: Timeline, top: number, start: number, end: number, prefer: readonly number[]): number[] {
  const { field } = fieldAt(tl, start);
  const melody = melodyBetween(tl, start, end);
  const others = soundingBetween(tl.others, start, end);
  const bassTop = Math.max(LOW - 3, ...soundingBetween(tl.bass, start, end));
  for (const iv of prefer) {
    const low = top - iv;
    if (low < Math.max(LOW, bassTop + 3)) continue;
    if (!field.includes(((low % 12) + 12) % 12)) continue;
    if (clashes(low, melody, others)) continue;
    if (!assessGuitarFeasibility([low, top]).feasible) continue;
    return [low, top];
  }
  return [top];
}

/** Lay a rhythm into a window from its start, ending at least one grid step before the window end. */
function fitRhythm(durs: readonly number[], length: number, offset = 0): Array<{ at: number; dur: number }> {
  const out: Array<{ at: number; dur: number }> = [];
  let at = offset;
  for (const d of durs) {
    if (at + GRID > length - 1e-9) break;
    const dur = Math.min(d, snap(length - at));
    if (dur < GRID - 1e-9) break;
    out.push({ at, dur });
    at += dur;
  }
  return out;
}

function buildAnswer(
  tl: Timeline,
  w: RespondWindow,
  character: RespondCharacter,
  index: number,
  count: number,
  rand: () => number,
  first: RespondAnswer | null
): RespondAnswer | null {
  const length = w.end - w.start;
  const cell = w.cell;
  const iv = cell.pitches.slice(1).map((p, k) => p - cell.pitches[k]!);
  const notes: RespondAnswer['notes'] = [];
  let device = '';
  const push = (at: number, dur: number, midis: number[]) => {
    if (midis.length) notes.push({ start: w.start + at, dur, midis });
  };

  if (character === 'echo') {
    const isReturn = first !== null && index === count - 1 && count >= 3;
    const devices = ['imitation', 'displaced imitation', 'fragment', 'augmentation'];
    device = isReturn ? 'return of the first answer' : devices[index % devices.length]!;
    let intervals = iv;
    let durs = cell.durs;
    let offset = 0;
    let minNotes = 3;
    if (isReturn && first) {
      const fp = first.notes.map((n) => n.midis[n.midis.length - 1]!);
      intervals = fp.slice(1).map((p, k) => p - fp[k]!);
      durs = first.notes.map((n) => n.dur);
    } else if (device === 'displaced imitation') offset = length >= 2 ? 0.5 : 0;
    else if (device === 'fragment') {
      intervals = iv.slice(-2);
      durs = cell.durs.slice(-3);
      minNotes = 2;
    } else if (device === 'augmentation') {
      const aug = cell.durs.map((d) => Math.min(2, d * 2));
      if (aug.reduce((x, y) => x + y, 0) <= length) durs = aug;
      else device = 'imitation';
    }
    const slots = fitShapeRhythm(durs, length, minNotes, offset);
    if (!slots) return null;
    // Imitation at the octave, fifth or fourth (below or above), then nearer levels.
    const head = isReturn && first ? first.notes[0]!.midis[first.notes[0]!.midis.length - 1]! : cell.pitches[0]!;
    const levels = [-12, -7, -5, 5, 7, -3, -4, -8, -9, 3, 4, 12];
    const r = Math.floor(rand() * 3);
    const order = [...levels.slice(r), ...levels.slice(0, r)];
    const line = realiseShape(tl, w, intervals.slice(0, slots.length - 1), slots, order.map((l) => head + l));
    if (!line) return null;
    slots.forEach((slot, k) => push(slot.at, slot.dur, [line.pitches[k]!]));
  } else if (character === 'counterline') {
    const retro = index % 2 === 1;
    device = retro ? 'retrograde inversion' : 'inversion';
    // Inversion: the cell's intervals negated. Retrograde inversion: the cell reversed, then inverted.
    let intervals = retro ? [...iv].reverse() : iv.map((x) => -x);
    if (w.held !== null && w.nextMove !== 0) {
      // Under a held note, move against where the melody goes next.
      const total = intervals.reduce((x, y) => x + y, 0);
      if (Math.sign(total) === w.nextMove) intervals = intervals.map((x) => -x);
    }
    const durs = (retro ? [...cell.durs].reverse() : cell.durs).map((d) => Math.max(0.5, d));
    const slots = fitShapeRhythm(durs, length, length < 1.5 ? 2 : 3);
    if (!slots) return null;
    const { chord, field } = fieldAt(tl, w.start);
    const guidePcs = chord ? chord.chordPcs.filter((pc) => [3, 4, 10, 11].includes((pc - chord.rootPc + 12) % 12)) : [];
    const chordPcs = chord ? chord.chordPcs : field;
    const below = w.ceiling - 3;
    // Start on a guide tone (3rd or 7th); failing that, any chord tone.
    const guideStarts: number[] = [];
    const chordStarts: number[] = [];
    for (let p = below; p >= LOW; p--) {
      const pc = ((p % 12) + 12) % 12;
      if (guidePcs.includes(pc)) guideStarts.push(p);
      else if (chordPcs.includes(pc)) chordStarts.push(p);
    }
    if (rand() < 0.5) guideStarts.reverse();
    const line =
      realiseShape(tl, w, intervals.slice(0, slots.length - 1), slots, guideStarts) ??
      realiseShape(tl, w, intervals.slice(0, slots.length - 1), slots, chordStarts);
    if (!line) return null;
    slots.forEach((slot, k) => {
      const p = line.pitches[k]!;
      const last = k === slots.length - 1;
      let midis = last ? addDyadBelow(tl, p, w.start + slot.at, w.start + slot.at + slot.dur, [9, 8, 4, 3]) : [p];
      if (w.held !== null && !assessGuitarFeasibility([...midis, w.held]).feasible) midis = [p];
      push(slot.at, slot.dur, midis);
    });
  } else {
    device = 'open dyad from the cell interval';
    const largest = iv.reduce((a, b) => (Math.abs(b) > Math.abs(a) ? b : a), 0);
    let dyad = Math.abs(largest) % 12;
    if (dyad < 3) dyad = 5;
    if (dyad > 9) dyad = 12 - dyad < 3 ? 7 : 12 - dyad;
    const offset = rand() < 0.4 && length >= 2 ? 0.5 : 0;
    const dur = Math.min(snap(length - offset), length >= 4 ? 3 : 2);
    const { field, chord } = fieldAt(tl, w.start);
    const colours = chord ? field.filter((pc) => !chord.chordPcs.includes(pc)) : field;
    const wantPc = colours.length ? colours[Math.floor(rand() * colours.length)]! : field[0]!;
    const mid = Math.min(w.ceiling - 3, 64);
    const base = mid - ((((mid - wantPc) % 12) + 12) % 12);
    let top = placePitch(tl, base, w.start + offset, w.start + offset + dur, w.ceiling, 0);
    if (top !== null && w.held !== null && !assessGuitarFeasibility([top, w.held]).feasible) top = null;
    if (top === null) return null;
    let grip = addDyadBelow(tl, top, w.start + offset, w.start + offset + dur, [dyad, 7, 5, 9, 8]);
    if (grip.length === 1) {
      for (const up of [dyad, 7, 5, 9, 8]) {
        if (fitsAt(tl, top + up, w.start + offset, w.start + offset + dur, w.ceiling, w.held) && assessGuitarFeasibility([top, top + up]).feasible) {
          grip = [top, top + up];
          break;
        }
      }
    }
    if (w.held !== null && !assessGuitarFeasibility([...grip, w.held]).feasible) grip = [top];
    push(offset, dur, grip);
    const rest = length - offset - dur;
    if (rest >= 1.5 && rand() < 0.5) {
      const step = top + (w.nextMove >= 0 ? -2 : 2);
      const p = placePitch(tl, step, w.start + offset + dur, w.start + offset + dur + 1, w.ceiling, 0);
      if (p !== null && Math.abs(p - top) <= 4) {
        push(offset + dur, 1, [p]);
        device += ', step';
      }
    }
  }
  if (!notes.length) return null;
  return { window: -1, bar: barAt(tl, w.start) + 1, start: w.start, notes, device };
}

/** Split answers into per-bar lane events (no ties across barlines; long tones are clipped at the bar). */
function toEvents(tl: Timeline, answers: readonly RespondAnswer[]): PcLaneEvent[] {
  const out: PcLaneEvent[] = [];
  for (const a of answers) {
    for (const n of a.notes) {
      const bi = barAt(tl, n.start);
      const barEnd = tl.barStart[bi]! + tl.barLen[bi]!;
      const dur = Math.min(n.dur, barEnd - n.start);
      if (dur < GRID - 1e-9) continue;
      out.push({ bar: bi + 1, onsetQuarters: snap(n.start - tl.barStart[bi]!), quarters: snap(dur), midis: [...new Set(n.midis)].sort((x, y) => x - y) });
    }
  }
  return out;
}

export interface RespondRequest {
  sourceXml: string;
  from?: number;
  to?: number;
  character: RespondCharacter;
  seed: number;
}

/** Compose one RESPOND alternative. Returns lane events for writeLane; never touches the source. */
export function composeRespond(request: RespondRequest): RespondPlan {
  const doc = parseScoreDocument(request.sourceXml);
  const names = partNames(doc);
  const parts = partElements(doc);
  const lanePart =
    parts.find((p) => /guitar|gtr/i.test(`${names.get(p.getAttribute('id') ?? '')} ${p.getAttribute('id')}`)) ?? parts[0]!;
  const partId = lanePart.getAttribute('id') ?? '';
  const views = measureViews(lanePart);
  const from = request.from ?? 1;
  const to = request.to ?? views.length;
  // Lane voice: 2–4, the one used in the fewest bars. Bars with any second source voice stay silent.
  let voice = '2';
  let fewest = Infinity;
  for (const v of ['2', '3', '4']) {
    const n = views.slice(from - 1, to).filter((m) => m.notes.some((x) => x.voice === v)).length;
    if (n < fewest) {
      fewest = n;
      voice = v;
    }
  }
  const melodyVoice = '1';
  const blocked = new Set<number>();
  views.forEach((m, i) => {
    if (m.notes.some((x) => x.voice !== melodyVoice)) blocked.add(i + 1);
    if (elementChildren(m.element, 'note').length === 0) blocked.add(i + 1);
  });
  const tl = absTimeline(doc, partId, melodyVoice);
  const windows = findWindows(tl, from, to, blocked);
  const rand = seededRandom(request.seed * 31 + RESPOND_CHARACTERS.findIndex((c) => c.id === request.character) * 7919);
  const total = tl.barStart[to - 1]! + tl.barLen[to - 1]!;
  // Pass 1: walk gaps best-first; keep those where this character's answer can actually be made.
  const target = answerTarget(windows.length, request.character);
  const chosen = new Set<number>();
  for (const wi of rankWindows(windows, request.character, rand, total)) {
    if (chosen.size >= target) break;
    chosen.add(wi);
    if (runLength(chosen, wi) > MAX_RUN[request.character]) {
      chosen.delete(wi);
      continue;
    }
    if (!buildAnswer(tl, windows[wi]!, request.character, 0, 1, seededRandom(request.seed + wi), null)) chosen.delete(wi);
  }
  // Pass 2: in time order, develop the answers (device sequence, return of the first answer).
  const picked = [...chosen].sort((a, b) => a - b);
  const answers: RespondAnswer[] = [];
  picked.forEach((wi, k) => {
    const a =
      buildAnswer(tl, windows[wi]!, request.character, k, picked.length, rand, answers[0] ?? null) ??
      buildAnswer(tl, windows[wi]!, request.character, 0, 1, rand, null);
    if (a) answers.push({ ...a, window: wi });
  });
  return {
    character: request.character,
    label: RESPOND_CHARACTERS.find((c) => c.id === request.character)!.label,
    seed: request.seed,
    partId,
    voice,
    windows,
    answers,
    events: toEvents(tl, answers),
    blockedBars: [...blocked].filter((b) => b >= from && b <= to),
  };
}
