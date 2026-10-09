/**
 * Operator 1.1 — RESPOND.
 *
 * The guitar answers in the source's own gaps (rests, and the held part of long melody notes) using one of
 * four vocabulary families: Mike's comping-map grips, dyads, quartal stacks and quintal stacks.
 * Melody, bass, harmony, form, tempo and metre are locked: every source measure is copied as written and the
 * answer is added as guitar voice 2.
 *
 * The seed decides (1) which gaps are answered — silence is kept, at most `density` of the gaps are filled,
 * (2) the rhythm of each answer, (3) the family used in each gap, and (4) the voicing among the best
 * voice-led candidates. Voicings are found by a fretboard search (max fret and stopped span from V8B).
 *
 * Output: ONE audition score — ORIGINAL, then alternatives A, B, C of the same bars — so MuseScore opens
 * once. Nothing is opened unless `open` is set.
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { importWwhDuoMusicXml, type WwhDuoScore, type WwhImportedMeasure, type WwhImportedNote } from './wwhDuoImport';
import { midiOf, stoppedSpan, V8B_MAX_FRET, V8B_MAX_STOPPED_SPAN, V8B_OPEN_STRING_MIDI } from './wwhBlackAuraV8bRecipe';
import { renderWwhDuoScore, type WwhScoreHeader, type WwhWrittenBar } from './wwhMusicXmlWrite';
import { wwhBarTicks } from './wwhPerformanceTypes';

export const RESPOND_OUT_DIR = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/RESPOND';
export const RESPOND_VERSION = 'wwh-respond-1.1';

export type RespondFamily = 'grips' | 'dyads' | 'quartal' | 'quintal';

export interface RespondAlternative {
  label: string;
  families: RespondFamily[];
}

export const DEFAULT_ALTERNATIVES: RespondAlternative[] = [
  { label: 'A · YOUR GRIPS', families: ['grips'] },
  { label: 'B · QUARTAL + DYADS', families: ['quartal', 'dyads'] },
  { label: 'C · QUINTAL + DYADS', families: ['quintal', 'dyads'] },
];

export interface RespondRequest {
  source: string;
  startBar: number;
  endBar: number;
  seed: number;
  /** Comping voicing map MusicXML for the piece (source of the 'grips' family). */
  compingMap?: string;
  alternatives?: RespondAlternative[];
  /** Highest share of gaps that may be answered (0–1). Default 0.4. */
  density?: number;
  outDir?: string;
  open?: boolean;
}

export interface RespondEvent {
  bar: number;
  onsetQuarters: number;
  quarters: number;
  family: RespondFamily;
  kind: 'rest' | 'sustain';
  chord: string;
  sounding: string[];
  midis: number[];
  fingering: string;
}

export interface RespondSection {
  label: string;
  seed: number;
  windows: number;
  answered: number;
  events: RespondEvent[];
  notes: string[];
}

export interface RespondResult {
  output: string;
  version: string;
  sourceShaBefore: string;
  sourceShaAfter: string;
  bars: number[];
  sections: RespondSection[];
  checks: { melodyLocked: boolean; bassLocked: boolean; barMath: boolean; grid: boolean; frets: boolean };
}

/* ------------------------------------------------------------------ chords */

const NATURAL: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTERS = 'CDEFGAB';

/** Interval content of chord qualities used across the nine WWH duo leadsheets (checked against tonal.js). */
const QUALITY: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '5': [0, 7],
  '6': [0, 4, 7, 9],
  m6: [0, 3, 7, 9],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  maj9: [0, 2, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m9: [0, 2, 3, 7, 10],
  m11: [0, 2, 3, 5, 7, 10],
  mMaj7: [0, 3, 7, 11],
  dim: [0, 3, 6],
  dim7: [0, 3, 6, 9],
  m7b5: [0, 3, 6, 10],
  aug: [0, 4, 8],
  'maj7#5': [0, 4, 8, 11],
  'maj7#11': [0, 4, 6, 7, 11],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '7sus4': [0, 5, 7, 10],
  '9': [0, 2, 4, 7, 10],
  '13': [0, 2, 4, 7, 9, 10],
};
const ADD_DEGREE: Record<string, number> = {
  '2': 2, b2: 1, '4': 5, '#4': 6, b6: 8, '6': 9, '9': 2, b9: 1, '#9': 3, '11': 5, '#11': 6, '13': 9, b13: 8,
};

export interface WwhChord {
  label: string;
  rootPc: number;
  rootStep: string;
  rootAlter: number;
  chordPcs: number[];
  /** Chord tones plus colour tensions that suit the quality. */
  fieldPcs: number[];
  bassPc?: number;
  augmentedFifth: boolean;
}

function pcOf(step: string, alter: number): number {
  return (((NATURAL[step] ?? 0) + alter) % 12 + 12) % 12;
}

