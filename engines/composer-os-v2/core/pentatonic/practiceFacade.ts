/**
 * Pentatonic Options V2 practice facade.
 * UI state stays in the app. Every musical decision is delegated to the
 * existing pentatonic engine, phrase engine, GCE evaluator, and MusicXML exporter.
 * This file does not add path resources, operators, or a second registry.
 */

import { evaluateGce, defaultGceWeights } from '../evaluation/gceEvaluator';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import type { BaseMotif } from '../motif/motifTypes';
import { createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import type { ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { analyzePentatonicScore, formatPentatonicScoreMap } from './analyzeScore';
import { formatCollectionIdentityMark } from './musicXmlScore';
import { planAutoColor, MUSICAL_INTENTIONS, type MusicalIntention } from './autoColor';
import { fieldFromResource } from './fieldDistance';
import { planGradedOut, type OutnessLevel } from './gradedOut';
import { planLayeredField, type LayerRole } from './layeredField';
import { extractParentField } from './parentExtraction';
import { planPivotLink } from './pivotLink';
import { getPentatonicColourResource, listPentatonicColourResources } from './colourRegistry';
import { evaluatePentatonicColour } from './colourEvaluate';
import { manualCollection } from './dev4cWorkflow';
import type { DuoRole } from './formDuoIntelligence';
import { assessGrounding, DEFAULT_OUTSIDE_BUDGET, type OutsideBudget } from './pathIntelligence';
import {
  canonicalPitchSet,
  mod12,
  parseNoteList,
  parseNoteToken,
  pitchClassSpellingMap,
  spellFromReference,
  spellingForPc,
  type ParsedNote,
} from './pitch';
import {
  realisePentatonicPhrase,
  transformCell,
  type CellTransform,
  type PentatonicOperator,
  type ReseatLanding,
} from './phraseOperators';
import { COMPARE_CANDIDATE_CAP, comparePentatonicCandidates, orderCompareCandidates } from './productionCompare';
import { realiseQuartalComp, realiseQuartalLine } from './quartalField';
import { buildPentatonicMusicContext, recommendPentatonicsFromRegion } from './recommend';
import { collectionPitchClasses, transposeCollection, type PentatonicCollectionView, type RhythmSlot } from './motifTransform';
import type { ExplicitPitchSpelling } from '../export/musicXmlNoteFragment';

export const PENTATONIC_OPTIONS_V2_FACADE_VERSION = 'pentatonic-options-v2-facade-1';

/** Production functions this facade calls. The app must not reimplement them. */
export const PENTATONIC_OPTIONS_V2_SEAMS = [
  'analyzePentatonicScore',
  'formatPentatonicScoreMap',
  'listPentatonicColourResources',
  'getPentatonicColourResource',
  'evaluatePentatonicColour',
  'planAutoColor',
  'realisePentatonicPhrase',
  'transformCell',
  'comparePentatonicCandidates',
  'orderCompareCandidates',
  'recommendPentatonicsFromRegion',
  'buildPentatonicMusicContext',
  'realiseQuartalComp',
  'realiseQuartalLine',
  'manualCollection',
  'assessGrounding',
  'evaluateGce',
  'exportScoreModelToMusicXml',
] as const;

/** Dev 7 capabilities the practice app may call. Decisions stay in the engine. */
export const DEV7_EXTENSION_SEAMS = ['planGradedOut', 'planPivotLink', 'extractParentField', 'planLayeredField'] as const;

/** Discussed earlier and left out of Dev 7. */
export const DEV7_DEFERRED_SEAMS = ['FIELD_WALK', 'BIMODAL_DUO', 'RHYTHMIC_GROUPING'] as const;

export const PRACTICE_CATEGORIES = [
  'HOME_CONTINUITY',
  'HOLD_FIELD',
  'RESEAT',
  'CELL_LINEAGE',
  'OUTSIDE_RETURN',
  'TRITONE_PAIR',
  'QUARTAL_COMP',
  'QUARTAL_LINE',
  'ANSWER_BASS',
  'SUPPORT_BASS',
  'STRUCTURAL_SILENCE',
  'NO_PHRASE',
  'NONE',
] as const;

export type PracticeCategory = (typeof PRACTICE_CATEGORIES)[number];

export const PRACTICE_CATEGORY_LABELS: Record<PracticeCategory, string> = {
  HOME_CONTINUITY: 'HOME / CONTINUITY',
  HOLD_FIELD: 'HOLD_FIELD',
  RESEAT: 'RESEAT',
  CELL_LINEAGE: 'CELL_LINEAGE',
  OUTSIDE_RETURN: 'OUTSIDE / RETURN',
  TRITONE_PAIR: 'TRITONE_PAIR',
  QUARTAL_COMP: 'QUARTAL_COMP',
  QUARTAL_LINE: 'QUARTAL_LINE',
  ANSWER_BASS: 'ANSWER_BASS',
  SUPPORT_BASS: 'SUPPORT_BASS',
  STRUCTURAL_SILENCE: 'STRUCTURAL_SILENCE',
  NO_PHRASE: 'NO_PHRASE',
  NONE: 'NONE',
};

export const PRACTICE_DIFFICULTIES = ['SPARSE', 'INTERMEDIATE', 'EXPANDED'] as const;
export type PracticeDifficulty = (typeof PRACTICE_DIFFICULTIES)[number];

export const PRACTICE_GUITAR_ROLES = [
  'GUITAR_LEADS',
  'GUITAR_RESPONDS',
  'GUITAR_SUPPORTS',
  'COUNTERPOINT',
  'SHARED_FIELD',
  'SPACE',
] as const;
export type PracticeGuitarRole = (typeof PRACTICE_GUITAR_ROLES)[number];

export const AUTO_COLOR_LABELS: ReadonlyArray<readonly [MusicalIntention, string]> = [
  ['DARKER', 'Darker'],
  ['BRIGHTER', 'Brighter'],
  ['MORE_OUTSIDE', 'More outside'],
  ['LESS_OUTSIDE', 'Less outside'],
  ['RETAIN_MOTIF', 'Keep motif'],
  ['MORE_CONTINUITY', 'More continuity'],
  ['MORE_TENSION', 'More tension'],
  ['TENSION_THEN_RESOLVE', 'Tension then resolve'],
  ['MORE_SPACE', 'More space'],
  ['LESS_DENSE', 'Less dense'],
  ['MORE_SUSPENDED', 'More suspended'],
  ['MORE_AMBIGUOUS', 'More ambiguous'],
  ['MORE_EDGE', 'More edge'],
  ['RETURN_HOME', 'Return home'],
  ['STAY_CURRENT', 'Stay current'],
  ['DEVELOP', 'Develop'],
  ['SUPPORT_BASS', 'Support bass'],
  ['ANSWER_BASS', 'Answer bass'],
  ['SUPPORT_GUITAR', 'Support guitar'],
  ['ANSWER_GUITAR', 'Answer guitar'],
];

const LINEAGE_CYCLE: readonly CellTransform[] = ['M-DEG', 'rotation', 'transposition', 'M-NEAR', 'original'];
const RESEAT_CYCLE: readonly ReseatLanding[] = ['common-tone', 'held', 'bass', 'declared-tension'];

/**
 * Legacy five-position practice view. Interval lists are the conceptual positions
 * from the V1 wheel. They are matched against the Dev 6 colour registry.
 * They are not registry resources.
 */
const LEGACY_WHEEL: readonly { label: string; intervals: readonly number[] }[] = [
  { label: 'Minor Pentatonic', intervals: [0, 3, 5, 7, 10] },
  { label: 'Major Pentatonic', intervals: [0, 2, 4, 7, 9] },
  { label: '6/9 Suspended', intervals: [0, 2, 5, 7, 9] },
  { label: 'Major 7 Color', intervals: [2, 4, 7, 9, 11] },
  { label: 'Suspended Pentatonic', intervals: [0, 2, 5, 7, 10] },
];

export interface PracticeRequest {
  category?: PracticeCategory;
  difficulty?: PracticeDifficulty;
  centre?: string;
  chord?: string;
  targetNotes?: string;
  bassNotes?: string;
  heldNotes?: string;
  landingNote?: string;
  motif?: string;
  fieldId?: string;
  /** Destination already chosen by Dev 6. Pivot link will not invent one. */
  destinationFieldId?: string;
  customNotes?: string;
  guitarRole?: PracticeGuitarRole | '';
  variation?: number;
  intentions?: readonly MusicalIntention[];
  /** Written source timing, including rests. Absent: even generated rhythm. */
  sourceRhythm?: readonly RhythmSlot[];
  /** Spelling of each source note, in sounding-note order. */
  sourceSpellings?: readonly (ExplicitPitchSpelling | null)[];
}

export interface PracticeExample {
  version: typeof PENTATONIC_OPTIONS_V2_FACADE_VERSION;
  category: PracticeCategory;
  categoryLabel: string;
  difficulty: PracticeDifficulty;
  centre: string;
  chord: string;
  fieldId: string;
  fieldName: string;
  fieldNotes: string;
  practiceView: boolean;
  operator: string;
  silenceKind: 'SOUNDING' | 'PATH_NONE' | 'NO_PHRASE' | 'STRUCTURAL_SILENCE';
  notes: string;
  pitches: readonly number[];
  lineage: string;
  returnQuality: string;
  formFit: string;
  duoFit: string;
  gceAdvisory: string;
  gceOverall: number | null;
  reason: string;
  musicXml: string;
  variation: number;
  barCount: number;
  rhythm: 'source' | 'generated';
}

export interface FieldBrowserRow {
  id: string;
  name: string;
  notes: string;
  brightness: string;
  darkness: string;
  stability: string;
  ambiguity: string;
  openness: string;
  tension: string;
  chromaticEdge: string;
  relationship: string;
  pathArchetype: boolean;
}

export interface LegacyWheelRow {
  label: string;
  notes: string;
  practiceView: boolean;
  mappedResourceId: string | null;
  mappedResourceName: string | null;
  mappedReference: string | null;
  exactAtCentre: boolean;
}

export interface CustomCollectionResult {
  ok: boolean;
  error?: string;
  label: string;
  notes: string;
  pitchClasses: readonly number[];
  matchedResourceId: string | null;
  sessionOnly: true;
}

export interface CompareView {
  ranking: 'plan-alternative-silence';
  capped: number;
  sortedByGce: false;
  candidates: readonly {
    slot: string;
    kind: string;
    resource: string;
    operator: string;
    notes: string;
    lineage: string;
    returnQuality: string;
    formFit: string;
    duoFit: string;
    gceAdvisory: string;
    gceOverall: number | null;
    silence: boolean;
    musicXml: string;
  }[];
}

export function defaultPracticeRequest(): PracticeRequest {
  return {
    category: 'HOME_CONTINUITY',
    difficulty: 'SPARSE',
    centre: 'C',
    chord: '',
    targetNotes: '',
    bassNotes: '',
    heldNotes: '',
    landingNote: '',
    motif: '',
    fieldId: 'minor_pentatonic',
    customNotes: '',
    guitarRole: '',
    variation: 0,
    intentions: ['MORE_CONTINUITY'],
  };
}

export function sha256Text(text: string): string {
  return sha256Hex(text);
}

function sha256Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bitLength = bytes.length * 8;
  const withOne = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
  withOne.set(bytes);
  withOne[bytes.length] = 0x80;
  const view = new DataView(withOne.buffer);
  view.setUint32(withOne.length - 4, bitLength, false);
  const k = new Uint32Array(64);
  const primes = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  k.set(primes);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < withOne.length; offset += 64) {
    for (let i = 0; i < 16; i += 1) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15]!, 7) ^ rotr(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(w[i - 2]!, 17) ^ rotr(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i += 1) {
      const s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[i]! + w[i]!) >>> 0;
      const s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((word) => word.toString(16).padStart(8, '0')).join('');
}

