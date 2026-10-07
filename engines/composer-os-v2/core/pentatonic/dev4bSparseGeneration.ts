/**
 * Dev 4B — sparse phrase pilot.
 * Pentatonic path supplies a colour field. Existing phrase / motif / guitar
 * authority write the notes. Existing GCE scores them. Existing MusicXML
 * exporter writes the audition.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DOMParser as XmldomDOMParser } from '@xmldom/xmldom';
import { evaluateGce, defaultGceWeights } from '../evaluation/gceEvaluator';
import type { GceCategory, GceEvaluationResult } from '../evaluation/evaluationTypes';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { ACOUSTIC_UPRIGHT_BASS } from '../instrument-profiles/uprightBassProfile';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { computeEnsembleStagger, emitGuitarPhraseBar } from '../goldenPath/guitarPhraseAuthority';
import type { PhraseIntent } from '../goldenPath/phraseIntentTypes';
import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import type { MusicContext } from '../music-context/musicContextTypes';
import { generateMotif } from '../motif/motifGenerator';
import { buildPhrase } from '../phrase/phraseBuilder';
import type { Phrase } from '../phrase/phraseTypes';
import { createMeasure, createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import type { ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { validateMusicXml } from '../../../../src/utils/musicXmlValidator';
import { analyzePentatonicScore, type PentatonicScoreAnalysis, type PentatonicScoreEvent } from './analyzeScore';
import { pentatonicFrozenConfigFingerprint } from './frozenConfigFingerprint';
import {
  collectionPitchClasses,
  degreeOf,
  inGuitarRange,
  maxAdjacentCollectionRun,
  type MotifMapMethod,
  type PentatonicCollectionView,
} from './motifTransform';
import { mapMotifPitches } from './motifTransform';
import { PENTATONIC_OUTPUT_ROOT } from './dev4Audition';
import { sharpName } from './pitch';

export const DEV4B_DEFAULT_MOTIF_METHOD: MotifMapMethod = 'M-DEG';

export const DEV4B_OUTPUT_DIR = `${PENTATONIC_OUTPUT_ROOT}/Generated-Phrases/Dev4B`;

const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';

export type Dev4bActivity = 'VERY_SPARSE' | 'SPARSE' | 'MODERATE';

export type Dev4bPurpose = 'MOTIF' | 'LYRICAL_ANSWER' | 'COUNTERLINE' | 'COMPING_FRAGMENT' | 'NO_PHRASE';

/** Canonical PhraseIntent. No parallel intent type. */
export const DEV4B_PHRASE_INTENT: Record<Exclude<Dev4bPurpose, 'NO_PHRASE'>, PhraseIntent> = {
  MOTIF: 'guitar_lead',
  LYRICAL_ANSWER: 'answer_guitar',
  COUNTERLINE: 'development',
  COMPING_FRAGMENT: 'bass_lead',
};

const ACTIVITIES: readonly Dev4bActivity[] = ['VERY_SPARSE', 'SPARSE', 'MODERATE'];
const PURPOSES: readonly Exclude<Dev4bPurpose, 'NO_PHRASE'>[] = [
  'MOTIF',
  'LYRICAL_ANSWER',
  'COUNTERLINE',
  'COMPING_FRAGMENT',
];

export interface Dev4bPiece {
  id: 'impossible-metaphysics' | 'the-mirror' | 'after-everything';
  file: string;
  slug: string;
  title: string;
  seed: number;
  rule: 'colour-contrast' | 'continuity-transform' | 'space-home-path';
}

export const DEV4B_PIECES: readonly Dev4bPiece[] = [
  {
    id: 'impossible-metaphysics',
    file: '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml',
    slug: 'Impossible-Metaphysics',
    title: 'Impossible Metaphysics',
    seed: 84041,
    rule: 'colour-contrast',
  },
  {
    id: 'the-mirror',
    file: '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml',
    slug: 'The-Mirror',
    title: 'The Mirror',
    seed: 84042,
    rule: 'continuity-transform',
  },
  {
    id: 'after-everything',
    file: '09-After-Everything-Duo-Leadsheet-V1.0.musicxml',
    slug: 'After-Everything',
    title: 'After Everything',
    seed: 84043,
    rule: 'space-home-path',
  },
];

export interface AntiScaleRun {
  maxRun: number;
  status: 'clear' | 'penalise' | 'reject';
  reason: string;
}

export interface Dev4bDiagnostics {
  selectedPentatonic: string;
  phrasePurpose: Dev4bPurpose;
  activity: Dev4bActivity | 'NO_PHRASE';
  noteCount: number;
  restProportion: number;
  pitchClassSubset: string[];
  pentatonicCoverage: number;
  outOfCollection: string[];
  antiScaleRun: AntiScaleRun;
  pitchRange: string;
  largestMelodicInterval: number | null;
  landing: string;
}

export interface Dev4bGceReport {
  applied: boolean;
  reason: string;
  finalScore: number | null;
  pass: boolean | null;
  threshold: number | null;
  weakestCategory: string | null;
  strongestCategory: string | null;
  categories: { category: GceCategory; score: number; weight: number }[];
  warnings: string[];
  penalties: string[];
}

export interface Dev4bCandidate {
  id: string;
  purpose: Dev4bPurpose;
  activity: Dev4bActivity | 'NO_PHRASE';
  method: MotifMapMethod | null;
  intent: PhraseIntent | null;
  seed: number;
  signature: string;
  phrase: Phrase | null;
  diagnostics: Dev4bDiagnostics;
  gce: Dev4bGceReport;
  gceWeak: boolean;
  selectedLetter: string | null;
}

export interface Dev4bRegionChoice {
  firstBar: number;
  lastBar: number;
  collectionName: string;
  meanLocalFit: number | null;
  boundaryKind: string;
  reason: string;
}

export interface Dev4bAuditionFile {
  letter: string;
  filePath: string;
  valid: boolean;
  errors: string[];
}

export interface Dev4bPieceResult {
  piece: Dev4bPiece;
  sourceSha256: string;
  analysisSong: string;
  homeReading: string;
  region: Dev4bRegionChoice;
  context: {
    presetId: string;
    seed: number;
    meter: MusicContext['meter'];
    harmonyBars: readonly string[];
    checksum: string;
    motifId: string | null;
    anchorMidi: number | null;
    receiptKind: string | null;
  };
  pool: Dev4bCandidate[];
  selected: Dev4bCandidate[];
  auditions: Dev4bAuditionFile[];
}

export interface Dev4bRun {
  fingerprint: string;
  pieces: Dev4bPieceResult[];
  sourceHashesAfter: Record<string, string>;
  reportPath: string;
}

