/**
 * Dev 5B phrase operators.
 * The pentatonic layer chooses the cell, the colour, the path, and the operator.
 * `mapMotifPitches` and `buildPhrase` realise the notes. No second generator.
 * INTENSIFY, fixed-interval sequence, and one-cell-per-chord are not implemented.
 */

import type { PhraseIntent } from '../goldenPath/phraseIntentTypes';
import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import type { MusicContext } from '../music-context/musicContextTypes';
import type { BaseMotif } from '../motif/motifTypes';
import { buildPhrase } from '../phrase/phraseBuilder';
import type { Phrase } from '../phrase/phraseTypes';
import { createNote } from '../score-model/scoreEventBuilder';
import { assessHoldField, harmonyEventsFromSymbols, type HoldFieldReport } from './holdField';
import { assessGrounding, DEFAULT_OUTSIDE_BUDGET, type GroundingAssessment, type OutsideBudget, type PathTrajectory } from './pathIntelligence';
import {
  collectionPitchClasses,
  degreeOf,
  mapMotifPitches,
  maxAdjacentCollectionRun,
  transposeCollection,
  type MotifMapMethod,
  type PentatonicCollectionView,
} from './motifTransform';
import { mod12 } from './pitch';
import { quartalLineFaults, quartalSubsets, realiseQuartalComp, realiseQuartalLine, type QuartalComp, type QuartalLine } from './quartalField';

export const PENTATONIC_PHRASE_OPERATORS_VERSION = 'pentatonic-phrase-operators-5c';

export const DEV5B_DEFAULT_METHOD: MotifMapMethod = 'M-DEG';

export const DEV5B_REJECTED_BEHAVIOURS = [
  'exhaustive rotations',
  'permutation dumps',
  'scale runs',
  'automatic sequencing',
  'constant transposition',
  'collection switching on every chord',
  'forced use of all five notes',
  'INTENSIFY',
  'fixed-interval SEQUENCE',
  'THROUGH one-cell-per-chord',
  'guitar fret-shift realisation',
] as const;

export type Dev5bPurpose = 'MOTIF' | 'LYRICAL_ANSWER' | 'COUNTERLINE' | 'COMPING_FRAGMENT' | 'DEVELOPMENT' | 'NO_PHRASE';

export type PentatonicOperator =
  | 'CELL_LINEAGE'
  | 'RESEAT'
  | 'SLIP'
  | 'TRITONE_PAIR'
  | 'RETAIN'
  | 'HOLD_FIELD'
  | 'QUARTAL_COMP'
  | 'QUARTAL_LINE'
  | 'NONE';

export type CellTransform = 'original' | 'rotation' | 'transposition' | 'M-DEG' | 'M-NEAR';

export type ReturnKind = 'HOME' | 'COMMON_TONE' | 'TARGET_NOTE' | 'STABILISED_FIELD' | 'NONE';

export type SlipLandingClass = 'STRONG' | 'ACCEPTABLE' | 'WEAK';

export type SlipDirectionLabel = 'DOWN' | 'UP';

export type SlipDirectionBasis = 'DEFAULT' | 'CONTEXT OVERRIDE';

/**
 * Advisory only. A WEAK landing does not reject the phrase.
 * Semitone (and a unison already on the target) is STRONG.
 * A whole tone is ACCEPTABLE. Anything larger is WEAK.
 */
export interface SlipLanding {
  finalOutsideNote: number;
  returnTarget: number | null;
  approachInterval: number | null;
  classification: SlipLandingClass | null;
}

export interface SlipDirectionReport {
  label: SlipDirectionLabel;
  basis: SlipDirectionBasis;
  staticField: boolean;
  semitones: 1 | -1;
}

export type ReseatLanding = 'common-tone' | 'held' | 'bass' | 'declared-tension';

const PHRASE_INTENT: Record<Exclude<Dev5bPurpose, 'NO_PHRASE'>, PhraseIntent> = {
  MOTIF: 'guitar_lead',
  LYRICAL_ANSWER: 'answer_guitar',
  COUNTERLINE: 'development',
  COMPING_FRAGMENT: 'bass_lead',
  DEVELOPMENT: 'development',
};

const METER = { beats: 4, beatType: 4 };

export interface CellLineage {
  parentCell: readonly number[];
  soundedCell: readonly number[];
  chain: readonly CellTransform[];
  resultPitches: readonly number[];
  identityPreserved: boolean;
  fourNoteSubset: boolean;
}

export interface PhraseAdvisory {
  lineageIdentity: 'clear' | 'weak' | 'absent';
  recognisableTransformation: boolean;
  excessiveOutside: boolean;
  unnecessarySwitching: boolean;
  slipWithoutReturn: boolean;
  weakGrounding: boolean;
  excessivePermutation: boolean;
  scaleRun: boolean;
  mechanicalInterval: boolean;
  overDensity: boolean;
  registerJump: boolean;
  notes: readonly string[];
}

export interface OperatorPlan {
  purpose: Dev5bPurpose;
  operator: PentatonicOperator;
  trajectory: PathTrajectory;
  phraseResult: 'PHRASE' | 'NO_PHRASE';
  method: MotifMapMethod;
  budget: OutsideBudget;
  friction: string | null;
  reason: string;
}

export interface PentatonicPhraseRealisation {
  version: typeof PENTATONIC_PHRASE_OPERATORS_VERSION;
  plan: OperatorPlan;
  phraseResult: 'PHRASE' | 'NO_PHRASE';
  pathTrajectory: PathTrajectory;
  phraseEngineCalled: boolean;
  phrase: Phrase | null;
  phraseIntent: PhraseIntent | null;
  musicContext: MusicContext | null;
  method: MotifMapMethod | null;
  lineage: CellLineage | null;
  collectionName: string | null;
  returnKind: ReturnKind | null;
  pitches: readonly number[];
  slipLanding: SlipLanding | null;
  slipDirection: SlipDirectionReport | null;
  holdField: HoldFieldReport | null;
  quartal: QuartalComp | QuartalLine | null;
  advisory: PhraseAdvisory;
  /** Set only when Dev 6A asks for structural silence. Absent on Dev 5 phrases. */
  textureChoice?: 'STRUCTURAL_SILENCE';
}