function rotr(value: number, bits: number): number {
  return ((value >>> bits) | (value << (32 - bits))) >>> 0;
}

function tokens(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function notesOf(raw: string | undefined): ParsedNote[] {
  const list = tokens(raw);
  if (list.length === 0) return [];
  const parsed = parseNoteList(list);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.notes;
}

function centreOf(raw: string | undefined): ParsedNote {
  const parsed = parseNoteToken((raw ?? 'C').trim() || 'C');
  if (!parsed) throw new Error('Centre needs a note such as C, Eb, or F#.');
  return parsed;
}

function budgetFor(difficulty: PracticeDifficulty): OutsideBudget {
  if (difficulty === 'SPARSE') return 'LOW';
  return difficulty === 'EXPANDED' ? 'MODERATE' : 'MODERATE';
}

function duoRoleFor(role: PracticeGuitarRole | '' | undefined, category: PracticeCategory): DuoRole {
  if (category === 'ANSWER_BASS') return 'BASS_LEADS';
  if (category === 'SUPPORT_BASS') return 'BASS_SUPPORTS';
  if (role === 'GUITAR_LEADS') return 'GUITAR_LEADS';
  if (role === 'GUITAR_RESPONDS') return 'GUITAR_RESPONDS';
  if (role === 'GUITAR_SUPPORTS') return 'GUITAR_SUPPORTS';
  if (role === 'COUNTERPOINT') return 'COUNTERPOINT';
  if (role === 'SHARED_FIELD') return 'SHARED_FIELD';
  if (role === 'SPACE') return 'SPACE';
  return 'UNKNOWN';
}

function resourcePitchClasses(resourceId: string, centre: ParsedNote): number[] | null {
  const resource = getPentatonicColourResource(resourceId);
  if (!resource) return null;
  return canonicalPitchSet(resource.intervals.map((interval) => mod12(centre.pc + interval)));
}

function matchResource(pcs: readonly number[], preferredCentre: ParsedNote): { id: string; name: string; reference: string; atCentre: boolean } | null {
  const want = canonicalPitchSet(pcs).join(',');
  let fallback: { id: string; name: string; reference: string; atCentre: boolean } | null = null;
  for (const resource of listPentatonicColourResources()) {
    for (let pc = 0; pc < 12; pc += 1) {
      const set = canonicalPitchSet(resource.intervals.map((interval) => mod12(pc + interval))).join(',');
      if (set !== want) continue;
      const reference = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][pc]!;
      const row = { id: resource.id, name: resource.displayName, reference, atCentre: pc === preferredCentre.pc };
      if (row.atCentre) return row;
      fallback ??= row;
    }
  }
  return fallback;
}

