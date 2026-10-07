/**
 * Pentatonic Options V2 practice facade.
 * UI state stays in the app. Every musical decision is delegated to the
 * existing pentatonic engine, phrase engine, GCE evaluator, and MusicXML exporter.
 * This file does not add path resources, operators, or a second registry.
 */

import { createHash } from 'node:crypto';
import { evaluateGce, defaultGceWeights } from '../evaluation/gceEvaluator';
import { exportScoreModelToMusicXml } from '../export/musicxmlExporter';
import { CLEAN_ELECTRIC_GUITAR } from '../instrument-profiles/guitarProfile';
import type { BaseMotif } from '../motif/motifTypes';
import { createNote, createPart, createRest, createScore } from '../score-model/scoreEventBuilder';
import type { ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { analyzePentatonicScore, formatPentatonicScoreMap } from './analyzeScore';
import { planAutoColor, MUSICAL_INTENTIONS, type MusicalIntention } from './autoColor';
import { getPentatonicColourResource, listPentatonicColourResources } from './colourRegistry';
import { evaluatePentatonicColour } from './colourEvaluate';
import { midiNoteName, manualCollection } from './dev4cWorkflow';
import type { DuoRole } from './formDuoIntelligence';
import { assessGrounding, DEFAULT_OUTSIDE_BUDGET, type OutsideBudget } from './pathIntelligence';
import {
  canonicalPitchSet,
  mod12,
  parseNoteList,
  parseNoteToken,
  spellFromReference,
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
import { collectionPitchClasses, transposeCollection, type PentatonicCollectionView } from './motifTransform';

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

/** Named here so a later release can attach them. Not implemented. */
export const DEV7_EXTENSION_SEAMS_NOT_IMPLEMENTED = [
  'GRADED_OUT',
  'PIVOT_LINK',
  'FIELD_WALK',
  'PARENT_EXTRACTION',
  'BIMODAL_DUO',
] as const;

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
  customNotes?: string;
  guitarRole?: PracticeGuitarRole | '';
  variation?: number;
  intentions?: readonly MusicalIntention[];
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
  return createHash('sha256').update(text).digest('hex');
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

function registryCollection(fieldId: string, centre: ParsedNote): PentatonicCollectionView | null {
  const resource = getPentatonicColourResource(fieldId);
  const archetype = resource?.pathArchetypeId;
  if (archetype !== 'major_pentatonic' && archetype !== 'minor_pentatonic') return null;
  return manualCollection(archetype, centre.spelling);
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

export function exportGuitarMusicXml(args: {
  title: string;
  chord: string;
  bars: readonly (readonly number[])[];
  bpm?: number;
}): string {
  const barCount = Math.max(1, args.bars.length);
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
    measure.measureBeatSpanQuarters = 4;
    const pitches = args.bars[index] ?? [];
    if (pitches.length === 0) {
      measure.events = [createRest(0, 4, 1)];
      return;
    }
    const duration = Math.min(1, 4 / pitches.length);
    const events: ScoreEvent[] = pitches.map((pitch, noteIndex) => createNote(pitch, noteIndex * duration, duration, 1));
    const used = duration * pitches.length;
    if (used < 4 - 1e-6) events.push(createRest(used, 4 - used, 1));
    measure.events = events;
  });
  const score = createScore(args.title, [part], { tempo: args.bpm ?? 92 });
  score.timeSignature = { beats: 4, beatType: 4 };
  score.barMeterMap = {};
  for (let bar = 1; bar <= barCount; bar += 1) score.barMeterMap[bar] = { numerator: 4, denominator: 4 };
  score.keySignature = { fifths: 0, mode: 'major', hideKeySignature: false };
  return xmlOf(score);
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
  const home = registryCollection(args.fieldId || 'minor_pentatonic', centre) ?? manualCollection('minor_pentatonic', centre.spelling);
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
  const home = registryCollection(fieldId, centre) ?? manualCollection('minor_pentatonic', centre.spelling);
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
  const musicXml = exportGuitarMusicXml({
    title: `Pentatonic Options V2 ${PRACTICE_CATEGORY_LABELS[category]}`,
    chord,
    bars,
  });
  const gce = gceFor(sounding ? pitches : [], !sounding);
  const noteText = sounding ? pitches.map((pitch) => midiNoteName(pitch)).join(' ') : 'rest';
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
  };
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
  return exportGuitarMusicXml({ title: 'Pentatonic Options V2 Practice Sheet', chord: examples[0]?.chord || 'N.C.', bars });
}

export function museScoreOpenCommand(filePath: string): readonly string[] {
  return ['open', '-a', 'MuseScore 4', filePath];
}

export function revealInFinderCommand(filePath: string): readonly string[] {
  return ['open', '-R', filePath];
}
