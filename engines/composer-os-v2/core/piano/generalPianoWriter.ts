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
import type { NoteEvent, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
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
}

type Phase = 'statement' | 'sequence' | 'development' | 'contrast' | 'return' | 'approach' | 'ending';

export interface GeneralPianoComposeInput {
  seed: number;
  bars: GeneralPianoBarCount;
  tempo: number;
  tonalCentre: GeneralPianoCentre;
  harmony: string[];
  lockedEvents?: PianoLockedEvent[];
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

function repairEvents(
  events: readonly MotifNoteEvent[],
  chordTones: readonly number[],
  low: number,
  high: number,
  anchor: number,
): MotifNoteEvent[] {
  let previous = anchor;
  return events.map((event) => {
    if (event.midi === null) return { ...event };
    const strong = Math.abs(event.onset % 2) < 1e-6;
    const allowed = strong ? chordTones : [...new Set([...FIELD, ...chordTones])];
    const pc = allowed.includes(mod12(event.midi)) ? mod12(event.midi) : closestPc(event.midi, allowed);
    const midi = midiInWindow(pc, previous, low, high);
    previous = midi;
    return { ...event, midi };
  });
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
  let devOrdinal = 0;
  let contrastOrdinal = 0;
  let openTie: number[] | null = null;
  let openingEvents: MotifNoteEvent[] = [];
  let returnEvents: MotifNoteEvent[] = [];
  let developmentDurations: number[] = [];

  for (let bar = 1; bar <= input.bars; bar += 1) {
    const phase = phaseAt(bar, input.bars);
    phases.push(phase);
    const chord = chords[bar - 1]!;
    const next = chords[bar];
    let line: MotifNoteEvent[] = [];
    let motifRef = root.id;
    if (phase === 'statement') {
      line = fitToBar(root.events);
      motifRef = root.id;
    } else if (phase === 'sequence') {
      let steps = ((bar + input.seed) % 5) - 2;
      if (steps === 0) steps = input.seed % 2 === 0 ? 1 : -1;
      const sequenced = applyOperator(root, 'sequence-tonal', { steps });
      line = fitToBar(sequenced.motif.events);
      motifRef = sequenced.step.toId;
    } else if (phase === 'development') {
      const sequenced = applyOperator(augmented, 'sequence-tonal', { steps: devOrdinal });
      devOrdinal += 1;
      line = fitToBar(sequenced.motif.events);
      motifRef = sequenced.step.toId;
    } else if (phase === 'contrast') {
      const sequenced = applyOperator(contrasted.motif, 'sequence-tonal', { steps: contrastOrdinal + 1 });
      contrastOrdinal += 1;
      line = fitToBar(sequenced.motif.events);
      motifRef = sequenced.step.toId;
    } else if (phase === 'return') {
      const delta = mod12(chord.rootPc - chords[0]!.rootPc);
      const shift = delta > 6 ? delta - 12 : delta;
      const transposed = root.events.map((event) => (
        event.midi === null ? { ...event } : { ...event, midi: event.midi + shift }
      ));
      line = fitToBar(transposed);
      motifRef = 'm1.return';
    } else if (phase === 'approach') {
      line = fitToBar(liquidated.motif.events);
      motifRef = liquidated.step.toId;
    } else {
      const pc = chord.tones.includes(tonic) ? tonic : chord.rootPc;
      line = [{ onset: 0, duration: 4, midi: midiInWindow(pc, previousRh, RH_LOW, RH_HIGH) }];
      motifRef = 'm1.cadence';
    }
    if (phase !== 'ending') {
      line = repairEvents(line, chord.tones, RH_LOW, RH_HIGH, previousRh);
      line = shiftRegister(line, previousRh);
    }
    const lastRh = [...line].reverse().find((event) => event.midi !== null);
    if (lastRh?.midi) previousRh = lastRh.midi;
    if (bar === 1) openingEvents = line.map((event) => ({ ...event }));
    if (bar === returnBar) returnEvents = line.map((event) => ({ ...event }));
    if (phase === 'development' && developmentDurations.length === 0) {
      developmentDurations = line.filter((event) => event.midi !== null).map((event) => event.duration);
    }
    rh.set(bar, slotsFrom(line, motifRef));

    const level = getDensityForBar(density, bar);
    const tieBar = phase === 'approach' || (phase === 'return' && bar === input.bars - 1);
    let texture: PianoLhTexture['texture'] = 'sustained';
    if (phase === 'ending') {
      if (openTie) {
        const releasePool = chordPool(chord, openTie[0]! + 2).filter((pitch) => !openTie!.includes(pitch));
        const release = releasePool[0] ?? midiInWindow(chord.rootPc, openTie[0]! + 3, LH_LOW, LH_HIGH);
        lh.set(bar, [
          lhTie(openTie, 'stop', 'lh.tie', 2, 0),
          { start: 2, duration: 2, pitch: release === openTie[0] ? openTie[0]! : release, motifRef: 'lh.cadence' },
        ]);
        openTie = null;
      } else {
        lh.set(bar, lhSustain(chord, 'lh.cadence'));
      }
      texture = 'tied-stack';
    } else if (tieBar) {
      const pitches = tiePitches(chord, next);
      if (pitches) {
        openTie = pitches;
        const held = phase === 'approach'
          ? [lhTie(pitches, 'start', 'lh.tie', 2, 2), ...lhSparse(chord).filter((slot) => slot.start < 2)]
          : [lhTie(pitches, 'start', 'lh.tie', 4, 0)];
        lh.set(bar, held);
        texture = 'tied-stack';
      } else if (phase === 'development' || level === 'medium') {
        lh.set(bar, lhBroken(chord, bar, input.seed));
        texture = 'broken';
      } else {
        lh.set(bar, lhSustain(chord, 'lh.sustain'));
        texture = 'sustained';
      }
    } else if (phase === 'development') {
      lh.set(bar, lhBroken(chord, bar, input.seed));
      texture = 'broken';
    } else if (phase === 'contrast') {
      const answered = applyOperator(responseSource.motif, 'sequence-tonal', { steps: contrastOrdinal });
      lh.set(bar, lhResponse(chord, answered.step.toId, answered.motif.events));
      texture = 'response';
    } else if (level === 'sparse' && bar % 2 === 0) {
      lh.set(bar, lhSparse(chord));
      texture = 'sparse';
    } else if (level === 'sparse') {
      lh.set(bar, lhSustain(chord, 'lh.sustain'));
      texture = 'sustained';
    } else {
      lh.set(bar, lhBroken(chord, bar, input.seed));
      texture = 'broken';
    }
    textures.push({ bar, texture });
  }

  const catalogue = getInstrument('piano');
  const score: ScoreModel = {
    title: `General Piano V1 seed ${input.seed}`,
    tempo: input.tempo,
    timeSignature: { beats: 4, beatType: 4 },
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
        return {
          index: bar,
          chord,
          chordSymbol: chord,
          events: [
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
      metre: '4/4',
      phases,
      openingIntervals: intervalsOf(openingEvents),
      returnIntervals: intervalsOf(returnEvents),
      developmentDurations,
    },
  };

  const lockSnapshot = snapshotOf(plan, locks);
  const beforeEvents = ownedSignature(score);
  const kept = validateLockedEventsPresent(score, locks);
  if (!kept.ok) return { ok: false, code: 'unsupported_lock', error: kept.errors.join('; ') };
  const playable = validatePianoPlayability(score, input.tempo);
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
    const chord = chords[measure.index - 1];
    if (!chord) continue;
    for (const event of measure.events) {
      if (event.kind !== 'note') continue;
      const voice = event.voice ?? 1;
      const pitches = [event.pitch, ...(event.pitches ?? []).filter((pitch) => pitch !== event.pitch)];
      const strong = Math.abs(event.startBeat % 2) < 1e-6;
      for (const pitch of pitches) {
        const pc = mod12(pitch);
        if (voice === 3 && !chord.tones.includes(pc)) {
          return { ok: false, code: 'validation', error: `LH pitch ${pitch} leaves ${chord.display} in bar ${measure.index}` };
        }
        if (voice === 1 && strong && !chord.tones.includes(pc)) {
          return { ok: false, code: 'validation', error: `RH pitch ${pitch} leaves ${chord.display} on a strong beat in bar ${measure.index}` };
        }
        if (voice === 1 && !strong && !chord.tones.includes(pc) && !FIELD.includes(pc as (typeof FIELD)[number])) {
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
