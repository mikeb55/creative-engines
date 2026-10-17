/**
 * Coffee Run — Variation.
 * Fixed 24-bar solo-piano film cue. The 8-bar Piano V1 checkpoint is a different entry.
 * Motif operators supply the line. This module places them. It does not call the duo seal.
 */

import { buildChordSymbolPlanFromBars, buildHarmonyPlanFromBars } from '../harmony/chordProgressionParser';
import { chordTonesForChordSymbol } from '../harmony/chordSymbolAnalysis';
import { resolveFormPrecedence } from '../form/resolveFormPrecedence';
import { planSectionRoles } from '../section-roles/sectionRolePlanner';
import { planDensityCurve } from '../density/densityCurvePlanner';
import { applyOperator, type OperatorParams } from '../motif-ops/operators';
import { buildChain } from '../motif-ops/developmentChain';
import { C_MAJOR_FIELD, type Motif, type MotifNoteEvent, type OperatorId } from '../motif-ops/types';
import { getInstrument } from '../instruments/instrumentCatalogue';
import type { NoteEvent, NoteNotationV34, RestEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { validateStrictBarMath } from '../score-integrity/strictBarMath';
import { comparePianoScoreToXml } from './pianoXmlOracle';
import { pianoGrandStaffConfig, type PianoLockedEvent } from './pianoTypes';
import {
  validateLhDevelopment,
  validateLockedEventPlayable,
  validateLockedEventsPresent,
  validatePianoIndependence,
  validatePianoPlayability,
} from './pianoValidation';
import type { PianoComposeResult, PianoCompositionPlan, PianoLhTexture } from './pianoWriter';

export const COFFEE_RUN_BARS = 24;
export const COFFEE_RUN_TEMPO = 64;
export const COFFEE_RUN_TITLE = 'Coffee Run — Variation';

/** Reference progression from the brief. Not the written harmony. */
export const COFFEE_RUN_REFERENCE_HARMONY = [
  'Am(add9)', 'Fmaj7', 'C/E', 'G6sus2', 'Fmaj9', 'Cmaj7/E', 'Dm9', 'Am(add9)',
  'Fmaj7', 'C/E', 'Dm7', 'Am7', 'Bbmaj7(#11)', 'Fmaj7/A', 'Dm9', 'Cmaj7/E',
  'Fmaj9', 'Am(add9)', 'Dm9', 'Fmaj7', 'Am(add9)', 'Fmaj7', 'C(add9)/E', 'Fmaj7(add9)',
] as const;

/** Written harmony. Bars 6, 8, 10, 16, 20 and 22 leave the reference. */
export const COFFEE_RUN_HARMONY = [
  'Am(add9)', 'Fmaj7', 'C/E', 'G6sus2', 'Fmaj9', 'Am9/E', 'Dm9', 'Cmaj7',
  'Fmaj7', 'Am(add9)/E', 'Dm7', 'Am7', 'Bbmaj7(#11)', 'Fmaj7/A', 'Dm9', 'Am7/E',
  'Fmaj9', 'Am(add9)', 'Dm9', 'Cmaj7', 'Am(add9)', 'Dm9', 'C(add9)/E', 'Fmaj7(add9)',
] as const;

export const COFFEE_RUN_ACTIVITY = [
  'Eighth rest, then the falling E–D–C cell. LH holds A.',
  'Downbeat answer C–B–A. LH moves F to C.',
  'Rising inversion E–F–G after a beat of rest. LH holds E–B.',
  'Sequence F–G–A, off the downbeat. LH breaks G–D–B.',
  'Same cell, augmented into sustained halves. LH holds F–C.',
  'Augmented head, then the cell a step up, over Am9/E. LH imitates two octaves down.',
  'Sustained C, then B. LH moves D–A–C.',
  'Cell in retrograde, then a low G. LH holds C, then G. Harmony opens to Cmaj7.',
  'Cell a step down, then G. LH arpeggiates F–A–C.',
  'Head fragment, a rest, then C, over Am(add9)/E. LH holds E and releases.',
  'One sustained C. LH holds D. Cemetery restraint.',
  'Bar 2 answer, delayed. LH holds A, then adds E.',
  'Cell a step up: F–E–D, the E sounding the #11. LH holds B♭–F, then D.',
  'Augmented C–B–A across the bar. LH holds A.',
  'Cell up two steps, G–F–E, then D. LH moves D–F–A.',
  'E then G, still below the later peak. LH holds E, then B.',
  'Arrival. Augmented cell lifted to B–A–G. Inner E. LH holds F–C.',
  'G sustained, then the motif head E. Inner C. LH moves A to E.',
  'Two separated notes, F then D. LH holds a short D. Hairpin starts.',
  'One C. Short F in the bass. Texture thins.',
  'Opening cell reversed: C, late, alone. A brief low A, then space.',
  'The next retrograde note, D, with a long rest. No pedal.',
  'Last retrograde note, E, late. A short E in the bass, then space.',
  'Final chord F–C / A–E–G, held for the whole bar.',
] as const;

const MARKERS: { bar: number; words?: string; dynamic?: 'p' | 'mp' | 'pp' }[] = [
  { bar: 1, words: 'Very gently; with space between phrases', dynamic: 'p' },
  { bar: 3, words: 'Proposal / warmth, without sentimentality' },
  { bar: 6, dynamic: 'mp' },
  { bar: 11, words: 'Cemetery — more restrained', dynamic: 'pp' },
  { bar: 12, words: 'Pram — tenderness' },
  { bar: 17, words: 'Apartment — allow the melody to arrive', dynamic: 'mp' },
  { bar: 19, words: 'Toward black — diminuendo', dynamic: 'pp' },
  { bar: 21, words: 'Credits — distant echo, freely' },
  { bar: 24, words: 'Let the last chord disappear' },
];

interface Slot {
  start: number;
  duration: number;
  pitch: number;
  pitches?: number[];
  motifRef?: string;
  notation?: NoteNotationV34;
  velocity?: number;
  spelling?: { step: string; alter: number };
}

function roundBeat(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function velocityForBar(bar: number): number {
  if (bar <= 5) return 52;
  if (bar <= 10) return 68;
  if (bar === 11) return 36;
  if (bar === 12) return 44;
  if (bar <= 16) return 40;
  if (bar <= 18) return 74;
  if (bar === 19) return 36;
  if (bar === 20) return 28;
  if (bar <= 23) return 24;
  return 32;
}

export function coffeeRunStartTime(bar: number): string {
  const seconds = (bar - 1) * 3.75;
  const minutes = Math.floor(seconds / 60 + 1e-9);
  const remain = seconds - minutes * 60;
  return `${minutes}:${remain.toFixed(2).padStart(5, '0')}`;
}

export function coffeeRunMarkerText(bar: number): string {
  const marker = MARKERS.find((item) => item.bar === bar);
  if (!marker) return '';
  return [marker.words, marker.dynamic].filter(Boolean).join(' — ');
}

export function coffeeRunBarSummary(): string {
  const lines = [
    '# Coffee Run — Variation',
    '',
    'Solo piano. 24 bars. 4/4. Quarter note = 64. Duration 1:30.00.',
    '',
    '| Bar | Start time | Film marker | Chord | Piano activity |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (let bar = 1; bar <= COFFEE_RUN_BARS; bar += 1) {
    lines.push(`| ${bar} | ${coffeeRunStartTime(bar)} | ${coffeeRunMarkerText(bar)} | ${COFFEE_RUN_HARMONY[bar - 1]} | ${COFFEE_RUN_ACTIVITY[bar - 1]} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function cellMotif(): Motif {
  return {
    id: 'cr',
    field: C_MAJOR_FIELD,
    events: [
      { onset: 0, duration: 0.5, midi: 76 },
      { onset: 0.5, duration: 0.5, midi: 74 },
      { onset: 1, duration: 1, midi: 72 },
    ],
  };
}

function op(motif: Motif, operator: OperatorId, params?: OperatorParams): Motif {
  return applyOperator(motif, operator, params).motif;
}

function fillVoice(slots: Slot[], voice: number): ScoreEvent[] {
  const sorted = [...slots].sort((a, b) => a.start - b.start);
  const events: ScoreEvent[] = [];
  let cursor = 0;
  for (const slot of sorted) {
    if (slot.start < cursor - 1e-6) {
      throw new Error(`coffee run overlap voice ${voice} at beat ${slot.start}`);
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
      ...(slot.notation ? { notation: slot.notation } : {}),
      ...(slot.velocity != null ? { velocity: slot.velocity } : {}),
      ...(slot.spelling ? { spelling: slot.spelling } : {}),
    };
    events.push(note);
    cursor = roundBeat(slot.start + slot.duration);
  }
  if (cursor < 4 - 1e-6) {
    events.push({ kind: 'rest', startBeat: cursor, duration: roundBeat(4 - cursor), voice } satisfies RestEvent);
  }
  if (cursor > 4 + 1e-6) throw new Error(`coffee run voice ${voice} exceeds the bar`);
  return events;
}

function placeMotif(target: Map<number, Slot[]>, motif: Motif, bar: number, beat: number): void {
  for (const event of motif.events) {
    if (event.midi === null) continue;
    placeEvent(target, event, bar, beat, motif.id);
  }
}

function placeEvent(
  target: Map<number, Slot[]>,
  event: MotifNoteEvent,
  bar: number,
  beat: number,
  motifRef: string,
): void {
  if (event.midi === null) return;
  const start = roundBeat(beat + event.onset);
  if (start < -1e-6 || start + event.duration > 4 + 1e-6) {
    throw new Error(`${motifRef} does not fit in bar ${bar} at ${start}+${event.duration}`);
  }
  target.get(bar)!.push({
    start,
    duration: event.duration,
    pitch: event.midi,
    motifRef,
    velocity: velocityForBar(bar),
  });
}

function add(
  target: Map<number, Slot[]>,
  bar: number,
  start: number,
  duration: number,
  pitch: number,
  motifRef: string,
  extra?: Partial<Slot>,
): void {
  target.get(bar)!.push({
    start,
    duration,
    pitch,
    motifRef,
    velocity: velocityForBar(bar),
    ...extra,
  });
}

function slur(rh: Map<number, Slot[]>, startBar: number, endBar: number): void {
  let first: Slot | undefined;
  let last: Slot | undefined;
  for (let bar = startBar; bar <= endBar; bar += 1) {
    const notes = [...(rh.get(bar) ?? [])].sort((a, b) => a.start - b.start);
    if (!first && notes[0]) first = notes[0];
    if (notes.length) last = notes[notes.length - 1];
  }
  if (!first || !last || first === last) return;
  first.notation = { ...first.notation, slur: 'start' };
  last.notation = { ...last.notation, slur: 'stop' };
}

function fail(error: string): PianoComposeResult {
  return { ok: false, code: 'validation', error };
}

export function composeCoffeeRunVariation(input: {
  seed: number;
  innerVoice?: boolean;
  lockedEvents?: PianoLockedEvent[];
}): PianoComposeResult {
  if (!Number.isInteger(input.seed)) {
    return { ok: false, code: 'bad_request', error: 'Coffee Run variation needs an integer seed.' };
  }
  const locks = input.lockedEvents ?? [];
  for (const lock of locks) {
    const playable = validateLockedEventPlayable(lock);
    if (!playable.ok) return { ok: false, code: 'unsupported_lock', error: playable.errors.join('; ') };
  }
  const harmonyBars = [...COFFEE_RUN_HARMONY];
  for (const symbol of harmonyBars) {
    const tones = chordTonesForChordSymbol(symbol, { lockedHarmony: true });
    if (!Number.isFinite(tones.root)) return fail(`unparsed harmony symbol ${symbol}`);
  }

  const cell = cellMotif();
  const chain = buildChain(cell, [
    { op: 'displace', params: { beats: 0.5 } },
    { op: 'augment' },
    { op: 'transpose-in-field', params: { degrees: 4 } },
  ]);
  const opening = chain.results[0];
  const sustained = chain.results[1];
  const arrival = chain.results[2];
  if (!opening || !sustained || !arrival) return fail('motif chain did not produce the cue');
  const arrivalPitches = arrival.events.map((event) => event.midi);
  if (arrivalPitches.join(',') !== '83,81,79') {
    return fail(`arrival pitches ${arrivalPitches.join(',')} are not B–A–G`);
  }
  if (arrival.events.map((event) => event.duration).join(',') !== '1,1,2') {
    return fail('arrival augmentation did not lengthen the lifted cell');
  }

  const answer = op(cell, 'transpose-in-field', { degrees: -2 });
  const warmth = op(cell, 'invert-in-field', { axis: 76 });
  const warmthLift = op(warmth, 'sequence-tonal', { steps: 1, count: 1 });
  const head = op(cell, 'fragment-head', { count: 2 });
  const headLong = op(head, 'augment');
  const up = op(cell, 'transpose-in-field', { degrees: 1 });
  const tail = op(cell, 'fragment-tail', { count: 1 });
  const tailLong = op(tail, 'augment');
  const down = op(cell, 'transpose-in-field', { degrees: -1 });
  const up2 = op(cell, 'transpose-in-field', { degrees: 2 });
  const backward = op(cell, 'retrograde');
  const tender = op(answer, 'displace', { beats: 0.5 });
  const answerLong = op(answer, 'augment');
  const imitation = op(op(cell, 'transpose', { semitones: -24 }), 'displace', { beats: 1 });
  const arrivalBack = op(arrival, 'retrograde');
  const echo = backward.events;
  if (echo.length !== 3 || echo.some((event) => event.midi === null)) {
    return fail('retrograde echo is incomplete');
  }

  const innerVoiceEnabled = input.innerVoice !== false;
  const rh = new Map<number, Slot[]>();
  const lh = new Map<number, Slot[]>();
  const inner = new Map<number, Slot[]>();
  for (let bar = 1; bar <= COFFEE_RUN_BARS; bar += 1) {
    rh.set(bar, []);
    lh.set(bar, []);
    inner.set(bar, []);
  }

  placeMotif(rh, opening, 1, 0);
  placeMotif(rh, answer, 2, 0);
  placeMotif(rh, warmth, 3, 1);
  placeMotif(rh, warmthLift, 4, 0.5);
  placeMotif(rh, sustained, 5, 0);
  placeMotif(rh, headLong, 6, 0);
  placeMotif(rh, up, 6, 2);
  placeMotif(rh, tailLong, 7, 0);
  add(rh, 7, 3, 1, 71, 'cr.bridge');
  placeMotif(rh, backward, 8, 0);
  add(rh, 8, 3, 1, 67, 'cr.colour');
  placeMotif(rh, down, 9, 0);
  add(rh, 9, 2.5, 1.5, 67, 'cr.colour');
  placeMotif(rh, head, 10, 0);
  placeMotif(rh, tail, 10, 2.5);
  placeMotif(rh, tailLong, 11, 1);
  placeMotif(rh, tender, 12, 0);
  placeMotif(rh, up, 13, 0.5);
  placeMotif(rh, answerLong, 14, 0);
  placeMotif(rh, up2, 15, 0);
  add(rh, 15, 3, 1, 74, 'cr.prep');
  add(rh, 16, 0, 2, 76, 'cr.prep');
  add(rh, 16, 2, 2, 79, 'cr.prep');
  placeMotif(rh, arrival, 17, 0);
  placeEvent(rh, arrivalBack.events[0]!, 18, 0, arrivalBack.id);
  add(rh, 18, 2, 2, 76, 'cr.settle');
  placeEvent(rh, { ...up.events[0]!, onset: 0 }, 19, 0.5, up.id);
  placeEvent(rh, { ...up.events[2]!, onset: 0 }, 19, 2, up.id);
  placeMotif(rh, tailLong, 20, 1);
  placeEvent(rh, { ...echo[0]!, onset: 0 }, 21, 2.5, backward.id);
  placeEvent(rh, { ...echo[1]!, onset: 0 }, 22, 2, backward.id);
  placeEvent(rh, { ...echo[2]!, onset: 0 }, 23, 3, backward.id);
  add(rh, 24, 0, 4, 69, 'cr.final', { pitches: [69, 76, 79] });

  add(lh, 1, 0, 4, 45, 'lh.sustain');
  add(lh, 2, 0, 2, 41, 'lh.sparse');
  add(lh, 2, 2.5, 1.5, 48, 'lh.sparse');
  add(lh, 3, 0, 4, 40, 'lh.dyad', { pitches: [40, 47] });
  add(lh, 4, 0, 1.5, 43, 'lh.broken');
  add(lh, 4, 1.5, 1, 50, 'lh.broken');
  add(lh, 4, 2.5, 1.5, 47, 'lh.broken');
  add(lh, 5, 0, 4, 41, 'lh.stack', { pitches: [41, 48] });
  add(lh, 6, 0, 1, 40, 'lh.bass');
  placeMotif(lh, imitation, 6, 0);
  add(lh, 7, 0, 2, 38, 'lh.move');
  add(lh, 7, 2, 1, 45, 'lh.move');
  add(lh, 7, 3, 1, 48, 'lh.move');
  add(lh, 8, 0, 2.5, 36, 'lh.sustain');
  add(lh, 8, 2.5, 1.5, 43, 'lh.sustain');
  add(lh, 9, 0, 1, 41, 'lh.arp');
  add(lh, 9, 1, 1, 45, 'lh.arp');
  add(lh, 9, 2, 2, 48, 'lh.arp');
  add(lh, 10, 0, 3, 40, 'lh.release');
  add(lh, 11, 0, 4, 38, 'lh.still');
  add(lh, 12, 0, 3, 45, 'lh.tender');
  add(lh, 12, 3, 1, 52, 'lh.tender');
  add(lh, 13, 0, 2.5, 46, 'lh.colour', { pitches: [46, 53], spelling: { step: 'B', alter: -1 } });
  add(lh, 13, 2.5, 1.5, 50, 'lh.colour');
  add(lh, 14, 0, 4, 45, 'lh.sustain');
  add(lh, 15, 0, 1, 38, 'lh.prep');
  add(lh, 15, 1, 1, 41, 'lh.prep');
  add(lh, 15, 2, 2, 45, 'lh.prep');
  add(lh, 16, 0, 2, 40, 'lh.prep');
  add(lh, 16, 2, 2, 47, 'lh.prep');
  add(lh, 17, 0, 4, 41, 'lh.arrival', { pitches: [41, 48] });
  add(lh, 18, 0, 2.5, 45, 'lh.settle');
  add(lh, 18, 2.5, 1.5, 40, 'lh.settle');
  add(lh, 19, 0, 2, 50, 'lh.thin');
  add(lh, 20, 0, 1.5, 41, 'lh.thin');
  add(lh, 21, 0, 1, 45, 'lh.echo');
  add(lh, 23, 0, 1, 40, 'lh.echo');
  add(lh, 24, 0, 4, 41, 'lh.final', { pitches: [41, 48] });

  if (innerVoiceEnabled) {
    add(inner, 17, 0, 4, 76, 'rh.inner');
    add(inner, 18, 0, 4, 72, 'rh.inner');
  }

  slur(rh, 1, 2);
  slur(rh, 3, 4);
  slur(rh, 5, 5);
  slur(rh, 6, 6);
  slur(rh, 13, 14);
  slur(rh, 17, 17);
  slur(rh, 18, 18);

  const words: Record<number, string> = {};
  for (const marker of MARKERS) {
    if (marker.words) words[marker.bar] = marker.words;
  }
  const catalogue = getInstrument('piano');
  const score: ScoreModel = {
    title: COFFEE_RUN_TITLE,
    tempo: COFFEE_RUN_TEMPO,
    timeSignature: { beats: 4, beatType: 4 },
    keySignature: { fifths: 0, mode: 'minor', hideKeySignature: false },
    measureWordsMarkings: words,
    partDynamics: {
      piano: [
        { bar: 1, beat: 0, mark: 'p' },
        { bar: 6, beat: 0, mark: 'mp' },
        { bar: 11, beat: 0, mark: 'pp' },
        { bar: 17, beat: 0, mark: 'mp' },
        { bar: 19, beat: 0, mark: 'pp', wedge: 'diminuendo' },
        { bar: 21, beat: 0, wedge: 'stop' },
      ],
    },
    pianoPedal: [
      { bar: 1, beat: 0, type: 'start' },
      { bar: 2, beat: 0, type: 'stop' },
      { bar: 2, beat: 0, type: 'start' },
      { bar: 3, beat: 0, type: 'stop' },
      { bar: 3, beat: 0, type: 'start' },
      { bar: 4, beat: 0, type: 'stop' },
      { bar: 4, beat: 0, type: 'start' },
      { bar: 5, beat: 0, type: 'stop' },
      { bar: 5, beat: 0, type: 'start' },
      { bar: 6, beat: 0, type: 'stop' },
      { bar: 6, beat: 0, type: 'start' },
      { bar: 7, beat: 0, type: 'stop' },
      { bar: 7, beat: 0, type: 'start' },
      { bar: 8, beat: 0, type: 'stop' },
      { bar: 8, beat: 0, type: 'start' },
      { bar: 9, beat: 0, type: 'stop' },
      { bar: 9, beat: 0, type: 'start' },
      { bar: 10, beat: 0, type: 'stop' },
      { bar: 10, beat: 0, type: 'start' },
      { bar: 10, beat: 3, type: 'stop' },
      { bar: 11, beat: 1, type: 'start' },
      { bar: 11, beat: 3.5, type: 'stop' },
      { bar: 12, beat: 0, type: 'start' },
      { bar: 12, beat: 3, type: 'stop' },
      { bar: 13, beat: 0, type: 'start' },
      { bar: 14, beat: 0, type: 'stop' },
      { bar: 14, beat: 0, type: 'start' },
      { bar: 15, beat: 0, type: 'stop' },
      { bar: 15, beat: 0, type: 'start' },
      { bar: 16, beat: 0, type: 'stop' },
      { bar: 16, beat: 0, type: 'start' },
      { bar: 16, beat: 3.5, type: 'stop' },
      { bar: 17, beat: 0, type: 'start' },
      { bar: 18, beat: 0, type: 'stop' },
      { bar: 18, beat: 0, type: 'start' },
      { bar: 19, beat: 0, type: 'stop' },
      { bar: 19, beat: 0, type: 'start' },
      { bar: 19, beat: 3.5, type: 'stop' },
      { bar: 20, beat: 0, type: 'start' },
      { bar: 20, beat: 3, type: 'stop' },
      { bar: 21, beat: 2.5, type: 'start' },
      { bar: 21, beat: 3.5, type: 'stop' },
      { bar: 24, beat: 0, type: 'start' },
      { bar: 24, beat: 1919 / 480, type: 'stop' },
    ],
    parts: [{
      id: 'piano',
      name: catalogue.displayName,
      instrumentIdentity: catalogue.id,
      midiProgram: catalogue.midiProgram,
      clef: 'treble',
      catalogueInstrumentSound: catalogue.instrumentSound,
      pianoGrandStaff: pianoGrandStaffConfig(innerVoiceEnabled),
      measures: harmonyBars.map((chord, index) => {
        const bar = index + 1;
        return {
          index: bar,
          chord,
          chordSymbol: chord,
          events: [
            ...fillVoice(rh.get(bar) ?? [], 1),
            ...(innerVoiceEnabled ? fillVoice(inner.get(bar) ?? [], 2) : []),
            ...fillVoice(lh.get(bar) ?? [], 3),
          ],
        };
      }),
    }],
  };

  const form = resolveFormPrecedence({
    totalBars: COFFEE_RUN_BARS,
    lockedHarmonyBarCount: harmonyBars.length,
    compiledSections: [
      { kind: 'verse', barLength: 2 },
      { kind: 'pre_chorus', barLength: 3 },
      { kind: 'verse', barLength: 5 },
      { kind: 'bridge', barLength: 2 },
      { kind: 'verse', barLength: 4 },
      { kind: 'chorus', barLength: 2 },
      { kind: 'chorus', barLength: 2 },
      { kind: 'bridge', barLength: 3 },
      { kind: 'verse', barLength: 1 },
    ],
  });
  const roles = planSectionRoles(form.sections, {
    verse_0: 'statement',
    pre_chorus_0: 'statement',
    verse_1: 'development',
    bridge_0: 'contrast',
    verse_2: 'development',
    chorus_0: 'return',
    chorus_1: 'contrast',
    bridge_1: 'contrast',
    verse_3: 'return',
  });
  const textures: PianoLhTexture[] = [
    { bar: 1, texture: 'sustained' },
    { bar: 2, texture: 'sparse' },
    { bar: 3, texture: 'sustained' },
    { bar: 4, texture: 'broken' },
    { bar: 5, texture: 'sustained' },
    { bar: 6, texture: 'response' },
    { bar: 7, texture: 'sparse' },
    { bar: 8, texture: 'sustained' },
    { bar: 9, texture: 'broken' },
    { bar: 10, texture: 'sparse' },
    { bar: 11, texture: 'sustained' },
    { bar: 12, texture: 'sustained' },
    { bar: 13, texture: 'sustained' },
    { bar: 14, texture: 'sustained' },
    { bar: 15, texture: 'broken' },
    { bar: 16, texture: 'sustained' },
    { bar: 17, texture: 'sustained' },
    { bar: 18, texture: 'sparse' },
    { bar: 19, texture: 'sparse' },
    { bar: 20, texture: 'sparse' },
    { bar: 21, texture: 'sparse' },
    { bar: 22, texture: 'sparse' },
    { bar: 23, texture: 'sparse' },
    { bar: 24, texture: 'tied-stack' },
  ];
  const plan: PianoCompositionPlan = {
    seed: input.seed,
    tempo: COFFEE_RUN_TEMPO,
    bars: COFFEE_RUN_BARS,
    harmonyBars,
    harmonyPlan: buildHarmonyPlanFromBars(harmonyBars),
    chordSymbolPlan: buildChordSymbolPlanFromBars(harmonyBars),
    form,
    roles,
    density: planDensityCurve(roles, COFFEE_RUN_BARS),
    lineageIds: chain.lineageIds,
    transformOps: chain.steps.map((step) => step.op),
    lhResponse: {
      lineageId: imitation.id,
      bar: 6,
      pitches: imitation.events.map((event) => event.midi).filter((midi): midi is number => midi !== null),
      durations: imitation.events.filter((event) => event.midi !== null).map((event) => event.duration),
    },
    returnBar: 21,
    returnLockBars: [17, 21],
    innerVoiceEnabled,
    textures,
    modalTones: [
      { bar: 1, pitch: 76, role: 'modal' },
      { bar: 1, pitch: 74, role: 'modal' },
      { bar: 1, pitch: 72, role: 'modal' },
    ],
  };

  const kept = validateLockedEventsPresent(score, locks);
  if (!kept.ok) return { ok: false, code: 'unsupported_lock', error: kept.errors.join('; ') };
  const playable = validatePianoPlayability(score, COFFEE_RUN_TEMPO);
  if (!playable.ok) return { ok: false, code: 'playability', error: playable.errors.join('; ') };
  const independent = validatePianoIndependence(score);
  if (!independent.ok) return fail(independent.errors.join('; '));
  const developed = validateLhDevelopment(score);
  if (!developed.ok) return fail(developed.errors.join('; '));
  const barMath = validateStrictBarMath(score);
  if (!barMath.valid) return fail(barMath.errors.join('; '));
  const rhPeak = score.parts[0]!.measures.flatMap((measure) => measure.events
    .filter((event) => event.kind === 'note' && (event.voice ?? 1) === 1)
    .map((event) => event.kind === 'note' ? { bar: measure.index, pitch: event.pitch } : { bar: 0, pitch: 0 }));
  const peak = Math.max(...rhPeak.map((event) => event.pitch));
  if (peak !== 83 || rhPeak.some((event) => event.pitch === 83 && event.bar !== 17)) {
    return fail('bar 17 is not the unique melodic peak');
  }

  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) return fail(exported.errors.join('; ') || 'coffee run export failed');
  const compared = comparePianoScoreToXml(score, exported.xml);
  if (!compared.ok || compared.elapsedSeconds !== 90) {
    return { ok: false, code: 'parity', error: compared.errors.join('; ') || `duration ${compared.elapsedSeconds}` };
  }
  return {
    ok: true,
    score,
    xml: exported.xml,
    plan,
    lockSnapshot: {
      harmonyBars: [...harmonyBars],
      form: structuredClone(form),
      lockedEvents: structuredClone(locks),
    },
    elapsedSeconds: compared.elapsedSeconds,
    soundingAttacks: compared.soundingAttacks,
  };
}
