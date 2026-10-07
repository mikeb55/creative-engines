/**
 * Dev 4C — Composer OS integration adapter.
 *
 * Analyse uses the existing score path. Motif transform uses Dev 4A
 * `mapMotifPitches` (M-DEG default, M-NEAR unchanged). Phrase notes come from
 * the existing guitar phrase authority, then `buildPhrase`, then `evaluateGce`,
 * then `exportScoreModelToMusicXml`. This file does not write MusicXML to disk
 * and does not replace those engines.
 *
 * A pentatonic collection is a colour field. Notes the phrase engine already
 * wrote outside that collection stay outside. They are reported, not relabelled
 * as members and not treated as errors.
 */

import { evaluateGce, defaultGceWeights } from '../evaluation/gceEvaluator';
import type { GceCategory } from '../evaluation/evaluationTypes';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import { computeEnsembleStagger, emitGuitarPhraseBar } from '../goldenPath/guitarPhraseAuthority';
import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import type { MusicContext } from '../music-context/musicContextTypes';
import type { BaseMotif } from '../motif/motifTypes';
import { buildPhrase } from '../phrase/phraseBuilder';
import { createMeasure, createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import type { NoteEvent, ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import type { PhraseIntent } from '../goldenPath/phraseIntentTypes';
import { analyzePentatonicScore, type PentatonicScoreAnalysis, type PentatonicScoreRegion } from './analyzeScore';
import { getPentatonicArchetype } from './registry';
import { parseNoteToken, sharpName, spellFromReference } from './pitch';
import {
  collectionPitchClasses,
  degreeOf,
  inGuitarRange,
  mapMotifPitches,
  maxAdjacentCollectionRun,
  type MotifMapMethod,
  type PentatonicCollectionView,
} from './motifTransform';

/** Same intent map as Dev 4B. Copied here so the GUI bundle does not load the filesystem runner. */
export type Dev4cActivity = 'VERY_SPARSE' | 'SPARSE' | 'MODERATE';
export type Dev4cPurpose = 'MOTIF' | 'LYRICAL_ANSWER' | 'COUNTERLINE' | 'COMPING_FRAGMENT' | 'NO_PHRASE';

const PHRASE_INTENT: Record<Exclude<Dev4cPurpose, 'NO_PHRASE'>, PhraseIntent> = {
  MOTIF: 'guitar_lead',
  LYRICAL_ANSWER: 'answer_guitar',
  COUNTERLINE: 'development',
  COMPING_FRAGMENT: 'bass_lead',
};

function collectionFromPathName(name: string, homeRelationshipLabel: string | null): PentatonicCollectionView | null {
  const match = name.match(/^([A-G](?:#|b)?) (Major|Minor) Pentatonic$/);
  if (!match) return null;
  return {
    name,
    archetypeId: match[2] === 'Minor' ? 'minor_pentatonic' : 'major_pentatonic',
    referenceNote: match[1]!,
    homeRelationshipLabel,
  };
}

function antiScaleRun(pitches: readonly number[], collection: PentatonicCollectionView): { status: 'clear' | 'penalise' | 'reject' } {
  if (pitches.length < 2) return { status: 'clear' };
  const maxRun = maxAdjacentCollectionRun(pitches, collection);
  const steps = pitches.length - 1;
  if (maxRun >= 3 || (pitches.length >= 3 && maxRun === steps)) return { status: 'reject' };
  if (maxRun === 2) return { status: 'penalise' };
  return { status: 'clear' };
}

export const PENTATONIC_WORKFLOW_MODES = ['analyse', 'transform', 'generate'] as const;

export const DEV4C_DEFAULT_METHOD: MotifMapMethod = 'M-DEG';

export const DEV4C_ACTIVITIES: readonly Dev4cActivity[] = ['VERY_SPARSE', 'SPARSE', 'MODERATE'];

export const DEV4C_PURPOSES: readonly Dev4cPurpose[] = [
  'MOTIF',
  'LYRICAL_ANSWER',
  'COUNTERLINE',
  'COMPING_FRAGMENT',
  'NO_PHRASE',
];

const PITCHED_PURPOSES = ['MOTIF', 'LYRICAL_ANSWER', 'COUNTERLINE', 'COMPING_FRAGMENT'] as const;

export function purposeLabel(purpose: Dev4cPurpose): string {
  if (purpose === 'MOTIF') return 'Motif';
  if (purpose === 'LYRICAL_ANSWER') return 'Lyrical answer';
  if (purpose === 'COUNTERLINE') return 'Counterline';
  if (purpose === 'COMPING_FRAGMENT') return 'Comping fragment';
  return 'No phrase / silence';
}

export function activityLabel(activity: Dev4cActivity | 'NO_PHRASE'): string {
  if (activity === 'VERY_SPARSE') return 'Very sparse';
  if (activity === 'SPARSE') return 'Sparse';
  if (activity === 'MODERATE') return 'Moderate';
  return 'Silence';
}

export function methodDescription(method: MotifMapMethod): string {
  if (method === 'M-DEG') {
    return "Preserve the motif's pentatonic-degree pattern while moving it into the new colour.";
  }
  return 'Move into the new pentatonic while changing pitches as little as possible.';
}

export interface ColourFieldView {
  selectedResource: string;
  resourceNotes: string;
  actualNotes: string;
  outsideResourceNotes: string;
}

export interface MusicianRegion {
  measureRangeLabel: string;
  collectionName: string;
  colour: string;
  none: boolean;
  firstBar: number;
  lastBar: number;
}

export interface MusicianAnalysis {
  song: string;
  centre: string;
  home: string;
  homeStatus: string;
  regions: MusicianRegion[];
  noneCount: number;
  analysis: PentatonicScoreAnalysis;
}

export interface PentatonicCandidateView {
  letter: 'A' | 'B' | 'C';
  purpose: Dev4cPurpose;
  purposeLabel: string;
  activityLabel: string;
  silence: boolean;
  resultLabel: string;
  selectedResource: string;
  resourceNotes: string;
  actualNotes: string;
  outsideResourceNotes: string;
  scaleLike: 'CLEAR' | 'WARNING' | null;
  gceOverall: number | null;
  gceCategories: { category: GceCategory; score: number }[];
  gceWarnings: string[];
  musicXml: string;
  method: MotifMapMethod | null;
  pitchChange: 'YES' | 'NO' | null;
}

export interface PentatonicGenerateResult {
  notice: string | null;
  musicContext: {
    presetId: string;
    seed: number;
    meter: string;
    harmonyChecksum: string;
    barCount: number;
  };
  candidates: PentatonicCandidateView[];
}

export interface PentatonicTransformResult {
  method: MotifMapMethod;
  pitchChange: 'YES' | 'NO';
  selectedResource: string;
  resourceNotes: string;
  actualNotes: string;
  outsideResourceNotes: string;
  musicXml: string;
  sourcePitches: number[];
  resultPitches: number[];
}

export function resourceNoteNames(collection: PentatonicCollectionView | null): string {
  if (!collection) return 'NONE';
  const archetype = getPentatonicArchetype(collection.archetypeId);
  if (!archetype) return 'NONE';
  return spellFromReference(collection.referenceNote, archetype.intervals, archetype.letterSteps).join(' ');
}

export function midiNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  return `${sharpName(midi)}${octave}`;
}

export function colourField(collection: PentatonicCollectionView | null, pitches: readonly number[]): ColourFieldView {
  if (!collection) {
    return {
      selectedResource: 'NONE',
      resourceNotes: 'NONE',
      actualNotes: pitches.length ? pitches.map(midiNoteName).join(' ') : 'NONE',
      outsideResourceNotes: 'NONE',
    };
  }
  const outside = pitches.filter((pitch) => degreeOf(pitch, collection) === null);
  return {
    selectedResource: collection.name,
    resourceNotes: resourceNoteNames(collection),
    actualNotes: pitches.length ? pitches.map(midiNoteName).join(' ') : 'NONE',
    outsideResourceNotes: outside.length ? [...new Set(outside.map(midiNoteName))].join(' ') : 'NONE',
  };
}

export function manualCollection(archetypeId: 'major_pentatonic' | 'minor_pentatonic', referenceNote: string): PentatonicCollectionView {
  const archetype = getPentatonicArchetype(archetypeId);
  if (!archetype) throw new Error('Only major and minor pentatonic are registered.');
  const parsed = parseNoteToken(referenceNote);
  if (!parsed) throw new Error(`Reference ${referenceNote} is not a pitch.`);
  const kind = archetypeId === 'minor_pentatonic' ? 'Minor' : 'Major';
  return {
    name: `${parsed.spelling} ${kind} Pentatonic`,
    archetypeId,
    referenceNote: parsed.spelling,
    homeRelationshipLabel: null,
  };
}

export function collectionForRegion(region: PentatonicScoreRegion): PentatonicCollectionView | null {
  return collectionFromPathName(region.collectionName, region.homeRelationshipLabel);
}

export function homeCollection(analysis: PentatonicScoreAnalysis): PentatonicCollectionView | null {
  const home = analysis.identity.home;
  if (!home) return null;
  const kind = home.archetypeId === 'minor_pentatonic' ? 'Minor' : 'Major';
  return {
    name: `${home.referenceNote} ${kind} Pentatonic`,
    archetypeId: home.archetypeId,
    referenceNote: home.referenceNote,
    homeRelationshipLabel: 'HOME',
  };
}

export function formatMusicianAnalysis(analysis: PentatonicScoreAnalysis): MusicianAnalysis {
  const centre =
    analysis.identity.centreStatus === 'CENTRE' && analysis.identity.centre
      ? analysis.identity.centre.spelling
      : 'not established';
  const homeCollectionView = homeCollection(analysis);
  const home = homeCollectionView ? homeCollectionView.name : 'not established';
  const regions = analysis.regions.map((region) => ({
    measureRangeLabel: region.measureRangeLabel,
    collectionName: region.collectionName,
    colour: region.homeRelationshipLabel ?? region.boundaryKind,
    none: region.collectionName === 'NONE',
    firstBar: Number(region.firstSourceLabel),
    lastBar: Number(region.lastSourceLabel),
  }));
  return {
    song: analysis.song || 'Score',
    centre,
    home,
    homeStatus: analysis.identity.homeStatus,
    regions,
    noneCount: analysis.summary.noneRegions,
    analysis,
  };
}

export function analysePentatonicMusicXml(
  xml: string,
  options?: { sourceFile?: string; sourceSha256?: string; profile?: 'default' | 'wwh-duo-1.1' }
): MusicianAnalysis {
  const analysis = analyzePentatonicScore(xml, {
    profile: options?.profile ?? 'wwh-duo-1.1',
    sourceFile: options?.sourceFile ?? '',
    sourceSha256: options?.sourceSha256 ?? '',
  });
  return formatMusicianAnalysis(analysis);
}

function regionEvents(analysis: PentatonicScoreAnalysis, region: PentatonicScoreRegion) {
  const first = Number(region.firstSourceLabel);
  const last = Number(region.lastSourceLabel);
  return analysis.score.events.filter((event) => {
    const bar = Number(event.sourceLabel);
    return bar >= first && bar <= last;
  });
}

function spellingToMidi(spelling: string, previous: number | null): number | null {
  const cleaned = spelling.trim().replace('♭', 'b').replace('♯', '#').replace(/[0-9]+$/, '');
  const parsed = parseNoteToken(cleaned);
  if (!parsed) return null;
  let midi = 60 + parsed.pc;
  if (previous !== null) {
    while (midi - previous > 6) midi -= 12;
    while (previous - midi > 6) midi += 12;
  }
  while (midi < 52) midi += 12;
  while (midi > 84) midi -= 12;
  return midi;
}

export function motifFromRegion(analysis: PentatonicScoreAnalysis, region: PentatonicScoreRegion): BaseMotif | null {
  const notes: BaseMotif['notes'] = [];
  let previous: number | null = null;
  for (const event of regionEvents(analysis, region)) {
    let beat = 0;
    const attacks = event.soundingAttacks.filter((attack) => attack.role === 'melody');
    const rows =
      attacks.length > 0
        ? attacks.map((attack) => ({ spelling: attack.spelling, duration: attack.durationBeats > 0 ? attack.durationBeats : 1 }))
        : (event.melodyNotes ?? []).map((spelling) => ({ spelling, duration: 1 }));
    for (const row of rows) {
      const pitch = spellingToMidi(row.spelling, previous);
      if (pitch === null) continue;
      notes.push({ pitch, startBeat: beat, duration: row.duration });
      previous = pitch;
      beat += row.duration;
      if (notes.length >= 8) break;
    }
    if (notes.length >= 3) break;
  }
  if (notes.length < 2) return null;
  return { id: 'score-motif', barCount: 1, notes };
}

function tempoOf(xml: string): number {
  const sound = xml.match(/tempo="([\d.]+)"/)?.[1];
  const words = xml.match(/<per-minute>([\d.]+)<\/per-minute>/)?.[1];
  const bpm = Number(sound ?? words ?? 72);
  return Number.isFinite(bpm) && bpm > 0 ? bpm : 72;
}

function quantizeBeat(beats: number): number {
  return Math.round(beats * 480) / 480;
}

function voiceNumbers(events: readonly ScoreEvent[]): number[] {
  const voices = new Set<number>();
  for (const event of events) voices.add(event.voice ?? 1);
  if (voices.size === 0) voices.add(1);
  return [...voices].sort((left, right) => left - right);
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
  clipped.sort((left, right) => left.startBeat - right.startBeat);
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
    .sort((left, right) => left.startBeat - right.startBeat)
    .map((event) => event.pitch);
}

function activityDensity(activity: Dev4cActivity): { density: 'sparse' | 'medium'; reduceAttack: boolean } {
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
      id: 'dev4c',
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

function emitPhrase(args: {
  purpose: Exclude<Dev4cPurpose, 'NO_PHRASE'>;
  activity: Dev4cActivity;
  seed: number;
  chord: string;
  anchorMidi: number | undefined;
  beats: number;
  beatType: number;
}): ScoreEvent[] {
  const measure = createMeasure(1, args.chord);
  measure.measureBeatSpanQuarters = args.beats * (4 / args.beatType);
  const intent = PHRASE_INTENT[args.purpose];
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
  return fitBar(measure.events, measure.measureBeatSpanQuarters);
}

function meterOf(analysis: PentatonicScoreAnalysis, region: PentatonicScoreRegion): { beats: number; beatType: number } {
  const event = regionEvents(analysis, region)[0];
  return {
    beats: event?.timeBeats && event.timeBeats > 0 ? event.timeBeats : 4,
    beatType: event?.timeBeatType && event.timeBeatType > 0 ? event.timeBeatType : 4,
  };
}

function chordOf(analysis: PentatonicScoreAnalysis, region: PentatonicScoreRegion): string {
  const event = regionEvents(analysis, region).find((row) => row.chordSymbol);
  return event?.chordSymbol ?? 'N.C.';
}

function exportLine(args: {
  title: string;
  events: readonly ScoreEvent[];
  chord: string;
  beats: number;
  beatType: number;
  fifths: number;
  mode: 'major' | 'minor';
  bpm: number;
  barCount: number;
  chords: readonly string[];
}): string {
  const span = args.beats * (4 / args.beatType);
  const part = createPart(
    'guitar',
    'Electric Guitar',
    CLEAN_ELECTRIC_GUITAR.instrumentIdentity,
    CLEAN_ELECTRIC_GUITAR.midiProgram,
    'treble',
    Math.max(1, args.barCount),
    (bar) => args.chords[bar - 1] ?? args.chord,
    () => undefined
  );
  part.measures.forEach((measure, index) => {
    measure.measureBeatSpanQuarters = span;
    measure.events = index === 0 ? fitBar(args.events, span) : [createRest(0, span, 1)];
    measure.chord = args.chords[index] ?? args.chord;
    measure.chordSymbol = measure.chord;
  });
  const score = createScore(args.title, [part], { tempo: args.bpm });
  score.timeSignature = { beats: args.beats, beatType: args.beatType };
  score.barMeterMap = {};
  for (let bar = 1; bar <= part.measures.length; bar += 1) {
    score.barMeterMap[bar] = { numerator: args.beats, denominator: args.beatType };
  }
  score.keySignature = { fifths: args.fifths, mode: args.mode, hideKeySignature: false };
  return xmlOf(score);
}

function xmlOf(score: ScoreModel): string {
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) {
    throw new Error(exported.errors.join(' ') || 'MusicXML export failed.');
  }
  if (/<staff-type>tab<\/staff-type>/i.test(exported.xml)) {
    throw new Error('Pentatonic export included a TAB staff.');
  }
  return exported.xml;
}

function scaleLike(status: 'clear' | 'penalise' | 'reject'): 'CLEAR' | 'WARNING' {
  return status === 'clear' ? 'CLEAR' : 'WARNING';
}

function gceSummary(score: ScoreModel | null): {
  overall: number | null;
  categories: { category: GceCategory; score: number }[];
  warnings: string[];
} {
  if (!score) return { overall: null, categories: [], warnings: [] };
  try {
    const result = evaluateGce({ output: score, features: {}, weights: defaultGceWeights });
    return {
      overall: result.finalScore,
      categories: Object.values(result.categories).map((row) => ({ category: row.category, score: row.score })),
      warnings: result.notes ?? [],
    };
  } catch (error) {
    return {
      overall: null,
      categories: [],
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

function silenceView(args: {
  letter: 'A' | 'B' | 'C';
  collection: PentatonicCollectionView | null;
  exportArgs: Parameters<typeof exportLine>[0];
}): PentatonicCandidateView {
  const field = colourField(args.collection, []);
  const musicXml = exportLine({ ...args.exportArgs, title: `${args.exportArgs.title} silence`, events: [] });
  return {
    letter: args.letter,
    purpose: 'NO_PHRASE',
    purposeLabel: purposeLabel('NO_PHRASE'),
    activityLabel: 'Silence',
    silence: true,
    resultLabel: 'RESULT: SILENCE / NO PHRASE',
    selectedResource: field.selectedResource,
    resourceNotes: field.resourceNotes,
    actualNotes: 'NONE',
    outsideResourceNotes: 'NONE',
    scaleLike: null,
    gceOverall: null,
    gceCategories: [],
    gceWarnings: [],
    musicXml,
    method: null,
    pitchChange: null,
  };
}

function contextFor(args: {
  analysis: PentatonicScoreAnalysis;
  region: PentatonicScoreRegion;
  collectionName: string;
  seed: number;
  bpm: number;
  anchor: BaseMotif | null;
}): MusicContext {
  const events = regionEvents(args.analysis, args.region);
  const bars = events.map((event) => event.chordSymbol ?? 'N.C.');
  const meter = meterOf(args.analysis, args.region);
  const context = buildMusicContextFromHarmonyBars({
    harmonyBars: bars.length ? bars : ['N.C.'],
    sourceEngineId: 'pentatonic-engine',
    presetId: 'guitar_bass_duo',
    seed: args.seed,
    bpm: args.bpm,
    receipts: [
      {
        engine: 'pentatonic',
        kind: 'dev4c-colour-field',
        payload: {
          collection: args.collectionName,
          method: DEV4C_DEFAULT_METHOD,
          nearAvailable: true,
          pathEngine: 'dev-3.7',
        },
      },
    ],
  });
  context.meter = meter;
  if (args.anchor && args.anchor.notes.length > 0) {
    const pitches = args.anchor.notes.map((note) => note.pitch);
    context.motif = {
      id: 'pentatonic-anchor',
      intervalPattern: pitches.slice(1).map((pitch, index) => pitch - pitches[index]!),
      rhythmPattern: args.anchor.notes.map((note) => ({ startBeat: note.startBeat, duration: note.duration })),
      contourPattern: pitches.slice(1).map((pitch, index) => Math.sign(pitch - pitches[index]!)),
      anchorMidi: pitches[0],
      seedPitches: pitches,
      producer: 'user',
    };
  }
  return context;
}

function pitchedCandidate(args: {
  letter: 'A' | 'B' | 'C';
  purpose: Exclude<Dev4cPurpose, 'NO_PHRASE'>;
  activity: Dev4cActivity;
  seed: number;
  collection: PentatonicCollectionView;
  context: MusicContext;
  chord: string;
  exportArgs: Omit<Parameters<typeof exportLine>[0], 'title' | 'events'>;
  title: string;
}): PentatonicCandidateView {
  const beats = args.context.meter.beats;
  const beatType = args.context.meter.beatType;
  const span = beats * (4 / beatType);
  const purposeIndex = PITCHED_PURPOSES.indexOf(args.purpose);
  const activityIndex = DEV4C_ACTIVITIES.indexOf(args.activity);
  let chosen: ScoreEvent[] = [];
  let pitches: number[] = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const seed = args.seed + purposeIndex * 100 + activityIndex * 10 + attempt;
    const raw = emitPhrase({
      purpose: args.purpose,
      activity: args.activity,
      seed,
      chord: args.chord,
      anchorMidi: args.context.motif?.anchorMidi,
      beats,
      beatType,
    });
    const coloured = applyColourField(raw, args.collection, DEV4C_DEFAULT_METHOD, { beats, beatType });
    chosen = fitBar(coloured, span).map((event) => {
      if (event.kind !== 'note') return event;
      return inGuitarRange(event.pitch) ? event : { ...event, pitch: Math.max(40, Math.min(88, event.pitch)) };
    });
    pitches = linePitches(chosen);
    const run = antiScaleRun(pitches, args.collection);
    if (run.status !== 'reject') break;
  }
  const field = colourField(args.collection, pitches);
  const silent = pitches.length === 0;
  if (silent) {
    return silenceView({
      letter: args.letter,
      collection: args.collection,
      exportArgs: { ...args.exportArgs, title: args.title, events: [] },
    });
  }
  const notes = chosen.filter((event): event is NoteEvent => event.kind === 'note' && (event.voice ?? 1) === 1);
  buildPhrase(`${args.purpose}-${args.activity}`, { startBar: 1, endBar: 1 }, notes, 'ambiguous');
  const score = createScore(args.title, []);
  const part = createPart('guitar', 'Electric Guitar', CLEAN_ELECTRIC_GUITAR.instrumentIdentity, CLEAN_ELECTRIC_GUITAR.midiProgram, 'treble', 1, () => args.chord, () => undefined);
  part.measures[0]!.measureBeatSpanQuarters = span;
  part.measures[0]!.events = chosen;
  score.parts = [part];
  score.timeSignature = { beats, beatType };
  score.tempo = args.exportArgs.bpm;
  const gce = gceSummary(score);
  const run = antiScaleRun(pitches, args.collection);
  return {
    letter: args.letter,
    purpose: args.purpose,
    purposeLabel: purposeLabel(args.purpose),
    activityLabel: activityLabel(args.activity),
    silence: false,
    resultLabel: `${args.letter} · ${purposeLabel(args.purpose)}`,
    selectedResource: field.selectedResource,
    resourceNotes: field.resourceNotes,
    actualNotes: field.actualNotes,
    outsideResourceNotes: field.outsideResourceNotes,
    scaleLike: scaleLike(run.status),
    gceOverall: gce.overall,
    gceCategories: gce.categories,
    gceWarnings: gce.warnings,
    musicXml: exportLine({ ...args.exportArgs, title: args.title, events: chosen }),
    method: DEV4C_DEFAULT_METHOD,
    pitchChange: null,
  };
}

export function generatePentatonicPhrase(args: {
  xml: string;
  analysis: PentatonicScoreAnalysis;
  region: PentatonicScoreRegion;
  purpose: Dev4cPurpose;
  activity?: Dev4cActivity;
  collection?: PentatonicCollectionView | null;
  seed?: number;
}): PentatonicGenerateResult {
  const activity = args.activity ?? 'SPARSE';
  const seed = args.seed ?? 84041;
  const bpm = tempoOf(args.xml);
  const meter = meterOf(args.analysis, args.region);
  const chord = chordOf(args.analysis, args.region);
  const events = regionEvents(args.analysis, args.region);
  const chords = events.map((event) => event.chordSymbol ?? chord);
  const fifths = args.analysis.score.keySignatures[0]?.fifths ?? 0;
  const mode = args.analysis.score.keySignatures[0]?.mode === 'minor' ? 'minor' : 'major';
  const collection = args.collection === undefined ? collectionForRegion(args.region) : args.collection;
  const anchor = motifFromRegion(args.analysis, args.region);
  const context = contextFor({
    analysis: args.analysis,
    region: args.region,
    collectionName: collection?.name ?? 'NONE',
    seed,
    bpm,
    anchor,
  });
  const exportArgs = {
    chord,
    beats: meter.beats,
    beatType: meter.beatType,
    fifths,
    mode,
    bpm,
    barCount: Math.max(1, events.length),
    chords: chords.length ? chords : [chord],
  } as const;
  const musicContext = {
    presetId: context.presetId,
    seed: context.seed,
    meter: `${context.meter.beats}/${context.meter.beatType}`,
    harmonyChecksum: context.harmony.checksum,
    barCount: context.totalBars,
  };
  if (args.purpose === 'NO_PHRASE' || !collection) {
    return {
      notice: collection
        ? null
        : 'This region is NONE. No pentatonic colour is selected. Silence is available.',
      musicContext,
      candidates: [
        silenceView({
          letter: 'A',
          collection,
          exportArgs: { ...exportArgs, title: args.analysis.song || 'Pentatonic', events: [] },
        }),
      ],
    };
  }
  const alternate: Dev4cActivity = activity === 'SPARSE' ? 'VERY_SPARSE' : 'SPARSE';
  const title = args.analysis.song || 'Pentatonic';
  const candidates = [
    pitchedCandidate({
      letter: 'A',
      purpose: args.purpose,
      activity,
      seed,
      collection,
      context,
      chord,
      exportArgs,
      title: `${title} ${purposeLabel(args.purpose)}`,
    }),
    pitchedCandidate({
      letter: 'B',
      purpose: args.purpose,
      activity: alternate,
      seed,
      collection,
      context,
      chord,
      exportArgs,
      title: `${title} ${purposeLabel(args.purpose)} ${activityLabel(alternate)}`,
    }),
    silenceView({
      letter: 'C',
      collection,
      exportArgs: { ...exportArgs, title, events: [] },
    }),
  ].slice(0, 3);
  return { notice: null, musicContext, candidates };
}

export function transformPentatonicMotif(args: {
  xml: string;
  analysis: PentatonicScoreAnalysis;
  region: PentatonicScoreRegion;
  target: PentatonicCollectionView;
  method?: MotifMapMethod;
  motif?: BaseMotif | null;
}): PentatonicTransformResult {
  const method = args.method ?? DEV4C_DEFAULT_METHOD;
  const motif = args.motif === undefined ? motifFromRegion(args.analysis, args.region) : args.motif;
  if (!motif || motif.notes.length < 2) {
    throw new Error('This region has no motif to transform.');
  }
  const source = collectionForRegion(args.region) ?? homeCollection(args.analysis) ?? args.target;
  const meter = meterOf(args.analysis, args.region);
  const mapped = mapMotifPitches({
    motif,
    rhythm: motif.notes.map((note) => ({ kind: 'note' as const, startBeat: note.startBeat, duration: note.duration })),
    source,
    target: args.target,
    method,
    meter,
  });
  const sourcePitches = motif.notes.map((note) => note.pitch);
  const resultPitches = mapped.notes.map((note) => note.pitch);
  const changed = mapped.notes.some((note) => note.pitch !== note.sourcePitch);
  const field = colourField(args.target, resultPitches);
  const events = mapped.notes.map((note) => createNote(note.pitch, note.startBeat, note.duration, 1));
  const chord = chordOf(args.analysis, args.region);
  const fifths = args.analysis.score.keySignatures[0]?.fifths ?? 0;
  const mode = args.analysis.score.keySignatures[0]?.mode === 'minor' ? 'minor' : 'major';
  const musicXml = exportLine({
    title: `${args.analysis.song || 'Pentatonic'} ${method}`,
    events,
    chord,
    beats: meter.beats,
    beatType: meter.beatType,
    fifths,
    mode,
    bpm: tempoOf(args.xml),
    barCount: 1,
    chords: [chord],
  });
  return {
    method,
    pitchChange: changed ? 'YES' : 'NO',
    selectedResource: field.selectedResource,
    resourceNotes: field.resourceNotes,
    actualNotes: field.actualNotes,
    outsideResourceNotes: field.outsideResourceNotes,
    musicXml,
    sourcePitches,
    resultPitches,
  };
}

export function collectionPitchClassCount(collection: PentatonicCollectionView): number {
  return collectionPitchClasses(collection).length;
}
