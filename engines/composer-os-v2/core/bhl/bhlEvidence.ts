/**
 * BHL evidence reader.
 * Describes what the MusicXML does. It does not score the music.
 * Parts and voices are generic. One guitar and one bass is not assumed.
 */

import { midiOfPitch } from '../performance-composer/pcChord';
import {
  elementChildren,
  measureViews,
  parseScoreDocument,
  partElements,
  partNames,
} from '../performance-composer/pcScore';
import type { BhlSpan } from './bhlTypes';
import { motionKind } from '../musical-evaluation/voiceRelations';

export interface Rational {
  n: number;
  d: number;
}

export interface BhlTimelineEvent {
  partId: string;
  partName: string;
  voice: string;
  /** Document order, 1-based. */
  bar: number;
  printedBar: string;
  beats: number;
  beatType: number;
  divisions: number;
  onset: Rational;
  duration: Rational;
  onsetInBar: Rational;
  rest: boolean;
  /** Sounding MIDI after octave and chromatic transposition. Null on a rest. */
  midi: number | null;
  attack: boolean;
  tieSustained: boolean;
}

export type BhlMotionKind = 'contrary' | 'oblique' | 'parallel' | 'similar';

export interface BhlMotionObservation {
  bar: number;
  onsetInBar: Rational;
  voiceA: string;
  voiceB: string;
  kind: BhlMotionKind;
  pitchA: number;
  pitchB: number;
  previousA: number;
  previousB: number;
}

export interface BhlIntervalObservation {
  bar: number;
  onsetInBar: Rational;
  voiceA: string;
  voiceB: string;
  midiA: number;
  midiB: number;
  semitones: number;
  interval: string;
  /** Same voice, same onset: a chord, not two lines. */
  chordal: boolean;
  newlyAttacked: boolean;
  sustained: boolean;
  prepared: boolean;
  nextSemitones: number | null;
}

export interface BhlEntryObservation {
  bar: number;
  onsetInBar: Rational;
  entering: string;
  other: string;
  kind: 'shared-attack' | 'against-sustain' | 'during-rest' | 'handoff';
  enteringMidi: number;
  otherMidi: number | null;
}

export interface BhlCrossingObservation {
  bar: number;
  onsetInBar: Rational;
  voiceA: string;
  voiceB: string;
  pitchA: number;
  pitchB: number;
}

export interface BhlSilenceObservation {
  bar: number;
  voice: string;
  kind: 'inner-bar' | 'whole-bar';
  onsetInBar: Rational;
  duration: Rational;
}

export interface BhlMotifMatch {
  kind: 'exact' | 'transposition' | 'rhythmic-displacement' | 'augmentation' | 'diminution' | 'fragmentation' | 'return';
  bar: number;
  onsetInBar: Rational;
  intervals: number[];
  detail: string;
}

export interface BhlMotifFinding {
  voice: string;
  openingBar: number;
  openingOnset: Rational;
  midis: number[];
  intervals: number[];
  durations: Rational[];
  matches: BhlMotifMatch[];
  recurrence: 'observed' | 'indeterminate';
}

export interface BhlTensionObservation {
  bar: number;
  onsetInBar: Rational;
  pitches: string;
  interval: string;
  voices: string;
  sustained: boolean;
  prepared: boolean;
  nextInterval: string | null;
  inOpeningMotif: boolean;
  question: string;
}

export interface BhlDensityBar {
  bar: number;
  partId: string;
  partName: string;
  voice: string;
  attacks: number;
  sounding: Rational;
  rest: Rational;
  metre: Rational;
  wholeBarSilence: boolean;
}

export interface BhlActivityRelation {
  bar: number;
  guitarSoundingDuringBassRest: boolean;
  bassSoundingDuringGuitarRest: boolean;
  simultaneous: boolean;
  alternating: boolean;
}

export interface BhlEvidenceReport {
  span: BhlSpan;
  awaitingComposerVerification: true;
  musicalQualityScore: null;
  events: BhlTimelineEvent[];
  motions: BhlMotionObservation[];
  intervals: BhlIntervalObservation[];
  entries: BhlEntryObservation[];
  crossings: BhlCrossingObservation[];
  silences: BhlSilenceObservation[];
  motifs: BhlMotifFinding[];
  tensions: BhlTensionObservation[];
  density: BhlDensityBar[];
  activity: BhlActivityRelation[];
  questions: string[];
  /** Empty when this walk agrees with measureViews on voice, onset, and pitch. */
  reconstructionWarnings: string[];
  barMetres: Array<{ bar: number; beats: number; beatType: number; quarters: Rational; maxCursor: Rational }>;
}

export interface BhlEvidenceComparison {
  provisional: true;
  notice: string;
  originalAttacks: number;
  candidateAttacks: number;
  originalWholeBarSilences: number;
  candidateWholeBarSilences: number;
  motion: Record<BhlMotionKind, { original: number; candidate: number }>;
  dissonances: { original: number; candidate: number };
  notes: string[];
}

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const INTERVALS = ['unison', 'm2', 'M2', 'm3', 'M3', 'P4', 'tritone', 'P5', 'm6', 'M6', 'm7', 'M7'] as const;
const NOTABLE = new Set([1, 2, 6, 10, 11]);

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

export function q(n: number, d = 1): Rational {
  if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error(`not a rational: ${n}/${d}`);
  const g = gcd(n, d);
  const sign = n < 0 !== d < 0 ? -1 : 1;
  return { n: (sign * Math.abs(n)) / g, d: Math.abs(d) / g };
}

/** Max denominator when recovering float MusicXML duration ticks (e.g. 0.333… → 1/3). */
const FLOAT_TICK_MAX_DEN = 1_000_000;

/**
 * Approximate a finite float as a reduced Rational via continued fractions.
 * Rejects non-finite values. Integers pass through q().
 */