export function fourNoteSubset(collection: PentatonicCollectionView, omitIndex: number, register = 60): number[] {
  const classes = collectionPitchClasses(collection);
  const kept = classes.filter((_, index) => index !== ((omitIndex % classes.length) + classes.length) % classes.length);
  const ordered = [kept[0]!, kept[2] ?? kept[1]!, kept[3] ?? kept[1]!, kept[1]!].filter((pc, index, list) => list.indexOf(pc) === index);
  const pitches: number[] = [];
  let cursor = register;
  for (const pc of ordered) {
    cursor = nearestMidi(cursor, pc);
    pitches.push(cursor);
    cursor += 1;
  }
  return pitches;
}

export function assessPentatonicGrounding(args: Parameters<typeof assessGrounding>[0]): GroundingAssessment {
  return assessGrounding(args);
}

function outsideRoom(budget: OutsideBudget, alreadyUsed: number): { allowed: boolean; friction: string | null } {
  if (alreadyUsed <= 0) return { allowed: true, friction: null };
  if (budget === 'LOW') return { allowed: false, friction: 'LOW budget refuses a second outside device.' };
  if (alreadyUsed >= 2) return { allowed: false, friction: 'A third outside device would sequence the excursion.' };
  return { allowed: true, friction: 'Repeated outside device. Extra friction.' };
}

export function planPentatonicOperator(args: {
  purpose: Dev5bPurpose;
  hasMotif: boolean;
  grounding: GroundingAssessment;
  budget?: OutsideBudget;
  pairAvailable?: boolean;
  outsideDevicesAlreadyUsed?: number;
  explicitOutside?: boolean;
  explicitReseat?: boolean;
  quartalAvailable?: boolean;
}): OperatorPlan {
  const budget = args.budget ?? DEFAULT_OUTSIDE_BUDGET;
  const method = DEV5B_DEFAULT_METHOD;
  const used = args.outsideDevicesAlreadyUsed ?? 0;
  const base = {
    purpose: args.purpose,
    method,
    budget,
  };
  if (args.purpose === 'NO_PHRASE') {
    return {
      ...base,
      operator: 'NONE',
      trajectory: 'RETAIN_CURRENT_FIELD',
      phraseResult: 'NO_PHRASE',
      friction: null,
      reason: 'NO_PHRASE is silence. Path NONE is a separate abstention.',
    };
  }
  if (!args.hasMotif && args.purpose !== 'COMPING_FRAGMENT') {
    return {
      ...base,
      operator: 'NONE',
      trajectory: 'RETAIN_CURRENT_FIELD',
      phraseResult: 'NO_PHRASE',
      friction: null,
      reason: 'No source cell. Lineage is not invented.',
    };
  }
  const room = outsideRoom(budget, used);
  const outsideWanted = args.explicitOutside === true && args.grounding.present && room.allowed;
  const pairWanted = outsideWanted && args.pairAvailable === true && (args.purpose === 'DEVELOPMENT' || args.purpose === 'MOTIF');

  if (args.purpose === 'LYRICAL_ANSWER') {
    if (!args.hasMotif || (args.explicitOutside && !outsideWanted)) {
      return {
        ...base,
        operator: args.hasMotif ? 'RESEAT' : 'NONE',
        trajectory: 'HOME_COLOUR_HOME',
        phraseResult: args.hasMotif ? 'PHRASE' : 'NO_PHRASE',
        friction: args.explicitOutside ? room.friction ?? 'Lyrical answer keeps the collection.' : null,
        reason: 'Silence or a reseat. A lyrical answer does not take an outside excursion by default.',
      };
    }
    return {
      ...base,
      operator: 'RESEAT',
      trajectory: 'HOME_COLOUR_HOME',
      phraseResult: 'PHRASE',
      friction: null,
      reason: 'Same collection. Landing changes.',
    };
  }

  if (args.purpose === 'COMPING_FRAGMENT') {
    const quartal = args.quartalAvailable === true && !args.explicitReseat;
    return {
      ...base,
      operator: args.explicitReseat ? 'RESEAT' : quartal ? 'QUARTAL_COMP' : 'RETAIN',
      trajectory: 'RETAIN_CURRENT_FIELD',
      phraseResult: 'PHRASE',
      friction: args.explicitOutside ? 'Comping stays a short subset.' : null,
      reason: quartal
        ? 'Two or three notes from the field, with a fourth when the field has one. Not a five-note run.'
        : 'Two or three notes, or silence. Not a five-note run.',
    };
  }

  if (args.purpose === 'COUNTERLINE') {
    if (outsideWanted && budget !== 'LOW') {
      return {
        ...base,
        operator: 'SLIP',
        trajectory: 'HOME_OUTSIDE_HOME',
        phraseResult: 'PHRASE',
        friction: room.friction,
        reason: 'One grounded slip, then a common-tone return.',
      };
    }
    return {
      ...base,
      operator: 'RESEAT',
      trajectory: 'CONTINUITY',
      phraseResult: 'PHRASE',
      friction: args.explicitOutside && !args.grounding.present ? 'No grounding. Outside stays unsuitable.' : null,
      reason: 'Common-tone landing. The collection stays.',
    };
  }

  if (pairWanted) {
    return {
      ...base,
      operator: 'TRITONE_PAIR',
      trajectory: 'TRITONE_PAIR_FIELD',
      phraseResult: 'PHRASE',
      friction: room.friction,
      reason: 'The pair is already established. Two cell statements, not a switch per chord.',
    };
  }

  if (outsideWanted && (args.purpose === 'DEVELOPMENT' || args.purpose === 'MOTIF')) {
    return {
      ...base,
      operator: 'SLIP',
      trajectory: 'HOME_OUTSIDE_HOME',
      phraseResult: 'PHRASE',
      friction: room.friction,
      reason: 'One semitone slip on the cell, then a return. M-DEG is the map.',
    };
  }

  if (args.explicitReseat) {
    return {
      ...base,
      operator: 'RESEAT',
      trajectory: 'HOME_COLOUR_HOME',
      phraseResult: 'PHRASE',
      friction: args.explicitOutside && !args.grounding.present ? 'No grounding. Slip was refused.' : room.friction,
      reason: 'HOME to colour to HOME by landing, not by a new collection.',
    };
  }

  return {
    ...base,
    operator: 'CELL_LINEAGE',
    trajectory: 'HOME',
    phraseResult: 'PHRASE',
    friction: args.explicitOutside ? room.friction ?? 'Outside was not earned.' : null,
    reason: 'The phrase descends from the source cell.',
  };
}