function registryCollection(fieldId: string, centre: ParsedNote): PentatonicCollectionView {
  const resource = getPentatonicColourResource(fieldId);
  if (!resource) {
    throw new Error(`Pentatonic colour "${fieldId}" is not registered. Refusing to substitute minor pentatonic.`);
  }
  if (resource.pathArchetypeId === 'major_pentatonic' || resource.pathArchetypeId === 'minor_pentatonic') {
    return manualCollection(resource.pathArchetypeId, centre.spelling);
  }
  return {
    name: `${resource.displayName} ${centre.spelling}`,
    archetypeId: resource.id,
    referenceNote: centre.spelling,
    homeRelationshipLabel: null,
  };
}

function fieldSpelling(fieldId: string, centre: ParsedNote): { name: string; notes: string } {
  const resource = getPentatonicColourResource(fieldId);
  if (!resource) return { name: fieldId, notes: '' };
  const notes = spellFromReference(centre.spelling, resource.intervals, resource.letterSteps);
  return { name: resource.displayName, notes: notes.join(' ') };
}

function motifFromRequest(raw: string | undefined): BaseMotif | null {
  const parsed = notesOf(raw);
  if (parsed.length === 0) return null;
  const pitches = parsed.map((note) => 60 + note.pc);
  return {
    id: 'practice-motif',
    barCount: 1,
    notes: pitches.map((pitch, index) => ({ pitch, startBeat: index * 0.5, duration: 0.5 })),
  };
}

function trajectoryBars(category: PracticeCategory, difficulty: PracticeDifficulty): number {
  if (category === 'OUTSIDE_RETURN' || category === 'ANSWER_BASS' || category === 'HOLD_FIELD') return 2;
  if (category === 'CELL_LINEAGE' && difficulty === 'EXPANDED') return 2;
  return 1;
}

function silenceKindOf(category: PracticeCategory, texture: string | undefined): PracticeExample['silenceKind'] {
  if (texture === 'STRUCTURAL_SILENCE' || category === 'STRUCTURAL_SILENCE') return 'STRUCTURAL_SILENCE';
  if (category === 'NO_PHRASE') return 'NO_PHRASE';
  if (category === 'NONE') return 'PATH_NONE';
  return 'SOUNDING';
}

type TimedPracticeEvent = {
  kind: 'note' | 'rest';
  startBeat: number;
  duration: number;
  pitch?: number;
  spelling?: ExplicitPitchSpelling;
};

export function exportGuitarMusicXml(args: {
  title: string;
  chord: string;
  bars: readonly (readonly number[])[];
  bpm?: number;
  /** Field spellings. Applied per generated note. Does not rewrite notes that already carry spelling. */
  pitchClassSpelling?: Readonly<Record<number, string>>;
  timed?: readonly (readonly TimedPracticeEvent[])[];
  beats?: number;
  beatType?: number;
  /** Written as direction words. Does not change the notes. */
  collection?: { resourceId: string; centre: string };
}): string {
  const barCount = Math.max(1, args.timed?.length ?? args.bars.length);
  const beats = args.beats ?? 4;
  const beatType = args.beatType ?? 4;
  const chord = args.chord.trim() || 'N.C.';
  const part = createPart(
    'guitar',
    'Electric Guitar',
    CLEAN_ELECTRIC_GUITAR.instrumentIdentity,
    CLEAN_ELECTRIC_GUITAR.midiProgram,
    'treble',
    barCount,
    () => chord,
    () => undefined
  );
  part.measures.forEach((measure, index) => {
    measure.measureBeatSpanQuarters = beats * (4 / beatType);
    const timed = args.timed?.[index];
    if (timed) {
      measure.events = timed.map((event) => {
        if (event.kind === 'rest' || event.pitch === undefined) return createRest(event.startBeat, event.duration, 1);
        const note = createNote(event.pitch, event.startBeat, event.duration, 1);
        const spelling = event.spelling ?? spellingFromMap(event.pitch, args.pitchClassSpelling);
        if (spelling) note.spelling = spelling;
        return note;
      });
      return;
    }
    const pitches = args.bars[index] ?? [];
    if (pitches.length === 0) {
      measure.events = [createRest(0, beats * (4 / beatType), 1)];
      return;
    }
    const duration = Math.min(1, (beats * (4 / beatType)) / pitches.length);
    const events: ScoreEvent[] = pitches.map((pitch, noteIndex) => {
      const note = createNote(pitch, noteIndex * duration, duration, 1);
      const spelling = spellingFromMap(pitch, args.pitchClassSpelling);
      if (spelling) note.spelling = spelling;
      return note;
    });
    const used = duration * pitches.length;
    const span = beats * (4 / beatType);
    if (used < span - 1e-6) events.push(createRest(used, span - used, 1));
    measure.events = events;
  });
  const score = createScore(args.title, [part], { tempo: args.bpm ?? 92 });
  if (args.collection) score.measureWordsMarkings = { 1: formatCollectionIdentityMark(args.collection.resourceId, args.collection.centre) };
  score.timeSignature = { beats, beatType };
  score.barMeterMap = {};
  for (let bar = 1; bar <= barCount; bar += 1) score.barMeterMap[bar] = { numerator: beats, denominator: beatType };
  score.keySignature = { fifths: 0, mode: 'major', hideKeySignature: false };
  return xmlOf(score);
}