export function floatToRational(x: number, maxDen = FLOAT_TICK_MAX_DEN): Rational {
  if (!Number.isFinite(x)) throw new Error(`not a rational float: ${x}`);
  if (Number.isInteger(x)) return q(x, 1);
  const sign = x < 0 ? -1 : 1;
  let v = Math.abs(x);
  let n0 = 0;
  let d0 = 1;
  let n1 = 1;
  let d1 = 0;
  for (let i = 0; i < 32; i += 1) {
    const a = Math.floor(v + 1e-15);
    const n = a * n1 + n0;
    const d = a * d1 + d0;
    if (d > maxDen) break;
    n0 = n1;
    d0 = d1;
    n1 = n;
    d1 = d;
    const frac = v - a;
    if (frac < 1e-12) break;
    v = 1 / frac;
  }
  if (d1 === 0) throw new Error(`not a rational float: ${x}`);
  return q(sign * n1, d1);
}

/**
 * MusicXML duration/onset tick count over divisions → Rational.
 * Integer ticks keep existing q(n,d). Float tick residue (e.g. 1/3 from bar÷3)
 * converts via continued fraction — does not invent a different integer tick count.
 */
export function ticksOverDivisions(ticks: number, divisions: number): Rational {
  if (!Number.isFinite(ticks) || !Number.isFinite(divisions) || !(divisions > 0)) {
    throw new Error(`not a rational: ${ticks}/${divisions}`);
  }
  if (Number.isInteger(ticks) && Number.isInteger(divisions)) return q(ticks, divisions);
  const tickQ = floatToRational(ticks);
  if (Number.isInteger(divisions)) return q(tickQ.n, tickQ.d * divisions);
  const divQ = floatToRational(divisions);
  return q(tickQ.n * divQ.d, tickQ.d * divQ.n);
}