function noteToken(token: string): { step: string; alter: number } | null {
  const m = /^([A-G])(#{1,2}|b{1,2})?$/.exec(token);
  if (!m) return null;
  const acc = m[2] ?? '';
  return { step: m[1]!, alter: acc.startsWith('#') ? acc.length : -acc.length };
}

/** Parse an imported WWH harmony label (e.g. "Fm(add9)", "Eb7sus4/Ab", "Amajor/#C", "C°7"). Null for N.C. */
export function parseWwhChord(label: string): WwhChord | null {
  const raw = label.trim();
  if (!raw || /N\.?C\.?/i.test(raw)) return null;
  const [bodyRaw, bassRaw] = raw.split('/');
  const body = bodyRaw ?? '';
  const m = /^([A-G](?:#|b)?)(.*)$/.exec(body);
  if (!m) throw new Error(`chord "${label}" has no root`);
  const root = noteToken(m[1]!);
  if (!root) throw new Error(`chord "${label}" has a bad root`);
  let quality = (m[2] ?? '').trim();
  const adds: number[] = [];
  const paren = /\(([^)]*)\)/.exec(quality);
  if (paren) {
    quality = quality.replace(paren[0], '');
    for (const part of paren[1]!.split(',')) {
      const token = part.trim().replace(/^add/, '');
      if (token === 'maj7') {
        quality = `${quality}Maj7`;
        continue;
      }
      const degree = ADD_DEGREE[token];
      if (degree === undefined) throw new Error(`chord "${label}": unknown added degree "${token}"`);
      adds.push(degree);
    }
  }
  quality = quality
    .replace(/^major$/, '')
    .replace(/^minor$/, 'm')
    .replace(/°7/, 'dim7')
    .replace(/°/, 'dim')
    .replace(/^mMaj7$|^mmaj7$|^m\(maj7\)$/, 'mMaj7')
    .replace(/^min/, 'm')
    .replace(/^add9$/, '')
    .trim();
  if (/^add9$/.test((m[2] ?? '').trim())) adds.push(2);
  if (quality === 'Maj7') quality = 'maj7';
  if (quality === 'mMaj7' || quality === 'mmaj7') quality = 'mMaj7';
  const intervals = QUALITY[quality];
  if (!intervals) throw new Error(`chord "${label}": unknown quality "${quality}"`);
  const rootPc = pcOf(root.step, root.alter);
  const chord = new Set(intervals.map((i) => (rootPc + i) % 12));
  for (const add of adds) chord.add((rootPc + add) % 12);
  const has = (i: number) => chord.has((rootPc + i) % 12);
  const colour = new Set<number>();
  const minorThird = has(3) && !has(4);
  const diminished = has(3) && has(6) && !has(7);
  if (diminished) {
    /* diminished colours stay inside the chord */
  } else if (minorThird) {
    colour.add(2);
    colour.add(5);
  } else if (has(10) && has(4)) {
    colour.add(2);
    colour.add(9);
  } else if (has(5) || has(2)) {
    colour.add(2);
    colour.add(9);
    if (!has(10)) colour.add(5);
  } else if (has(4)) {
    colour.add(2);
    colour.add(9);
    if (!has(5)) colour.add(6);
  } else {
    colour.add(2);
    colour.add(5);
  }
  const field = new Set(chord);
  for (const c of colour) field.add((rootPc + c) % 12);
  let bassPc: number | undefined;
  if (bassRaw) {
    const fixed = bassRaw.trim().replace(/^([#b])([A-G])$/, '$2$1');
    const bass = noteToken(fixed);
    if (!bass) throw new Error(`chord "${label}" has a bad bass`);
    bassPc = pcOf(bass.step, bass.alter);
  }
  return {
    label: raw,
    rootPc,
    rootStep: root.step,
    rootAlter: root.alter,
    chordPcs: [...chord].sort((a, b) => a - b),
    fieldPcs: [...field].sort((a, b) => a - b),
    bassPc,
    augmentedFifth: has(8) && has(4) && !has(7),
  };
}

/** Spell a sounding MIDI pitch relative to the chord root (b3, b7, #11 …). */
export function spellForChord(midi: number, chord: WwhChord | null, fifths: number): { step: string; alter: number; octave: number } {
  const pc = ((midi % 12) + 12) % 12;
  let step: string;
  let alter: number;
  if (chord) {
    const interval = (pc - chord.rootPc + 12) % 12;
    const letterSteps = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 6][interval]!;
    const adjusted = interval === 6 && !chord.chordPcs.includes(pc) ? 3 : interval === 8 && chord.augmentedFifth ? 4 : letterSteps;
    const letterIndex = (LETTERS.indexOf(chord.rootStep) + adjusted) % 7;
    step = LETTERS[letterIndex]!;
    alter = pc - NATURAL[step]!;
    if (alter > 6) alter -= 12;
    if (alter < -6) alter += 12;
    if (Math.abs(alter) > 1) {
      ({ step, alter } = plainSpelling(pc, fifths));
    }
  } else {
    ({ step, alter } = plainSpelling(pc, fifths));
  }
  const octave = Math.floor((midi - NATURAL[step]! - alter) / 12) - 1;
  return { step, alter, octave };
}

function plainSpelling(pc: number, fifths: number): { step: string; alter: number } {
  const flats = fifths <= 0;
  for (const step of LETTERS) if (NATURAL[step] === pc) return { step, alter: 0 };
  if (flats) {
    const step = LETTERS.find((s) => (NATURAL[s]! - 1 + 12) % 12 === pc)!;
    return { step, alter: -1 };
  }
  const step = LETTERS.find((s) => (NATURAL[s]! + 1) % 12 === pc)!;
  return { step, alter: 1 };
}

/* ------------------------------------------------------------------ seeded random */

export function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) ^ 0x9e3779b9;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T>(items: readonly T[], weights: readonly number[], rand: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i += 1) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

/* ------------------------------------------------------------------ score timing */

interface TimedNote {
  onset: number;
  ticks: number;
  midis: number[];
  rest: boolean;
  voice: string;
}

interface BarInfo {
  number: number;
  measure: WwhImportedMeasure;
  bass: WwhImportedMeasure;
  ticks: number;
  quarter: number;
  melody: TimedNote[];
  bassNotes: TimedNote[];
  harmony: Array<{ onset: number; chord: WwhChord | null }>;
  singleVoice: boolean;
}

function barNumber(measure: WwhImportedMeasure): number {
  const parsed = Number(measure.number);
  return Number.isInteger(parsed) ? parsed : measure.order + 1;
}

function timedNotes(measure: WwhImportedMeasure): TimedNote[] {
  const out: TimedNote[] = [];
  let onset = 0;
  for (const note of measure.notes) {
    if (note.chord) {
      const last = out[out.length - 1];
      if (last && note.step && note.octave !== undefined) last.midis.push(soundingMidi(note, measure));
      continue;
    }
    out.push({
      onset,
      ticks: note.duration,
      rest: note.rest,
      voice: note.voice,
      midis: note.rest || !note.step || note.octave === undefined ? [] : [soundingMidi(note, measure)],
    });
    onset += note.duration;
  }
  return out;
}

function soundingMidi(note: WwhImportedNote, measure: WwhImportedMeasure): number {
  return midiOf(note.step!, note.alter ?? 0, note.octave! + measure.transposeOctave);
}

/** Harmony onsets inside a measure, read from the DOM order of <harmony>, <note>, <backup>, <forward>. */
function harmonyTimeline(measure: WwhImportedMeasure, carried: WwhChord | null): Array<{ onset: number; chord: WwhChord | null }> {
  const out: Array<{ onset: number; chord: WwhChord | null }> = [];
  let cursor = 0;
  let labelIndex = 0;
  const kids = Array.from(measure.element.childNodes) as Element[];
  for (const node of kids) {
    if (node.nodeType !== 1) continue;
    const name = node.nodeName;
    if (name === 'harmony') {
      const label = measure.harmony[labelIndex] ?? '';
      labelIndex += 1;
      out.push({ onset: cursor, chord: parseWwhChord(label) });
    } else if (name === 'note') {
      const isChord = Array.from(node.childNodes).some((c) => (c as Element).nodeName === 'chord');
      const dur = Array.from(node.childNodes).find((c) => (c as Element).nodeName === 'duration');
      if (!isChord && dur) cursor += Number(dur.textContent);
    } else if (name === 'backup') {
      const dur = Array.from(node.childNodes).find((c) => (c as Element).nodeName === 'duration');
      if (dur) cursor -= Number(dur.textContent);
    } else if (name === 'forward') {
      const dur = Array.from(node.childNodes).find((c) => (c as Element).nodeName === 'duration');
      if (dur) cursor += Number(dur.textContent);
    }
  }
  if (!out.length || out[0]!.onset > 0) out.unshift({ onset: 0, chord: carried });
  return out;
}

function chordAt(bar: BarInfo, onset: number): WwhChord | null {
  let current: WwhChord | null = null;
  for (const h of bar.harmony) if (h.onset <= onset) current = h.chord;
  return current;
}

/* ------------------------------------------------------------------ gaps */

interface Gap {
  bar: number;
  onset: number;
  ticks: number;
  kind: 'rest' | 'sustain';
  heldMidi: number | null;
  prevMelody: number | null;
  nextMelody: number | null;
  afterPhrase: boolean;
}

const MIN_GAP_QUARTERS = 1;

function gapsFor(bars: readonly BarInfo[]): Gap[] {
  const gaps: Gap[] = [];
  const flat: Array<{ bar: BarInfo; note: TimedNote }> = [];
  for (const bar of bars) for (const note of bar.melody) flat.push({ bar, note });
  const pitched = (index: number, dir: 1 | -1): number | null => {
    for (let i = index + dir; i >= 0 && i < flat.length; i += dir) {
      const m = flat[i]!.note.midis;
      if (m.length) return Math.max(...m);
    }
    return null;
  };
  for (let i = 0; i < flat.length; i += 1) {
    const { bar, note } = flat[i]!;
    if (!bar.singleVoice) continue;
    const q = bar.quarter;
    if (note.rest) {
      let ticks = note.ticks;
      while (i + 1 < flat.length && flat[i + 1]!.bar === bar && flat[i + 1]!.note.rest) {
        i += 1;
        ticks += flat[i]!.note.ticks;
      }
      const startNote = flat.findIndex((f) => f.note === note);
      if (ticks >= MIN_GAP_QUARTERS * q) {
        const prev = startNote > 0 ? flat[startNote - 1]!.note : null;
        gaps.push({
          bar: bar.number,
          onset: note.onset,
          ticks,
          kind: 'rest',
          heldMidi: null,
          prevMelody: pitched(startNote, -1),
          nextMelody: pitched(i, 1),
          afterPhrase: Boolean(prev && !prev.rest && prev.ticks >= q),
        });
      }
    } else if (note.ticks >= 2 * q && note.midis.length) {
      gaps.push({
        bar: bar.number,
        onset: note.onset + q,
        ticks: note.ticks - q,
        kind: 'sustain',
        heldMidi: Math.max(...note.midis),
        prevMelody: Math.max(...note.midis),
        nextMelody: pitched(i, 1),
        afterPhrase: false,
      });
    }
  }
  return gaps;
}

/* ------------------------------------------------------------------ vocabulary */

interface Fingered {
  midis: number[];
  strings: number[];
  frets: number[];
}

const RESPONSE_LOW = 50;
const RESPONSE_HIGH = 74;

/** Best playable fingering for a set of sounding pitches (distinct strings, max fret, max stopped span). */
export function fingerFor(midis: readonly number[]): Fingered | null {
  const notes = [...midis].sort((a, b) => a - b);
  let best: { f: Fingered; cost: number } | null = null;
  const choose = (index: number, lastString: number, strings: number[], frets: number[]) => {
    if (index === notes.length) {
      const span = stoppedSpan(frets);
      if (span > V8B_MAX_STOPPED_SPAN) return;
      const skips = strings.slice(1).reduce((s, str, k) => s + Math.max(0, strings[k]! - str - 1), 0);
      const avg = frets.reduce((a, b) => a + b, 0) / frets.length;
      const cost = span + skips * 1.5 + avg * 0.2;
      if (!best || cost < best.cost) best = { f: { midis: notes, strings: [...strings], frets: [...frets] }, cost };
      return;
    }
    for (let s = lastString - 1; s >= 1; s -= 1) {
      const fret = notes[index]! - V8B_OPEN_STRING_MIDI[s - 1]!;
      if (fret < 0 || fret > V8B_MAX_FRET) continue;
      strings.push(s);
      frets.push(fret);
      choose(index + 1, s, strings, frets);
      strings.pop();
      frets.pop();
    }
  };
  choose(0, 7, [], []);
  return best ? (best as { f: Fingered }).f : null;
}

const DYAD_INTERVALS = [3, 4, 5, 8, 9, 2, 10];

function stackCandidates(chord: WwhChord, family: Exclude<RespondFamily, 'grips'>): number[][] {
  const field = new Set(chord.fieldPcs);
  const chordTones = new Set(chord.chordPcs);
  const out: number[][] = [];
  for (let low = RESPONSE_LOW; low <= RESPONSE_HIGH; low += 1) {
    if (!field.has(low % 12)) continue;
    if (family === 'dyads') {
      for (const interval of DYAD_INTERVALS) {
        const high = low + interval;
        if (high > RESPONSE_HIGH || !field.has(high % 12)) continue;
        if (!chordTones.has(low % 12) && !chordTones.has(high % 12)) continue;
        if (interval === 2 && !(chordTones.has(low % 12) || chordTones.has(high % 12))) continue;
        out.push([low, high]);
      }
    } else {
      const step = family === 'quartal' ? 5 : 7;
      const stack = [low, low + step, low + 2 * step];
      if (stack[2]! > RESPONSE_HIGH + 2) continue;
      if (!stack.every((m) => field.has(m % 12))) continue;
      if (stack.filter((m) => chordTones.has(m % 12)).length < 1) continue;
      out.push(stack);
    }
  }
  return out;
}

export interface GripBook {
  byLabel: Map<string, number[][]>;
  all: number[][];
}

/** Read Mike's comping voicing map: every chord attack of ≥ 2 notes becomes a grip (sounding MIDI). */
export function readGripBook(file: string): GripBook {
  const xml = fs.readFileSync(file, 'utf8');
  const octaveChange = Number(/<octave-change>(-?\d+)<\/octave-change>/.exec(xml)?.[1] ?? '-1');
  const byLabel = new Map<string, number[][]>();
  const all: number[][] = [];
  const seen = new Set<string>();
  for (const measure of xml.match(/<measure\b[\s\S]*?<\/measure>/g) ?? []) {
    let label = '';
    const parts = measure.match(/<harmony\b[\s\S]*?<\/harmony>|<note\b[\s\S]*?<\/note>/g) ?? [];
    let current: number[] = [];
    const flush = () => {
      if (current.length >= 2) {
        const grip = [...current].sort((a, b) => a - b);
        const key = grip.join('.');
        const list = byLabel.get(label) ?? [];
        if (!list.some((g) => g.join('.') === key)) list.push(grip);
        byLabel.set(label, list);
        if (!seen.has(key)) {
          seen.add(key);
          all.push(grip);
        }
      }
      current = [];
    };
    for (const part of parts) {
      if (part.startsWith('<harmony')) {
        const step = /<root-step>(\w)/.exec(part)?.[1] ?? '';
        const alter = /<root-alter>(-?\d)/.exec(part)?.[1];
        const kindText = /<kind[^>]*text="([^"]*)"/.exec(part)?.[1] ?? /<kind[^>]*>([^<]*)/.exec(part)?.[1] ?? '';
        const bassStep = /<bass-step>(\w)/.exec(part)?.[1];
        const bassAlter = /<bass-alter>(-?\d)/.exec(part)?.[1];
        const acc = (a?: string) => (a === '-1' ? 'b' : a === '1' ? '#' : '');
        label = `${step}${acc(alter)}${kindText}${bassStep ? `/${acc(bassAlter)}${bassStep}` : ''}`;
        continue;
      }
      if (part.includes('<rest')) {
        flush();
        continue;
      }
      const step = /<step>(\w)/.exec(part)?.[1];
      const octave = /<octave>(\d)/.exec(part)?.[1];
      if (!step || !octave) continue;
      const alter = Number(/<alter>(-?\d)/.exec(part)?.[1] ?? '0');
      if (!part.includes('<chord')) flush();
      current.push(midiOf(step, alter, Number(octave) + octaveChange));
    }
    flush();
  }
  return { byLabel, all };
}

function gripCandidates(book: GripBook | null, chord: WwhChord): number[][] {
  if (!book) return [];
  const field = new Set(chord.fieldPcs);
  const exact = book.byLabel.get(chord.label) ?? [];
  const fitting = book.all.filter((grip) => grip.every((m) => field.has(m % 12)) && grip.some((m) => chord.chordPcs.includes(m % 12)));
  const merged: number[][] = [];
  for (const g of [...exact, ...fitting]) if (!merged.some((x) => x.join('.') === g.join('.'))) merged.push(g);
  return merged;
}

/* ------------------------------------------------------------------ planning */

const PATTERNS: Array<{ name: string; weight: number; build: (q: number) => Array<{ at: number; len: number }> | null }> = [
  { name: 'held', weight: 3, build: (q) => [{ at: 0, len: q }] },
  { name: 'late', weight: 3, build: (q) => (q >= 1.5 ? [{ at: q >= 2 ? 1 : 0.5, len: q - (q >= 2 ? 1 : 0.5) }] : null) },
  { name: 'short', weight: 2, build: (q) => (q >= 2 ? [{ at: 0, len: 1 }] : null) },
  { name: 'two', weight: 2, build: (q) => (q >= 2 ? [{ at: 0, len: q >= 3 ? 1.5 : 1 }, { at: q >= 3 ? 1.5 : 1, len: q - (q >= 3 ? 1.5 : 1) }] : null) },
];

const DURATIONS: Array<[number, string, number]> = [
  [4, 'whole', 0],
  [3, 'half', 1],
  [2, 'half', 0],
  [1.5, 'quarter', 1],
  [1, 'quarter', 0],
  [0.75, 'eighth', 1],
  [0.5, 'eighth', 0],
  [0.25, '16th', 0],
];

/** Largest single notated value ≤ quarters. */
function fitDuration(quarters: number): [number, string, number] | null {
  return DURATIONS.find(([q]) => q <= quarters + 1e-9) ?? null;
}

function clashes(midis: readonly number[], others: readonly number[]): boolean {
  for (const a of midis) for (const b of others) {
    const d = Math.abs(a - b);
    if (d === 1 || d === 13 || d === 0) return true;
  }
  return false;
}

function soundingDuring(notes: readonly TimedNote[], start: number, end: number): number[] {
  const out: number[] = [];
  for (const n of notes) if (!n.rest && n.onset < end && n.onset + n.ticks > start) out.push(...n.midis);
  return out;
}

interface Placed {
  bar: number;
  onset: number;
  ticks: number;
  fingered: Fingered;
  chord: WwhChord | null;
  family: RespondFamily;
  kind: 'rest' | 'sustain';
}

function scoreCandidates(
  bar: BarInfo,
  gap: Gap,
  onset: number,
  ticks: number,
  chord: WwhChord,
  family: RespondFamily,
  book: GripBook | null,
  previous: number[] | null,
  notes: string[] | null,
  used: Map<string, number> = new Map()
): Array<{ f: Fingered; cost: number }> {
  let raw = family === 'grips' ? gripCandidates(book, chord) : stackCandidates(chord, family);
  if (family === 'grips' && !raw.length) {
    notes?.push(`bar ${gap.bar} ${chord.label}: no grip in the comping map fits — dyad used`);
    raw = stackCandidates(chord, 'dyads');
  }
  const melodyNow = soundingDuring(bar.melody, onset, onset + ticks);
  const bassNow = soundingDuring(bar.bassNotes, onset, onset + ticks);
  const ceiling = gap.kind === 'sustain' ? (gap.heldMidi ?? RESPONSE_HIGH) - 2 : Math.max(gap.prevMelody ?? RESPONSE_HIGH, gap.nextMelody ?? RESPONSE_HIGH) + 2;
  const floor = (bassNow.length ? Math.max(...bassNow) : 40) + 5;
  const scored: Array<{ f: Fingered; cost: number }> = [];
  for (const cand of raw) {
    if (Math.max(...cand) > ceiling || Math.min(...cand) < floor) continue;
    if (clashes(cand, [...melodyNow, ...bassNow])) continue;
    const f = fingerFor(cand);
    if (!f) continue;
    let cost = 0;
    if (previous) {
      for (const m of cand) cost += Math.min(...previous.map((p) => Math.abs(p - m)));
      const common = cand.filter((m) => previous.includes(m)).length;
      cost -= common * 1.5;
      if (cand.join('.') === previous.join('.')) cost += 6;
    }
    cost += (used.get(cand.join('.')) ?? 0) * 2.5;
    cost += Math.abs(cand.reduce((a, b) => a + b, 0) / cand.length - 62) * 0.15;
    if (chord.bassPc !== undefined && cand.some((m) => m % 12 === chord.bassPc) && family !== 'grips') cost += 0.5;
    scored.push({ f, cost });
  }
  return scored;
}

function planSection(
  bars: readonly BarInfo[],
  gaps: readonly Gap[],
  alternative: RespondAlternative,
  seed: number,
  density: number,
  book: GripBook | null,
  notes: string[]
): Placed[] {
  const rand = seededRandom(seed);
  const byNumber = new Map(bars.map((b) => [b.number, b]));
  const target = Math.max(1, Math.round(gaps.length * Math.min(0.5, Math.max(0.35, density - 0.1 + rand() * 0.2))));
  const answerable = (g: Gap): boolean => {
    const bar = byNumber.get(g.bar)!;
    const chord = chordAt(bar, g.onset);
    if (!chord) return false;
    const ticks = Math.min(g.ticks, bar.quarter);
    return alternative.families.some((family) => scoreCandidates(bar, g, g.onset, ticks, chord, family, book, null, null).length > 0);
  };
  const pool = gaps.map((g, i) => ({ g, i, w: (g.kind === 'rest' ? 1.3 : 1) * (g.afterPhrase ? 1.6 : 1) * (g.ticks >= 2 * byNumber.get(g.bar)!.quarter ? 1.2 : 1) })).filter((p) => answerable(p.g));
  const chosen: number[] = [];
  while (chosen.length < target && pool.length) {
    const pick = weightedPick(pool, pool.map((p) => p.w), rand);
    pool.splice(pool.indexOf(pick), 1);
    const barsAnswered = new Set(chosen.map((i) => gaps[i]!.bar));
    const run = [1, 2, 3].every((k) => barsAnswered.has(pick.g.bar - k)) || [1, 2, 3].every((k) => barsAnswered.has(pick.g.bar + k));
    if (run) continue;
    chosen.push(pick.i);
  }
  chosen.sort((a, b) => a - b);
  const placed: Placed[] = [];
  const used = new Map<string, number>();
  let previous: number[] | null = null;
  for (const index of chosen) {
    const gap = gaps[index]!;
    const bar = byNumber.get(gap.bar)!;
    const q = bar.quarter;
    const quarters = gap.ticks / q;
    const patterns = PATTERNS.map((p) => ({ p, segs: p.build(quarters) })).filter((x) => x.segs);
    const { segs } = weightedPick(patterns, patterns.map((x) => x.p.weight), rand);
    for (const seg of segs!) {
      const fit = fitDuration(seg.len);
      if (!fit) continue;
      const onset = gap.onset + Math.round(seg.at * q);
      const ticks = Math.round(fit[0] * q);
      const chord = chordAt(bar, onset);
      if (!chord) {
        notes.push(`bar ${gap.bar}: N.C. — left silent`);
        continue;
      }
      const chosenFamily = alternative.families.length === 1 ? alternative.families[0]! : weightedPick(alternative.families, alternative.families.map((_, k) => (k === 0 ? 0.6 : 0.4 / (alternative.families.length - 1))), rand);
      let family = chosenFamily;
      let scored = scoreCandidates(bar, gap, onset, ticks, chord, family, book, previous, notes, used);
      for (const other of alternative.families) {
        if (scored.length || other === chosenFamily) continue;
        family = other;
        scored = scoreCandidates(bar, gap, onset, ticks, chord, family, book, previous, notes, used);
      }
      if (!scored.length) {
        notes.push(`bar ${gap.bar} ${chord.label}: no playable ${family} voicing under the melody — left silent`);
        continue;
      }
      scored.sort((a, b) => a.cost - b.cost);
      const top = scored.slice(0, 5);
      const pick = weightedPick(top, [0.34, 0.26, 0.18, 0.13, 0.09].slice(0, top.length), rand);
      previous = pick.f.midis;
      used.set(pick.f.midis.join('.'), (used.get(pick.f.midis.join('.')) ?? 0) + 1);
      placed.push({ bar: gap.bar, onset, ticks, fingered: pick.f, chord, family, kind: gap.kind });
    }
  }
  return placed;
}

/* ------------------------------------------------------------------ writing */

function noteXml(midi: number, chordFirst: boolean, ticks: number, quarters: number, chord: WwhChord | null, fifths: number, writtenShift: number, stringNo: number, fret: number): string {
  const fit = fitDuration(quarters)!;
  const sp = spellForChord(midi, chord, fifths);
  const alter = sp.alter ? `<alter>${sp.alter}</alter>` : '';
  const dot = fit[2] ? '<dot/>' : '';
  return `<note>${chordFirst ? '' : '<chord/>'}<pitch><step>${sp.step}</step>${alter}<octave>${sp.octave + writtenShift}</octave></pitch><duration>${ticks}</duration><voice>2</voice><type>${fit[1]}</type>${dot}<stem>down</stem><notations><technical><string>${stringNo}</string><fret>${fret}</fret></technical></notations></note>`;
}

function restXml(ticks: number, quarter: number): string {
  let out = '';
  let left = ticks / quarter;
  while (left > 1e-9) {
    const fit = fitDuration(left);
    if (!fit) throw new Error(`cannot write rest of ${left} quarters`);
    const t = Math.round(fit[0] * quarter);
    out += `<note print-object="no"><rest/><duration>${t}</duration><voice>2</voice><type>${fit[1]}</type>${fit[2] ? '<dot/>' : ''}</note>`;
    left -= fit[0];
  }
  return out;
}

function voice2Xml(bar: BarInfo, placed: readonly Placed[]): { xml: string; words: string[] } {
  const items = [...placed].sort((a, b) => a.onset - b.onset);
  let xml = '';
  let cursor = 0;
  const words: string[] = [];
  const writtenShift = -bar.measure.transposeOctave;
  for (const item of items) {
    if (item.onset < cursor) continue;
    if (item.onset > cursor) xml += restXml(item.onset - cursor, bar.quarter);
    const order = item.fingered.midis.map((m, k) => ({ m, s: item.fingered.strings[k]!, f: item.fingered.frets[k]! }));
    order.forEach((n, k) => {
      xml += noteXml(n.m, k === 0, item.ticks, item.ticks / bar.quarter, item.chord, bar.measure.fifths, writtenShift, n.s, n.f);
    });
    words.push(order.map((n) => `${n.s}/${n.f}`).join(' '));
    cursor = item.onset + item.ticks;
  }
  if (cursor < bar.ticks) xml += restXml(bar.ticks - cursor, bar.quarter);
  return { xml: `<backup><duration>${bar.ticks}</duration></backup>${xml}`, words };
}

function injectVoice2(score: string, measureIndex: number, xml: string): string {
  const partStart = score.indexOf('<part id="P1">');
  const partEnd = score.indexOf('</part>', partStart);
  const part = score.slice(partStart, partEnd);
  const marker = `<measure number="${measureIndex}"`;
  const at = part.indexOf(marker);
  if (at < 0) throw new Error(`audition measure ${measureIndex} missing`);
  const close = part.indexOf('</measure>', at);
  const body = part.slice(at, close);
  const barline = body.lastIndexOf('<barline');
  const insertAt = at + (barline >= 0 && !body.slice(barline).includes('<note') ? barline : body.length);
  const updated = part.slice(0, insertAt) + xml + part.slice(insertAt);
  return score.slice(0, partStart) + updated + score.slice(partEnd);
}

/** MusicXML order: <print>/<attributes> before harmony and directions (the shared writer can insert them later). */
export function attributesFirst(score: string): string {
  return score.replace(/(<measure number="\d+">)((?:\s*<print[^>]*\/>)?)([\s\S]*?)(<\/measure>)/g, (whole, open: string, print: string, body: string, close: string) => {
    const firstNote = body.search(/<note\b/);
    const head = firstNote >= 0 ? body.slice(0, firstNote) : body;
    const attrs = head.match(/<attributes>[\s\S]*?<\/attributes>/g);
    if (!attrs || head.trimStart().startsWith('<attributes>')) return whole;
    let rest = head;
    for (const a of attrs) rest = rest.replace(a, '');
    return `${open}${print}${attrs.join('')}${rest}${firstNote >= 0 ? body.slice(firstNote) : ''}${close}`;
  });
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function pieceSlug(title: string): string {
  const words = title.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words.length ? words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('-') : 'Piece';
}

function lane(notes: readonly WwhImportedNote[], voice?: string): string {
  return notes
    .filter((n) => (voice ? n.voice === voice : true))
    .map((n) => (n.rest ? `R${n.duration}` : `${n.step}${n.alter ?? 0}${n.octave}:${n.duration}${n.chord ? 'c' : ''}`))
    .join(',');
}

function pitchLabel(midi: number, chord: WwhChord | null, fifths: number): string {
  const sp = spellForChord(midi, chord, fifths);
  return `${sp.step}${sp.alter === -1 ? 'b' : sp.alter === 1 ? '#' : ''}${sp.octave}`;
}

/* ------------------------------------------------------------------ main */

export function buildRespondAudition(request: RespondRequest): RespondResult {
  if (!Number.isInteger(request.startBar) || !Number.isInteger(request.endBar) || request.endBar < request.startBar) {
    throw new Error('bar range must be integers with endBar >= startBar');
  }
  if (!Number.isInteger(request.seed)) throw new Error('seed must be an integer');
  const sourceShaBefore = sha256(request.source);
  const duo: WwhDuoScore = importWwhDuoMusicXml(fs.readFileSync(request.source, 'utf8'));
  const book = request.compingMap ? readGripBook(request.compingMap) : null;
  const alternatives = request.alternatives ?? DEFAULT_ALTERNATIVES;
  if (!book && alternatives.some((a) => a.families.includes('grips'))) {
    throw new Error("the 'grips' family needs compingMap (the piece's comping voicing map MusicXML)");
  }
  let carried: WwhChord | null = null;
  const all: BarInfo[] = duo.guitar.measures.map((measure, index) => {
    const bass = duo.bass.measures[index];
    if (!bass) throw new Error(`bass bar ${measure.number} missing`);
    const harmony = harmonyTimeline(measure, carried);
    carried = harmony[harmony.length - 1]?.chord ?? carried;
    const voices = new Set(measure.notes.map((n) => n.voice));
    return {
      number: barNumber(measure),
      measure,
      bass,
      ticks: measure.specTicks ?? wwhBarTicks(measure.beats, measure.beatType, measure.divisions),
      quarter: measure.divisions,
      melody: timedNotes(measure),
      bassNotes: timedNotes(bass),
      harmony,
      singleVoice: voices.size <= 1,
    };
  });
  const bars = all.filter((b) => b.number >= request.startBar && b.number <= request.endBar);
  if (!bars.length) throw new Error(`no bars ${request.startBar}-${request.endBar}`);
  const gaps = gapsFor(bars);
  const density = request.density ?? 0.4;

  const sections: RespondSection[] = [];
  const written: WwhWrittenBar[] = [];
  const injections: Array<{ index: number; xml: string }> = [];
  const pushSection = (label: string, placedByBar: Map<number, Placed[]> | null) => {
    bars.forEach((bar, k) => {
      const placed = placedByBar?.get(bar.number) ?? [];
      const v2 = placed.length ? voice2Xml(bar, placed) : null;
      written.push({
        guitar: [],
        bass: [],
        guitarClone: bar.measure.element,
        bassClone: bar.bass.element,
        beats: bar.measure.beats,
        beatType: bar.measure.beatType,
        divisions: bar.measure.divisions,
        fifths: bar.measure.fifths,
        mode: bar.measure.mode,
        guitarTranspose: bar.measure.transposeOctave,
        bassTranspose: bar.bass.transposeOctave,
        rehearsal: k === 0 ? label : undefined,
        words: v2?.words.length ? [`${v2.words.join('  ·  ')}`] : undefined,
        newSystem: k === 0 && written.length > 0,
        tempoMark: bar.measure.tempo.perMinute || bar.measure.tempo.soundTempo ? bar.measure.tempo : null,
      });
      if (v2) injections.push({ index: written.length, xml: v2.xml });
    });
  };
  pushSection(`ORIGINAL · bars ${request.startBar}–${request.endBar}`, null);
  alternatives.forEach((alt, k) => {
    const seed = request.seed * 1000 + k;
    const notes: string[] = [];
    const placed = planSection(bars, gaps, alt, seed, density, book, notes);
    const byBar = new Map<number, Placed[]>();
    for (const p of placed) byBar.set(p.bar, [...(byBar.get(p.bar) ?? []), p]);
    sections.push({
      label: alt.label,
      seed,
      windows: gaps.length,
      answered: new Set(placed.map((p) => `${p.bar}:${gaps.find((g) => g.bar === p.bar && p.onset >= g.onset && p.onset < g.onset + g.ticks)?.onset}`)).size,
      events: placed.map((p) => {
        const bar = bars.find((b) => b.number === p.bar)!;
        return {
          bar: p.bar,
          onsetQuarters: p.onset / bar.quarter,
          quarters: p.ticks / bar.quarter,
          family: p.family,
          kind: p.kind,
          chord: p.chord?.label ?? 'N.C.',
          midis: p.fingered.midis,
          sounding: p.fingered.midis.map((m) => pitchLabel(m, p.chord, bar.measure.fifths)),
          fingering: p.fingered.strings.map((s, i) => `${s}/${p.fingered.frets[i]}`).join(' '),
        };
      }),
      notes,
    });
    pushSection(`${alt.label} · seed ${seed}`, byBar);
  });

  const header: WwhScoreHeader = {
    title: duo.title,
    movementTitle: `${duo.movementTitle || duo.title} — RESPOND audition, bars ${request.startBar}–${request.endBar}, seed ${request.seed}`,
    composer: duo.composer,
    software: `Composer OS ${RESPOND_VERSION}`,
  };
  let score = renderWwhDuoScore(written, header);
  for (const inj of injections) score = injectVoice2(score, inj.index, inj.xml);
  score = attributesFirst(score);

  const outDir = request.outDir ?? RESPOND_OUT_DIR;
  fs.mkdirSync(outDir, { recursive: true });
  const output = path.join(outDir, `${pieceSlug(duo.title)}-RESPOND-${request.startBar}-${request.endBar}-seed${request.seed}.musicxml`);
  if (path.resolve(output) === path.resolve(request.source)) throw new Error('refusing to overwrite the source');
  fs.writeFileSync(output, score);
  if (request.open) execFileSync('open', ['-a', 'MuseScore 4', output], { stdio: 'ignore' });

  const reread = importWwhDuoMusicXml(score);
  const n = bars.length;
  let melodyLocked = true;
  let bassLocked = true;
  let barMath = true;
  let grid = true;
  for (let s = 0; s <= alternatives.length; s += 1) {
    for (let k = 0; k < n; k += 1) {
      const src = bars[k]!;
      const g = reread.guitar.measures[s * n + k];
      const b = reread.bass.measures[s * n + k];
      if (!g || !b) {
        barMath = false;
        continue;
      }
      if (lane(g.notes, '1') !== lane(src.measure.notes, '1')) melodyLocked = false;
      if (lane(b.notes) !== lane(src.bass.notes)) bassLocked = false;
      const ticks = g.specTicks ?? wwhBarTicks(g.beats, g.beatType, g.divisions);
      const v2 = g.notes.filter((x) => x.voice === '2' && !x.chord).reduce((a, x) => a + x.duration, 0);
      if (v2 && v2 !== ticks) barMath = false;
      if (!g.gridAgrees || !b.gridAgrees) grid = false;
    }
  }
  const frets = sections.every((sec) =>
    sec.events.every((e) => {
      const fr = e.fingering.split(' ').map((x) => Number(x.split('/')[1]));
      return fr.every((f) => f >= 0 && f <= V8B_MAX_FRET) && stoppedSpan(fr) <= V8B_MAX_STOPPED_SPAN;
    })
  );
  return {
    output,
    version: RESPOND_VERSION,
    sourceShaBefore,
    sourceShaAfter: sha256(request.source),
    bars: bars.map((b) => b.number),
    sections,
    checks: { melodyLocked, bassLocked, barMath, grid, frets },
  };
}