function spellingFromMap(midi: number, map: Readonly<Record<number, string>> | undefined): ExplicitPitchSpelling | undefined {
  if (!map) return undefined;
  const token = map[mod12(Math.round(midi))];
  if (!token) return undefined;
  return explicitSpelling(token);
}

export function explicitSpelling(token: string): ExplicitPitchSpelling | null {
  const parsed = parseNoteToken(token);
  if (!parsed) return null;
  let alter = 0;
  if (parsed.spelling.endsWith('bb')) alter = -2;
  else if (parsed.spelling.endsWith('b')) alter = -1;
  else if (parsed.spelling.endsWith('##')) alter = 2;
  else if (parsed.spelling.endsWith('#')) alter = 1;
  return { step: parsed.letter, alter };
}

function spellingMapFromText(notes: string): Record<number, string> {
  return pitchClassSpellingMap(notes.split(/\s+/).filter(Boolean));
}

function namedMidi(midi: number, preferred: readonly ParsedNote[]): string {
  const rounded = Math.round(midi);
  const octave = Math.floor(rounded / 12) - 1;
  return `${spellingForPc(mod12(rounded), preferred)}${octave}`;
}

function xmlOf(score: ScoreModel): string {
  const exported = exportScoreModelToMusicXml(score);
  if (!exported.success || !exported.xml) throw new Error(exported.errors.join(' ') || 'MusicXML export failed.');
  if (/<staff-type>tab<\/staff-type>/i.test(exported.xml)) throw new Error('Pentatonic export included a TAB staff.');
  return exported.xml;
}

function gceFor(pitches: readonly number[], silence: boolean): { overall: number | null; comment: string } {
  if (silence || pitches.length === 0) {
    return { overall: null, comment: 'No numeric score. Silence is a musical result. This number does not choose the example.' };
  }
  try {
    const part = createPart(
      'guitar',
      'Electric Guitar',
      CLEAN_ELECTRIC_GUITAR.instrumentIdentity,
      CLEAN_ELECTRIC_GUITAR.midiProgram,
      'treble',
      1,
      () => 'N.C.',
      () => undefined
    );
    const duration = Math.min(1, 4 / pitches.length);
    part.measures[0]!.measureBeatSpanQuarters = 4;
    part.measures[0]!.events = pitches.map((pitch, index) => createNote(pitch, index * duration, duration, 1));
    const score = createScore('Pentatonic Options V2', [part], { tempo: 92 });
    score.timeSignature = { beats: 4, beatType: 4 };
    const result = evaluateGce({ output: score, features: {}, weights: defaultGceWeights });
    return {
      overall: result.finalScore,
      comment: `Advisory ${result.finalScore.toFixed(2)}. This number does not choose the example.`,
    };
  } catch {
    return { overall: null, comment: 'GCE advisory unavailable. This number does not choose the example.' };
  }
}

export function transformPracticeCell(args: { pitches: readonly number[]; fieldId?: string; centre?: string; transform?: CellTransform }): number[] {
  const centre = centreOf(args.centre);
  const home = registryCollection(args.fieldId || 'minor_pentatonic', centre);
  return transformCell({
    pitches: [...args.pitches],
    collection: home,
    transform: args.transform ?? 'M-DEG',
    target: home,
  });
}

export function listPracticeFields(centreRaw?: string): FieldBrowserRow[] {
  const centre = centreOf(centreRaw);
  const homeId = 'minor_pentatonic';
  return listPentatonicColourResources().map((resource) => {
    const spelled = spellFromReference(centre.spelling, resource.intervals, resource.letterSteps);
    const relation =
      resource.id === homeId
        ? 'Home field at this centre'
        : resource.metadata.distanceFromHome === 'near'
          ? 'Near the minor-pentatonic home'
          : resource.metadata.distanceFromHome === 'far'
            ? 'Remote from the minor-pentatonic home'
            : 'A step away from the minor-pentatonic home';
    return {
      id: resource.id,
      name: resource.displayName,
      notes: spelled.join(' '),
      brightness: resource.metadata.brightness,
      darkness: resource.metadata.darkness,
      stability: resource.metadata.stability,
      ambiguity: resource.metadata.ambiguity,
      openness: resource.metadata.openness,
      tension: resource.metadata.tension,
      chromaticEdge: resource.metadata.chromaticEdge,
      relationship: relation,
      pathArchetype: resource.pathArchetypeId !== null,
    };
  });
}