export function qAdd(a: Rational, b: Rational): Rational {
  return q(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function qSub(a: Rational, b: Rational): Rational {
  return q(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function qCmp(a: Rational, b: Rational): number {
  return a.n * b.d - b.n * a.d;
}

export function qEq(a: Rational, b: Rational): boolean {
  return qCmp(a, b) === 0;
}

export function formatRational(value: Rational): string {
  return value.d === 1 ? String(value.n) : `${value.n}/${value.d}`;
}

export function pitchName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  return `${NAMES[pc]}${Math.floor(midi / 12) - 1}`;
}

export function intervalName(semitones: number): string {
  const abs = Math.abs(semitones);
  const pc = abs % 12;
  const octaves = Math.floor(abs / 12);
  const base = INTERVALS[pc] ?? String(pc);
  if (octaves === 0) return base;
  if (pc === 0) return octaves === 1 ? 'octave' : `${octaves} octaves`;
  return `${base} + ${octaves} octave${octaves === 1 ? '' : 's'}`;
}

export function voiceKey(event: { partId: string; voice: string }): string {
  return `${event.partId}:${event.voice}`;
}

function textOf(parent: Element | undefined, name: string): string {
  if (!parent) return '';
  return elementChildren(parent, name)[0]?.textContent?.trim() ?? '';
}

function roleOf(name: string): 'guitar' | 'bass' | 'other' {
  if (/bass|cello|contrabass/i.test(name)) return 'bass';
  if (/guitar/i.test(name)) return 'guitar';
  return 'other';
}

interface RawPitch {
  partId: string;
  partName: string;
  voice: string;
  bar: number;
  printedBar: string;
  beats: number;
  beatType: number;
  divisions: number;
  onset: Rational;
  duration: Rational;
  onsetInBar: Rational;
  rest: boolean;
  midi: number | null;
  tieStart: boolean;
  tieStop: boolean;
  cursorEnd: Rational;
}

function walkPart(
  part: Element,
  partId: string,
  partName: string,
  span: BhlSpan | null,
): { pitches: RawPitch[]; warnings: string[]; metres: BhlEvidenceReport['barMetres'] } {
  const views = measureViews(part);
  const measures = elementChildren(part, 'measure');
  let beats = 4;
  let beatType = 4;
  let divisions = 1;
  let octaveChange = 0;
  let chromatic = 0;
  let barStart = q(0);
  const pitches: RawPitch[] = [];
  const warnings: string[] = [];
  const metres: BhlEvidenceReport['barMetres'] = [];

  measures.forEach((measure, index) => {
    const bar = index + 1;
    for (const attributes of elementChildren(measure, 'attributes')) {
      const d = Number(textOf(attributes, 'divisions'));
      if (Number.isFinite(d) && d > 0) divisions = d;
      const time = elementChildren(attributes, 'time')[0];
      if (time) {
        const nextBeats = Number(textOf(time, 'beats'));
        const nextType = Number(textOf(time, 'beat-type'));
        if (Number.isFinite(nextBeats) && nextBeats > 0) beats = nextBeats;
        if (Number.isFinite(nextType) && nextType > 0) beatType = nextType;
      }
      const transpose = elementChildren(attributes, 'transpose')[0];
      if (transpose) {
        const oct = textOf(transpose, 'octave-change');
        const chrom = textOf(transpose, 'chromatic');
        if (oct !== '') octaveChange = Number(oct);
        if (chrom !== '') chromatic = Number(chrom);
      }
    }
    const metre = q(beats * 4, beatType);
    let cursor = 0;
    let maxCursor = 0;
    let pendingVoice = '1';
    const inSpan = span === null || (bar >= span.from && bar <= span.to);
    for (const node of elementChildren(measure)) {
      const name = node.nodeName;
      if (name === 'backup') {
        cursor -= Number(textOf(node, 'duration') || 0);
      } else if (name === 'forward') {
        cursor += Number(textOf(node, 'duration') || 0);
      } else if (name === 'note') {
        if (elementChildren(node, 'grace').length || elementChildren(node, 'cue').length) continue;
        const chord = elementChildren(node, 'chord').length > 0;
        const dur = Number(textOf(node, 'duration') || 0);
        const voiceText = textOf(node, 'voice');
        if (voiceText) pendingVoice = voiceText;
        const onsetTicks = chord ? cursor - (pitches.length ? 0 : 0) : cursor;
        const onset = chord
          ? pitches.filter((item) => item.bar === bar).at(-1)?.onsetInBar ?? ticksOverDivisions(cursor, divisions)
          : ticksOverDivisions(cursor, divisions);
        if (!chord) {
          cursor += dur;
          if (cursor > maxCursor) maxCursor = cursor;
        }
        if (!inSpan) continue;
        const rest = elementChildren(node, 'rest').length > 0;
        const pitch = elementChildren(node, 'pitch')[0];
        const midi = pitch
          ? midiOfPitch(textOf(pitch, 'step'), Number(textOf(pitch, 'alter') || 0), Number(textOf(pitch, 'octave'))) +
            12 * octaveChange +
            chromatic
          : null;
        const tags = [...node.getElementsByTagName('tie'), ...node.getElementsByTagName('tied')] as Element[];
        const usedOnset = chord ? (pitches.filter((item) => item.bar === bar).at(-1)?.onsetInBar ?? onset) : onset;
        void onsetTicks;
        pitches.push({
          partId,
          partName,
          voice: pendingVoice,
          bar,
          printedBar: measure.getAttribute('number') ?? String(bar),
          beats,
          beatType,
          divisions,
          onset: qAdd(barStart, usedOnset),
          duration: ticksOverDivisions(dur, divisions),
          onsetInBar: usedOnset,
          rest,
          midi: rest ? null : midi,
          tieStart: tags.some((tag) => tag.getAttribute('type') === 'start'),
          tieStop: tags.some((tag) => tag.getAttribute('type') === 'stop'),
          cursorEnd: ticksOverDivisions(maxCursor, divisions),
        });
      }
    }
    if (cursor > maxCursor) maxCursor = cursor;
    const view = views[index];
    if (view && inSpan) {
      const folded = new Map<string, number[]>();
      for (const pitch of pitches.filter((item) => item.bar === bar)) {
        const key = `${pitch.voice}|${formatRational(pitch.onsetInBar)}|${formatRational(pitch.duration)}|${pitch.rest}`;
        const list = folded.get(key) ?? [];
        if (pitch.midi !== null) list.push(pitch.midi);
        folded.set(key, list);
      }
      if (folded.size !== view.notes.length) {
        warnings.push(`bar ${bar} ${partId}: walker groups ${folded.size}, measureViews notes ${view.notes.length}`);
      }
      view.notes.forEach((note, noteIndex) => {
        const onset = ticksOverDivisions(note.onset, view.divisions);
        const found = pitches.find(
          (item) =>
            item.bar === bar &&
            item.voice === note.voice &&
            qEq(item.onsetInBar, onset) &&
            item.rest === note.rest &&
            (note.rest || item.midi === note.midis[0]),
        );
        if (!found) warnings.push(`bar ${bar} ${partId} note ${noteIndex + 1} missing from the walker`);
      });
    }
    if (inSpan) {
      metres.push({ bar, beats, beatType, quarters: metre, maxCursor: ticksOverDivisions(maxCursor, divisions) });
    }
    barStart = qAdd(barStart, metre);
  });
  return { pitches, warnings, metres };
}

function mergeTies(pitches: readonly RawPitch[]): BhlTimelineEvent[] {
  const open = new Map<string, BhlTimelineEvent>();
  const events: BhlTimelineEvent[] = [];
  for (const pitch of pitches) {
    if (pitch.rest || pitch.midi === null) {
      events.push({
        partId: pitch.partId,
        partName: pitch.partName,
        voice: pitch.voice,
        bar: pitch.bar,
        printedBar: pitch.printedBar,
        beats: pitch.beats,
        beatType: pitch.beatType,
        divisions: pitch.divisions,
        onset: pitch.onset,
        duration: pitch.duration,
        onsetInBar: pitch.onsetInBar,
        rest: true,
        midi: null,
        attack: false,
        tieSustained: false,
      });
      continue;
    }
    const key = `${pitch.partId}|${pitch.voice}|${pitch.midi}`;
    const held = open.get(key);
    if (pitch.tieStop && held && qEq(qAdd(held.onset, held.duration), pitch.onset)) {
      held.duration = qAdd(held.duration, pitch.duration);
      held.tieSustained = true;
      if (!pitch.tieStart) open.delete(key);
      continue;
    }
    const event: BhlTimelineEvent = {
      partId: pitch.partId,
      partName: pitch.partName,
      voice: pitch.voice,
      bar: pitch.bar,
      printedBar: pitch.printedBar,
      beats: pitch.beats,
      beatType: pitch.beatType,
      divisions: pitch.divisions,
      onset: pitch.onset,
      duration: pitch.duration,
      onsetInBar: pitch.onsetInBar,
      rest: false,
      midi: pitch.midi,
      attack: true,
      tieSustained: false,
    };
    events.push(event);
    if (pitch.tieStart) open.set(key, event);
    else open.delete(key);
  }
  return events;
}

function topAt(events: readonly BhlTimelineEvent[], key: string, onset: Rational): number | null {
  const sounding = events.filter(
    (event) =>
      voiceKey(event) === key &&
      event.midi !== null &&
      qCmp(event.onset, onset) <= 0 &&
      qCmp(onset, qAdd(event.onset, event.duration)) < 0,
  );
  if (!sounding.length) return null;
  return Math.max(...sounding.map((event) => event.midi!));
}

function covered(events: readonly BhlTimelineEvent[], key: string, start: Rational, end: Rational): boolean {
  let cursor = start;
  const segs = events
    .filter(
      (event) =>
        voiceKey(event) === key &&
        event.midi !== null &&
        qCmp(qAdd(event.onset, event.duration), start) > 0 &&
        qCmp(event.onset, end) < 0,
    )
    .sort((a, b) => qCmp(a.onset, b.onset));
  for (const seg of segs) {
    if (qCmp(seg.onset, cursor) > 0) return false;
    const stop = qAdd(seg.onset, seg.duration);
    if (qCmp(stop, cursor) > 0) cursor = stop;
    if (qCmp(cursor, end) >= 0) return true;
  }
  return qCmp(cursor, end) >= 0;
}

function fillUnwrittenGaps(
  events: readonly BhlTimelineEvent[],
  metres: BhlEvidenceReport['barMetres'],
  silences: BhlSilenceObservation[],
): void {
  const keys = [...new Set(events.map(voiceKey))];
  for (const key of keys) {
    for (const metre of metres) {
      const inBar = events
        .filter((event) => voiceKey(event) === key && event.bar === metre.bar)
        .sort((a, b) => qCmp(a.onsetInBar, b.onsetInBar));
      if (!inBar.length) continue;
      let cursor = q(0);
      for (const seg of inBar) {
        if (qCmp(seg.onsetInBar, cursor) > 0) {
          silences.push({
            bar: metre.bar,
            voice: key,
            kind: 'inner-bar',
            onsetInBar: cursor,
            duration: qSub(seg.onsetInBar, cursor),
          });
        }
        const end = qAdd(seg.onsetInBar, seg.duration);
        if (qCmp(end, cursor) > 0) cursor = end;
      }
      if (qCmp(cursor, metre.quarters) < 0) {
        const duration = qSub(metre.quarters, cursor);
        silences.push({
          bar: metre.bar,
          voice: key,
          kind: qEq(cursor, q(0)) ? 'whole-bar' : 'inner-bar',
          onsetInBar: cursor,
          duration,
        });
      }
    }
  }
}

function analyseMotifs(events: readonly BhlTimelineEvent[]): BhlMotifFinding[] {
  const keys = [...new Set(events.filter((event) => event.attack && event.midi !== null).map(voiceKey))];
  return keys.map((key) => {
    const attacks = events.filter((event) => voiceKey(event) === key && event.attack && event.midi !== null);
    const byOnset = new Map<string, BhlTimelineEvent[]>();
    for (const attack of attacks) {
      const id = `${attack.bar}|${formatRational(attack.onset)}`;
      const list = byOnset.get(id) ?? [];
      list.push(attack);
      byOnset.set(id, list);
    }
    const line = [...byOnset.values()].map((group) => {
      const top = group.reduce((best, event) => (event.midi! > best.midi! ? event : best));
      return top;
    });
    const cell = line.slice(0, 4);
    const intervals = cell.slice(1).map((event, index) => event.midi! - cell[index]!.midi!);
    const durations = cell.map((event) => event.duration);
    const matches: BhlMotifMatch[] = [];
    if (intervals.length >= 2) {
      for (let start = 1; start <= line.length - intervals.length; start++) {
        const window = line.slice(start, start + cell.length);
        const heard = window.slice(1).map((event, index) => event.midi! - window[index]!.midi!);
        const durs = window.map((event) => event.duration);
        const sameIntervals = heard.length === intervals.length && heard.every((interval, index) => interval === intervals[index]);
        if (!sameIntervals) {
          if (intervals.length > 2) {
            for (let len = 2; len < intervals.length; len++) {
              const frag = heard.slice(0, len);
              if (frag.every((interval, index) => interval === intervals[index])) {
                matches.push({
                  kind: 'fragmentation',
                  bar: window[0]!.bar,
                  onsetInBar: window[0]!.onsetInBar,
                  intervals: frag,
                  detail: `first ${len} motif intervals return`,
                });
                break;
              }
            }
          }
          continue;
        }
        const exact = window.every((event, index) => event.midi === cell[index]!.midi);
        const sameRhythm = durs.every((dur, index) => qEq(dur, durations[index]!));
        const doubled = durs.every((dur, index) => qEq(dur, q(durations[index]!.n * 2, durations[index]!.d)));
        const halved = durations.every((dur, index) => qEq(dur, q(durs[index]!.n * 2, durs[index]!.d)));
        const displaced =
          sameRhythm &&
          (window[0]!.bar !== cell[0]!.bar || !qEq(window[0]!.onsetInBar, cell[0]!.onsetInBar));
        let kind: BhlMotifMatch['kind'] = 'transposition';
        if (exact && sameRhythm) kind = 'exact';
        else if (doubled) kind = 'augmentation';
        else if (halved) kind = 'diminution';
        else if (displaced) kind = 'rhythmic-displacement';
        const earlierMismatch = line.slice(1, start).length >= cell.length;
        matches.push({
          kind: earlierMismatch && (kind === 'exact' || kind === 'transposition') ? 'return' : kind,
          bar: window[0]!.bar,
          onsetInBar: window[0]!.onsetInBar,
          intervals: heard,
          detail: exact ? 'same pitches' : `intervals ${heard.join(', ')} from ${pitchName(window[0]!.midi!)}`,
        });
      }
    }
    const reliable = matches.some((match) => match.kind !== 'fragmentation' || match.intervals.length >= 2);
    return {
      voice: key,
      openingBar: cell[0]?.bar ?? 0,
      openingOnset: cell[0]?.onsetInBar ?? q(0),
      midis: cell.map((event) => event.midi!),
      intervals,
      durations,
      matches,
      recurrence: reliable ? 'observed' : 'indeterminate',
    };
  });
}

export function readBhlEvidence(xml: string, span?: BhlSpan): BhlEvidenceReport {
  const doc = parseScoreDocument(xml);
  const names = partNames(doc);
  const range = span ?? { from: 1, to: 9999 };
  const events: BhlTimelineEvent[] = [];
  const warnings: string[] = [];
  const barMetres: BhlEvidenceReport['barMetres'] = [];
  for (const part of partElements(doc)) {
    const partId = part.getAttribute('id') ?? '';
    const walked = walkPart(part, partId, names.get(partId) ?? partId, range);
    warnings.push(...walked.warnings);
    if (!barMetres.length) barMetres.push(...walked.metres);
    events.push(...mergeTies(walked.pitches));
  }
  events.sort((a, b) => qCmp(a.onset, b.onset) || a.partId.localeCompare(b.partId) || a.voice.localeCompare(b.voice));

  const keys = [...new Set(events.map(voiceKey))];
  const motions: BhlMotionObservation[] = [];
  const entries: BhlEntryObservation[] = [];
  const crossings: BhlCrossingObservation[] = [];
  const intervals: BhlIntervalObservation[] = [];

  const attacks = events.filter((event) => event.attack && event.midi !== null);
  const attackTimes = new Map<string, BhlTimelineEvent[]>();
  for (const attack of attacks) {
    const id = formatRational(attack.onset);
    const list = attackTimes.get(id) ?? [];
    list.push(attack);
    attackTimes.set(id, list);
  }

  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i]!;
      const b = keys[j]!;
      const times = [...attackTimes.entries()]
        .filter(([, group]) => group.some((event) => voiceKey(event) === a || voiceKey(event) === b))
        .map(([id]) => id);
      const sorted = [...attackTimes.keys()].sort((left, right) => qCmp(parseRational(left), parseRational(right)));
      void times;
      let prevA: number | null = null;
      let prevB: number | null = null;
      let prevOnset: Rational | null = null;
      for (const id of sorted) {
        const onset = parseRational(id);
        const here = attackTimes.get(id) ?? [];
        const pitchA = topAt(events, a, onset);
        const pitchB = topAt(events, b, onset);
        const aAttacks = here.some((event) => voiceKey(event) === a);
        const bAttacks = here.some((event) => voiceKey(event) === b);
        const sample = here.find((event) => voiceKey(event) === a || voiceKey(event) === b);
        if (pitchA !== null && pitchB !== null && prevA !== null && prevB !== null && prevOnset && sample) {
          const bothHeld =
            covered(events, a, prevOnset, onset) && covered(events, b, prevOnset, onset);
          if (bothHeld) {
            const da = pitchA - prevA;
            const db = pitchB - prevB;
            const kind: BhlMotionKind | null = motionKind(da, db);
            if (kind) {
              motions.push({
                bar: sample.bar,
                onsetInBar: sample.onsetInBar,
                voiceA: a,
                voiceB: b,
                kind,
                pitchA,
                pitchB,
                previousA: prevA,
                previousB: prevB,
              });
            }
            if ((prevA - prevB) * (pitchA - pitchB) < 0) {
              crossings.push({
                bar: sample.bar,
                onsetInBar: sample.onsetInBar,
                voiceA: a,
                voiceB: b,
                pitchA,
                pitchB,
              });
            }
          }
        }
        if (aAttacks && pitchA !== null && sample) {
          classifyEntry(entries, events, sample, a, b, pitchA, pitchB, bAttacks);
        }
        if (bAttacks && pitchB !== null && sample) {
          classifyEntry(entries, events, sample, b, a, pitchB, pitchA, aAttacks);
        }
        if (pitchA !== null && pitchB !== null) {
          for (const left of soundingPitches(events, a, onset)) {
            for (const right of soundingPitches(events, b, onset)) {
              const semitones = Math.abs(left.midi! - right.midi!);
              const leftNew = left.attack && qEq(left.onset, onset);
              const rightNew = right.attack && qEq(right.onset, onset);
              intervals.push({
                bar: left.bar,
                onsetInBar: onsetInBarOf(events, onset, left.bar),
                voiceA: a,
                voiceB: b,
                midiA: left.midi!,
                midiB: right.midi!,
                semitones,
                interval: intervalName(semitones),
                chordal: false,
                newlyAttacked: leftNew || rightNew,
                sustained: !leftNew || !rightNew,
                prepared: wasSoundingBefore(events, a, left.midi!, onset) || wasSoundingBefore(events, b, right.midi!, onset),
                nextSemitones: null,
              });
            }
          }
          prevA = pitchA;
          prevB = pitchB;
          prevOnset = onset;
        }
      }
    }
  }

  const chordGroups = new Map<string, BhlTimelineEvent[]>();
  for (const event of attacks) {
    const id = `${voiceKey(event)}|${formatRational(event.onset)}`;
    const list = chordGroups.get(id) ?? [];
    list.push(event);
    chordGroups.set(id, list);
  }
  for (const group of chordGroups.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const left = group[i]!;
        const right = group[j]!;
        const semitones = Math.abs(left.midi! - right.midi!);
        intervals.push({
          bar: left.bar,
          onsetInBar: left.onsetInBar,
          voiceA: voiceKey(left),
          voiceB: voiceKey(right),
          midiA: left.midi!,
          midiB: right.midi!,
          semitones,
          interval: intervalName(semitones),
          chordal: true,
          newlyAttacked: true,
          sustained: false,
          prepared: false,
          nextSemitones: null,
        });
      }
    }
  }

  fillNextIntervals(intervals);

  const silences: BhlSilenceObservation[] = [];
  for (const event of events) {
    if (!event.rest) continue;
    const metre = barMetres.find((item) => item.bar === event.bar)?.quarters ?? q(event.beats * 4, event.beatType);
    const kind = qCmp(event.duration, metre) >= 0 ? 'whole-bar' : 'inner-bar';
    silences.push({ bar: event.bar, voice: voiceKey(event), kind, onsetInBar: event.onsetInBar, duration: event.duration });
  }
  for (const key of keys) {
    for (const metre of barMetres) {
      const sounding = events.some((event) => voiceKey(event) === key && event.bar === metre.bar && event.midi !== null);
      const rests = events.filter((event) => voiceKey(event) === key && event.bar === metre.bar && event.rest);
      if (!sounding && rests.length === 0 && events.some((event) => voiceKey(event) === key)) {
        silences.push({ bar: metre.bar, voice: key, kind: 'whole-bar', onsetInBar: q(0), duration: metre.quarters });
      }
    }
  }
  fillUnwrittenGaps(events, barMetres, silences);

  const motifs = analyseMotifs(events);
  const motifPcs = new Set(motifs.flatMap((motif) => motif.midis.map((midi) => ((midi % 12) + 12) % 12)));
  const tensions: BhlTensionObservation[] = [];
  const seenTension = new Set<string>();
  for (const interval of intervals) {
    if (interval.chordal) continue;
    const ic = interval.semitones % 12;
    if (!NOTABLE.has(ic)) continue;
    const id = `${interval.bar}|${formatRational(interval.onsetInBar)}|${interval.voiceA}|${interval.voiceB}|${interval.midiA}|${interval.midiB}`;
    if (seenTension.has(id)) continue;
    seenTension.add(id);
    const question = `Bar ${interval.bar} at ${formatRational(interval.onsetInBar)} quarters: ${pitchName(interval.midiA)} and ${pitchName(interval.midiB)} sound a ${interval.interval}. What purpose does this dissonance serve?`;
    tensions.push({
      bar: interval.bar,
      onsetInBar: interval.onsetInBar,
      pitches: `${pitchName(interval.midiA)} / ${pitchName(interval.midiB)}`,
      interval: interval.interval,
      voices: `${interval.voiceA} and ${interval.voiceB}`,
      sustained: interval.sustained,
      prepared: interval.prepared,
      nextInterval: interval.nextSemitones === null ? null : intervalName(interval.nextSemitones),
      inOpeningMotif:
        motifPcs.has(((interval.midiA % 12) + 12) % 12) || motifPcs.has(((interval.midiB % 12) + 12) % 12),
      question,
    });
  }

  const density: BhlDensityBar[] = [];
  for (const key of keys) {
    const sample = events.find((event) => voiceKey(event) === key);
    if (!sample) continue;
    for (const metre of barMetres) {
      const inBar = events.filter((event) => voiceKey(event) === key && event.bar === metre.bar);
      const sounding = soundingCoverage(inBar);
      const rest = sumDurations(inBar.filter((event) => event.rest));
      density.push({
        bar: metre.bar,
        partId: sample.partId,
        partName: sample.partName,
        voice: sample.voice,
        attacks: attackCount(inBar),
        sounding,
        rest,
        metre: metre.quarters,
        wholeBarSilence: inBar.length > 0 && inBar.every((event) => event.rest),
      });
    }
  }

  const activity = activityOf(events, barMetres);
  const questions = [
    ...tensions.map((item) => item.question),
    ...motifs
      .filter((motif) => motif.recurrence === 'indeterminate' && motif.intervals.length >= 2)
      .map((motif) => `${motif.voice}: motif recurrence is indeterminate. Is the later material related, or is that not the intention?`),
    'Playability at tempo is a composer question. This reader does not decide it.',
  ];

  return {
    span: { from: barMetres[0]?.bar ?? range.from, to: barMetres.at(-1)?.bar ?? range.to },
    awaitingComposerVerification: true,
    musicalQualityScore: null,
    events,
    motions,
    intervals,
    entries,
    crossings,
    silences,
    motifs,
    tensions,
    density,
    activity,
    questions,
    reconstructionWarnings: warnings,
    barMetres,
  };
}