function nearestMidi(midi: number, pc: number): number {
  let best = midi;
  let bestDistance = 99;
  for (let candidate = midi - 18; candidate <= midi + 18; candidate += 1) {
    if (mod12(candidate) !== mod12(pc)) continue;
    const distance = Math.abs(candidate - midi);
    if (distance < bestDistance || (distance === bestDistance && candidate < best)) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function motifFromPitches(id: string, pitches: readonly number[], rhythmFrom?: BaseMotif | null): BaseMotif {
  return {
    id,
    barCount: 1,
    notes: pitches.map((pitch, index) => ({
      pitch,
      startBeat: rhythmFrom?.notes[index]?.startBeat ?? index,
      duration: rhythmFrom?.notes[index]?.duration ?? 1,
    })),
  };
}

function mapCell(
  pitches: readonly number[],
  source: PentatonicCollectionView,
  target: PentatonicCollectionView,
  method: MotifMapMethod
): number[] {
  const motif = motifFromPitches('cell', pitches);
  const mapped = mapMotifPitches({
    motif,
    rhythm: motif.notes.map((note) => ({ kind: 'note', startBeat: note.startBeat, duration: note.duration })),
    source,
    target,
    method,
    meter: METER,
  });
  return mapped.notes.map((note) => note.pitch);
}

function rotate(pitches: readonly number[]): number[] {
  if (pitches.length === 0) return [];
  return [...pitches.slice(1), pitches[0]!];
}

function collectionStep(collection: PentatonicCollectionView): number {
  const classes = collectionPitchClasses(collection);
  if (classes.length < 2) return 2;
  const step = mod12(classes[1]! - classes[0]!);
  return step === 0 ? 2 : step;
}

export function transformCell(args: {
  pitches: readonly number[];
  collection: PentatonicCollectionView;
  transform: CellTransform;
  target?: PentatonicCollectionView;
}): number[] {
  if (args.transform === 'original') return [...args.pitches];
  if (args.transform === 'rotation') return rotate(args.pitches);
  if (args.transform === 'transposition') return args.pitches.map((pitch) => pitch + collectionStep(args.collection));
  const method: MotifMapMethod = args.transform === 'M-NEAR' ? 'M-NEAR' : 'M-DEG';
  return mapCell(args.pitches, args.collection, args.target ?? args.collection, method);
}

function extractCell(motif: BaseMotif | null | undefined): number[] | null {
  if (!motif) return null;
  const pitches = motif.notes.map((note) => note.pitch);
  if (pitches.length < 3) return null;
  return pitches.slice(0, Math.min(4, pitches.length));
}

function loosenScale(pitches: readonly number[], collection: PentatonicCollectionView): { pitches: number[]; chain: CellTransform[] } | null {
  let current = [...pitches];
  const chain: CellTransform[] = ['original'];
  if (maxAdjacentCollectionRun(current, collection) < 3) return { pitches: current, chain };
  current = rotate(current);
  chain.push('rotation');
  if (maxAdjacentCollectionRun(current, collection) < 3) return { pitches: current, chain };
  current = rotate(current);
  chain.push('rotation');
  if (maxAdjacentCollectionRun(current, collection) < 3) return { pitches: current, chain };
  return null;
}

function degreePattern(pitches: readonly number[], collection: PentatonicCollectionView): Array<number | null> {
  return pitches.map((pitch) => degreeOf(pitch, collection));
}

function identityHolds(parent: readonly number[], resultWindow: readonly number[], source: PentatonicCollectionView, target: PentatonicCollectionView): boolean {
  const left = degreePattern(parent, source);
  const right = degreePattern(resultWindow, target);
  if (left.length > 0 && left.length === right.length && left.every((degree, index) => degree !== null && degree === right[index])) return true;
  const parentSet = new Set(parent.map((pitch) => mod12(pitch)));
  const resultSet = new Set(resultWindow.map((pitch) => mod12(pitch)));
  if (parentSet.size >= 3 && parentSet.size === resultSet.size && [...parentSet].every((pc) => resultSet.has(pc))) return true;
  let shared = 0;
  for (const pc of parentSet) if (resultSet.has(pc)) shared += 1;
  return parentSet.size >= 3 && shared >= Math.min(3, parentSet.size - 1);
}

function inCollection(pitches: readonly number[], collection: PentatonicCollectionView): boolean {
  return pitches.every((pitch) => degreeOf(pitch, collection) !== null);
}

function landingMidi(current: number, pc: number): number {
  return nearestMidi(current, pc);
}

export function reseatLanding(args: {
  pitches: readonly number[];
  collection: PentatonicCollectionView;
  preference: ReseatLanding;
  bassPc?: number | null;
  heldPc?: number | null;
  tensionPc?: number | null;
}): { pitches: number[]; landingPc: number; collectionUnchanged: true } {
  const classes = collectionPitchClasses(args.collection);
  const next = [...args.pitches];
  const index = next.length - 1;
  const currentPc = mod12(next[index] ?? 60);
  const preferred =
    args.preference === 'bass'
      ? args.bassPc
      : args.preference === 'held'
        ? args.heldPc
        : args.preference === 'declared-tension'
          ? args.tensionPc
          : (args.bassPc ?? args.heldPc ?? null);
  let target = preferred !== null && preferred !== undefined && classes.includes(mod12(preferred)) ? mod12(preferred) : null;
  if (target === null || target === currentPc) {
    target = classes.find((pc) => pc !== currentPc && pc !== classes[0]) ?? classes.find((pc) => pc !== currentPc) ?? currentPc;
  }
  next[index] = landingMidi(next[index] ?? 60, target);
  return { pitches: next, landingPc: target, collectionUnchanged: true };
}

function subsetForComping(pitches: readonly number[], collection: PentatonicCollectionView): number[] {
  let count = Math.min(3, pitches.length);
  while (count > 2 && maxAdjacentCollectionRun(pitches.slice(0, count), collection) >= 3) count -= 1;
  return pitches.slice(0, count);
}

function windows(pitches: readonly number[], size: number): number[][] {
  const out: number[][] = [];
  for (let index = 0; index + size <= pitches.length; index += 1) out.push(pitches.slice(index, index + size));
  return out;
}

export function antiLickFindings(pitches: readonly number[], collection: PentatonicCollectionView): {
  scaleRun: boolean;
  exhaustiveRotation: boolean;
  permutationDump: boolean;
  allFiveForced: boolean;
  chromaticSequence: boolean;
  rejected: boolean;
} {
  const scaleRun = pitches.length >= 4 && maxAdjacentCollectionRun(pitches, collection) >= 3;
  const size = Math.min(4, pitches.length);
  const sets = windows(pitches, size).map((window) => [...window.map((pitch) => mod12(pitch))].sort((left, right) => left - right).join(','));
  const counts = new Map<string, number>();
  for (const set of sets) counts.set(set, (counts.get(set) ?? 0) + 1);
  const permutationDump = [...counts.values()].some((count) => count >= 3);
  const rotations = new Set(windows(pitches, size).map((window) => window.map((pitch) => mod12(pitch)).join(',')));
  const exhaustiveRotation = size >= 3 && rotations.size >= 3 && permutationDump;
  const degrees = new Set(pitches.map((pitch) => degreeOf(pitch, collection)).filter((degree): degree is number => degree !== null));
  const allFiveForced = degrees.size >= 5 && pitches.length >= 5;
  let chromaticSequence = false;
  if (size >= 3) {
    const levels = windows(pitches, size).map((window) => window[0]!);
    const shifts = levels.slice(1).map((pitch, index) => pitch - levels[index]!);
    chromaticSequence = shifts.filter((shift) => Math.abs(shift) === 1).length >= 2;
  }
  return {
    scaleRun,
    exhaustiveRotation,
    permutationDump,
    allFiveForced,
    chromaticSequence,
    rejected: scaleRun || exhaustiveRotation || permutationDump || allFiveForced || chromaticSequence,
  };
}

export function advisePentatonicPhrase(args: {
  lineage: CellLineage | null;
  pitches: readonly number[];
  home: PentatonicCollectionView | null;
  operator: PentatonicOperator;
  grounding: GroundingAssessment;
  returned: boolean;
  distinctCollections: number;
}): PhraseAdvisory {
  const home = args.home;
  const lick = home ? antiLickFindings(args.pitches, home) : null;
  const outside = home ? args.pitches.filter((pitch) => degreeOf(pitch, home) === null).length : 0;
  const inside = args.pitches.length - outside;
  const excessiveOutside = args.pitches.length > 0 && outside > inside;
  const lineageIdentity = !args.lineage ? 'absent' : args.lineage.identityPreserved ? 'clear' : 'weak';
  const slipWithoutReturn = args.operator === 'SLIP' && !args.returned;
  const weakGrounding = (args.operator === 'SLIP' || args.operator === 'TRITONE_PAIR') && !args.grounding.present;
  const unnecessarySwitching = args.distinctCollections > 2;
  const quartalFaults = home ? quartalLineFaults(args.pitches, collectionPitchClasses(home)) : null;
  const mechanicalInterval =
    args.operator !== 'QUARTAL_COMP' && (Boolean(quartalFaults?.mechanical) || Boolean(lick?.chromaticSequence));
  const overDensity = Boolean(quartalFaults?.overDensity) || (args.operator === 'QUARTAL_COMP' && args.pitches.length > 3);
  const registerJump = Boolean(quartalFaults?.registerJump);
  const notes: string[] = [];
  if (lick?.scaleRun) notes.push('Adjacent collection motion runs like a scale.');
  if (lick?.permutationDump || lick?.exhaustiveRotation) notes.push('The cell is permuted instead of stated.');
  if (lick?.chromaticSequence) notes.push('The cell is sequenced by semitone more than once.');
  if (mechanicalInterval && !lick?.chromaticSequence) notes.push('The same interval repeats in one direction.');
  if (overDensity) notes.push('The phrase is too dense for this field.');
  if (registerJump) notes.push('A leap leaves the cell’s register.');
  if (lick?.allFiveForced) notes.push('All five notes were forced.');
  if (excessiveOutside) notes.push('Outside notes outlast the home statement.');
  if (slipWithoutReturn) notes.push('Slip has no return.');
  if (weakGrounding) notes.push('Outside motion has no bass, hold, motif, or anchor.');
  if (unnecessarySwitching) notes.push('More than two collections in one phrase.');
  if (args.lineage && !args.lineage.identityPreserved) notes.push('The cell lost its lineage.');
  if (lineageIdentity === 'clear') notes.push('The cell is still recognisable.');
  return {
    lineageIdentity,
    recognisableTransformation: Boolean(args.lineage && args.lineage.chain.length > 0 && args.lineage.identityPreserved),
    excessiveOutside,
    unnecessarySwitching,
    slipWithoutReturn,
    weakGrounding,
    excessivePermutation: Boolean(lick?.permutationDump || lick?.exhaustiveRotation),
    scaleRun: Boolean(lick?.scaleRun),
    mechanicalInterval,
    overDensity,
    registerJump,
    notes,
  };
}

export function selectPhraseByAdvice<T extends { advisory: PhraseAdvisory; gceScore: number | null }>(rows: readonly T[]): T | null {
  if (rows.length === 0) return null;
  const viable = rows.filter(
    (row) =>
      !row.advisory.scaleRun &&
      !row.advisory.excessivePermutation &&
      !row.advisory.slipWithoutReturn &&
      !row.advisory.mechanicalInterval &&
      !row.advisory.overDensity
  );
  const pool = viable.length > 0 ? viable : [...rows];
  return [...pool].sort((left, right) => {
    const leftWarnings = left.advisory.notes.filter((note) => note !== 'The cell is still recognisable.').length;
    const rightWarnings = right.advisory.notes.filter((note) => note !== 'The cell is still recognisable.').length;
    if (leftWarnings !== rightWarnings) return leftWarnings - rightWarnings;
    if (left.advisory.lineageIdentity !== right.advisory.lineageIdentity) {
      return left.advisory.lineageIdentity === 'clear' ? -1 : 1;
    }
    return 0;
  })[0]!;
}

function contextFor(args: {
  operator: PentatonicOperator;
  trajectory: PathTrajectory;
  method: MotifMapMethod | null;
  harmonyBars?: readonly string[];
}): MusicContext {
  return buildMusicContextFromHarmonyBars({
    harmonyBars: args.harmonyBars && args.harmonyBars.length > 0 ? [...args.harmonyBars] : ['N.C.'],
    sourceEngineId: 'pentatonic-engine',
    presetId: 'guitar_bass_duo',
    seed: 85051,
    bpm: 72,
    receipts: [
      {
        engine: 'pentatonic',
        kind: 'dev5b-path-phrase',
        payload: {
          operator: args.operator,
          trajectory: args.trajectory,
          method: args.method,
        },
      },
    ],
  });
}

function silence(plan: OperatorPlan, home: PentatonicCollectionView | null, grounding: GroundingAssessment): PentatonicPhraseRealisation {
  return {
    version: PENTATONIC_PHRASE_OPERATORS_VERSION,
    plan,
    phraseResult: 'NO_PHRASE',
    pathTrajectory: plan.trajectory,
    phraseEngineCalled: false,
    phrase: null,
    phraseIntent: null,
    musicContext: null,
    method: null,
    lineage: null,
    collectionName: home?.name ?? null,
    returnKind: null,
    pitches: [],
    slipLanding: null,
    slipDirection: null,
    holdField: null,
    quartal: null,
    advisory: advisePentatonicPhrase({
      lineage: null,
      pitches: [],
      home,
      operator: 'NONE',
      grounding,
      returned: false,
      distinctCollections: 0,
    }),
  };
}

function finish(args: {
  plan: OperatorPlan;
  home: PentatonicCollectionView;
  grounding: GroundingAssessment;
  pitches: number[];
  lineage: CellLineage;
  method: MotifMapMethod | null;
  returnKind: ReturnKind | null;
  returned: boolean;
  distinctCollections: number;
  harmonyBars?: readonly string[];
  slipLanding?: SlipLanding | null;
  slipDirection?: SlipDirectionReport | null;
  holdField?: HoldFieldReport | null;
  quartal?: QuartalComp | QuartalLine | null;
}): PentatonicPhraseRealisation {
  const lick = antiLickFindings(args.pitches, args.home);
  if (lick.rejected) {
    return silence(
      { ...args.plan, phraseResult: 'NO_PHRASE', operator: 'NONE', reason: 'The line was a scale, a permutation, or a sequence. Silence instead.' },
      args.home,
      args.grounding
    );
  }
  const notes = args.pitches.map((pitch, index) => createNote(pitch, index, 1, 1));
  const phrase = buildPhrase(`pentatonic-${args.plan.operator}`, { startBar: 1, endBar: 1 }, notes, 'ambiguous');
  const intent = args.plan.purpose === 'NO_PHRASE' ? null : PHRASE_INTENT[args.plan.purpose];
  return {
    version: PENTATONIC_PHRASE_OPERATORS_VERSION,
    plan: args.plan,
    phraseResult: 'PHRASE',
    pathTrajectory: args.plan.trajectory,
    phraseEngineCalled: true,
    phrase,
    phraseIntent: intent,
    musicContext: contextFor({
      operator: args.plan.operator,
      trajectory: args.plan.trajectory,
      method: args.method,
      harmonyBars: args.harmonyBars,
    }),
    method: args.method,
    lineage: { ...args.lineage, resultPitches: args.pitches },
    collectionName: args.home.name,
    returnKind: args.returnKind,
    pitches: args.pitches,
    slipLanding: args.slipLanding ?? null,
    slipDirection: args.slipDirection ?? null,
    holdField: args.holdField ?? null,
    quartal: args.quartal ?? null,
    advisory: advisePentatonicPhrase({
      lineage: { ...args.lineage, resultPitches: args.pitches },
      pitches: args.pitches,
      home: args.home,
      operator: args.plan.operator,
      grounding: args.grounding,
      returned: args.returned,
      distinctCollections: args.distinctCollections,
    }),
  };
}

function landingRank(classification: SlipLandingClass | null): number {
  if (classification === 'STRONG') return 3;
  if (classification === 'ACCEPTABLE') return 2;
  if (classification === 'WEAK') return 1;
  return 0;
}

/** Advisory approach from the last outside note into an explicit return target. */
export function evaluateSlipLanding(finalOutsideNote: number, returnTarget: number | null): SlipLanding {
  if (returnTarget === null) {
    return { finalOutsideNote, returnTarget: null, approachInterval: null, classification: null };
  }
  const approachInterval = Math.abs(returnTarget - finalOutsideNote);
  const classification: SlipLandingClass = approachInterval <= 1 ? 'STRONG' : approachInterval === 2 ? 'ACCEPTABLE' : 'WEAK';
  return { finalOutsideNote, returnTarget, approachInterval, classification };
}

/**
 * A static field is a pedal, a held tone, or an unchanging vamp.
 * Motif identity grounds a slip. It does not make the field static.
 * Moving harmony is not a static vamp.
 */
export function isStaticSlipField(args: {
  grounding: GroundingAssessment;
  harmonyBars?: readonly string[];
  staticField?: boolean;
}): boolean {
  if (args.staticField === true) return true;
  if (args.staticField === false) return false;
  const labels = (args.harmonyBars ?? []).map((bar) => bar.trim()).filter((bar) => bar.length > 0 && bar !== 'N.C.');
  if (new Set(labels).size > 1) return false;
  return args.grounding.bassPedal || args.grounding.bassOstinato || args.grounding.sustainedTone;
}

export function chooseSlipDirection(args: {
  staticField: boolean;
  explicitDirection?: 1 | -1;
  favourDirection?: 1 | -1;
  upResolvesBetter: boolean;
  registerFavoursUp: boolean;
  degreeLineageFavoursUp: boolean;
}): SlipDirectionReport {
  const report = (semitones: 1 | -1, basis: SlipDirectionBasis): SlipDirectionReport => ({
    label: semitones === -1 ? 'DOWN' : 'UP',
    basis,
    staticField: args.staticField,
    semitones,
  });
  if (args.explicitDirection === 1 || args.explicitDirection === -1) {
    const matchesDefault = args.staticField ? args.explicitDirection === -1 : args.explicitDirection === 1;
    return report(args.explicitDirection, matchesDefault ? 'DEFAULT' : 'CONTEXT OVERRIDE');
  }
  if (!args.staticField) {
    if (args.favourDirection === -1) return report(-1, 'CONTEXT OVERRIDE');
    return report(1, 'DEFAULT');
  }
  if (args.upResolvesBetter || args.registerFavoursUp || args.degreeLineageFavoursUp || args.favourDirection === 1) {
    return report(1, 'CONTEXT OVERRIDE');
  }
  return report(-1, 'DEFAULT');
}

function slipDrift(source: readonly number[], slipped: readonly number[], direction: 1 | -1): number {
  const count = Math.min(source.length, slipped.length);
  let worst = 0;
  for (let index = 0; index < count; index += 1) {
    const drift = Math.abs(slipped[index]! - (source[index]! + direction));
    if (drift > worst) worst = drift;
  }
  return worst;
}

function resolveSlipReturn(args: {
  sounded: readonly number[];
  slipped: readonly number[];
  slippedCollection: PentatonicCollectionView;
  home: PentatonicCollectionView;
  returnKind: ReturnKind;
  targetNotePc?: number | null;
  anchorPc?: number | null;
}): number | null {
  if (args.returnKind === 'NONE') return null;
  const returned = mapCell(args.slipped, args.slippedCollection, args.home, 'M-DEG');
  const anchorMidi = returned[returned.length - 1] ?? args.sounded[args.sounded.length - 1] ?? 60;
  if (args.returnKind === 'STABILISED_FIELD') {
    return nearestMidi(anchorMidi, collectionPitchClasses(args.home)[0]!);
  }
  if (args.returnKind === 'TARGET_NOTE' && args.targetNotePc !== null && args.targetNotePc !== undefined) {
    return nearestMidi(anchorMidi, args.targetNotePc);
  }
  if (args.returnKind === 'COMMON_TONE') {
    const anchor = args.anchorPc ?? mod12(args.sounded[0] ?? 60);
    return nearestMidi(anchorMidi, anchor);
  }
  return returned[returned.length - 1] ?? args.sounded[args.sounded.length - 1] ?? null;
}

function slipCandidate(args: {
  sounded: readonly number[];
  home: PentatonicCollectionView;
  direction: 1 | -1;
  method: MotifMapMethod;
  returnKind: ReturnKind;
  targetNotePc?: number | null;
  anchorPc?: number | null;
}): {
  direction: 1 | -1;
  slipped: number[];
  returnPitch: number | null;
  landing: SlipLanding;
  identity: boolean;
} {
  const slippedCollection = transposeCollection(args.home, args.direction);
  const slipped = mapCell(args.sounded, args.home, slippedCollection, args.method);
  const returnPitch = resolveSlipReturn({
    sounded: args.sounded,
    slipped,
    slippedCollection,
    home: args.home,
    returnKind: args.returnKind,
    targetNotePc: args.targetNotePc,
    anchorPc: args.anchorPc,
  });
  const finalOutside = slipped[slipped.length - 1] ?? args.sounded[args.sounded.length - 1] ?? 60;
  return {
    direction: args.direction,
    slipped,
    returnPitch,
    landing: evaluateSlipLanding(finalOutside, returnPitch),
    identity: identityHolds(args.sounded, slipped, args.home, slippedCollection),
  };
}

export function realisePentatonicPhrase(args: {
  purpose: Dev5bPurpose;
  home: PentatonicCollectionView | null;
  motif?: BaseMotif | null;
  method?: MotifMapMethod;
  budget?: OutsideBudget;
  grounding?: GroundingAssessment;
  pair?: { left: PentatonicCollectionView; right: PentatonicCollectionView } | null;
  pairAvailable?: boolean;
  explicitOutside?: boolean;
  explicitReseat?: boolean;
  outsideDevicesAlreadyUsed?: number;
  lineageTransform?: CellTransform;
  reseat?: { preference: ReseatLanding; bassPc?: number | null; heldPc?: number | null; tensionPc?: number | null };
  slipDirection?: 1 | -1;
  favourSlipDirection?: 1 | -1;
  staticField?: boolean;
  returnKind?: ReturnKind;
  targetNotePc?: number | null;
  harmonyBars?: readonly string[];
  operator?: PentatonicOperator;
  considerHold?: boolean;
  quartalLine?: boolean;
  /** Dev 6A. Writes no notes and does not set the path to NONE. */
  structuralSilence?: boolean;
}): PentatonicPhraseRealisation {
  const grounding =
    args.grounding ??
    assessGrounding({
      motifIdentityRetained: Boolean(args.motif && args.motif.notes.length >= 3),
    });
  if (args.structuralSilence === true) {
    const silent = silence(
      {
        purpose: args.purpose === 'NO_PHRASE' ? 'MOTIF' : args.purpose,
        operator: 'NONE',
        trajectory: 'RETAIN_CURRENT_FIELD',
        phraseResult: 'NO_PHRASE',
        method: DEV5B_DEFAULT_METHOD,
        budget: args.budget ?? DEFAULT_OUTSIDE_BUDGET,
        friction: null,
        reason: 'STRUCTURAL_SILENCE. The path field stays. This is not NO_PHRASE and not PATH NONE.',
      },
      args.home,
      grounding
    );
    return { ...silent, textureChoice: 'STRUCTURAL_SILENCE' };
  }
  const quartalReady = args.home ? quartalSubsets(collectionPitchClasses(args.home)).length > 0 : false;
  const planned = planPentatonicOperator({
    purpose: args.purpose,
    hasMotif: Boolean(extractCell(args.motif)) || args.purpose === 'COMPING_FRAGMENT',
    grounding,
    budget: args.budget,
    pairAvailable: args.pairAvailable === true && Boolean(args.pair),
    outsideDevicesAlreadyUsed: args.outsideDevicesAlreadyUsed,
    explicitOutside: args.explicitOutside,
    explicitReseat: args.explicitReseat,
    quartalAvailable: args.purpose === 'COMPING_FRAGMENT' && quartalReady,
  });
  let plan = args.operator ? { ...planned, operator: args.operator, phraseResult: args.operator === 'NONE' ? 'NO_PHRASE' as const : 'PHRASE' as const } : planned;
  let holdField: HoldFieldReport | null = null;
  if (
    args.home &&
    args.considerHold !== false &&
    !args.operator &&
    (plan.operator === 'CELL_LINEAGE' || plan.operator === 'RETAIN') &&
    args.harmonyBars &&
    args.harmonyBars.length > 1
  ) {
    holdField = assessHoldField({
      resourceName: args.home.name,
      resourcePitchClasses: collectionPitchClasses(args.home),
      events: harmonyEventsFromSymbols(args.harmonyBars.map((chord, index) => ({ sourceLabel: String(index + 1), chordSymbol: chord }))),
      homePitchClasses: collectionPitchClasses(args.home),
    });
    if (holdField.held) {
      plan = {
        ...plan,
        operator: 'HOLD_FIELD',
        trajectory: 'RETAIN_CURRENT_FIELD',
        phraseResult: 'PHRASE',
        reason: holdField.reason,
      };
    }
  }
  if (
    args.quartalLine === true &&
    !args.operator &&
    !args.explicitOutside &&
    (args.purpose === 'MOTIF' || args.purpose === 'COUNTERLINE' || args.purpose === 'DEVELOPMENT') &&
    plan.operator !== 'SLIP' &&
    plan.operator !== 'TRITONE_PAIR' &&
    plan.operator !== 'HOLD_FIELD'
  ) {
    plan = {
      ...plan,
      operator: 'QUARTAL_LINE',
      trajectory: plan.trajectory === 'NONE' ? 'RETAIN_CURRENT_FIELD' : plan.trajectory,
      phraseResult: 'PHRASE',
      reason: 'One fourth-led cell from the governing field. Not a fourth sequence.',
    };
  }
  if (!args.home || plan.phraseResult === 'NO_PHRASE' || plan.operator === 'NONE') {
    const pathTrajectory: PathTrajectory = args.purpose === 'NO_PHRASE' ? 'RETAIN_CURRENT_FIELD' : plan.trajectory;
    return silence({ ...plan, trajectory: args.purpose === 'NO_PHRASE' ? pathTrajectory : plan.trajectory, phraseResult: 'NO_PHRASE' }, args.home, grounding);
  }

  const method = args.method ?? DEV5B_DEFAULT_METHOD;
  const parent = extractCell(args.motif) ?? fourNoteSubset(args.home, 4).slice(0, 3);
  const loosened = loosenScale(parent, args.home);
  if (!loosened) return silence({ ...plan, operator: 'NONE', phraseResult: 'NO_PHRASE', reason: 'Every short form of the cell was a scale run.' }, args.home, grounding);

  let chain = [...loosened.chain];
  let sounded = loosened.pitches;
  if (args.lineageTransform && args.lineageTransform !== 'original') {
    sounded = transformCell({ pitches: sounded, collection: args.home, transform: args.lineageTransform, target: args.home });
    chain = [...chain, args.lineageTransform];
  }

  if (plan.operator === 'QUARTAL_COMP') {
    const comp = realiseQuartalComp(collectionPitchClasses(args.home));
    if (!comp) {
      plan = { ...plan, operator: 'RETAIN', reason: 'The field has no fourth. Comping stays a short subset.' };
    } else {
      const lineage: CellLineage = {
        parentCell: parent,
        soundedCell: comp.pitches,
        chain,
        resultPitches: [...comp.pitches],
        identityPreserved: inCollection(comp.pitches, args.home),
        fourNoteSubset: false,
      };
      return finish({
        plan,
        home: args.home,
        grounding,
        pitches: [...comp.pitches],
        lineage,
        method: null,
        returnKind: null,
        returned: true,
        distinctCollections: 1,
        harmonyBars: args.harmonyBars,
        quartal: comp,
      });
    }
  }

  if (plan.operator === 'QUARTAL_LINE') {
    const line = realiseQuartalLine({
      fieldPitchClasses: collectionPitchClasses(args.home),
      parentPitches: sounded,
    });
    if (line.declined || line.pitches.length < 3) {
      plan = { ...plan, operator: 'CELL_LINEAGE', reason: 'A fourth-led cell would lose the lineage. The source cell stays.' };
    } else {
      const lineage: CellLineage = {
        parentCell: parent,
        soundedCell: [...line.pitches],
        chain: [...chain, 'original'],
        resultPitches: [...line.pitches],
        identityPreserved: line.lineagePreserved,
        fourNoteSubset: false,
      };
      return finish({
        plan,
        home: args.home,
        grounding,
        pitches: [...line.pitches],
        lineage,
        method: null,
        returnKind: null,
        returned: true,
        distinctCollections: 1,
        harmonyBars: args.harmonyBars,
        quartal: line,
      });
    }
  }

  if (plan.operator === 'RETAIN' || plan.operator === 'CELL_LINEAGE' || plan.operator === 'HOLD_FIELD') {
    const pitches = plan.purpose === 'COMPING_FRAGMENT' ? subsetForComping(sounded, args.home) : sounded;
    const lineage: CellLineage = {
      parentCell: parent,
      soundedCell: pitches,
      chain,
      resultPitches: pitches,
      identityPreserved: identityHolds(parent, pitches, args.home, args.home) || identityHolds(sounded, pitches, args.home, args.home),
      fourNoteSubset: parent.length === 4 && new Set(parent.map((pitch) => mod12(pitch))).size === 4,
    };
    return finish({
      plan,
      home: args.home,
      grounding,
      pitches,
      lineage,
      method: plan.operator === 'CELL_LINEAGE' ? method : null,
      returnKind: null,
      returned: true,
      distinctCollections: 1,
      harmonyBars: args.harmonyBars,
      holdField: plan.operator === 'HOLD_FIELD' ? holdField : null,
    });
  }

  if (plan.operator === 'RESEAT') {
    const reseated = reseatLanding({
      pitches: sounded,
      collection: args.home,
      preference: args.reseat?.preference ?? (plan.purpose === 'COUNTERLINE' ? 'common-tone' : 'declared-tension'),
      bassPc: args.reseat?.bassPc,
      heldPc: args.reseat?.heldPc,
      tensionPc: args.reseat?.tensionPc,
    });
    const lineage: CellLineage = {
      parentCell: parent,
      soundedCell: sounded,
      chain,
      resultPitches: reseated.pitches,
      identityPreserved: inCollection(reseated.pitches, args.home),
      fourNoteSubset: new Set(parent.map((pitch) => mod12(pitch))).size === 4,
    };
    return finish({
      plan,
      home: args.home,
      grounding,
      pitches: reseated.pitches,
      lineage,
      method: null,
      returnKind: 'HOME',
      returned: true,
      distinctCollections: 1,
      harmonyBars: args.harmonyBars,
    });
  }

  if (plan.operator === 'SLIP') {
    const returnKind = args.returnKind ?? 'HOME';
    const anchorPc = args.reseat?.bassPc ?? args.reseat?.heldPc ?? null;
    const candidateArgs = {
      sounded,
      home: args.home,
      method,
      returnKind,
      targetNotePc: args.targetNotePc,
      anchorPc,
    };
    const down = slipCandidate({ ...candidateArgs, direction: -1 });
    const up = slipCandidate({ ...candidateArgs, direction: 1 });
    const staticField = isStaticSlipField({
      grounding,
      harmonyBars: args.harmonyBars,
      staticField: args.staticField,
    });
    const heldPc = args.reseat?.heldPc;
    const lastPc = mod12(sounded[sounded.length - 1] ?? 60);
    const heldFavoursUp = heldPc !== null && heldPc !== undefined && mod12(heldPc) === mod12(lastPc + 1);
    const favourDirection = args.favourSlipDirection ?? (heldFavoursUp ? 1 : undefined);
    const slipDirection = chooseSlipDirection({
      staticField,
      explicitDirection: args.slipDirection,
      favourDirection,
      upResolvesBetter: landingRank(up.landing.classification) > landingRank(down.landing.classification),
      registerFavoursUp: slipDrift(sounded, down.slipped, -1) >= 6 && slipDrift(sounded, up.slipped, 1) < 6,
      degreeLineageFavoursUp: method === 'M-DEG' && up.identity && !down.identity,
    });
    const chosen = slipDirection.semitones === -1 ? down : up;
    chain = [...chain, method];
    const pitches = chosen.returnPitch === null ? [...sounded, ...chosen.slipped] : [...sounded, ...chosen.slipped, chosen.returnPitch];
    const lineage: CellLineage = {
      parentCell: parent,
      soundedCell: sounded,
      chain,
      resultPitches: pitches,
      identityPreserved: chosen.identity,
      fourNoteSubset: sounded.length === 4,
    };
    return finish({
      plan,
      home: args.home,
      grounding,
      pitches,
      lineage,
      method,
      returnKind,
      returned: returnKind === 'NONE' || chosen.returnPitch !== null,
      distinctCollections: 2,
      harmonyBars: args.harmonyBars,
      slipLanding: chosen.landing,
      slipDirection,
    });
  }

  if (plan.operator === 'TRITONE_PAIR' && args.pair) {
    const left = mapCell(sounded, args.home, args.pair.left, method);
    const right = mapCell(sounded, args.home, args.pair.right, method);
    chain = [...chain, method];
    const pitches = [...left, ...right];
    const lineage: CellLineage = {
      parentCell: parent,
      soundedCell: sounded,
      chain,
      resultPitches: pitches,
      identityPreserved: identityHolds(sounded, left, args.home, args.pair.left) && identityHolds(sounded, right, args.home, args.pair.right),
      fourNoteSubset: sounded.length === 4,
    };
    return finish({
      plan,
      home: args.home,
      grounding,
      pitches,
      lineage,
      method,
      returnKind: null,
      returned: true,
      distinctCollections: 2,
      harmonyBars: args.harmonyBars,
    });
  }

  return silence(plan, args.home, grounding);
}