export function legacyColourWheel(centreRaw?: string): LegacyWheelRow[] {
  const centre = centreOf(centreRaw);
  return LEGACY_WHEEL.map((position) => {
    const pcs = canonicalPitchSet(position.intervals.map((interval) => mod12(centre.pc + interval)));
    const match = matchResource(pcs, centre);
    const exact = listPentatonicColourResources().find((resource) => canonicalPitchSet(resource.intervals).join(',') === canonicalPitchSet(position.intervals).join(','));
    const notes = pcs.map((pc) => ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'][pc]!).join(' ');
    return {
      label: position.label,
      notes: exact ? spellFromReference(centre.spelling, exact.intervals, exact.letterSteps).join(' ') : notes,
      practiceView: !exact,
      mappedResourceId: exact?.id ?? match?.id ?? null,
      mappedResourceName: exact?.displayName ?? match?.name ?? null,
      mappedReference: exact ? centre.spelling : match?.reference ?? null,
      exactAtCentre: Boolean(exact),
    };
  });
}

export function inspectCustomCollection(raw: string, centreRaw?: string): CustomCollectionResult {
  const centre = centreOf(centreRaw);
  const before = listPentatonicColourResources().length;
  const parsed = notesOf(raw);
  if (parsed.length !== 5) {
    return { ok: false, error: 'Custom collection needs exactly five notes.', label: 'CUSTOM', notes: '', pitchClasses: [], matchedResourceId: null, sessionOnly: true };
  }
  const pcs = canonicalPitchSet(parsed.map((note) => note.pc));
  if (pcs.length !== 5) {
    return { ok: false, error: 'Custom collection needs five distinct pitch classes.', label: 'CUSTOM', notes: '', pitchClasses: pcs, matchedResourceId: null, sessionOnly: true };
  }
  const match = matchResource(pcs, centre);
  if (listPentatonicColourResources().length !== before) throw new Error('Custom collection mutated the colour registry.');
  const spelling = parsed.map((note) => note.spelling).join(' ');
  return {
    ok: true,
    label: match ? match.name : 'CUSTOM',
    notes: spelling,
    pitchClasses: pcs,
    matchedResourceId: match?.id ?? null,
    sessionOnly: true,
  };
}

export function analyseManualContext(request: PracticeRequest = {}): {
  centre: string;
  recommendation: string;
  colour: string;
  musicContextPreset: string;
} {
  const centre = centreOf(request.centre);
  const chord = (request.chord ?? '').trim();
  const region = recommendPentatonicsFromRegion({
    tonalCentre: { root: centre.spelling, mode: 'minor' },
    harmonyBars: chord && chord.toUpperCase() !== 'N.C.' ? [chord] : [],
    melodyNotes: tokens(request.motif),
    bassNotes: tokens(request.bassNotes),
    heldNotes: tokens(request.heldNotes),
    targetNotes: tokens(request.targetNotes),
    purpose: 'continuity',
  });
  const context = buildPentatonicMusicContext({
    tonalCentre: { root: centre.spelling, mode: 'minor' },
    harmonyBars: chord ? [chord] : [],
  });
  const colour = evaluatePentatonicColour({
    centreNote: centre.spelling,
    home: { resourceId: request.fieldId || 'minor_pentatonic', referenceNote: centre.spelling },
    melodyNotes: tokens(request.motif),
    bassNotes: tokens(request.bassNotes),
    heldNotes: tokens(request.heldNotes),
  });
  const top = region.recommendations[0];
  return {
    centre: centre.spelling,
    recommendation: top ? `${top.transposedName}. ${top.explanation}` : colour.explanation,
    colour: colour.explanation,
    musicContextPreset: context.presetId,
  };
}

export function analyseScoreXml(xml: string): { sha256: string; map: string; regionCount: number; song: string } {
  const sha256 = sha256Text(xml);
  const analysis = analyzePentatonicScore(xml);
  if (sha256Text(xml) !== sha256) throw new Error('Score analysis modified the source MusicXML.');
  return {
    sha256,
    map: formatPentatonicScoreMap(analysis),
    regionCount: analysis.regions.length,
    song: analysis.song,
  };
}

export function planPracticeAutoColor(request: PracticeRequest = {}): { intentions: MusicalIntention[]; outcome: string; operator: string; rationale: string; silence: string } {
  const centre = centreOf(request.centre);
  const intentions = (request.intentions?.length ? request.intentions : ['MORE_CONTINUITY']).filter((item): item is MusicalIntention =>
    (MUSICAL_INTENTIONS as readonly string[]).includes(item)
  );
  const plan = planAutoColor({
    intentions,
    centreNote: centre.spelling,
    homeResourceId: request.fieldId || 'minor_pentatonic',
    currentResourceId: request.fieldId || 'minor_pentatonic',
    homeKnown: true,
    fieldIsHome: (request.fieldId || 'minor_pentatonic') === 'minor_pentatonic',
    hasMotif: tokens(request.motif).length >= 3,
    duoRole: duoRoleFor(request.guitarRole, request.category ?? 'HOME_CONTINUITY'),
    density: request.difficulty === 'EXPANDED' ? 'moderate' : 'sparse',
    grounding: assessGrounding({
      bassPitchClasses: notesOf(request.bassNotes).map((note) => [note.pc]),
      heldPitchClasses: notesOf(request.heldNotes).map((note) => [note.pc]),
      motifIdentityRetained: tokens(request.motif).length >= 3,
      explicitAnchor: true,
    }),
  });
  return {
    intentions: [...plan.intentions],
    outcome: plan.outcome,
    operator: plan.operator,
    rationale: plan.rationale,
    silence: plan.silencePreference,
  };
}

export function generatePracticeExample(request: PracticeRequest = {}): PracticeExample {
  const merged: PracticeRequest = { ...defaultPracticeRequest(), ...request };
  const category = merged.category ?? 'HOME_CONTINUITY';
  const difficulty = merged.difficulty ?? 'SPARSE';
  const variation = Math.max(0, merged.variation ?? 0);
  const centre = centreOf(merged.centre);
  const chord = (merged.chord ?? '').trim();
  const custom = (merged.customNotes ?? '').trim();
  let fieldId = merged.fieldId || 'minor_pentatonic';
  let practiceView = false;
  let fieldName = fieldSpelling(fieldId, centre).name;
  let fieldNotes = fieldSpelling(fieldId, centre).notes;
  if (custom) {
    const inspected = inspectCustomCollection(custom, centre.spelling);
    if (!inspected.ok) throw new Error(inspected.error || 'Custom collection rejected.');
    fieldName = inspected.label;
    fieldNotes = inspected.notes;
    practiceView = inspected.label === 'CUSTOM';
    if (inspected.matchedResourceId) fieldId = inspected.matchedResourceId;
  }
  const home = registryCollection(fieldId, centre);
  if (!getPentatonicColourResource(fieldId)?.pathArchetypeId) {
    const spelled = fieldSpelling(fieldId, centre);
    if (!custom) {
      fieldName = spelled.name;
      fieldNotes = spelled.notes;
    }
    practiceView = getPentatonicColourResource(fieldId)?.pathArchetypeId == null && fieldId !== 'minor_pentatonic' && fieldId !== 'major_pentatonic';
  }
  const motif = motifFromRequest(merged.motif);
  const bass = notesOf(merged.bassNotes);
  const held = notesOf(merged.heldNotes);
  const landing = notesOf(merged.landingNote)[0] ?? null;
  const grounding = assessGrounding({
    bassPitchClasses: bass.map((note) => [note.pc]),
    heldPitchClasses: held.map((note) => [note.pc]),
    motifIdentityRetained: Boolean(motif && motif.notes.length >= 3),
    explicitAnchor: true,
  });
  const lineageTransform = LINEAGE_CYCLE[variation % LINEAGE_CYCLE.length]!;
  const reseatPreference = RESEAT_CYCLE[variation % RESEAT_CYCLE.length]!;
  const slipDirection: 1 | -1 | undefined = variation === 0 ? undefined : variation % 2 === 0 ? 1 : -1;
  const structuralSilence = category === 'STRUCTURAL_SILENCE';
  const operator = operatorFor(category);
  const purpose = purposeFor(category);
  const harmonyBars = category === 'HOLD_FIELD' ? [chord || 'N.C.', chord || 'N.C.'] : chord ? [chord] : undefined;
  const realisation = realisePentatonicPhrase({
    purpose,
    home,
    motif,
    budget: category === 'OUTSIDE_RETURN' && difficulty === 'SPARSE' ? DEFAULT_OUTSIDE_BUDGET : budgetFor(difficulty),
    grounding,
    method: 'M-DEG',
    operator: structuralSilence ? undefined : operator,
    structuralSilence,
    explicitOutside: category === 'OUTSIDE_RETURN',
    explicitReseat: category === 'RESEAT' || (difficulty !== 'SPARSE' && category === 'HOME_CONTINUITY' && variation > 0),
    pairAvailable: category === 'TRITONE_PAIR',
    pair: category === 'TRITONE_PAIR' ? { left: home, right: transposeCollection(home, 6) } : null,
    lineageTransform: category === 'CELL_LINEAGE' || category === 'HOME_CONTINUITY' ? lineageTransform : undefined,
    reseat: {
      preference: category === 'ANSWER_BASS' || category === 'SUPPORT_BASS' ? 'bass' : reseatPreference,
      bassPc: bass[0]?.pc ?? null,
      heldPc: held[0]?.pc ?? null,
      tensionPc: landing?.pc ?? null,
    },
    slipDirection,
    returnKind: category === 'OUTSIDE_RETURN' ? 'HOME' : undefined,
    targetNotePc: landing?.pc ?? null,
    harmonyBars,
    sourceRhythm:
      merged.sourceRhythm &&
      merged.sourceRhythm.length > 0 &&
      (category === 'CELL_LINEAGE' || category === 'RESEAT' || category === 'HOME_CONTINUITY')
        ? merged.sourceRhythm
        : undefined,
    considerHold: category === 'HOLD_FIELD',
    quartalLine: category === 'QUARTAL_LINE',
  });
  let pitches = [...realisation.pitches];
  if ((category === 'QUARTAL_COMP' || category === 'QUARTAL_LINE') && pitches.length === 0) {
    const pcs = resourcePitchClasses(fieldId, centre) ?? collectionPitchClasses(home);
    const quartal = category === 'QUARTAL_COMP' ? realiseQuartalComp(pcs) : realiseQuartalLine({ fieldPitchClasses: pcs, parentPitches: pitches });
    if (quartal && 'pitches' in quartal && quartal.pitches.length > 0 && !('declined' in quartal && quartal.declined)) pitches = [...quartal.pitches];
  }
  const silentCategory = category === 'STRUCTURAL_SILENCE' || category === 'NO_PHRASE' || category === 'NONE';
  if (silentCategory) pitches = [];
  const silenceKind = silenceKindOf(category, realisation.textureChoice);
  const sounding = silenceKind === 'SOUNDING' && pitches.length > 0;
  const barCount = trajectoryBars(category, difficulty);
  const bars = sounding ? [pitches, ...Array.from({ length: barCount - 1 }, () => [] as number[])] : Array.from({ length: barCount }, () => [] as number[]);
  const pitchClassSpelling = spellingMapFromText(fieldNotes);
  const preferredSpellings = parseNoteList(fieldNotes.split(/\s+/).filter(Boolean));
  const rhythm = sounding && realisation.rhythm === 'source' ? 'source' : 'generated';
  const timed = sounding ? timedEventsForExample({ realisation, pitches, pitchClassSpelling, sourceSpellings: merged.sourceSpellings, home, fieldId, rhythm }) : undefined;
  const musicXml = exportGuitarMusicXml({
    title: `Pentatonic Options V2 ${PRACTICE_CATEGORY_LABELS[category]}`,
    chord,
    bars,
    pitchClassSpelling,
    timed,
    ...(getPentatonicColourResource(fieldId) || fieldId === 'major_pentatonic' || fieldId === 'minor_pentatonic'
      ? { collection: { resourceId: fieldId, centre: centre.spelling } }
      : {}),
  });
  const gce = gceFor(sounding ? pitches : [], !sounding);
  const noteText = sounding
    ? pitches.map((pitch) => namedMidi(pitch, preferredSpellings.ok ? preferredSpellings.notes : [])).join(' ')
    : 'rest';
  return {
    version: PENTATONIC_OPTIONS_V2_FACADE_VERSION,
    category,
    categoryLabel: PRACTICE_CATEGORY_LABELS[category],
    difficulty,
    centre: centre.spelling,
    chord: chord || 'N.C.',
    fieldId,
    fieldName,
    fieldNotes,
    practiceView,
    operator: silenceKind === 'STRUCTURAL_SILENCE' ? 'STRUCTURAL_SILENCE' : silenceKind === 'NO_PHRASE' ? 'NO_PHRASE' : silenceKind === 'PATH_NONE' ? 'NONE' : realisation.plan.operator,
    silenceKind,
    notes: noteText,
    pitches: sounding ? pitches : [],
    lineage: realisation.lineage?.identityPreserved ? 'Lineage clear' : sounding ? 'Lineage weak' : 'Parent cell unused',
    returnQuality: realisation.returnKind ?? realisation.plan.trajectory,
    formFit: barCount > 1 ? 'Short trajectory' : 'One-bar cell',
    duoFit: duoRoleFor(merged.guitarRole, category),
    gceAdvisory: gce.comment,
    gceOverall: gce.overall,
    reason: realisation.plan.reason,
    musicXml,
    variation,
    barCount,
    rhythm: sounding ? rhythm : 'generated',
  };
}

function spellingMatches(spelling: ExplicitPitchSpelling, midi: number): boolean {
  const parsed = explicitSpelling(`${spelling.step}${spelling.alter === 1 ? '#' : spelling.alter === -1 ? 'b' : spelling.alter === 2 ? '##' : spelling.alter === -2 ? 'bb' : ''}`);
  if (!parsed) return false;
  const token = `${spelling.step}${spelling.alter === 1 ? '#' : spelling.alter === -1 ? 'b' : spelling.alter === 2 ? '##' : spelling.alter === -2 ? 'bb' : ''}`;
  return parseNoteToken(token)?.pc === mod12(Math.round(midi));
}

function timedEventsForExample(args: {
  realisation: ReturnType<typeof realisePentatonicPhrase>;
  pitches: readonly number[];
  pitchClassSpelling: Record<number, string>;
  sourceSpellings?: readonly (ExplicitPitchSpelling | null)[];
  home: PentatonicCollectionView;
  fieldId: string;
  rhythm: 'source' | 'generated';
}): TimedPracticeEvent[][] | undefined {
  const slipMap =
    args.realisation.plan.operator === 'SLIP' && args.realisation.slipDirection
      ? slippedSpellingMap(args.home, args.fieldId, args.realisation.slipDirection.semitones)
      : null;
  if (args.rhythm === 'source') {
    let noteIndex = 0;
    const events: TimedPracticeEvent[] = args.realisation.rhythmEvents.map((event) => {
      if (event.kind === 'rest' || event.pitch === undefined) {
        return { kind: 'rest', startBeat: event.startBeat, duration: event.duration };
      }
      const source = args.sourceSpellings?.[noteIndex] ?? null;
      noteIndex += 1;
      const spelling =
        source && spellingMatches(source, event.pitch) ? source : spellingFromMap(event.pitch, args.pitchClassSpelling);
      return { kind: 'note', startBeat: event.startBeat, duration: event.duration, pitch: event.pitch, spelling };
    });
    return [events];
  }
  if (!slipMap) return undefined;
  const duration = Math.min(1, 4 / args.pitches.length);
  const soundedCount = args.realisation.lineage?.soundedCell.length ?? args.pitches.length;
  const returnCount = args.realisation.returnKind ? 1 : 0;
  return [
    args.pitches.map((pitch, index) => {
      const inSlip = index >= soundedCount && index < args.pitches.length - returnCount;
      return {
        kind: 'note' as const,
        startBeat: index * duration,
        duration,
        pitch,
        spelling: spellingFromMap(pitch, inSlip ? slipMap : args.pitchClassSpelling),
      };
    }),
  ];
}

function slippedSpellingMap(home: PentatonicCollectionView, fieldId: string, semitones: number): Record<number, string> {
  const resource = getPentatonicColourResource(fieldId);
  if (!resource) return {};
  const transposed = transposeCollection(home, semitones);
  return pitchClassSpellingMap(spellFromReference(transposed.referenceNote, resource.intervals, resource.letterSteps));
}

function operatorFor(category: PracticeCategory): PentatonicOperator | undefined {
  switch (category) {
    case 'HOME_CONTINUITY':
      return 'CELL_LINEAGE';
    case 'HOLD_FIELD':
      return 'HOLD_FIELD';
    case 'RESEAT':
      return 'RESEAT';
    case 'CELL_LINEAGE':
      return 'CELL_LINEAGE';
    case 'OUTSIDE_RETURN':
      return 'SLIP';
    case 'TRITONE_PAIR':
      return 'TRITONE_PAIR';
    case 'QUARTAL_COMP':
      return 'QUARTAL_COMP';
    case 'QUARTAL_LINE':
      return 'QUARTAL_LINE';
    case 'ANSWER_BASS':
      return 'RESEAT';
    case 'SUPPORT_BASS':
      return 'RETAIN';
    case 'NONE':
      return 'NONE';
    case 'NO_PHRASE':
      return 'NONE';
    case 'STRUCTURAL_SILENCE':
      return undefined;
    default:
      return undefined;
  }
}

function purposeFor(category: PracticeCategory): 'MOTIF' | 'LYRICAL_ANSWER' | 'COUNTERLINE' | 'COMPING_FRAGMENT' | 'DEVELOPMENT' | 'NO_PHRASE' {
  if (category === 'NO_PHRASE' || category === 'NONE' || category === 'STRUCTURAL_SILENCE') return 'NO_PHRASE';
  if (category === 'ANSWER_BASS') return 'LYRICAL_ANSWER';
  if (category === 'SUPPORT_BASS' || category === 'QUARTAL_COMP') return 'COMPING_FRAGMENT';
  if (category === 'OUTSIDE_RETURN' || category === 'TRITONE_PAIR') return 'DEVELOPMENT';
  if (category === 'QUARTAL_LINE') return 'COUNTERLINE';
  return 'MOTIF';
}

export function nextPracticeExample(request: PracticeRequest = {}): PracticeExample {
  const current = { ...defaultPracticeRequest(), ...request };
  return generatePracticeExample({ ...current, variation: (current.variation ?? 0) + 1 });
}

export function comparePracticeExample(example: PracticeExample, intentions?: readonly MusicalIntention[]): CompareView {
  const before = sha256Text(example.musicXml);
  const analysis = analyzePentatonicScore(example.musicXml);
  if (sha256Text(example.musicXml) !== before) throw new Error('Compare modified the source MusicXML.');
  const region = analysis.regions[0];
  if (!region) {
    return { ranking: 'plan-alternative-silence', capped: COMPARE_CANDIDATE_CAP, sortedByGce: false, candidates: [] };
  }
  const compared = comparePentatonicCandidates({
    xml: example.musicXml,
    analysis,
    region,
    intentions: intentions?.length ? intentions : ['RETAIN_MOTIF', 'MORE_CONTINUITY'],
  });
  const ordered = orderCompareCandidates(compared.candidates);
  return {
    ranking: 'plan-alternative-silence',
    capped: COMPARE_CANDIDATE_CAP,
    sortedByGce: false,
    candidates: ordered.slice(0, COMPARE_CANDIDATE_CAP).map((candidate) => ({
      slot: candidate.slot,
      kind: candidate.kind,
      resource: candidate.resource,
      operator: candidate.operator,
      notes: candidate.generatedNotes,
      lineage: candidate.lineage,
      returnQuality: candidate.returnQuality,
      formFit: candidate.formFit,
      duoFit: candidate.duoFit,
      gceAdvisory: candidate.gceAdvisory,
      gceOverall: candidate.gceOverall,
      silence: candidate.silence,
      musicXml: candidate.musicXml,
    })),
  };
}

export function exportPracticeSheet(examples: readonly PracticeExample[]): string {
  if (examples.length < 2 || examples.length > 8) throw new Error('Practice sheet needs 2 to 8 examples.');
  const bars = examples.map((example) => (example.silenceKind === 'SOUNDING' ? [...example.pitches] : []));
  const pitchClassSpelling: Record<number, string> = {};
  for (const example of examples) {
    for (const [pc, spelling] of Object.entries(spellingMapFromText(example.fieldNotes))) {
      const key = Number(pc);
      if (pitchClassSpelling[key] === undefined) pitchClassSpelling[key] = spelling;
    }
  }
  return exportGuitarMusicXml({
    title: 'Pentatonic Options V2 Practice Sheet',
    chord: examples[0]?.chord || 'N.C.',
    bars,
    pitchClassSpelling,
  });
}

export function museScoreOpenCommand(filePath: string): readonly string[] {
  return ['open', '-a', 'MuseScore 4', filePath];
}

export function revealInFinderCommand(filePath: string): readonly string[] {
  return ['open', '-R', filePath];
}

export const OUTNESS_LABELS: ReadonlyArray<readonly [OutnessLevel, string]> = [
  ['SUBTLE', 'Subtle'],
  ['MODERATE', 'Moderate'],
  ['STRONG', 'Strong'],
  ['REMOTE', 'Remote'],
];

const DISTANCE_WORDS: Record<string, string> = {
  IDENTICAL: 'Same colour',
  NEAR: 'Near',
  RELATED: 'Related',
  OUTSIDE: 'Outside',
  REMOTE: 'Remote',
};

export interface ColourNavigationView {
  title: string;
  text: string;
  candidates: readonly { slot: string; text: string }[];
}

function practiceField(request: PracticeRequest) {
  return fieldFromResource(request.fieldId || 'minor_pentatonic', request.centre || 'C');
}

function notePcs(raw: string | undefined): number[] {
  if (!raw?.trim()) return [];
  const parsed = parseNoteList(raw.split(/[\s,]+/).filter(Boolean));
  return parsed.ok ? parsed.notes.map((note) => note.pc) : [];
}

function practiceLayerRole(role: PracticeRequest['guitarRole'], fallback: LayerRole): LayerRole {
  if (role === 'SPACE') return 'SHARED_SPACE';
  if (role === 'COUNTERPOINT') return 'COUNTERPOINT';
  if (role === 'GUITAR_RESPONDS' || role === 'GUITAR_SUPPORTS') return 'GUITAR_SLOW_BASS_ACTIVE';
  if (role === 'GUITAR_LEADS' || role === 'SHARED_FIELD') return 'GUITAR_ACTIVE_BASS_SLOW';
  return fallback;
}

export function moveOut(request: PracticeRequest, outness: OutnessLevel = 'MODERATE'): ColourNavigationView {
  const source = practiceField(request);
  if (!source) return { title: 'Distance', text: 'That field is not in the vocabulary.', candidates: [] };
  const home = fieldFromResource(source.resourceId ?? 'minor_pentatonic', request.centre || 'C');
  const plan = planGradedOut({ source, outness, home });
  const distance = DISTANCE_WORDS[plan.distance.distanceClass] ?? plan.distance.distanceClass;
  const text = plan.disposition === 'STAY'
    ? 'Current field already sits in that band. Nothing was chosen.'
    : `${plan.explanation} ${distance}.`;
  return {
    title: 'Distance',
    text,
    candidates: [
      { slot: 'Current', text: source.displayName },
      { slot: 'Band', text },
      { slot: 'Silence', text: 'Silence remains available. No lick was written.' },
    ],
  };
}

export function connectFields(request: PracticeRequest): ColourNavigationView {
  const source = practiceField(request);
  if (!source) return { title: 'Pivot link', text: 'That field is not in the vocabulary.', candidates: [] };
  if (!request.destinationFieldId) {
    return {
      title: 'Pivot link',
      text: 'Pivot link checks a source and a destination Dev 6 already chose. No destination was supplied.',
      candidates: [
        { slot: 'Source', text: source.displayName },
        { slot: 'Destination', text: 'None' },
        { slot: 'Pivot', text: 'No check yet.' },
      ],
    };
  }
  const destination = fieldFromResource(request.destinationFieldId, request.centre || 'C');
  if (!destination) return { title: 'Pivot link', text: 'That destination is not in the vocabulary.', candidates: [] };
  const motif = notePcs(request.motif);
  const pivot = planPivotLink({ source, destination, home: source, motifPitchClasses: motif });
  const text = pivot.mechanism === 'NO_CREDIBLE_PIVOT' ? 'No credible pivot.' : pivot.explanation;
  return {
    title: 'Pivot link',
    text,
    candidates: [
      { slot: 'Source', text: source.displayName },
      { slot: 'Destination', text: destination.displayName },
      { slot: 'Pivot', text },
    ],
  };
}

export function deriveField(request: PracticeRequest): ColourNavigationView {
  const parent = [...notePcs(request.targetNotes), ...notePcs(request.bassNotes), ...notePcs(request.heldNotes), ...notePcs(request.motif)];
  const current = practiceField(request);
  const extracted = extractParentField({
    parentPitchClasses: parent,
    melodyPitchClasses: notePcs(request.targetNotes),
    bassPitchClasses: notePcs(request.bassNotes),
    motifPitchClasses: notePcs(request.motif),
    current,
    centreSpelling: request.centre || 'C',
  });
  if (extracted.disposition !== 'FIELDS') {
    return {
      title: 'Extract',
      text: `Advisory. ${extracted.explanation}`,
      candidates: [
        { slot: 'Extracted', text: 'None' },
        { slot: 'Contrast', text: 'None' },
        { slot: 'NONE', text: extracted.explanation },
      ],
    };
  }
  const slots = ['Strongest', 'Contrast', 'Sparse'];
  const candidates = extracted.candidates.slice(0, 3).map((row, index) => ({
    slot: slots[index] ?? row.rank,
    text: `${row.field.displayName}. ${row.field.noteNames.join(' ')}`,
  }));
  while (candidates.length < 3) candidates.push({ slot: 'NONE', text: 'No further subset.' });
  return { title: 'Extract', text: `Advisory. ${extracted.explanation}`, candidates };
}

export function layerField(request: PracticeRequest, role: LayerRole = 'GUITAR_ACTIVE_BASS_SLOW'): ColourNavigationView {
  const field = practiceField(request);
  if (!field) return { title: 'Layered field', text: 'That field is not in the vocabulary.', candidates: [] };
  const plan = planLayeredField({ field, role: practiceLayerRole(request.guitarRole, role) });
  const text = plan.roleRelation === 'SHARED_SPACE'
    ? `Analysis. ${field.displayName} stays. Both layers rest.`
    : `Analysis. ${field.displayName}. Bass ${plan.bassSubset.length} notes, guitar ${plan.guitarSubset.length}. ${plan.densityRelation}`;
  return { title: 'Layered field', text, candidates: [{ slot: 'Field', text }] };
}