function parseRational(text: string): Rational {
  const [n, d] = text.split('/');
  return q(Number(n), d ? Number(d) : 1);
}

function onsetInBarOf(events: readonly BhlTimelineEvent[], onset: Rational, bar: number): Rational {
  return events.find((event) => event.bar === bar && qEq(event.onset, onset))?.onsetInBar ?? q(0);
}

function soundingPitches(events: readonly BhlTimelineEvent[], key: string, onset: Rational): BhlTimelineEvent[] {
  return events.filter(
    (event) =>
      voiceKey(event) === key &&
      event.midi !== null &&
      qCmp(event.onset, onset) <= 0 &&
      qCmp(onset, qAdd(event.onset, event.duration)) < 0,
  );
}

function wasSoundingBefore(events: readonly BhlTimelineEvent[], key: string, midi: number, onset: Rational): boolean {
  return events.some(
    (event) =>
      voiceKey(event) === key &&
      event.midi === midi &&
      qCmp(event.onset, onset) < 0 &&
      qCmp(onset, qAdd(event.onset, event.duration)) <= 0,
  );
}

function classifyEntry(
  entries: BhlEntryObservation[],
  events: readonly BhlTimelineEvent[],
  sample: BhlTimelineEvent,
  entering: string,
  other: string,
  enteringMidi: number,
  otherMidi: number | null,
  otherAttacks: boolean,
): void {
  const onset = sample.onset;
  if (otherAttacks && otherMidi !== null) {
    if (entering > other) return;
    entries.push({
      bar: sample.bar,
      onsetInBar: sample.onsetInBar,
      entering,
      other,
      kind: 'shared-attack',
      enteringMidi,
      otherMidi,
    });
    return;
  }
  if (otherMidi !== null) {
    entries.push({
      bar: sample.bar,
      onsetInBar: sample.onsetInBar,
      entering,
      other,
      kind: 'against-sustain',
      enteringMidi,
      otherMidi,
    });
    return;
  }
  const otherResting = events.some(
    (event) =>
      voiceKey(event) === other &&
      event.rest &&
      qCmp(event.onset, onset) <= 0 &&
      qCmp(onset, qAdd(event.onset, event.duration)) < 0,
  );
  if (!otherResting) return;
  const enteringRole = roleOf(sample.partName);
  const otherEvent = events.find((event) => voiceKey(event) === other);
  const otherRole = otherEvent ? roleOf(otherEvent.partName) : 'other';
  const handoff =
    (enteringRole === 'guitar' && otherRole === 'bass') || (enteringRole === 'bass' && otherRole === 'guitar');
  entries.push({
    bar: sample.bar,
    onsetInBar: sample.onsetInBar,
    entering,
    other,
    kind: handoff ? 'handoff' : 'during-rest',
    enteringMidi,
    otherMidi: null,
  });
}

