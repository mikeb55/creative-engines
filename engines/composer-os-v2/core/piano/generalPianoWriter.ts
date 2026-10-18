/**
 * General Piano Composition V1.
 * Opt-in two-hand writer. The 8-bar fixture and Coffee Run do not call this module.
 * Pitch, onset, duration, rests, ties, staff and motif identity are written here.
 */

import { buildChordSymbolPlanFromBars, buildHarmonyPlanFromBars } from '../harmony/chordProgressionParser';
import { noteNameToPitchClass } from '../harmony/chordSymbolAnalysis';
import { resolveFormPrecedence } from '../form/resolveFormPrecedence';
import { planSectionRoles } from '../section-roles/sectionRolePlanner';
import { getDensityForBar, planDensityCurve } from '../density/densityCurvePlanner';
import { applyOperator } from '../motif-ops/operators';
import { buildChain } from '../motif-ops/developmentChain';
import type { Motif, MotifNoteEvent } from '../motif-ops/types';
import { mulberry32, randInt } from '../riff-generator/riffRandom';
import { getInstrument } from '../instruments/instrumentCatalogue';
import type { ExactQuarter, NoteEvent, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';
import { comparePianoScoreToXml } from './pianoXmlOracle';
import {
  pianoGrandStaffConfig,
  GENERAL_PIANO_BAR_COUNTS,
  GENERAL_PIANO_TEMPO_MAX,
  GENERAL_PIANO_TEMPO_MIN,
  type GeneralPianoBarCount,
  type GeneralPianoCentre,
  type PianoLockedEvent,
} from './pianoTypes';
import {
  validateLhDevelopment,
  validateLockedEventPlayable,
  validateLockedEventsPresent,
  validatePianoIndependence,
  validatePianoPlayability,
  validatePianoTies,
} from './pianoValidation';
import type { PianoComposeResult, PianoCompositionPlan, PianoLhTexture, PianoLockSnapshot } from './pianoWriter';
import { dyadicQuarter, q, qAdd, qCmp, qEq, qToNumber } from './pianoExactTiming';
import {
  barMeterMapFromPlan,
  buildPianoTimeline,
  findTimelineBar,
  isGroupBoundary,
  timelineTotals,
  validatePianoMeterPlan,
  type PianoMeterBarPlan,
  type PianoTimelineBar,
} from './pianoMeterPlan';
import {
  fragmentEventsToSpan,
  fragmentSlotsToSpan,
  realiseStageA,
  releaseUnjoinedTies,
  type PianoFragmentRecord,
  type PianoRhythmicWindow,
} from './pianoV11Realise';
import {
  applyParentMemberSpellings,
  bar12TripletWindow,
  decoratePolychordWindow,
  regionAt,
  validatePolychordRegions,
  voicePolychordPair,
  voiceTriad,
  type PianoPolychordRegion,
  type VoicedPolychord,
  type VoicedTriad,
} from './pianoV11Polychord';
import { finalRealisedDiagnostics } from './pianoV11Diagnostics';
import {
  choosePhraseSpan,
  eventsForPhraseBar,
  phraseIntentAt,
  phraseSpanIndex,
  rhythmSignature,
  type PhraseSpanChoice,
} from './pianoV11Phrase';

const C_SCALE = [0, 2, 4, 5, 7, 9, 11] as const;
const A_SCALE = [9, 11, 0, 2, 4, 5, 7] as const;
const FIELD = [0, 2, 4, 5, 7, 9, 11] as const;
const RH_LOW = 64;
const RH_HIGH = 81;
const LH_LOW = 43;
const LH_HIGH = 54;
const RHYTHMS: readonly (readonly number[])[] = [
  [1, 1, 1, 1],
  [1, 0.5, 0.5, 2],
  [0.5, 0.5, 1, 2],
  [1.5, 0.5, 1, 1],
];

const QUALITY: Record<string, readonly number[]> = {
  '': [0, 4, 7],
  maj: [0, 4, 7],
  m: [0, 3, 7],
  min: [0, 3, 7],
  m7: [0, 3, 7, 10],
  min7: [0, 3, 7, 10],
  m9: [0, 2, 3, 7, 10],
  maj7: [0, 4, 7, 11],
  maj9: [0, 2, 4, 7, 11],
  '7': [0, 4, 7, 10],
  '9': [0, 2, 4, 7, 10],
  '6': [0, 4, 7, 9],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  '6sus2': [0, 2, 7, 9],
  add9: [0, 2, 4, 7],
  '(add9)': [0, 2, 4, 7],
  'm(add9)': [0, 2, 3, 7],
  'maj7(#11)': [0, 4, 6, 7, 11],
  'maj7(add9)': [0, 2, 4, 7, 11],
  m7b5: [0, 3, 6, 10],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  '7sus4': [0, 5, 7, 10],
};

export interface ParsedPianoChord {
  display: string;
  rootPc: number;
  bassPc: number;
  tones: number[];
}

interface Slot {
  start: number;
  duration: number;
  pitch: number;
  pitches?: number[];
  tie?: 'start' | 'stop' | 'continue';
  motifRef?: string;
  spellings?: { step: string; alter: number }[];
}

type Phase = 'statement' | 'sequence' | 'development' | 'contrast' | 'return' | 'approach' | 'ending';

export interface PianoV11StageAContract {
  enabled: true;
  meterPlan: PianoMeterBarPlan[];
  rhythmicWindows?: PianoRhythmicWindow[];
  /** Fills the 24-bar six-metre cycle with 3:2, 5:4, and one cross-bar tuplet. */
  acceptance?: boolean;
}

export interface GeneralPianoComposeInput {
  seed: number;
  bars: GeneralPianoBarCount;
  tempo: number;
  tonalCentre: GeneralPianoCentre;
  harmony: string[];
  lockedEvents?: PianoLockedEvent[];
  /** Omit, or leave unset, for legacy 4/4 output. */
  timing?: PianoV11StageAContract;
  /** Opt-in. Default off. Requires 24 bars. */
  phraseDevelopmentV11?: boolean;
  /** Structured upper/lower triads. Absent keeps slash-chord and symbol harmony. */
  polychords?: PianoPolychordRegion[];
  /** Adds a 3:2 inside bar 12 when that bar is 9/16. */
  groupedNineSixteenTriplet?: boolean;
}

function roundBeat(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

export function parseGeneralPianoChord(symbol: string): ParsedPianoChord | null {
  const raw = symbol.trim();
  if (!raw || /\s/.test(raw)) return null;
  let body = raw;
  let bassName: string | null = null;
  const slash = raw.lastIndexOf('/');
  if (slash > 0) {
    body = raw.slice(0, slash);
    bassName = raw.slice(slash + 1);
    if (!/^[A-G](?:#|b)?$/i.test(bassName)) return null;
  }
  const match = body.match(/^([A-G](?:#|b)?)(.*)$/i);
  if (!match?.[1] || match[2] == null) return null;
  const rootName = match[1][0]!.toUpperCase() + match[1].slice(1);
  const quality = match[2];
  const intervals = QUALITY[quality];
  if (!intervals) return null;
  const rootPc = noteNameToPitchClass(rootName);
  const bassPc = bassName
    ? noteNameToPitchClass(bassName[0]!.toUpperCase() + bassName.slice(1))
    : rootPc;
  if (rootPc === undefined || bassPc === undefined) return null;
  const tones = [...new Set([...intervals.map((interval) => mod12(rootPc + interval)), bassPc])];
  return { display: raw, rootPc, bassPc, tones };
}

function midiInWindow(pc: number, anchor: number, low: number, high: number): number {
  let best = low;
  let bestDist = Infinity;
  const target = mod12(pc);
  for (let midi = low; midi <= high; midi += 1) {
    if (mod12(midi) !== target) continue;
    const dist = Math.abs(midi - anchor);
    if (dist < bestDist) {
      best = midi;
      bestDist = dist;
    }
  }
  return best;
}

function closestPc(midi: number, pcs: readonly number[]): number {
  const pc = mod12(midi);
  let best = pcs[0] ?? 0;
  let bestDist = 99;
  for (const candidate of pcs) {
    let dist = Math.abs(candidate - pc);
    if (dist > 6) dist = 12 - dist;
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best;
}

function closestAllowedMidi(target: number, allowed: readonly number[], low: number, high: number): number {
  let best = low;
  let bestDist = Infinity;
  for (const pc of allowed) {
    const midi = midiInWindow(pc, target, low, high);
    if (midi < low || midi > high) continue;
    const dist = Math.abs(midi - target);
    if (dist < bestDist) {
      best = midi;
      bestDist = dist;
    }
  }
  return best;
}

function repairEvents(
  events: readonly MotifNoteEvent[],
  chordTones: readonly number[],
  low: number,
  high: number,
  anchor: number,
  strongAt?: (onset: number) => boolean,
  strict = false,
  aim = false,
): MotifNoteEvent[] {
  let previous = anchor;
  const target = anchor;
  return events.map((event) => {
    if (event.midi === null) return { ...event };
    const strong = strongAt ? strongAt(event.onset) : Math.abs(event.onset % 2) < 1e-6;
    const allowed = strong || strict ? chordTones : [...new Set([...FIELD, ...chordTones])];
    const pc = allowed.includes(mod12(event.midi)) ? mod12(event.midi) : closestPc(event.midi, allowed);
    const midi = aim
      ? closestAllowedMidi(target, allowed, low, Math.min(high, previous + 12))
      : midiInWindow(pc, previous, low, high);
    previous = midi;
    return { ...event, midi };
  });
}

function fitMotif(
  events: readonly MotifNoteEvent[],
  span: ExactQuarter | null,
  fragments: PianoFragmentRecord[],
  bar: number,
): MotifNoteEvent[] {
  if (!span) return fitToBar(events);
  const fragmented = fragmentEventsToSpan(events, span);
  if (qCmp(fragmented.omitted, q(0, 1)) > 0) {
    fragments.push({ bar, hand: 'RH', motifRef: 'rh', omitted: fragmented.omitted, reason: 'bar-capacity' });
  }
  return fragmented.placed.map((event) => ({
    onset: qToNumber(event.start),
    duration: qToNumber(event.duration),
    midi: event.midi,
  }));
}

function fitToBar(events: readonly MotifNoteEvent[]): MotifNoteEvent[] {
  const out: MotifNoteEvent[] = [];
  let cursor = 0;
  for (const event of events) {
    if (cursor >= 4 - 1e-6) break;
    const duration = roundBeat(Math.min(event.duration, 4 - cursor));
    if (duration <= 1e-6) break;
    out.push({ onset: roundBeat(cursor), duration, midi: event.midi });
    cursor = roundBeat(cursor + duration);
  }
  return out;
}

function shiftRegister(events: readonly MotifNoteEvent[], anchor: number): MotifNoteEvent[] {
  const first = events.find((event) => event.midi !== null);
  if (!first?.midi) return events.map((event) => ({ ...event }));
  let shift = 0;
  if (first.midi - anchor > 7) shift = -12;
  else if (anchor - first.midi > 7) shift = 12;
  const moved = events.map((event) => (
    event.midi === null ? { ...event } : { ...event, midi: event.midi + shift }
  ));
  if (moved.some((event) => event.midi !== null && (event.midi < RH_LOW || event.midi > RH_HIGH))) {
    return events.map((event) => ({ ...event }));
  }
  return moved;
}

function slotsFrom(events: readonly MotifNoteEvent[], motifRef: string): Slot[] {
  return events
    .filter((event): event is MotifNoteEvent & { midi: number } => event.midi !== null)
    .map((event) => ({
      start: event.onset,
      duration: event.duration,
      pitch: event.midi,
      motifRef,
    }));
}

function fillVoice(slots: Slot[], voice: number): ScoreEvent[] {
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  const events: ScoreEvent[] = [];
  let cursor = 0;
  for (const slot of sorted) {
    if (slot.start < cursor - 1e-6) {
      throw new Error(`general piano overlap voice ${voice} at beat ${slot.start}`);
    }
    if (slot.start > cursor + 1e-6) {
      events.push({ kind: 'rest', startBeat: cursor, duration: roundBeat(slot.start - cursor), voice });
    }
    const note: NoteEvent = {
      kind: 'note',
      pitch: slot.pitch,
      startBeat: slot.start,
      duration: slot.duration,
      voice,
      ...(slot.pitches ? { pitches: slot.pitches } : {}),
      ...(slot.spellings ? { spelling: slot.spellings[0], stackSpellings: slot.spellings } : {}),
      ...(slot.motifRef ? { motifRef: slot.motifRef } : {}),
      ...(slot.tie ? { notation: { tie: slot.tie } } : {}),
    };
    events.push(note);
    cursor = roundBeat(slot.start + slot.duration);
  }
  if (cursor < 4 - 1e-6) {
    events.push({ kind: 'rest', startBeat: cursor, duration: roundBeat(4 - cursor), voice } satisfies RestEvent);
  }
  if (cursor > 4 + 1e-6) throw new Error(`general piano voice ${voice} exceeds the bar`);
  return events;
}

function phaseAt(bar: number, bars: number): Phase {
  const map: Record<GeneralPianoBarCount, readonly Phase[]> = {
    8: ['statement', 'sequence', 'development', 'development', 'contrast', 'contrast', 'return', 'ending'],
    16: [
      'statement', 'sequence', 'sequence', 'sequence',
      'contrast', 'contrast', 'contrast', 'contrast',
      'development', 'development', 'development', 'development',
      'return', 'sequence', 'approach', 'ending',
    ],
    24: [
      'statement', 'sequence', 'sequence', 'sequence', 'sequence', 'sequence', 'sequence', 'sequence',
      'contrast', 'contrast', 'contrast', 'contrast', 'contrast', 'contrast', 'contrast', 'contrast',
      'development', 'development', 'development', 'development',
      'return', 'sequence', 'approach', 'ending',
    ],
  };
  return map[bars as GeneralPianoBarCount][bar - 1] ?? 'sequence';
}

function phaseFromIntent(intent: string): Phase {
  if (intent === 'statement') return 'statement';
  if (intent === 'development' || intent === 'climax') return 'development';
  if (intent === 'contrast' || intent === 'dialogue') return 'contrast';
  if (intent === 'preparation') return 'sequence';
  if (intent === 'return') return 'return';
  if (intent === 'ending') return 'ending';
  return 'sequence';
}

function stampPolychord(slots: Slot[], ordered: { midi: number; step: string; alter: number }[]): Slot[] {
  if (ordered.length !== 3) return slots;
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  const duration = sorted.length > 0 && sorted[0]!.start < 1e-6
    ? sorted[0]!.duration
    : Math.min(sorted[0]?.start ?? 1, 1);
  if (duration <= 1e-6) return slots;
  const spellings = ordered.map((item) => ({ step: item.step, alter: item.alter }));
  const stack: Slot = {
    start: 0,
    duration,
    pitch: ordered[0]!.midi,
    pitches: ordered.map((item) => item.midi),
    spellings,
    motifRef: 'polychord',
  };
  const rest = sorted.filter((slot) => slot.start >= duration - 1e-6).map((slot) => {
    const nearest = ordered.reduce((best, item) => (
      Math.abs(item.midi - slot.pitch) < Math.abs(best.midi - slot.pitch) ? item : best
    ));
    return {
      ...slot,
      pitch: nearest.midi,
      spellings: [{ step: nearest.step, alter: nearest.alter }],
    };
  });
  return [stack, ...rest];
}

function returnBarFor(bars: number): number {
  if (bars === 8) return 7;
  if (bars === 16) return 13;
  return 21;
}

function openingMotif(seed: number, centre: GeneralPianoCentre): Motif {
  const scale = centre === 'C' ? C_SCALE : A_SCALE;
  const rng = mulberry32(seed);
  const rhythm = RHYTHMS[randInt(rng, 0, RHYTHMS.length - 1)]!;
  const contour = randInt(rng, 0, 2);
  const degreeStarts = [0, 2, 4];
  let degree = degreeStarts[randInt(rng, 0, degreeStarts.length - 1)]!;
  const events: MotifNoteEvent[] = [];
  let onset = 0;
  let previous = centre === 'C' ? 72 : 69;
  for (let index = 0; index < rhythm.length; index += 1) {
    const pc = scale[((degree % 7) + 7) % 7]!;
    const midi = midiInWindow(pc, previous, RH_LOW, RH_HIGH);
    events.push({ onset, duration: rhythm[index]!, midi });
    const pool = contour === 1 ? [1, 2, 1] : contour === 2 ? [-1, -2, -1] : [1, 2, -1, -2];
    degree += pool[(index + (seed % pool.length) + 7) % pool.length]!;
    previous = midi;
    onset = roundBeat(onset + rhythm[index]!);
  }
  return { id: 'm1', field: FIELD, events };
}

function intervalsOf(events: readonly MotifNoteEvent[]): number[] {
  const pitches = events.filter((event) => event.midi !== null).map((event) => event.midi!);
  const intervals: number[] = [];
  for (let index = 1; index < pitches.length; index += 1) {
    intervals.push(pitches[index]! - pitches[index - 1]!);
  }
  return intervals;
}

function chordPool(chord: ParsedPianoChord, anchor: number): number[] {
  const pool: number[] = [];
  for (const pc of [chord.bassPc, ...chord.tones]) {
    const midi = midiInWindow(pc, anchor, LH_LOW, LH_HIGH);
    if (!pool.includes(midi)) pool.push(midi);
  }
  return pool.length > 0 ? pool : [midiInWindow(chord.rootPc, anchor, LH_LOW, LH_HIGH)];
}

function lhBroken(chord: ParsedPianoChord, bar: number, seed: number): Slot[] {
  const pool = chordPool(chord, 48);
  const slots: Slot[] = [];
  if (bar % 2 === 1) {
    for (let index = 0; index < 8; index += 1) {
      slots.push({
        start: index * 0.5,
        duration: 0.5,
        pitch: pool[(index + bar + (seed % pool.length)) % pool.length]!,
        motifRef: 'lh.broken',
      });
    }
    return slots;
  }
  const pattern = [1, 0.5, 0.5, 1, 1];
  let start = 0;
  pattern.forEach((duration, index) => {
    slots.push({
      start,
      duration,
      pitch: pool[(index + bar) % pool.length]!,
      motifRef: 'lh.broken',
    });
    start = roundBeat(start + duration);
  });
  return slots;
}

function lhResponse(chord: ParsedPianoChord, motifRef: string, events: readonly MotifNoteEvent[]): Slot[] {
  const fitted = fitToBar(events);
  const slots: Slot[] = [];
  let previous = 48;
  for (const event of fitted) {
    if (event.midi === null) continue;
    const start = roundBeat(event.onset + 1);
    if (start >= 4) continue;
    const duration = roundBeat(Math.min(event.duration, 4 - start));
    if (duration <= 1e-6) continue;
    const pc = chord.tones.includes(mod12(event.midi)) ? mod12(event.midi) : closestPc(event.midi, chord.tones);
    const pitch = midiInWindow(pc, previous, LH_LOW, LH_HIGH);
    previous = pitch;
    slots.push({ start, duration, pitch, motifRef });
  }
  if (slots.length === 0) {
    const fallback = midiInWindow(chord.bassPc, 48, LH_LOW, LH_HIGH);
    slots.push({ start: 1, duration: 1, pitch: fallback, motifRef });
    slots.push({
      start: 3,
      duration: 1,
      pitch: midiInWindow(chord.tones[chord.tones.length - 1] ?? chord.rootPc, fallback, LH_LOW, LH_HIGH),
      motifRef,
    });
  }
  return slots;
}

function lhSustain(chord: ParsedPianoChord, motifRef: string): Slot[] {
  return [{ start: 0, duration: 4, pitch: chordPool(chord, 48)[0]!, motifRef }];
}

function lhSparse(chord: ParsedPianoChord): Slot[] {
  const pool = chordPool(chord, 50);
  return [
    { start: 1, duration: 1, pitch: pool[0]!, motifRef: 'lh.sparse' },
    { start: 3, duration: 1, pitch: pool[pool.length - 1]!, motifRef: 'lh.sparse' },
  ];
}

function tiePitches(current: ParsedPianoChord, next: ParsedPianoChord | undefined): number[] | null {
  if (!next) return null;
  const shared = current.tones.filter((pc) => next.tones.includes(pc));
  if (shared.length === 0) return null;
  const low = midiInWindow(shared[0]!, 48, LH_LOW, LH_HIGH);
  const upperPc = shared.find((pc) => pc !== shared[0]);
  if (upperPc === undefined) return [low];
  const upper = midiInWindow(upperPc, low + 5, LH_LOW, LH_HIGH);
  if (upper === low || Math.abs(upper - low) > 12) return [low];
  return [Math.min(low, upper), Math.max(low, upper)];
}

function lhTie(pitches: number[], tie: 'start' | 'stop', motifRef: string, duration: number, start: number): Slot {
  return {
    start,
    duration,
    pitch: pitches[0]!,
    ...(pitches.length > 1 ? { pitches } : {}),
    tie,
    motifRef,
  };
}

function handsShareTriad(score: ScoreModel, bar: number, upper: readonly number[], lower: readonly number[]): boolean {
  const measure = score.parts[0]?.measures.find((item) => item.index === bar);
  if (!measure) return false;
  const notes = measure.events.filter((event): event is NoteEvent => event.kind === 'note');
  const pcs = (event: NoteEvent) => [event.pitch, ...(event.pitches ?? [])].map((pitch) => mod12(pitch));
  const rh = notes.filter((event) => (event.voice ?? 1) === 1);
  const lh = notes.filter((event) => (event.voice ?? 1) === 3);
  for (const right of rh) {
    for (const left of lh) {
      const start = Math.max(right.startBeat, left.startBeat);
      const end = Math.min(right.startBeat + right.duration, left.startBeat + left.duration);
      if (end <= start + 1e-6) continue;
      const activeRh = rh.filter((event) => event.startBeat <= start + 1e-6 && event.startBeat + event.duration > start + 1e-6);
      const activeLh = lh.filter((event) => event.startBeat <= start + 1e-6 && event.startBeat + event.duration > start + 1e-6);
      const gotRh = new Set(activeRh.flatMap(pcs));
      const gotLh = new Set(activeLh.flatMap(pcs));
      if (upper.every((pc) => gotRh.has(pc)) && lower.every((pc) => gotLh.has(pc))) return true;
    }
  }
  return false;
}

function ownedSignature(score: ScoreModel): string {
  return JSON.stringify(score.parts[0]?.measures.map((measure) => measure.events.map((event) => (
    event.kind === 'note'
      ? { k: 'n', p: event.pitch, s: event.startBeat, d: event.duration, v: event.voice, t: event.notation?.tie, m: event.motifRef, x: event.pitches }
      : { k: 'r', s: event.startBeat, d: event.duration, v: event.voice }
  ))));
}

function snapshotOf(plan: PianoCompositionPlan, locks: readonly PianoLockedEvent[]): PianoLockSnapshot {
  return {
    harmonyBars: [...plan.harmonyBars],
    form: structuredClone(plan.form),
    lockedEvents: structuredClone([...locks]),
  };
}

function compiledSections(bars: number): { kind: 'verse' | 'bridge' | 'chorus'; barLength: number }[] {
  if (bars === 8) {
    return [
      { kind: 'verse', barLength: 4 },
      { kind: 'bridge', barLength: 2 },
      { kind: 'chorus', barLength: 2 },
    ];
  }
  if (bars === 16) {
    return [
      { kind: 'verse', barLength: 4 },
      { kind: 'bridge', barLength: 4 },
      { kind: 'chorus', barLength: 4 },
      { kind: 'verse', barLength: 4 },
    ];
  }
  return [
    { kind: 'verse', barLength: 8 },
    { kind: 'bridge', barLength: 8 },
    { kind: 'chorus', barLength: 4 },
    { kind: 'verse', barLength: 4 },
  ];
}

function handPitch(chord: ParsedPianoChord, hand: 'RH' | 'LH', pc: number): number {
  return midiInWindow(pc, hand === 'RH' ? 72 : 48, hand === 'RH' ? RH_LOW : LH_LOW, hand === 'RH' ? RH_HIGH : LH_HIGH);
}

function repeatedPitch(chord: ParsedPianoChord, hand: 'RH' | 'LH', count: number, pc = hand === 'RH' ? chord.rootPc : chord.bassPc): number[] {
  return Array.from({ length: count }, () => handPitch(chord, hand, pc));
}

function decorateOwnedWindow(
  window: PianoRhythmicWindow,
  upper: VoicedTriad,
  lower: VoicedTriad,
  atChange: boolean,
  acceptance: boolean,
): PianoRhythmicWindow {
  if (window.material === 'given-pitches') return window;
  if (window.material === 'parent-stack') return decoratePolychordWindow(window, upper, lower, 'stack');
  if (window.material === 'parent-repeated') return decoratePolychordWindow(window, upper, lower, 'repeated');
  const named = acceptance
    ? window.id === 'rh-3-2' || window.id === 'rh-5-4' || window.id === 'bar12-3-2' || window.id.startsWith('gui-')
    : window.id.startsWith('gui-') || window.id === 'rh-3-2' || window.id === 'rh-5-4';
  return decoratePolychordWindow(window, upper, lower, atChange || named ? 'stack' : 'repeated');
}

function sharedPc(a: ParsedPianoChord, b: ParsedPianoChord): number | null {
  return a.tones.find((pc) => b.tones.includes(pc)) ?? null;
}

function acceptanceWindows(timeline: readonly PianoTimelineBar[], chords: ParsedPianoChord[]): PianoRhythmicWindow[] {
  const startOf = (bar: number, offset: ExactQuarter) => qAdd(timeline[bar - 1]!.start, offset);
  const bar5 = chords[4]!;
  const bar6 = chords[5]!;
  const shared = sharedPc(bar5, bar6);
  if (shared === null) throw new Error('acceptance cross-bar tuplet needs a pitch shared by bars 5 and 6');
  const crossRh = Array.from({ length: 3 }, () => handPitch(bar5, 'RH', shared));
  const crossLh = Array.from({ length: 5 }, () => handPitch(bar5, 'LH', shared));
  return [
    { id: 'rh-3-2', start: startOf(1, q(0, 1)), hand: 'RH', ratio: '3:2', pitches: repeatedPitch(chords[0]!, 'RH', 3), against: 'straight-eighths', againstPitches: repeatedPitch(chords[0]!, 'LH', 2) },
    { id: 'rest-3-2', start: startOf(2, q(0, 1)), hand: 'RH', ratio: '3:2', rests: [false, true, false], pitches: repeatedPitch(chords[1]!, 'RH', 3), against: 'straight-eighths', againstPitches: repeatedPitch(chords[1]!, 'LH', 2) },
    { id: 'rh-5-4', start: startOf(3, q(0, 1)), hand: 'RH', ratio: '5:4', pitches: repeatedPitch(chords[2]!, 'RH', 5), against: 'straight-sixteenths', againstPitches: repeatedPitch(chords[2]!, 'LH', 4) },
    { id: 'both-ratios', start: startOf(7, q(0, 1)), hand: 'RH', ratio: '3:2', pitches: repeatedPitch(chords[6]!, 'RH', 3), against: '5:4', againstPitches: repeatedPitch(chords[6]!, 'LH', 5) },
    { id: 'lh-3-2', start: startOf(8, q(0, 1)), hand: 'LH', ratio: '3:2', pitches: repeatedPitch(chords[7]!, 'LH', 3), against: 'straight-eighths', againstPitches: repeatedPitch(chords[7]!, 'RH', 2) },
    { id: 'cross-3-2', start: startOf(5, q(3, 1)), hand: 'RH', ratio: '3:2', pitches: crossRh },
    { id: 'cross-5-4', start: startOf(5, q(13, 4)), hand: 'LH', ratio: '5:4', pitches: crossLh },
  ];
}

export function composeGeneralPianoV1(input: GeneralPianoComposeInput): PianoComposeResult {
  if (!Number.isInteger(input.seed)) {
    return { ok: false, code: 'bad_request', error: 'General piano V1 needs an integer seed.' };
  }
  if (!GENERAL_PIANO_BAR_COUNTS.includes(input.bars)) {
    return { ok: false, code: 'bad_request', error: 'General piano V1 accepts 8, 16 or 24 bars.' };
  }
  if (!Number.isInteger(input.tempo) || input.tempo < GENERAL_PIANO_TEMPO_MIN || input.tempo > GENERAL_PIANO_TEMPO_MAX) {
    return { ok: false, code: 'bad_request', error: 'General piano V1 tempo must be an integer from 48 to 120.' };
  }
  if (input.tonalCentre !== 'C' && input.tonalCentre !== 'Am') {
    return { ok: false, code: 'bad_request', error: 'General piano V1 tonal centre must be C or Am.' };
  }
  if (input.phraseDevelopmentV11 === true && input.bars !== 24) {
    return { ok: false, code: 'bad_request', error: 'Phrase development V1.1 needs the 24-bar form.' };
  }
  if (input.polychords) {
    const regionError = validatePolychordRegions(input.polychords, input.bars);
    if (regionError) return { ok: false, code: 'bad_request', error: regionError };
  }
  if (!Array.isArray(input.harmony) || input.harmony.length !== input.bars) {
    return { ok: false, code: 'bad_request', error: 'General piano V1 needs one chord symbol for every bar.' };
  }
  const chords: ParsedPianoChord[] = [];
  for (const symbol of input.harmony) {
    const parsed = parseGeneralPianoChord(symbol);
    if (!parsed) {
      return { ok: false, code: 'bad_request', error: `Invalid piano chord symbol ${symbol}.` };
    }
    chords.push(parsed);
  }
  const locks = input.lockedEvents ?? [];
  for (const lock of locks) {
    const playable = validateLockedEventPlayable(lock);
    if (!playable.ok) return { ok: false, code: 'unsupported_lock', error: playable.errors.join('; ') };
  }

  const harmonyBars = chords.map((chord) => chord.display);
  const harmonyPlan = buildHarmonyPlanFromBars(harmonyBars);
  const chordSymbolPlan = buildChordSymbolPlanFromBars(harmonyBars);
  const form = resolveFormPrecedence({
    totalBars: input.bars,
    lockedHarmonyBarCount: harmonyBars.length,
    compiledSections: compiledSections(input.bars),
  });
  const roles = planSectionRoles(form.sections, input.bars === 8
    ? { verse_0: 'statement', bridge_0: 'contrast', chorus_0: 'return' }
    : { verse_0: 'statement', bridge_0: 'contrast', chorus_0: 'development', verse_1: 'return' });
  const density = planDensityCurve(roles, input.bars);
  const root = openingMotif(input.seed, input.tonalCentre);
  const chain = buildChain(root, [
    { op: 'fragment-head', params: { count: 3 } },
    { op: 'augment' },
  ]);
  const augmented = chain.results[1];
  const head = chain.results[0];
  if (!augmented || !head) {
    return { ok: false, code: 'validation', error: 'motif chain did not produce an augmented head' };
  }
  const inverted = applyOperator(root, 'invert-in-field');
  const contrasted = applyOperator(inverted.motif, 'insert-rest', { index: 1, duration: 0.5 });
  const liquidated = applyOperator(root, 'liquidate', { n: 1, count: 2 });
  const responseSource = applyOperator(head, 'transpose', { semitones: -12 });
  const tonic = input.tonalCentre === 'C' ? 0 : 9;
  const returnBar = returnBarFor(input.bars);
  const rh = new Map<number, Slot[]>();
  const lh = new Map<number, Slot[]>();
  const phases: Phase[] = [];
  const textures: PianoLhTexture[] = [];
  let previousRh = input.tonalCentre === 'C' ? 72 : 69;
  let previousLhPitch = 48;
  let devOrdinal = 0;
  let contrastOrdinal = 0;
  let openTie: number[] | null = null;
  let openingEvents: MotifNoteEvent[] = [];
  let returnEvents: MotifNoteEvent[] = [];
  let developmentDurations: number[] = [];
  const fragments: PianoFragmentRecord[] = [];
  let stageA: { timeline: PianoTimelineBar[] } | null = null;
  if (input.timing?.enabled === true) {
    const meterErrors = validatePianoMeterPlan(input.timing.meterPlan, input.bars);
    if (meterErrors.length > 0) return { ok: false, code: 'bad_request', error: meterErrors.join('; ') };
    stageA = { timeline: buildPianoTimeline(input.timing.meterPlan) };
  }
  const voicedByBar: (VoicedPolychord | null)[] = [];
  if (input.polychords) {
    let rhAnchor = input.tonalCentre === 'C' ? 72 : 69;
    let lhAnchor = 48;
    let previousUpper: number[] | null = null;
    let previousLower: number[] | null = null;
    for (let bar = 1; bar <= input.bars; bar += 1) {
      const region = regionAt(input.polychords, bar);
      if (!region) {
        voicedByBar.push(null);
        continue;
      }
      const anchor = input.phraseDevelopmentV11 && phraseIntentAt(bar) === 'climax'
        ? Math.min(RH_HIGH - 3, rhAnchor + 7)
        : rhAnchor;
      const voiced = voicePolychordPair({
        chord: region.polychord,
        rhLow: RH_LOW,
        rhHigh: RH_HIGH,
        lhLow: LH_LOW,
        lhHigh: LH_HIGH,
        rhAnchor: anchor,
        lhAnchor,
        previousRh: previousUpper,
        previousLh: previousLower,
      });
      if (!voiced.ok) return { ok: false, code: 'validation', error: `Bar ${bar}: ${voiced.diagnostic}` };
      voicedByBar.push(voiced.voiced);
      previousUpper = voiced.voiced.upper.ordered.map((member) => member.midi);
      previousLower = voiced.voiced.lower.ordered.map((member) => member.midi);
      rhAnchor = previousUpper[0]!;
      lhAnchor = previousLower[0]!;
    }
  }
  const spanChoices = new Map<number, PhraseSpanChoice & { events: MotifNoteEvent[] }>();
  let realisedMotif: Motif | null = null;

  for (let bar = 1; bar <= input.bars; bar += 1) {
    const stageBar = stageA?.timeline[bar - 1] ?? null;
    const stageSpan = stageBar?.span ?? null;
    const phase = input.phraseDevelopmentV11 ? phaseFromIntent(phraseIntentAt(bar)) : phaseAt(bar, input.bars);
    const rhEntry = previousRh;
    const lhEntry = previousLhPitch;
    phases.push(phase);
    const chord = chords[bar - 1]!;
    const voiced = voicedByBar[bar - 1] ?? null;
    const rhTones = voiced ? voiced.upper.pcs : chord.tones;
    const handChord: ParsedPianoChord = voiced
      ? {
        display: chord.display,
        rootPc: voiced.lower.ordered[0]!.pc,
        bassPc: voiced.lower.ordered[0]!.pc,
        tones: voiced.lower.pcs,
      }
      : chord;
    const next = chords[bar];
    let line: MotifNoteEvent[] = [];
    let motifRef = root.id;
    if (input.phraseDevelopmentV11 && realisedMotif && bar > 1) {
      const span = phraseSpanIndex(bar);
      const intent = phraseIntentAt(bar);
      if (!spanChoices.has(span)) {
        spanChoices.set(span, choosePhraseSpan(span, phraseIntentAt(span * 2 + 1), realisedMotif, previousRh));
      }
      const choice = spanChoices.get(span)!;
      const picked = eventsForPhraseBar(
        intent,
        realisedMotif,
        choice.events,
        midiInWindow(tonic, previousRh, RH_LOW, RH_HIGH),
      );
      line = fitMotif(picked.events, stageSpan, fragments, bar);
      motifRef = `phrase.${picked.id}`;
    } else if (phase === 'statement') {
      line = fitMotif(root.events, stageSpan, fragments, bar);
      motifRef = root.id;
    } else if (phase === 'sequence') {
      let steps = ((bar + input.seed) % 5) - 2;
      if (steps === 0) steps = input.seed % 2 === 0 ? 1 : -1;
      const sequenced = applyOperator(root, 'sequence-tonal', { steps });
      line = fitMotif(sequenced.motif.events, stageSpan, fragments, bar);
      motifRef = sequenced.step.toId;
    } else if (phase === 'development') {
      const sequenced = applyOperator(augmented, 'sequence-tonal', { steps: devOrdinal });
      devOrdinal += 1;
      line = fitMotif(sequenced.motif.events, stageSpan, fragments, bar);
      motifRef = sequenced.step.toId;
    } else if (phase === 'contrast') {
      const sequenced = applyOperator(contrasted.motif, 'sequence-tonal', { steps: contrastOrdinal + 1 });
      contrastOrdinal += 1;
      line = fitMotif(sequenced.motif.events, stageSpan, fragments, bar);
      motifRef = sequenced.step.toId;
    } else if (phase === 'return') {
      const delta = mod12(chord.rootPc - chords[0]!.rootPc);
      const shift = delta > 6 ? delta - 12 : delta;
      const transposed = root.events.map((event) => (
        event.midi === null ? { ...event } : { ...event, midi: event.midi + shift }
      ));
      line = fitMotif(transposed, stageSpan, fragments, bar);
      motifRef = 'm1.return';
    } else if (phase === 'approach') {
      line = fitMotif(liquidated.motif.events, stageSpan, fragments, bar);
      motifRef = liquidated.step.toId;
    } else {
      const pc = chord.tones.includes(tonic) ? tonic : chord.rootPc;
      line = fitMotif([{ onset: 0, duration: 4, midi: midiInWindow(pc, previousRh, RH_LOW, RH_HIGH) }], stageSpan, fragments, bar);
      motifRef = 'm1.cadence';
    }
    if (phase !== 'ending') {
      const climax = input.phraseDevelopmentV11 === true && phraseIntentAt(bar) === 'climax';
      if (climax) previousRh = Math.min(RH_HIGH - 2, previousRh + 12);
      const ceiling = input.phraseDevelopmentV11 && !climax ? RH_HIGH - 5 : RH_HIGH;
      const strongAt = stageBar
        ? (onset: number) => isGroupBoundary(dyadicQuarter(onset), stageBar)
        : undefined;
      line = repairEvents(line, rhTones, RH_LOW, ceiling, previousRh, strongAt, voiced !== null, climax);
      line = shiftRegister(line, previousRh);
      if (line.some((event) => event.midi !== null && (event.midi < RH_LOW || event.midi > ceiling))) {
        line = repairEvents(line, rhTones, RH_LOW, ceiling, previousRh, strongAt, voiced !== null, climax);
      }
    }
    const lastRh = [...line].reverse().find((event) => event.midi !== null);
    if (lastRh?.midi) previousRh = lastRh.midi;
    if (bar === 1) {
      openingEvents = line.map((event) => ({ ...event }));
      realisedMotif = { id: 'm1.realised', field: FIELD, events: openingEvents.map((event) => ({ ...event })) };
    }
    if (bar === returnBar) returnEvents = line.map((event) => ({ ...event }));
    if (phase === 'development' && developmentDurations.length === 0) {
      developmentDurations = line.filter((event) => event.midi !== null).map((event) => event.duration);
    }
    rh.set(bar, slotsFrom(line, motifRef));
    if (voiced && regionAt(input.polychords ?? [], bar)?.startBar === bar) {
      const locked = locks.some((lock) => lock.bar === bar && (lock.voice === 1 || lock.voice === 3) && lock.startBeat < 1e-6);
      if (locked) {
        return { ok: false, code: 'unsupported_lock', error: `Polychord bar ${bar} cannot sound a complete triad without moving a locked event.` };
      }
      const upper = voiceTriad({
        members: voiced.upper.ordered.map((member) => ({ step: member.step, alter: member.alter, pc: member.pc })),
        low: RH_LOW,
        high: RH_HIGH,
        anchor: rhEntry,
        previous: [rhEntry],
        preferExtreme: 'high',
        avoid: new Set<number>(),
        label: voiced.display,
      });
      if (!upper.ok) return { ok: false, code: 'validation', error: `Bar ${bar}: ${upper.diagnostic}` };
      const lower = voiceTriad({
        members: voiced.lower.ordered.map((member) => ({ step: member.step, alter: member.alter, pc: member.pc })),
        low: LH_LOW,
        high: LH_HIGH,
        anchor: lhEntry,
        previous: [lhEntry],
        preferExtreme: 'low',
        avoid: new Set(upper.voiced.ordered.map((member) => member.midi)),
        label: voiced.display,
      });
      if (!lower.ok) return { ok: false, code: 'validation', error: `Bar ${bar}: ${lower.diagnostic}` };
      voicedByBar[bar - 1] = { ...voiced, upper: upper.voiced, lower: lower.voiced };
      rh.set(bar, stampPolychord(rh.get(bar) ?? [], upper.voiced.ordered));
      const stamped = [...(rh.get(bar) ?? [])].reverse().find((slot) => Number.isFinite(slot.pitch));
      if (stamped) previousRh = stamped.pitch;
    }

    const level = getDensityForBar(density, bar);
    const tieBar = phase === 'approach' || (phase === 'return' && bar === input.bars - 1);
    let texture: PianoLhTexture['texture'] = 'sustained';
    if (phase === 'ending') {
      if (openTie) {
        const releasePool = chordPool(handChord, openTie[0]! + 2).filter((pitch) => !openTie!.includes(pitch));
        const release = releasePool[0] ?? midiInWindow(handChord.rootPc, openTie[0]! + 3, LH_LOW, LH_HIGH);
        lh.set(bar, [
          lhTie(openTie, 'stop', 'lh.tie', 2, 0),
          { start: 2, duration: 2, pitch: release === openTie[0] ? openTie[0]! : release, motifRef: 'lh.cadence' },
        ]);
        openTie = null;
      } else {
        lh.set(bar, lhSustain(handChord, 'lh.cadence'));
      }
      texture = 'tied-stack';
    } else if (tieBar) {
      const pitches = tiePitches(handChord, next ? { ...next, tones: voicedByBar[bar]?.lower.pcs ?? next.tones } : undefined);
      if (pitches) {
        openTie = pitches;
        const held = phase === 'approach'
          ? [lhTie(pitches, 'start', 'lh.tie', 2, 2), ...lhSparse(handChord).filter((slot) => slot.start < 2)]
          : [lhTie(pitches, 'start', 'lh.tie', 4, 0)];
        lh.set(bar, held);
        texture = 'tied-stack';
      } else if (phase === 'development' || level === 'medium') {
        lh.set(bar, lhBroken(handChord, bar, input.seed));
        texture = 'broken';
      } else {
        lh.set(bar, lhSustain(handChord, 'lh.sustain'));
        texture = 'sustained';
      }
    } else if (phase === 'development') {
      lh.set(bar, lhBroken(handChord, bar, input.seed));
      texture = 'broken';
    } else if (phase === 'contrast') {
      const answered = applyOperator(responseSource.motif, 'sequence-tonal', { steps: contrastOrdinal });
      lh.set(bar, lhResponse(handChord, answered.step.toId, answered.motif.events));
      texture = 'response';
    } else if (level === 'sparse' && bar % 2 === 0) {
      lh.set(bar, lhSparse(handChord));
      texture = 'sparse';
    } else if (level === 'sparse') {
      lh.set(bar, lhSustain(handChord, 'lh.sustain'));
      texture = 'sustained';
    } else {
      lh.set(bar, lhBroken(handChord, bar, input.seed));
      texture = 'broken';
    }
    if (stageBar) {
      const fragmented = fragmentSlotsToSpan(lh.get(bar) ?? [], stageBar.span);
      if (qCmp(fragmented.omitted, q(0, 1)) > 0) {
        fragments.push({ bar, hand: 'LH', motifRef: 'lh', omitted: fragmented.omitted, reason: 'bar-capacity' });
      }
      lh.set(bar, fragmented.kept);
    }
    if (voiced && regionAt(input.polychords ?? [], bar)?.startBar === bar) {
      const placed = voicedByBar[bar - 1];
      if (placed) lh.set(bar, stampPolychord(lh.get(bar) ?? [], placed.lower.ordered));
    }
    const lastLh = [...(lh.get(bar) ?? [])].reverse().find((slot) => Number.isFinite(slot.pitch));
    if (lastLh) previousLhPitch = lastLh.pitch;
    textures.push({ bar, texture });
  }

  if (stageA) {
    releaseUnjoinedTies(stageA.timeline, lh);
    releaseUnjoinedTies(stageA.timeline, rh);
  }

  let windows = input.timing?.enabled === true ? [...(input.timing.rhythmicWindows ?? [])] : [];
  if (input.timing?.acceptance && stageA) {
    const shared = input.polychords
      ? true
      : Boolean(chords[4] && chords[5] && chords[4].tones.some((pc) => chords[5]!.tones.includes(pc)));
    if (!shared) return { ok: false, code: 'bad_request', error: 'acceptance cross-bar tuplet needs a pitch shared by bars 5 and 6' };
    windows = acceptanceWindows(stageA.timeline, chords);
    if (input.groupedNineSixteenTriplet) {
      const upper = voicedByBar[11]?.upper;
      if (!upper) return { ok: false, code: 'bad_request', error: 'bar 12 3:2 needs a polychord on that bar' };
      const extra = bar12TripletWindow(stageA.timeline, upper);
      if (typeof extra === 'string') return { ok: false, code: 'bad_request', error: extra };
      windows = [...windows, extra];
    }
    if (input.polychords && stageA) {
      windows = windows.map((window) => {
        const host = findTimelineBar(stageA.timeline, window.start);
        const voiced = host ? voicedByBar[host.bar - 1] : null;
        if (!voiced) return window;
        const region = host ? regionAt(input.polychords ?? [], host.bar) : null;
        const atChange = Boolean(region && host && region.startBar === host.bar && qEq(window.start, host.start));
        return decorateOwnedWindow(window, voiced.upper, voiced.lower, atChange, true);
      });
    }
  } else if (input.polychords && stageA && windows.length > 0) {
    windows = windows.map((window) => {
      const host = findTimelineBar(stageA.timeline, window.start);
      const voiced = host ? voicedByBar[host.bar - 1] : null;
      if (!voiced) return window;
      const region = host ? regionAt(input.polychords ?? [], host.bar) : null;
      const atChange = Boolean(region && host && region.startBar === host.bar && qEq(window.start, host.start));
      return decorateOwnedWindow(window, voiced.upper, voiced.lower, atChange, false);
    });
  }
  const realised = stageA
    ? realiseStageA({ timeline: stageA.timeline, rh, lh, windows })
    : null;
  if (realised && realised.errors.length > 0) {
    return { ok: false, code: 'validation', error: realised.errors.join('; ') };
  }
  if (realised) fragments.push(...realised.fragments);

  const catalogue = getInstrument('piano');
  const score: ScoreModel = {
    title: `General Piano V1 seed ${input.seed}`,
    tempo: input.tempo,
    ...(stageA ? { barMeterMap: barMeterMapFromPlan(stageA.timeline), pianoV11StageA: { enabled: true as const, divisions: 480 } } : {}),
    timeSignature: stageA
      ? { beats: stageA.timeline[0]!.numerator, beatType: stageA.timeline[0]!.denominator }
      : { beats: 4, beatType: 4 },
    keySignature: {
      fifths: 0,
      mode: input.tonalCentre === 'C' ? 'major' : 'minor',
      hideKeySignature: false,
    },
    parts: [{
      id: 'piano',
      name: catalogue.displayName,
      instrumentIdentity: catalogue.id,
      midiProgram: catalogue.midiProgram,
      clef: 'treble',
      catalogueInstrumentSound: catalogue.instrumentSound,
      pianoGrandStaff: pianoGrandStaffConfig(false),
      measures: harmonyBars.map((chord, index) => {
        const bar = index + 1;
        const planned = stageA?.timeline[index];
        return {
          index: bar,
          chord,
          chordSymbol: chord,
          ...(voicedByBar[index] ? { pianoPolychord: voicedByBar[index]!.export } : {}),
          ...(planned ? { measureBeatSpanQuarters: qToNumber(planned.span), pianoBeatGroups: [...planned.groups] } : {}),
          events: realised
            ? [...(realised.events.get(bar) ?? [])]
            : [
              ...fillVoice(rh.get(bar) ?? [], 1),
              ...fillVoice(lh.get(bar) ?? [], 3),
            ],
        };
      }),
    }],
  };

  const responseEvents = responseSource.motif.events.filter((event) => event.midi !== null);
  const plan: PianoCompositionPlan = {
    seed: input.seed,
    tempo: input.tempo,
    bars: input.bars,
    harmonyBars,
    harmonyPlan,
    chordSymbolPlan,
    form,
    roles,
    density,
    lineageIds: [...chain.lineageIds, inverted.step.toId, contrasted.step.toId, liquidated.step.toId],
    transformOps: [...chain.steps.map((step) => step.op), inverted.step.op, contrasted.step.op, liquidated.step.op],
    lhResponse: {
      lineageId: responseSource.step.toId,
      bar: phases.findIndex((phase) => phase === 'contrast') + 1,
      pitches: responseEvents.map((event) => event.midi!),
      durations: responseEvents.map((event) => event.duration),
    },
    returnBar,
    returnLockBars: [returnBar],
    innerVoiceEnabled: false,
    textures,
    modalTones: openingEvents
      .filter((event) => event.midi !== null)
      .slice(0, 2)
      .map((event) => ({ bar: 1, pitch: event.midi!, role: 'modal' as const })),
    general: {
      tonalCentre: input.tonalCentre,
      metre: stageA ? 'mixed' : '4/4',
      ...(stageA ? {
        stageA: {
          quarters: timelineTotals(stageA.timeline).quarters,
          ticks: timelineTotals(stageA.timeline).ticks,
          fragments,
        },
      } : {}),
      phases,
      openingIntervals: intervalsOf(openingEvents),
      returnIntervals: intervalsOf(returnEvents),
      developmentDurations,
      ...(input.phraseDevelopmentV11 ? {
        phraseDevelopment: {
          evidence: 'planning-level' as const,
          opening: openingEvents.map((event) => ({ ...event })),
          spans: [...spanChoices.values()].map((choice) => ({
            span: choice.span,
            bars: [...choice.bars],
            intent: choice.intent,
            chosen: choice.chosen,
            candidates: choice.candidates,
          })),
          returnDurations: rhythmSignature(returnEvents),
          climaxRhMax: 0,
        },
      } : {}),
      ...(input.polychords ? {
        polychords: voicedByBar.map((voiced, index) => voiced ? {
          bar: index + 1,
          display: voiced.display,
          sourceSymbol: harmonyBars[index] ?? '',
          upper: voiced.upper.ordered.map((member) => member.midi),
          lower: voiced.lower.ordered.map((member) => member.midi),
        } : null).filter((item): item is { bar: number; display: string; sourceSymbol: string; upper: number[]; lower: number[] } => item !== null),
      } : {}),
    },
  };

  for (const measure of score.parts[0]?.measures ?? []) {
    const voiced = voicedByBar[measure.index - 1];
    if (!voiced) continue;
    const notes = measure.events.filter((event): event is NoteEvent => event.kind === 'note');
    applyParentMemberSpellings(notes, voiced.upper, voiced.lower);
  }
  if (plan.general && (input.phraseDevelopmentV11 || input.polychords || input.timing?.enabled)) {
    plan.general.finalEvents = finalRealisedDiagnostics(score);
  }

  const lockSnapshot = snapshotOf(plan, locks);
  const beforeEvents = ownedSignature(score);
  const kept = validateLockedEventsPresent(score, locks);
  if (!kept.ok) return { ok: false, code: 'unsupported_lock', error: kept.errors.join('; ') };
  if (input.polychords) {
    for (const region of input.polychords) {
      const voiced = voicedByBar[region.startBar - 1];
      if (!voiced) continue;
      if (!handsShareTriad(score, region.startBar, voiced.upper.pcs, voiced.lower.pcs)) {
        return {
          ok: false,
          code: 'validation',
          error: `Bar ${region.startBar}: ${voiced.display} does not sound both complete triads together`,
        };
      }
    }
  }
  if (plan.general?.phraseDevelopment) {
    let climaxRhMax = 0;
    for (const measure of score.parts[0]?.measures ?? []) {
      if (measure.index !== 19 && measure.index !== 20) continue;
      for (const event of measure.events) {
        if (event.kind !== 'note' || (event.voice ?? 1) !== 1) continue;
        climaxRhMax = Math.max(climaxRhMax, event.pitch, ...(event.pitches ?? []));
      }
    }
    plan.general.phraseDevelopment.climaxRhMax = climaxRhMax;
  }
  const playable = validatePianoPlayability(score, input.tempo, input.polychords ? 'v11-polychord' : 'legacy');
  if (!playable.ok) return { ok: false, code: 'playability', error: playable.errors.join('; ') };
  const independent = validatePianoIndependence(score);
  if (!independent.ok) return { ok: false, code: 'validation', error: independent.errors.join('; ') };
  const developed = validateLhDevelopment(score);
  if (!developed.ok) return { ok: false, code: 'validation', error: developed.errors.join('; ') };
  const ties = validatePianoTies(score);
  if (!ties.ok) return { ok: false, code: 'validation', error: ties.errors.join('; ') };
  const barMath = validateStrictBarMath(score);
  if (!barMath.valid) return { ok: false, code: 'validation', error: barMath.errors.join('; ') };
  if (ownedSignature(score) !== beforeEvents) {
    return { ok: false, code: 'validation', error: 'writer-owned piano events were overwritten' };
  }
  for (const measure of score.parts[0]?.measures ?? []) {
    const owner = voicedByBar[measure.index - 1];
    const chord = chords[measure.index - 1];
    if (!chord) continue;
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      const voice = event.voice ?? 1;
      const pitches = [event.pitch, ...(event.pitches ?? []).filter((pitch) => pitch !== event.pitch)];
      const planned = stageA?.timeline[measure.index - 1];
      const onsetQ = event.kind === 'note' ? event.pianoExact?.onsetQ : undefined;
      const strong = planned
        ? isGroupBoundary(onsetQ ?? dyadicQuarter(event.startBeat), planned)
        : Math.abs(event.startBeat % 2) < 1e-6;
      const rhAllow = owner ? owner.upper.pcs : chord.tones;
      const lhAllow = owner ? owner.lower.pcs : chord.tones;
      const weakAllow = owner ? owner.upper.pcs : [...new Set([...FIELD, ...chord.tones])];
      for (const pitch of pitches) {
        const pc = mod12(pitch);
        if (voice === 3 && !lhAllow.includes(pc)) {
          return { ok: false, code: 'validation', error: `LH pitch ${pitch} leaves ${owner?.display ?? chord.display} in bar ${measure.index}` };
        }
        if (voice === 1 && strong && !rhAllow.includes(pc)) {
          return { ok: false, code: 'validation', error: `RH pitch ${pitch} leaves ${owner?.display ?? chord.display} on a strong beat in bar ${measure.index}` };
        }
        if (voice === 1 && !strong && !weakAllow.includes(pc)) {
          return { ok: false, code: 'validation', error: `RH pitch ${pitch} leaves the field in bar ${measure.index}` };
        }
      }
    }
  }

  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) {
    return { ok: false, code: 'validation', error: exported.errors.join('; ') || 'piano export failed' };
  }
  if (ownedSignature(score) !== beforeEvents) {
    return { ok: false, code: 'validation', error: 'export overwrote writer-owned piano events' };
  }
  const compared = comparePianoScoreToXml(score, exported.xml);
  if (!compared.ok || compared.elapsedSeconds === null) {
    return { ok: false, code: 'parity', error: compared.errors.join('; ') };
  }
  const after = snapshotOf(plan, locks);
  if (JSON.stringify(after) !== JSON.stringify(lockSnapshot)) {
    return { ok: false, code: 'validation', error: 'harmony, form or locks changed during export' };
  }
  const chordsAfter = score.parts[0]?.measures.map((measure) => measure.chord) ?? [];
  if (chordsAfter.join('|') !== harmonyBars.join('|')) {
    return { ok: false, code: 'validation', error: 'exported score harmony no longer matches the plan' };
  }
  return {
    ok: true,
    score,
    xml: exported.xml,
    plan,
    lockSnapshot,
    elapsedSeconds: compared.elapsedSeconds,
    soundingAttacks: compared.soundingAttacks,
  };
}