export function antiScaleRun(pitches: readonly number[], collection: PentatonicCollectionView): AntiScaleRun {
  if (pitches.length < 2) {
    return { maxRun: 0, status: 'clear', reason: 'Fewer than two pitches. A single adjacent pair is not in play.' };
  }
  const maxRun = maxAdjacentCollectionRun(pitches, collection);
  const steps = pitches.length - 1;
  if (maxRun >= 3 || (pitches.length >= 3 && maxRun === steps)) {
    return {
      maxRun,
      status: 'reject',
      reason: `Adjacent pentatonic motion runs for ${maxRun} step(s) across ${pitches.length} pitches.`,
    };
  }
  if (maxRun === 2) {
    return { maxRun, status: 'penalise', reason: 'A three-note adjacent cell sits inside a longer phrase.' };
  }
  return { maxRun, status: 'clear', reason: 'Adjacent steps stay local. Isolated pairs are kept.' };
}

export function collectionFromPathName(name: string, homeRelationshipLabel: string | null): PentatonicCollectionView | null {
  const match = name.match(/^([A-G](?:#|b)?) (Major|Minor) Pentatonic$/);
  if (!match) return null;
  return {
    name,
    archetypeId: match[2] === 'Minor' ? 'minor_pentatonic' : 'major_pentatonic',
    referenceNote: match[1]!,
    homeRelationshipLabel,
  };
}

interface RegionSpan {
  first: number;
  last: number;
  name: string;
  fit: number | null;
  boundaryKind: string;
  homeRelationshipLabel: string | null;
}

function regionSpans(analysis: PentatonicScoreAnalysis): RegionSpan[] {
  return analysis.regions.map((region) => ({
    first: Number(region.firstSourceLabel),
    last: Number(region.lastSourceLabel),
    name: region.collectionName,
    fit: region.meanLocalFit,
    boundaryKind: region.boundaryKind,
    homeRelationshipLabel: region.homeRelationshipLabel,
  }));
}

function uniformMeter(
  analysis: PentatonicScoreAnalysis,
  first: number,
  last: number,
  beats: number,
  beatType: number
): boolean {
  const events = analysis.score.events.filter((event) => {
    const bar = Number(event.sourceLabel);
    return bar >= first && bar <= last;
  });
  return events.length > 0 && events.every((event) => event.timeBeats === beats && event.timeBeatType === beatType);
}

export function chooseDev4bRegion(piece: Dev4bPiece, analysis: PentatonicScoreAnalysis): Dev4bRegionChoice {
  const spans = regionSpans(analysis);
  if (piece.rule === 'colour-contrast') {
    for (let index = 1; index < spans.length - 1; index += 1) {
      const region = spans[index]!;
      const previous = spans[index - 1]!;
      const next = spans[index + 1]!;
      const length = region.last - region.first + 1;
      if (region.boundaryKind !== 'path' || length !== 2 || region.name === 'NONE') continue;
      if (region.name === previous.name || region.name === next.name) continue;
      if (previous.name !== next.name) continue;
      if (!uniformMeter(analysis, region.first, region.last, 4, 4)) continue;
      return {
        firstBar: region.first,
        lastBar: region.last,
        collectionName: region.name,
        meanLocalFit: region.fit,
        boundaryKind: region.boundaryKind,
        reason:
          `Two-bar path colour ${region.name} sits between matching ${previous.name} fields ` +
          `(mm. ${previous.first}–${previous.last} and mm. ${next.first}–${next.last}). ` +
          'The pocket is a contrast, and it is not the highest-fit region in the song. ' +
          'Both bars are 4/4, which the existing phrase emitter can fill.',
      };
    }
  }
  if (piece.rule === 'continuity-transform') {
    const opening = spans[0];
    for (const region of spans) {
      const length = region.last - region.first + 1;
      if (region === opening || region.boundaryKind === 'opening') continue;
      if (length !== 2 || region.name === 'NONE') continue;
      if (!uniformMeter(analysis, region.first, region.last, 4, 4)) continue;
      const left = spans.filter((span) => span.last < region.first).at(-1);
      const right = spans.find((span) => span.first > region.last);
      return {
        firstBar: region.first,
        lastBar: region.last,
        collectionName: region.name,
        meanLocalFit: region.fit,
        boundaryKind: region.boundaryKind,
        reason:
          `Short interior path region mm. ${region.first}–${region.last} is ${region.name}. ` +
          `The field before it is ${left?.name ?? 'the opening'} and the field after it is ${right?.name ?? 'the next region'}. ` +
          'The audition can keep those neighbours so a two-bar colour change is heard as transformation, not as a fragment.',
      };
    }
  }
  if (piece.rule === 'space-home-path') {
    const lengths = spans.map((span) => span.last - span.first + 1);
    const longest = Math.max(...lengths);
    for (const region of spans) {
      const length = region.last - region.first + 1;
      if (region.boundaryKind === 'opening' || region.name === 'NONE' || length >= longest) continue;
      const events = analysis.score.events.filter((event) => {
        const bar = Number(event.sourceLabel);
        return bar >= region.first && bar <= region.last;
      });
      const beats = events[0]?.timeBeats;
      const beatType = events[0]?.timeBeatType;
      if (!beats || !beatType || !uniformMeter(analysis, region.first, region.last, beats, beatType)) continue;
      const opening = spans[0]!;
      return {
        firstBar: region.first,
        lastBar: region.last,
        collectionName: region.name,
        meanLocalFit: region.fit,
        boundaryKind: region.boundaryKind,
        reason:
          `First path departure from the opening ${opening.name} field. ` +
          `mm. ${region.first}–${region.last} is ${region.name} in ${beats}/${beatType}, ` +
          `fit ${region.fit ?? 'n/a'}, shorter than the long return that follows. ` +
          'The test is space and the move away from the prevailing field, not pentatonic density.',
      };
    }
  }
  throw new Error(`Dev 4B found no pilot region for ${piece.title}.`);
}

function activityDensity(activity: Dev4bActivity): { density: 'sparse' | 'medium'; reduceAttack: boolean } {
  if (activity === 'VERY_SPARSE') return { density: 'sparse', reduceAttack: true };
  if (activity === 'MODERATE') return { density: 'medium', reduceAttack: false };
  return { density: 'sparse', reduceAttack: false };
}

function applyColourField(
  events: readonly ScoreEvent[],
  collection: PentatonicCollectionView,
  method: MotifMapMethod,
  meter: { beats: number; beatType: number }
): ScoreEvent[] {
  return events.map((event) => {
    if (event.kind !== 'note') return event;
    const motif = {
      id: 'dev4b',
      barCount: 1,
      notes: [{ pitch: event.pitch, startBeat: event.startBeat, duration: event.duration }],
    };
    const mapped = mapMotifPitches({
      motif,
      rhythm: [{ kind: 'note', startBeat: event.startBeat, duration: event.duration }],
      source: collection,
      target: collection,
      method,
      meter,
    });
    const row = mapped.notes[0]!;
    const pitch = row.preservedChromaticOrnament || row.sourceDegree === null ? event.pitch : row.pitch;
    return { ...event, pitch };
  });
}

function voiceNumbers(events: readonly ScoreEvent[]): number[] {
  const voices = new Set<number>();
  for (const event of events) voices.add(event.voice ?? 1);
  if (voices.size === 0) voices.add(1);
  return [...voices].sort((a, b) => a - b);
}

function quantizeBeat(beats: number): number {
  return Math.round(beats * 480) / 480;
}

function fitVoice(events: readonly ScoreEvent[], voice: number, span: number): ScoreEvent[] {
  const limit = quantizeBeat(span);
  const clipped: ScoreEvent[] = [];
  for (const event of events) {
    if ((event.voice ?? 1) !== voice) continue;
    const startBeat = quantizeBeat(event.startBeat);
    if (startBeat >= limit - 1e-6) continue;
    const duration = quantizeBeat(Math.min(event.duration, limit - startBeat));
    if (duration <= 1e-6) continue;
    clipped.push({ ...event, startBeat, duration });
  }
  clipped.sort((a, b) => a.startBeat - b.startBeat);
  const out: ScoreEvent[] = [];
  let cursor = 0;
  for (const event of clipped) {
    if (event.startBeat > cursor + 1e-6) out.push(createRest(cursor, quantizeBeat(event.startBeat - cursor), voice));
    const start = Math.max(event.startBeat, cursor);
    const duration = quantizeBeat(event.startBeat + event.duration - start);
    if (duration > 1e-6) out.push({ ...event, startBeat: start, duration });
    cursor = quantizeBeat(Math.max(cursor, start + Math.max(duration, 0)));
  }
  if (cursor < limit - 1e-6) out.push(createRest(cursor, quantizeBeat(limit - cursor), voice));
  if (out.length === 0) out.push(createRest(0, limit, voice));
  return out;
}

function fitBar(events: readonly ScoreEvent[], span: number): ScoreEvent[] {
  const voices = events.length === 0 ? [1] : voiceNumbers(events);
  return voices.flatMap((voice) => fitVoice(events, voice, span));
}

function linePitches(events: readonly ScoreEvent[]): number[] {
  return events
    .filter((event) => event.kind === 'note' && (event.voice ?? 1) === 1)
    .sort((a, b) => a.startBeat - b.startBeat)
    .map((event) => event.pitch);
}

function restProportion(events: readonly ScoreEvent[], span: number): number {
  const voice = events.filter((event) => (event.voice ?? 1) === 1);
  const rest = voice.filter((event) => event.kind === 'rest').reduce((sum, event) => sum + event.duration, 0);
  return span <= 0 ? 1 : Math.round((rest / span) * 1000) / 1000;
}

function chordRootPc(symbol: string | undefined): number | null {
  const match = symbol?.match(/^([A-G])([#b])?/);
  if (!match) return null;
  const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const delta = match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0;
  return ((natural[match[1]!] ?? 0) + delta + 12) % 12;
}

function diagnosticsFor(args: {
  collection: PentatonicCollectionView | null;
  purpose: Dev4bPurpose;
  activity: Dev4bActivity | 'NO_PHRASE';
  pitches: readonly number[];
  events: readonly ScoreEvent[];
  span: number;
  chord: string | undefined;
}): Dev4bDiagnostics {
  const collection = args.collection;
  const pcs = collection ? collectionPitchClasses(collection) : [];
  const used = [...new Set(args.pitches.map((pitch) => ((pitch % 12) + 12) % 12))];
  const inside = used.filter((pc) => pcs.includes(pc));
  const outside = args.pitches.filter((pitch) => collection !== null && degreeOf(pitch, collection) === null);
  let largest: number | null = null;
  for (let index = 1; index < args.pitches.length; index += 1) {
    const leap = Math.abs(args.pitches[index]! - args.pitches[index - 1]!);
    if (largest === null || leap > largest) largest = leap;
  }
  const low = args.pitches.length ? Math.min(...args.pitches) : null;
  const high = args.pitches.length ? Math.max(...args.pitches) : null;
  const last = args.pitches.at(-1);
  const root = chordRootPc(args.chord);
  const landing =
    last === undefined
      ? 'no landing note'
      : `MIDI ${last} pc ${sharpName(last)}` +
        (collection && degreeOf(last, collection) !== null ? ` degree ${degreeOf(last, collection)! + 1}` : ' outside collection') +
        (root === null ? '' : ` chord-root distance ${Math.min(Math.abs(((last % 12) + 12) % 12 - root), 12 - Math.abs(((last % 12) + 12) % 12 - root))}`);
  return {
    selectedPentatonic: collection?.name ?? 'NONE',
    phrasePurpose: args.purpose,
    activity: args.activity,
    noteCount: args.pitches.length,
    restProportion: restProportion(args.events, args.span),
    pitchClassSubset: inside.map((pc) => sharpName(pc)),
    pentatonicCoverage: pcs.length === 0 ? 0 : Math.round((inside.length / pcs.length) * 1000) / 1000,
    outOfCollection: outside.map((pitch) => `${sharpName(pitch)}${pitch}`),
    antiScaleRun: collection
      ? antiScaleRun(args.pitches, collection)
      : { maxRun: 0, status: 'clear', reason: 'No collection. Scale-run guard does not apply.' },
    pitchRange: low === null || high === null ? 'silent' : `MIDI ${low}–${high}`,
    largestMelodicInterval: largest,
    landing,
  };
}

function gceFor(score: ScoreModel | null): Dev4bGceReport {
  if (!score) {
    return {
      applied: false,
      reason: 'NO_PHRASE has no pitched line. Canonical GCE was not given an empty melody.',
      finalScore: null,
      pass: null,
      threshold: null,
      weakestCategory: null,
      strongestCategory: null,
      categories: [],
      warnings: [],
      penalties: [],
    };
  }
  try {
    const result: GceEvaluationResult = evaluateGce({
      output: score,
      features: {},
      weights: defaultGceWeights,
    });
    return {
      applied: true,
      reason: 'evaluateGce on the generated guitar phrase score. Threshold and pass flag are the canonical result.',
      finalScore: result.finalScore,
      pass: result.pass,
      threshold: result.threshold,
      weakestCategory: result.weakestCategory,
      strongestCategory: result.strongestCategory,
      categories: Object.values(result.categories).map((row) => ({
        category: row.category,
        score: row.score,
        weight: row.weight,
      })),
      warnings: result.notes ?? [],
      penalties: [],
    };
  } catch (error) {
    return {
      applied: false,
      reason: error instanceof Error ? error.message : String(error),
      finalScore: null,
      pass: null,
      threshold: null,
      weakestCategory: null,
      strongestCategory: null,
      categories: [],
      warnings: [],
      penalties: [],
    };
  }
}

function phraseScore(args: {
  title: string;
  events: readonly ScoreEvent[];
  chord: string | undefined;
  beats: number;
  beatType: number;
  fifths: number;
  mode: 'major' | 'minor';
  bpm: number;
}): ScoreModel {
  const span = args.beats * (4 / args.beatType);
  const part = createPart(
    'guitar',
    'Electric Guitar',
    CLEAN_ELECTRIC_GUITAR.instrumentIdentity,
    CLEAN_ELECTRIC_GUITAR.midiProgram,
    'treble',
    1,
    () => args.chord,
    () => undefined
  );
  const measure = part.measures[0]!;
  measure.measureBeatSpanQuarters = span;
  measure.events = fitBar(args.events, span);
  measure.chord = args.chord;
  measure.chordSymbol = args.chord;
  const score = createScore(args.title, [part], { tempo: args.bpm });
  score.timeSignature = { beats: args.beats, beatType: args.beatType };
  score.barMeterMap = { 1: { numerator: args.beats, denominator: args.beatType } };
  score.keySignature = { fifths: args.fifths, mode: args.mode, hideKeySignature: false };
  return score;
}

function emitPhrase(args: {
  purpose: Exclude<Dev4bPurpose, 'NO_PHRASE'>;
  activity: Dev4bActivity;
  seed: number;
  chord: string;
  anchorMidi: number | undefined;
  beats: number;
  beatType: number;
}): ScoreEvent[] {
  const measure = createMeasure(1, args.chord);
  const span = args.beats * (4 / args.beatType);
  measure.measureBeatSpanQuarters = span;
  const intent = DEV4B_PHRASE_INTENT[args.purpose];
  const { density, reduceAttack } = activityDensity(args.activity);
  const stagger = computeEnsembleStagger(1, args.seed, intent);
  const [low, high] = CLEAN_ELECTRIC_GUITAR.preferredMelodicZone;
  emitGuitarPhraseBar({
    m: measure,
    bar: 1,
    chord: args.chord,
    effectiveLow: low,
    effectiveHigh: high,
    density,
    useOffbeat: false,
    reduceAttack,
    intent,
    staggerG: stagger.guitar,
    seed: args.seed,
    anchorMidi: args.anchorMidi,
    swingDuo: false,
    triadPairs: args.purpose === 'COMPING_FRAGMENT',
  });
  return fitBar(measure.events, span);
}

function buildPieceContext(piece: Dev4bPiece, regionEvents: readonly PentatonicScoreEvent[], collectionName: string): MusicContext {
  const bars = regionEvents.map((event) => event.chordSymbol ?? 'N.C.');
  const beats = regionEvents[0]?.timeBeats ?? 4;
  const beatType = regionEvents[0]?.timeBeatType ?? 4;
  const [low, high] = CLEAN_ELECTRIC_GUITAR.preferredMelodicZone;
  const motif = generateMotif(piece.seed, low, high, { duoLock: true, metheny: true })[0];
  const context = buildMusicContextFromHarmonyBars({
    harmonyBars: bars,
    sourceEngineId: 'pentatonic-engine',
    presetId: 'guitar_bass_duo',
    seed: piece.seed,
    bpm: 72,
    receipts: [
      {
        engine: 'pentatonic',
        kind: 'dev4b-colour-field',
        payload: {
          collection: collectionName,
          method: DEV4B_DEFAULT_MOTIF_METHOD,
          nearAvailable: true,
          pathEngine: 'dev-3.7',
        },
      },
    ],
  });
  context.meter = { beats, beatType };
  if (motif) {
    const pitches = motif.notes.map((note) => note.pitch);
    context.motif = {
      id: `${piece.id}-anchor`,
      intervalPattern: pitches.slice(1).map((pitch, index) => pitch - pitches[index]!),
      rhythmPattern: motif.notes.map((note) => ({ startBeat: note.startBeat, duration: note.duration })),
      contourPattern: pitches.slice(1).map((pitch, index) => Math.sign(pitch - pitches[index]!)),
      anchorMidi: pitches[0],
      seedPitches: pitches,
      producer: 'user',
    };
  }
  return context;
}

function representativeCandidate(args: {
  piece: Dev4bPiece;
  context: MusicContext;
  collection: PentatonicCollectionView;
  purpose: Exclude<Dev4bPurpose, 'NO_PHRASE'>;
  activity: Dev4bActivity;
  chord: string;
  fifths: number;
  mode: 'major' | 'minor';
  bpm: number;
}): Dev4bCandidate {
  const beats = args.context.meter.beats;
  const beatType = args.context.meter.beatType;
  const span = beats * (4 / beatType);
  const purposeIndex = PURPOSES.indexOf(args.purpose);
  const activityIndex = ACTIVITIES.indexOf(args.activity);
  let chosen: ScoreEvent[] = [];
  let seed = args.piece.seed;
  let diagnostics = diagnosticsFor({
    collection: args.collection,
    purpose: args.purpose,
    activity: args.activity,
    pitches: [],
    events: [],
    span,
    chord: args.chord,
  });
  for (let attempt = 0; attempt < 4; attempt += 1) {
    seed = args.piece.seed + purposeIndex * 100 + activityIndex * 10 + attempt;
    const raw = emitPhrase({
      purpose: args.purpose,
      activity: args.activity,
      seed,
      chord: args.chord,
      anchorMidi: args.context.motif?.anchorMidi,
      beats,
      beatType,
    });
    const coloured = applyColourField(raw, args.collection, DEV4B_DEFAULT_MOTIF_METHOD, { beats, beatType });
    const fitted = fitBar(coloured, span).map((event) => {
      if (event.kind !== 'note') return event;
      return inGuitarRange(event.pitch) ? event : { ...event, pitch: Math.max(40, Math.min(88, event.pitch)) };
    });
    const pitches = linePitches(fitted);
    diagnostics = diagnosticsFor({
      collection: args.collection,
      purpose: args.purpose,
      activity: args.activity,
      pitches,
      events: fitted,
      span,
      chord: args.chord,
    });
    chosen = fitted;
    if (diagnostics.antiScaleRun.status !== 'reject') break;
  }
  const pitches = linePitches(chosen);
  const phrase =
    pitches.length === 0
      ? null
      : buildPhrase(
          `${args.purpose}-${args.activity}`,
          { startBar: 1, endBar: 1 },
          chosen.filter((event): event is Extract<ScoreEvent, { kind: 'note' }> => event.kind === 'note' && (event.voice ?? 1) === 1),
          'ambiguous'
        );
  const gceScore = pitches.length
    ? phraseScore({
        title: `${args.piece.title} ${args.purpose} ${args.activity}`,
        events: chosen,
        chord: args.chord,
        beats,
        beatType,
        fifths: args.fifths,
        mode: args.mode,
        bpm: args.bpm,
      })
    : null;
  const gce = gceFor(gceScore);
  const melodic = gce.categories.find((row) => row.category === 'melodicIdentity')?.score;
  return {
    id: `${args.purpose}-${args.activity}`,
    purpose: args.purpose,
    activity: args.activity,
    method: DEV4B_DEFAULT_MOTIF_METHOD,
    intent: DEV4B_PHRASE_INTENT[args.purpose],
    seed,
    signature: pitches.join(','),
    phrase,
    diagnostics,
    gce,
    gceWeak: melodic !== undefined && melodic <= 6,
    selectedLetter: null,
  };
}

function silenceCandidate(collectionName: string): Dev4bCandidate {
  return {
    id: 'NO_PHRASE',
    purpose: 'NO_PHRASE',
    activity: 'NO_PHRASE',
    method: null,
    intent: null,
    seed: 0,
    signature: 'silence',
    phrase: null,
    diagnostics: diagnosticsFor({
      collection: collectionFromPathName(collectionName, null),
      purpose: 'NO_PHRASE',
      activity: 'NO_PHRASE',
      pitches: [],
      events: [createRest(0, 4, 1)],
      span: 4,
      chord: undefined,
    }),
    gce: gceFor(null),
    gceWeak: false,
    selectedLetter: null,
  };
}

function activityRank(activity: Dev4bActivity | 'NO_PHRASE'): number {
  if (activity === 'SPARSE') return 0;
  if (activity === 'VERY_SPARSE') return 1;
  if (activity === 'MODERATE') return 2;
  return 3;
}

function scaleRank(status: AntiScaleRun['status']): number {
  if (status === 'clear') return 0;
  if (status === 'penalise') return 1;
  return 2;
}

function betterCandidate(left: Dev4bCandidate, right: Dev4bCandidate): number {
  if (left.gceWeak !== right.gceWeak) return left.gceWeak ? 1 : -1;
  const activity = activityRank(left.activity) - activityRank(right.activity);
  if (activity !== 0) return activity;
  return scaleRank(left.diagnostics.antiScaleRun.status) - scaleRank(right.diagnostics.antiScaleRun.status);
}

export function selectDev4bCandidates(piece: Dev4bPiece, pool: readonly Dev4bCandidate[]): Dev4bCandidate[] {
  const viable = pool.filter(
    (candidate) => candidate.purpose !== 'NO_PHRASE' && candidate.diagnostics.antiScaleRun.status !== 'reject' && candidate.signature !== ''
  );
  const picked: Dev4bCandidate[] = [];
  const seen = new Set<string>();
  const take = (candidate: Dev4bCandidate | undefined) => {
    if (!candidate || picked.length >= 3) return;
    if (seen.has(candidate.signature)) return;
    seen.add(candidate.signature);
    picked.push(candidate);
  };
  for (const purpose of PURPOSES) {
    const ranked = viable.filter((candidate) => candidate.purpose === purpose).sort(betterCandidate);
    take(ranked[0]);
  }
  const silence = pool.find((candidate) => candidate.purpose === 'NO_PHRASE');
  if (piece.rule === 'space-home-path' && silence) {
    if (picked.length >= 3) picked.pop();
    take(silence);
  }
  if (picked.length < 3) {
    const extras = [...viable].sort(betterCandidate);
    for (const candidate of extras) take(candidate);
  }
  if (picked.length < 3 && silence) take(silence);
  return picked.slice(0, 3);
}

interface SoundingMeasure {
  label: string;
  events: ScoreEvent[];
}

interface ReadPart {
  chromatic: number;
  octaveChange: number;
  measures: SoundingMeasure[];
}

function localName(element: Element): string {
  return element.localName || element.tagName;
}

function elementsOf(parent: Element): Element[] {
  const out: Element[] = [];
  const list = parent.childNodes;
  for (let index = 0; index < list.length; index += 1) {
    const child = list[index]!;
    if (child.nodeType === 1) out.push(child as Element);
  }
  return out;
}
function kids(parent: Element, tag: string): Element[] {
  return elementsOf(parent).filter((element) => localName(element) === tag);
}

function textOf(element: Element, tag: string): string | undefined {
  const value = kids(element, tag)[0]?.textContent?.trim();
  return value ? value : undefined;
}

function soundingMidi(note: Element, chromatic: number, octaveChange: number): number {
  const pitch = kids(note, 'pitch')[0];
  if (!pitch) return 60;
  const step = textOf(pitch, 'step') ?? 'C';
  const alter = Number(textOf(pitch, 'alter') ?? 0);
  const octave = Number(textOf(pitch, 'octave') ?? 4);
  const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const written = (octave + 1) * 12 + (natural[step] ?? 0) + alter;
  return written + chromatic + octaveChange * 12;
}

function readPart(xml: string, role: 'guitar' | 'bass'): ReadPart {
  const doc = new XmldomDOMParser().parseFromString(xml, 'application/xml');
  const root = doc.documentElement;
  if (!root) throw new Error('MusicXML has no document element.');
  const wanted = role === 'guitar' ? /guitar/i : /bass/i;
  let id = '';
  for (const list of kids(root, 'part-list')) {
    for (const scorePart of kids(list, 'score-part')) {
      const partName = textOf(scorePart, 'part-name') ?? '';
      const instrument = kids(scorePart, 'score-instrument')
        .map((node) => textOf(node, 'instrument-name') ?? '')
        .join(' ');
      if (wanted.test(instrument) || wanted.test(partName)) id = scorePart.getAttribute('id') ?? '';
    }
  }
  const part = kids(root, 'part').find((node) => node.getAttribute('id') === id);
  if (!part) throw new Error(`No ${role} part was in the source score.`);
  let divisions = 1;
  let chromatic = 0;
  let octaveChange = 0;
  const measures: SoundingMeasure[] = [];
  for (const measure of kids(part, 'measure')) {
    const attributes = kids(measure, 'attributes')[0];
    if (attributes) {
      const nextDivisions = Number(textOf(attributes, 'divisions'));
      if (Number.isFinite(nextDivisions) && nextDivisions > 0) divisions = nextDivisions;
      const transpose = kids(attributes, 'transpose')[0];
      if (transpose) {
        const nextChromatic = Number(textOf(transpose, 'chromatic'));
        const nextOctave = Number(textOf(transpose, 'octave-change'));
        if (Number.isFinite(nextChromatic)) chromatic = nextChromatic;
        if (Number.isFinite(nextOctave)) octaveChange = nextOctave;
      }
    }
    const voiceTime = new Map<number, number>();
    const events: ScoreEvent[] = [];
    for (const child of elementsOf(measure)) {
      const name = localName(child);
      if (name === 'backup' || name === 'forward') {
        const delta = Number(textOf(child, 'duration') ?? 0) / divisions;
        const sign = name === 'backup' ? -1 : 1;
        for (const [voice, time] of voiceTime) voiceTime.set(voice, Math.max(0, time + sign * delta));
        continue;
      }
      if (name !== 'note') continue;
      if (kids(child, 'grace').length > 0 || kids(child, 'cue').length > 0) continue;
      const voice = Number(textOf(child, 'voice') ?? '1');
      const duration = Number(textOf(child, 'duration') ?? 0) / divisions;
      const chord = kids(child, 'chord').length > 0;
      const cursor = voiceTime.get(voice) ?? 0;
      const start = chord ? cursor - duration : cursor;
      if (!chord) voiceTime.set(voice, start + duration);
      if (kids(child, 'rest').length > 0) {
        events.push(createRest(Math.max(0, start), duration, voice));
        continue;
      }
      if (kids(child, 'pitch').length === 0) continue;
      const note = createNote(soundingMidi(child, chromatic, octaveChange), Math.max(0, start), duration, voice);
      const ties = kids(child, 'tie').map((tie) => tie.getAttribute('type'));
      if (ties.includes('start')) note.tieStart = true;
      if (ties.includes('stop')) note.tieStop = true;
      events.push(note);
    }
    measures.push({ label: measure.getAttribute('number') ?? String(measures.length + 1), events });
  }
  return { chromatic, octaveChange, measures };
}

function tempoOf(xml: string): number {
  const sound = xml.match(/tempo="([\d.]+)"/)?.[1];
  const words = xml.match(/<per-minute>([\d.]+)<\/per-minute>/)?.[1];
  const bpm = Number(sound ?? words ?? 72);
  return Number.isFinite(bpm) && bpm > 0 ? bpm : 72;
}

function toWritten(event: ScoreEvent, chromatic: number, octaveChange: number): ScoreEvent {
  if (event.kind !== 'note') return event;
  return { ...event, pitch: event.pitch - chromatic - octaveChange * 12 };
}

function staffLabel(candidate: Dev4bCandidate, sourceBar: number, space: boolean): string {
  if (space) return 'PENTATONIC DEV4B\nREGION SPACE';
  return [
    'PENTATONIC DEV4B',
    `PURPOSE: ${candidate.purpose}`,
    `ACTIVITY: ${candidate.activity}`,
    `RESOURCE: ${candidate.diagnostics.selectedPentatonic}`,
    `CANDIDATE: ${candidate.selectedLetter ?? ''}`,
    `SOURCE mm. ${sourceBar}`,
  ].join('\n');
}

function buildAudition(args: {
  piece: Dev4bPiece;
  candidate: Dev4bCandidate;
  analysis: PentatonicScoreAnalysis;
  guitar: ReadPart;
  bass: ReadPart;
  generated: readonly ScoreEvent[] | null;
  bpm: number;
}): ScoreModel {
  const region = chooseDev4bRegion(args.piece, args.analysis);
  const labels = args.analysis.score.events
    .map((event) => Number(event.sourceLabel))
    .filter((bar) => bar >= region.firstBar - 2 && bar <= region.lastBar + 2);
  const fifths = args.analysis.score.keySignatures[0]?.fifths ?? 0;
  const mode = args.analysis.score.keySignatures[0]?.mode === 'minor' ? 'minor' : 'major';
  const guitarPart = createPart(
    'guitar',
    'Electric Guitar',
    CLEAN_ELECTRIC_GUITAR.instrumentIdentity,
    CLEAN_ELECTRIC_GUITAR.midiProgram,
    'treble',
    labels.length,
    () => undefined,
    () => undefined
  );
  const bassPart = createPart(
    'bass',
    'Upright Bass',
    ACOUSTIC_UPRIGHT_BASS.instrumentIdentity,
    ACOUSTIC_UPRIGHT_BASS.midiProgram,
    'bass',
    labels.length,
    () => undefined,
    () => undefined
  );
  const words: Record<number, string> = {};
  const barMeterMap: Record<number, { numerator: number; denominator: number }> = {};
  labels.forEach((label, index) => {
    const event = args.analysis.score.events.find((row) => Number(row.sourceLabel) === label);
    const beats = event?.timeBeats ?? 4;
    const beatType = event?.timeBeatType ?? 4;
    const span = beats * (4 / beatType);
    const measureNumber = index + 1;
    barMeterMap[measureNumber] = { numerator: beats, denominator: beatType };
    const inRegion = label >= region.firstBar && label <= region.lastBar;
    const generatedHere = inRegion && label === region.firstBar && args.generated;
    const guitarEvents = generatedHere
      ? args.generated!
      : inRegion && args.candidate.purpose !== 'NO_PHRASE'
        ? fitBar([], span)
        : inRegion
          ? fitBar([], span)
          : fitBar(args.guitar.measures.find((measure) => Number(measure.label) === label)?.events ?? [], span);
    const guitarMeasure = guitarPart.measures[index]!;
    guitarMeasure.events = guitarEvents.map((row) => toWritten(row, args.guitar.chromatic, args.guitar.octaveChange));
    guitarMeasure.measureBeatSpanQuarters = span;
    guitarMeasure.chord = event?.chordSymbol;
    guitarMeasure.chordSymbol = event?.chordSymbol;
    const bassMeasure = bassPart.measures[index]!;
    bassMeasure.events = fitBar(
      args.bass.measures.find((measure) => Number(measure.label) === label)?.events ?? [],
      span
    ).map((row) => toWritten(row, args.bass.chromatic, args.bass.octaveChange));
    bassMeasure.measureBeatSpanQuarters = span;
    if (inRegion && args.candidate.purpose === 'NO_PHRASE' && label === region.firstBar) words[measureNumber] = staffLabel(args.candidate, label, false);
    else if (generatedHere) words[measureNumber] = staffLabel(args.candidate, label, false);
    else if (inRegion) words[measureNumber] = staffLabel(args.candidate, label, true);
  });
  const score = createScore(
    `Dev4B ${args.piece.title} ${args.candidate.selectedLetter} ${args.candidate.purpose} ${args.candidate.diagnostics.selectedPentatonic}`,
    [guitarPart, bassPart],
    { tempo: args.bpm }
  );
  const opening = barMeterMap[1]!;
  score.timeSignature = { beats: opening.numerator, beatType: opening.denominator };
  score.barMeterMap = barMeterMap;
  score.keySignature = { fifths, mode, hideKeySignature: false };
  score.measureWordsMarkings = words;
  score.exportPartTransposeSemitones = {
    guitar: args.guitar.chromatic + args.guitar.octaveChange * 12,
    bass: args.bass.chromatic + args.bass.octaveChange * 12,
  };
  return score;
}

function generateBarEvents(candidate: Dev4bCandidate, context: MusicContext, collection: PentatonicCollectionView, chord: string): ScoreEvent[] | null {
  if (candidate.purpose === 'NO_PHRASE') return null;
  const beats = context.meter.beats;
  const beatType = context.meter.beatType;
  const raw = emitPhrase({
    purpose: candidate.purpose,
    activity: candidate.activity as Dev4bActivity,
    seed: candidate.seed,
    chord,
    anchorMidi: context.motif?.anchorMidi,
    beats,
    beatType,
  });
  const coloured = applyColourField(raw, collection, DEV4B_DEFAULT_MOTIF_METHOD, { beats, beatType });
  return fitBar(coloured, beats * (4 / beatType)).map((event) =>
    event.kind === 'note' && !inGuitarRange(event.pitch)
      ? { ...event, pitch: Math.max(40, Math.min(88, event.pitch)) }
      : event
  );
}

function sha256(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function writeAudition(score: ScoreModel, filePath: string): Dev4bAuditionFile {
  const exported = exportScoreModelToMusicXml(score, { barMeterMap: score.barMeterMap });
  const xml = exported.xml ?? '';
  const validation = xml ? validateMusicXml(xml) : { valid: false, errors: exported.errors };
  const errors = [...exported.errors, ...validation.errors];
  const valid = exported.success && validation.valid && errors.length === 0;
  if (!valid) return { letter: '', filePath, valid, errors };
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, xml);
  return { letter: '', filePath, valid, errors };
}

function formatGce(candidate: Dev4bCandidate): string {
  if (!candidate.gce.applied || candidate.gce.finalScore === null) {
    return `GCE not applied. ${candidate.gce.reason}`;
  }
  const categories = candidate.gce.categories
    .map((row) => `${row.category} ${row.score} (weight ${row.weight})`)
    .join('; ');
  return [
    `overall ${candidate.gce.finalScore}`,
    `pass ${candidate.gce.pass} at threshold ${candidate.gce.threshold}`,
    `weakest ${candidate.gce.weakestCategory}`,
    `strongest ${candidate.gce.strongestCategory}`,
    `warnings ${candidate.gce.warnings.length ? candidate.gce.warnings.join(' | ') : 'none'}`,
    'penalties none — GceEvaluationResult has no penalty list',
    categories,
  ].join('\n');
}

function formatDiagnostics(candidate: Dev4bCandidate): string {
  const row = candidate.diagnostics;
  return [
    `pentatonic ${row.selectedPentatonic}`,
    `purpose ${row.phrasePurpose}`,
    `activity ${row.activity}`,
    `notes ${row.noteCount}`,
    `rest proportion ${row.restProportion}`,
    `subset ${row.pitchClassSubset.join(' ') || '—'}`,
    `coverage ${row.pentatonicCoverage}`,
    `outside ${row.outOfCollection.join(' ') || '—'}`,
    `anti-scale-run ${row.antiScaleRun.status} max ${row.antiScaleRun.maxRun}: ${row.antiScaleRun.reason}`,
    `range ${row.pitchRange}`,
    `largest interval ${row.largestMelodicInterval ?? '—'}`,
    `landing ${row.landing}`,
  ].join('\n');
}

function reportMarkdown(run: Dev4bRun): string {
  const lines: string[] = [];
  lines.push('# Dev 4B Sparse Generation');
  lines.push('');
  lines.push('Album: While We\'re Here. Orbit is track 05 only.');
  lines.push('');
  lines.push('## A. Canonical architecture reused');
  lines.push('');
  lines.push('- MusicContext: `buildMusicContextFromHarmonyBars` in `core/music-context/harmonyBarsMusicContextShell.ts`. Schema stays `1.0`.');
  lines.push('- Phrase Engine: `emitGuitarPhraseBar` and `computeEnsembleStagger` in `core/goldenPath/guitarPhraseAuthority.ts`; `buildPhrase` in `core/phrase/phraseBuilder.ts`.');
  lines.push('- Phrase intents: `PhraseIntent` in `core/goldenPath/phraseIntentTypes.ts`.');
  lines.push('- Motif: `generateMotif` duo-lock anchor in `core/motif/motifGenerator.ts`, stored on `MusicContext.motif`.');
  lines.push('- Guitar: `CLEAN_ELECTRIC_GUITAR.preferredMelodicZone` and `hardRange` via `inGuitarRange`.');
  lines.push('- Pentatonic path: `analyzePentatonicScore` Dev 3.7 defaults. Registry stays major and minor.');
  lines.push('- Colour: existing `mapMotifPitches`. Default method `M-DEG`. `M-NEAR` is not deleted.');
  lines.push('- GCE: `evaluateGce` / `defaultGceWeights`. No scorer edits.');
  lines.push('- MusicXML: `exportScoreModelToMusicXml` and `validateMusicXml`.');
  lines.push(`- Frozen path fingerprint: \`${run.fingerprint}\`.`);
  lines.push('');
  lines.push('## B. Files changed');
  lines.push('');
  lines.push('- `engines/composer-os-v2/core/pentatonic/dev4bSparseGeneration.ts`');
  lines.push('- `engines/composer-os-v2/tests/pentatonicDev4b.test.ts`');
  lines.push('- Audition MusicXML and this report under `Pentatonic-Options/Generated-Phrases/Dev4B/`.');
  lines.push('');
  lines.push('## C. Phrase Engine intent mappings');
  lines.push('');
  lines.push('- MOTIF → `guitar_lead`');
  lines.push('- LYRICAL_ANSWER → `answer_guitar`');
  lines.push('- COUNTERLINE → `development` (no counterline intent exists)');
  lines.push('- COMPING_FRAGMENT → `bass_lead` (existing sparse guitar-fragment role when the bass leads)');
  lines.push('- NO_PHRASE → no intent. The phrase engine is not called.');
  lines.push('');
  lines.push('## D. Pentatonic constraint mechanism');
  lines.push('');
  lines.push('The path collection is a colour field on the MusicContext receipt `dev4b-colour-field`.');
  lines.push('The phrase engine writes from the chord, the motif anchor, the intent, and the density.');
  lines.push('`mapMotifPitches` then runs M-DEG with that collection as both source and target.');
  lines.push('A pitch with no source degree stays put unless M-DEG preserved it as a chromatic ornament.');
  lines.push('Membership is not a hard quantizer.');
  lines.push('');
  lines.push('## E. NO_PHRASE');
  lines.push('');
  lines.push('NO_PHRASE is a generation outcome: guitar rests in the test region while the bass context continues.');
  lines.push('Path NONE means the path selected no collection. These pilots did not land on NONE.');
  lines.push('A NONE path would skip the colour field. NO_PHRASE can still be chosen when a collection exists.');
  lines.push('');
  lines.push('## F. Anti-scale-run');
  lines.push('');
  lines.push('Uses existing `maxAdjacentCollectionRun`.');
  lines.push('One adjacent pair is clear. A three-note adjacent cell inside a longer line is penalised.');
  lines.push('A run of 3 or more adjacent steps, or a whole line that is only adjacent steps, is rejected and not auditioned.');
  lines.push('');
  lines.push('## G. GCE integration');
  lines.push('');
  lines.push('Each pitched candidate is a one-bar ScoreModel passed to `evaluateGce`.');
  lines.push('`pass` uses the canonical threshold 9.0. That flag is reported and is not the selection rule.');
  lines.push('Melodic Identity at or below 6 marks a candidate weak. Weak rows lose a tie. They are not optimised away.');
  lines.push('GCE returns no separate penalty list.');
  lines.push('NO_PHRASE is not scored.');
  lines.push('');
  for (const piece of run.pieces) {
    const heading =
      piece.piece.id === 'impossible-metaphysics' ? 'H. Impossible Metaphysics' : piece.piece.id === 'the-mirror' ? 'I. The Mirror' : 'J. After Everything';
    lines.push(`## ${heading}`);
    lines.push('');
    lines.push(`Source \`${piece.piece.file}\`. SHA-256 \`${piece.sourceSha256}\`.`);
    lines.push(`Home reading: ${piece.homeReading}.`);
    lines.push(`Region mm. ${piece.region.firstBar}–${piece.region.lastBar}: ${piece.region.collectionName}.`);
    lines.push(piece.region.reason);
    lines.push(`MusicContext preset ${piece.context.presetId}, meter ${piece.context.meter.beats}/${piece.context.meter.beatType}, harmony ${piece.context.harmonyBars.join(' | ')}, motif ${piece.context.motifId ?? 'none'}, anchor ${piece.context.anchorMidi ?? 'none'}.`);
    lines.push('');
    lines.push('Pool:');
    for (const candidate of piece.pool) {
      lines.push(`- ${candidate.id} intent ${candidate.intent ?? 'none'} seed ${candidate.seed} selected ${candidate.selectedLetter ?? 'no'}`);
      lines.push(`  ${formatDiagnostics(candidate).replaceAll('\n', ' | ')}`);
      lines.push(`  ${formatGce(candidate).replaceAll('\n', ' | ')}`);
    }
    lines.push('');
  }
  lines.push('## K. Generated MusicXML');
  lines.push('');
  for (const piece of run.pieces) {
    for (const audition of piece.auditions) lines.push(`- ${audition.filePath} valid ${audition.valid}`);
  }
  lines.push('');
  lines.push('## L. GCE results');
  lines.push('');
  lines.push('See each pool row. Selection prefers distinct purposes, SPARSE activity, and a clear scale-run check. Overall GCE is a tie-break only through the existing Melodic Identity hard gate, and only as a preference.');
  lines.push('');
  lines.push('## M. Deterministic non-GCE diagnostics');
  lines.push('');
  lines.push('See each pool row. Those figures are not GCE scores.');
  lines.push('');
  lines.push('## N. Limitations');
  lines.push('');
  lines.push('- `emitGuitarPhraseBar` writes a 4-quarter bar. Shorter metres are clipped to the written bar span. The emitter was not rewritten.');
  lines.push('- The emitter is called once, on the first bar of the region. Later region bars are rests. That avoids a new phrase on every chord.');
  lines.push('- `buildPhrase` still counts a 4-quarter grid. Rest proportion in the diagnostics uses the real bar span.');
  lines.push('- Bar index passed into the emitter is 1, so the 8-bar cadence and identity special cases stay out of a short insert.');
  lines.push('- COUNTERLINE and COMPING_FRAGMENT are mappings, not new intents.');
  lines.push('- Canonical GCE pass remains overall >= 9.0. Short phrases will usually report pass false. That is the existing gate.');
  lines.push('- NO_PHRASE is outside GCE because the scorer needs a melody.');
  lines.push('- Colour does not add exotic pentatonics. Registry is unchanged.');
  lines.push('- Source guitar and bass use their written transpose (octave-change -1 becomes chromatic -12 on export) so notation matches the leadsheet.');
  lines.push('');
  lines.push('## O. Source integrity');
  lines.push('');
  for (const piece of run.pieces) {
    const after = run.sourceHashesAfter[piece.piece.file];
    lines.push(`- ${piece.piece.file}: before ${piece.sourceSha256}; after ${after}; match ${piece.sourceSha256 === after}`);
  }
  lines.push('');
  lines.push('## P. Tests');
  lines.push('');
  lines.push('- `engines/composer-os-v2/tests/pentatonicDev4b.test.ts`');
  lines.push('- Existing Dev 4A, Dev 3.7 fingerprint, phrase engine, GCE, and MusicXML validator runners as recorded in the session report.');
  lines.push('');
  return lines.join('\n');
}

export function runDev4b(album = ALBUM): Dev4bRun {
  const fingerprint = pentatonicFrozenConfigFingerprint();
  const loaded = DEV4B_PIECES.map((piece) => {
    const sourcePath = path.join(album, piece.file);
    const xml = fs.readFileSync(sourcePath, 'utf8');
    return {
      piece,
      sourcePath,
      sourceSha256: sha256(sourcePath),
      xml,
      guitar: readPart(xml, 'guitar'),
      bass: readPart(xml, 'bass'),
    };
  });
  const pieces: Dev4bPieceResult[] = [];
  for (const item of loaded) {
    const { piece, xml, guitar, bass } = item;
    const sourceSha256 = item.sourceSha256;
    const analysis = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1', sourceFile: piece.file, sourceSha256 });
    const region = chooseDev4bRegion(piece, analysis);
    const regionEvents = analysis.score.events.filter((event) => {
      const bar = Number(event.sourceLabel);
      return bar >= region.firstBar && bar <= region.lastBar;
    });
    const collection = collectionFromPathName(region.collectionName, null);
    if (!collection) throw new Error(`${piece.title} region ${region.collectionName} is not a registry collection.`);
    const context = buildPieceContext(piece, regionEvents, collection.name);
    const bpm = tempoOf(xml);
    context.bpm = bpm;
    const fifths = analysis.score.keySignatures[0]?.fifths ?? 0;
    const mode = analysis.score.keySignatures[0]?.mode === 'minor' ? 'minor' : 'major';
    const chord = regionEvents[0]?.chordSymbol ?? context.harmony.bars[0] ?? 'N.C.';
    const pool = PURPOSES.flatMap((purpose) =>
      ACTIVITIES.map((activity) =>
        representativeCandidate({ piece, context, collection, purpose, activity, chord, fifths, mode, bpm })
      )
    );
    pool.push(silenceCandidate(collection.name));
    const selected = selectDev4bCandidates(piece, pool);
    selected.forEach((candidate, index) => {
      candidate.selectedLetter = String.fromCharCode(65 + index);
    });
    const auditions: Dev4bAuditionFile[] = [];
    for (const candidate of selected) {
      const generated = generateBarEvents(candidate, context, collection, chord);
      const score = buildAudition({ piece, candidate, analysis, guitar, bass, generated, bpm });
      const filePath = path.join(DEV4B_OUTPUT_DIR, piece.slug, `Dev4B-${piece.slug}-${candidate.selectedLetter}.musicxml`);
      const written = writeAudition(score, filePath);
      written.letter = candidate.selectedLetter ?? '';
      if (!written.valid) {
        throw new Error(`${filePath} failed validation: ${written.errors.join('; ')}`);
      }
      auditions.push(written);
    }
    pieces.push({
      piece,
      sourceSha256,
      analysisSong: analysis.song,
      homeReading: analysis.homeReading,
      region,
      context: {
        presetId: context.presetId,
        seed: context.seed,
        meter: context.meter,
        harmonyBars: context.harmony.bars,
        checksum: context.harmony.checksum,
        motifId: context.motif?.id ?? null,
        anchorMidi: context.motif?.anchorMidi ?? null,
        receiptKind: context.receipts[0]?.kind ?? null,
      },
      pool,
      selected,
      auditions,
    });
  }
  const sourceHashesAfter = Object.fromEntries(DEV4B_PIECES.map((piece) => [piece.file, sha256(path.join(album, piece.file))]));
  const run: Dev4bRun = {
    fingerprint,
    pieces,
    sourceHashesAfter,
    reportPath: path.join(DEV4B_OUTPUT_DIR, 'Reports', 'Dev4B-Sparse-Generation-Report.md'),
  };
  fs.mkdirSync(path.dirname(run.reportPath), { recursive: true });
  fs.writeFileSync(run.reportPath, reportMarkdown(run));
  return run;
}