function fillNextIntervals(intervals: BhlIntervalObservation[]): void {
  const groups = new Map<string, BhlIntervalObservation[]>();
  for (const interval of intervals) {
    if (interval.chordal) continue;
    const key = `${interval.voiceA}|${interval.voiceB}`;
    const list = groups.get(key) ?? [];
    list.push(interval);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    for (let index = 0; index < list.length - 1; index++) {
      const next = list[index + 1]!;
      if (next.bar === list[index]!.bar || next.bar === list[index]!.bar + 1) list[index]!.nextSemitones = next.semitones;
    }
  }
}

function sumDurations(events: readonly BhlTimelineEvent[]): Rational {
  return events.reduce((sum, event) => qAdd(sum, event.duration), q(0));
}

/** Union of sounding time. Chord tones that share an onset are one span, not stacked duration. */
function soundingCoverage(events: readonly BhlTimelineEvent[]): Rational {
  const segs = events
    .filter((event) => event.midi !== null)
    .slice()
    .sort((a, b) => qCmp(a.onsetInBar, b.onsetInBar));
  let total = q(0);
  let end: Rational | null = null;
  let start: Rational | null = null;
  for (const seg of segs) {
    const stop = qAdd(seg.onsetInBar, seg.duration);
    if (start === null || end === null || qCmp(seg.onsetInBar, end) > 0) {
      if (start !== null && end !== null) total = qAdd(total, qSub(end, start));
      start = seg.onsetInBar;
      end = stop;
    } else if (qCmp(stop, end) > 0) end = stop;
  }
  if (start !== null && end !== null) total = qAdd(total, qSub(end, start));
  return total;
}

function attackCount(events: readonly BhlTimelineEvent[]): number {
  const onsets = new Set(events.filter((event) => event.attack).map((event) => formatRational(event.onset)));
  return onsets.size;
}

function activityOf(events: readonly BhlTimelineEvent[], metres: BhlEvidenceReport['barMetres']): BhlActivityRelation[] {
  const guitars = new Set(events.filter((event) => roleOf(event.partName) === 'guitar').map(voiceKey));
  const basses = new Set(events.filter((event) => roleOf(event.partName) === 'bass').map(voiceKey));
  if (!guitars.size || !basses.size) return [];
  return metres.map((metre) => {
    const guitarRests = events.filter((event) => event.bar === metre.bar && event.rest && guitars.has(voiceKey(event)));
    const bassRests = events.filter((event) => event.bar === metre.bar && event.rest && basses.has(voiceKey(event)));
    const overlaps = (rests: BhlTimelineEvent[], soundingKeys: Set<string>) =>
      rests.some((rest) =>
        [...soundingKeys].some((key) =>
          events.some(
            (event) =>
              voiceKey(event) === key &&
              event.midi !== null &&
              event.bar === metre.bar &&
              qCmp(event.onset, qAdd(rest.onset, rest.duration)) < 0 &&
              qCmp(rest.onset, qAdd(event.onset, event.duration)) < 0,
          ),
        ),
      );
    const guitarDuringBassRest = overlaps(bassRests, guitars);
    const bassDuringGuitarRest = overlaps(guitarRests, basses);
    const simultaneous = events.some((guitar) => {
      if (guitar.bar !== metre.bar || guitar.midi === null || !guitars.has(voiceKey(guitar))) return false;
      return events.some(
        (bass) =>
          bass.bar === metre.bar &&
          bass.midi !== null &&
          basses.has(voiceKey(bass)) &&
          qCmp(guitar.onset, qAdd(bass.onset, bass.duration)) < 0 &&
          qCmp(bass.onset, qAdd(guitar.onset, guitar.duration)) < 0,
      );
    });
    return {
      bar: metre.bar,
      guitarSoundingDuringBassRest: guitarDuringBassRest,
      bassSoundingDuringGuitarRest: bassDuringGuitarRest,
      simultaneous,
      alternating: (guitarDuringBassRest || bassDuringGuitarRest) && !simultaneous,
    };
  });
}

export function compareBhlEvidence(original: BhlEvidenceReport, candidate: BhlEvidenceReport): BhlEvidenceComparison {
  const count = (report: BhlEvidenceReport, kind: BhlMotionKind) => report.motions.filter((item) => item.kind === kind).length;
  const kinds: BhlMotionKind[] = ['contrary', 'oblique', 'parallel', 'similar'];
  const motion = Object.fromEntries(
    kinds.map((kind) => [kind, { original: count(original, kind), candidate: count(candidate, kind) }]),
  ) as BhlEvidenceComparison['motion'];
  const notes = [
    `Attacks ${original.events.filter((event) => event.attack).length} in the original passage, ${candidate.events.filter((event) => event.attack).length} in the candidate.`,
    `Whole-bar silences ${original.silences.filter((item) => item.kind === 'whole-bar').length} original, ${candidate.silences.filter((item) => item.kind === 'whole-bar').length} candidate.`,
    `Notable dissonances ${original.tensions.length} original, ${candidate.tensions.length} candidate.`,
    'These are differences, not a ranking.',
  ];
  return {
    provisional: true,
    notice: 'Generated-candidate analysis is provisional until the composer reviews the original-score evidence.',
    originalAttacks: original.events.filter((event) => event.attack).length,
    candidateAttacks: candidate.events.filter((event) => event.attack).length,
    originalWholeBarSilences: original.silences.filter((item) => item.kind === 'whole-bar').length,
    candidateWholeBarSilences: candidate.silences.filter((item) => item.kind === 'whole-bar').length,
    motion,
    dissonances: { original: original.tensions.length, candidate: candidate.tensions.length },
    notes,
  };
}

function where(bar: number, onset: Rational): string {
  return `bar ${bar} at ${formatRational(onset)} quarters`;
}

export function formatBhlEvidenceReport(title: string, source: string, report: BhlEvidenceReport): string {
  const lines: string[] = [
    `# ${title}`,
    '',
    '**AWAITING COMPOSER VERIFICATION**',
    '',
    'This report describes musical events. It does not decide whether the music is good. There is no musical-quality score.',
    '',
    `Source: ${source}`,
    `Bars ${report.span.from}–${report.span.to}.`,
    '',
    '## Timing',
    ...report.barMetres.map(
      (metre) =>
        `- Bar ${metre.bar}: ${metre.beats}/${metre.beatType}, ${formatRational(metre.quarters)} quarters, cursor ${formatRational(metre.maxCursor)} quarters.`,
    ),
    '',
    '## Voices',
  ];
  const keys = [...new Set(report.events.map(voiceKey))];
  for (const key of keys) {
    const sample = report.events.find((event) => voiceKey(event) === key)!;
    lines.push(`### ${sample.partName} voice ${sample.voice} (${key})`);
    for (const event of report.events.filter((item) => voiceKey(item) === key)) {
      if (event.rest) {
        lines.push(`- ${where(event.bar, event.onsetInBar)}: rest ${formatRational(event.duration)} quarters.`);
      } else {
        const tie = event.tieSustained ? ' Tied sustain, not a new attack.' : '';
        lines.push(
          `- ${where(event.bar, event.onsetInBar)}: ${pitchName(event.midi!)} for ${formatRational(event.duration)} quarters.${tie}`,
        );
      }
    }
  }
  lines.push('', '## Voice relationships');
  if (!report.motions.length) lines.push('- No continuous contrary, oblique, parallel, or similar motion in this span.');
  for (const motion of report.motions) {
    lines.push(
      `- ${motion.kind} at ${where(motion.bar, motion.onsetInBar)}: ${motion.voiceA} ${pitchName(motion.previousA)}→${pitchName(motion.pitchA)}, ${motion.voiceB} ${pitchName(motion.previousB)}→${pitchName(motion.pitchB)}.`,
    );
  }
  const kinds = ['shared-attack', 'against-sustain', 'during-rest', 'handoff'] as const;
  for (const kind of kinds) {
    const rows = report.entries.filter((entry) => entry.kind === kind);
    if (!rows.length) continue;
    lines.push(`- ${kind}: ${rows.map((entry) => `${where(entry.bar, entry.onsetInBar)} ${entry.entering}`).join('; ')}.`);
  }
  if (report.crossings.length) {
    lines.push(
      `- Register crossings: ${report.crossings.map((item) => where(item.bar, item.onsetInBar)).join('; ')}.`,
    );
  }
  lines.push('', '## Silence');
  for (const silence of report.silences) {
    lines.push(`- ${silence.kind} ${silence.voice} ${where(silence.bar, silence.onsetInBar)} for ${formatRational(silence.duration)} quarters.`);
  }
  lines.push('', '## Density');
  for (const bar of report.density) {
    lines.push(
      `- Bar ${bar.bar} ${bar.partName} voice ${bar.voice}: ${bar.attacks} attacks, sounding ${formatRational(bar.sounding)} / ${formatRational(bar.metre)} quarters.`,
    );
  }
  for (const row of report.activity) {
    lines.push(
      `- Bar ${row.bar}: simultaneous ${row.simultaneous ? 'yes' : 'no'}, alternating ${row.alternating ? 'yes' : 'no'}, bass during guitar rest ${row.bassSoundingDuringGuitarRest ? 'yes' : 'no'}.`,
    );
  }
  lines.push('', '## Motif');
  for (const motif of report.motifs) {
    lines.push(
      `- ${motif.voice} opening ${motif.midis.map(pitchName).join(' ')} intervals ${motif.intervals.join(', ') || 'none'}. Recurrence ${motif.recurrence}.`,
    );
    for (const match of motif.matches) {
      lines.push(`  - ${match.kind} at ${where(match.bar, match.onsetInBar)}: ${match.detail}.`);
    }
  }
  lines.push('', '## Harmonic tension');
  lines.push('A dissonance is described. It is not scored, and it does not require a consonant resolution.');
  if (!report.tensions.length) lines.push('- No notable dissonance between voices in this span.');
  for (const tension of report.tensions) {
    lines.push(
      `- ${where(tension.bar, tension.onsetInBar)}: ${tension.pitches} (${tension.interval}), ${tension.voices}. ${tension.sustained ? 'Sustained or held against a new attack.' : 'Newly attacked.'} Prepared: ${tension.prepared ? 'yes' : 'no'}. Next interval: ${tension.nextInterval ?? 'not followed inside the span'}. Motif pitch class present: ${tension.inOpeningMotif ? 'yes' : 'no'}.`,
    );
  }
  lines.push('', '## Questions for the composer');
  for (const question of report.questions) lines.push(`- ${question}`);
  if (report.reconstructionWarnings.length) {
    lines.push('', '## Reconstruction warnings');
    for (const warning of report.reconstructionWarnings) lines.push(`- ${warning}`);
  }
  lines.push('', 'AWAITING COMPOSER VERIFICATION');
  return lines.join('\n');
}
