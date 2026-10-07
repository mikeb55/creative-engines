/**
 * Dev 6A form and duo intelligence.
 * Advisory. Reads the existing score import and the existing path.
 * Does not retune path cost, does not add a path resource, and does not write notes.
 * AUTO COLOR is not implemented.
 */

import type { PentatonicScoreAnalysis } from './analyzeScore';
import { guitarRange } from './motifTransform';
import { parseNoteToken } from './pitch';
import type { PentatonicOperator, SlipLandingClass } from './phraseOperators';
import type { PathSlice } from './pathIntelligence';
import { interpretPentatonicPath } from './pathIntelligence';

export const PENTATONIC_FORM_DUO_VERSION = 'pentatonic-form-duo-6a';

export const DEV6A_REJECTED_BEHAVIOURS = [
  'AUTO COLOR',
  'mid-phrase field change without strong evidence',
  'HOME at every boundary',
  'bass as automatic root support',
  'forced imitation',
  'forced duo density',
  'species counterpoint',
  'tonal voice-leading',
  'pitch-class overlap counted as voice-leading',
  'blind common-tone reward',
  'PATH NONE collapsed into silence',
  'NO_PHRASE collapsed into STRUCTURAL_SILENCE',
  'full guitar fingering',
  'TAB',
  'generic pentatonic lick',
  'Woody Shaw semitone pair',
  'THROUGH',
  'generic SEQUENCE',
  'full INTENSIFY',
] as const;

export type FormLevel = 'LOCAL' | 'PHRASE' | 'SECTION';

export type FormFunction = 'opening' | 'continuation' | 'development' | 'climax' | 'release' | 'ending' | 'unknown';

export type FormConfidence = 'high' | 'medium' | 'low' | 'unknown';

export type ContinuityAdvice =
  | 'PHRASE_RETENTION'
  | 'SECTION_RETENTION'
  | 'PHRASE_BOUNDARY_CHANGE'
  | 'SECTION_BOUNDARY_RETURN'
  | 'STRUCTURAL_NONE';

export type DuoRole =
  | 'GUITAR_LEADS'
  | 'BASS_LEADS'
  | 'GUITAR_RESPONDS'
  | 'BASS_RESPONDS'
  | 'COUNTERPOINT'
  | 'SHARED_FIELD'
  | 'GUITAR_SUPPORTS'
  | 'BASS_SUPPORTS'
  | 'SPACE'
  | 'UNKNOWN';

export type ResponseRelation = 'retained' | 'transformed' | 'silent' | 'unknown';

export type RegisterClass = 'CLEAR' | 'CLOSE' | 'COLLIDING' | 'UNKNOWN';

export type TextureChoice = 'PATH_NONE' | 'NO_PHRASE' | 'STRUCTURAL_SILENCE' | 'SOUND';

export type CommonToneJob =
  | 'phrase-boundary'
  | 'field-link'
  | 'outside-ground'
  | 'hold-field'
  | 'reseat'
  | 'duo-handoff';

/** Standard tuning adjacent-string semitones. G–B is 4, not a fourth. */
export const GUITAR_ADJACENT_STRING_INTERVALS = [5, 5, 5, 4, 5] as const;

export const GUITAR_ADJACENT_STRING_PAIRS = ['E-A', 'A-D', 'D-G', 'G-B', 'B-E'] as const;

export interface FormDuoEvent {
  sourceLabel: string;
  melodyNotes?: readonly string[];
  bassNotes?: readonly string[];
  melodyRest?: boolean;
  bassRest?: boolean;
  melodyMidis?: readonly number[];
  bassMidis?: readonly number[];
  sourceBoundary?: boolean;
  sectionMarks?: readonly string[];
  chordSymbol?: string;
  chosenId?: string | null;
  chosenPitchClasses?: readonly number[] | null;
}

export interface FormSpan {
  id: string;
  level: FormLevel;
  function: FormFunction;
  confidence: FormConfidence;
  firstSourceLabel: string;
  lastSourceLabel: string;
  firstIndex: number;
  lastIndex: number;
  evidence: readonly string[];
}

export interface FormDecision {
  sourceLabel: string;
  index: number;
  level: FormLevel;
  phraseId: string;
  sectionId: string;
  function: FormFunction;
  confidence: FormConfidence;
  continuity: ContinuityAdvice;
  homeReturn: boolean;
  localSwitchSuppressed: boolean;
}

export interface DuoRoleSpan {
  phraseId: string;
  firstSourceLabel: string;
  lastSourceLabel: string;
  role: DuoRole;
  confidence: FormConfidence;
  guitarAttacks: number;
  bassAttacks: number;
  bassAgency: boolean;
}

export interface InitiationEvent {
  phraseId: string;
  firstSourceLabel: string;
  lastSourceLabel: string;
  initiatingVoice: 'guitar' | 'bass' | 'unknown';
  responseVoice: 'guitar' | 'bass' | 'none';
  relation: ResponseRelation;
  imitated: boolean;
  imitationForced: false;
}

export interface CounterpointReading {
  phraseId: string;
  firstSourceLabel: string;
  lastSourceLabel: string;
  suitability: 'suitable' | 'weak' | 'unknown';
  contrary: boolean;
  oblique: boolean;
  commonToneRetained: boolean;
  register: RegisterClass;
  rhythmicIndependence: boolean;
  unisonWarning: boolean;
  pitchClassOverlapIsVoiceLeading: false;
}

export interface RegisterReading {
  phraseId: string;
  firstSourceLabel: string;
  lastSourceLabel: string;
  classification: RegisterClass;
  masksMelodyLanding: boolean;
}

export interface CommonToneAnchor {
  pitchClass: number;
  sourceLabel: string;
  jobs: readonly CommonToneJob[];
  rewarded: boolean;
  reason: string;
  voice: 'guitar' | 'bass' | 'both' | 'handoff';
}

export interface StructuralSilenceOpportunity {
  sourceLabel: string;
  phraseId: string;
  reason: string;
  texture: 'STRUCTURAL_SILENCE';
  pathNone: false;
  noPhrase: false;
}

export interface OperatorPlacement {
  operator: PentatonicOperator;
  texture: TextureChoice;
  homeReturn: boolean;
  changed: boolean;
  reason: string;
  rejected: readonly string[];
}

export interface FormDuoAssessment {
  version: typeof PENTATONIC_FORM_DUO_VERSION;
  phrases: readonly FormSpan[];
  sections: readonly FormSpan[];
  decisions: readonly FormDecision[];
  roles: readonly DuoRoleSpan[];
  initiations: readonly InitiationEvent[];
  counterpoint: readonly CounterpointReading[];
  register: readonly RegisterReading[];
  commonTones: readonly CommonToneAnchor[];
  structuralSilence: readonly StructuralSilenceOpportunity[];
  suppressedLocalSwitches: readonly { sourceLabel: string; from: string; to: string }[];
  deliberateNothing: readonly string[];
  holdFieldSpans: readonly string[];
  tritonePairSpans: readonly string[];
  operatorNotes: readonly { phraseId: string; operator: PentatonicOperator; texture: TextureChoice; reason: string }[];
  pathRewritten: false;
}

export interface FormDuoTrackReport {
  title: string;
  sourceSha256: string;
  phrases: readonly FormSpan[];
  sections: readonly FormSpan[];
  unknownPhraseCount: number;
  unknownSectionCount: number;
  roles: readonly DuoRoleSpan[];
  roleChanges: number;
  initiations: readonly InitiationEvent[];
  counterpoint: readonly CounterpointReading[];
  registerCollisions: number;
  closeRegisters: number;
  clearRegisters: number;
  commonToneAnchors: readonly CommonToneAnchor[];
  unrewardedCommonTones: number;
  structuralSilence: readonly StructuralSilenceOpportunity[];
  holdFieldSpans: readonly string[];
  reseatResponses: number;
  slipAvoidedAtEndings: number;
  tritonePairSpans: readonly string[];
  suppressedLocalSwitches: number;
  deliberateNothing: readonly string[];
  homeForcedAtEveryBoundary: false;
  sectionBoundaryReturns: number;
  phraseBoundaries: number;
}

interface Prepared {
  sourceLabel: string;
  melodyPcs: number[];
  bassPcs: number[];
  melodyMidis: number[];
  bassMidis: number[];
  melodyAttacks: number;
  bassAttacks: number;
  melodyRest: boolean;
  bassRest: boolean;
  boundary: boolean;
  marks: string[];
  chord: string;
  chosenId: string | null;
  chosenPcs: number[] | null;
  melodyKey: string;
}

function pcsOf(notes: readonly string[] | undefined): number[] {
  const out: number[] = [];
  for (const note of notes ?? []) {
    const parsed = parseNoteToken(note);
    if (!parsed || out.includes(parsed.pc)) continue;
    out.push(parsed.pc);
  }
  return out;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function shared(left: readonly number[], right: readonly number[]): number[] {
  const wanted = new Set(right);
  return left.filter((pc) => wanted.has(pc));
}

function sameSet(left: readonly number[] | null, right: readonly number[] | null): boolean {
  if (!left || !right || left.length !== right.length) return false;
  const wanted = new Set(right);
  return left.every((pc) => wanted.has(pc));
}

function prepare(events: readonly FormDuoEvent[]): Prepared[] {
  return events.map((event) => {
    const melodyPcs = pcsOf(event.melodyNotes);
    const bassPcs = pcsOf(event.bassNotes);
    const melodyMidis = [...(event.melodyMidis ?? [])];
    const bassMidis = [...(event.bassMidis ?? [])];
    return {
      sourceLabel: event.sourceLabel,
      melodyPcs,
      bassPcs,
      melodyMidis,
      bassMidis,
      melodyAttacks: melodyMidis.length > 0 ? melodyMidis.length : melodyPcs.length,
      bassAttacks: bassMidis.length > 0 ? bassMidis.length : bassPcs.length,
      melodyRest: event.melodyRest === true,
      bassRest: event.bassRest === true,
      boundary: event.sourceBoundary === true,
      marks: [...(event.sectionMarks ?? [])],
      chord: event.chordSymbol ?? '',
      chosenId: event.chosenId ?? null,
      chosenPcs: event.chosenPitchClasses ? [...event.chosenPitchClasses] : null,
      melodyKey: (event.melodyNotes ?? []).join(' '),
    };
  });
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function phraseStarts(events: readonly Prepared[]): { index: number; evidence: string[]; confidence: FormConfidence }[] {
  const starts: { index: number; evidence: string[]; confidence: FormConfidence }[] = [
    { index: 0, evidence: ['score start'], confidence: 'unknown' },
  ];
  const motifAt = new Map<string, number>();
  if (events[0]?.melodyKey) motifAt.set(events[0].melodyKey, 0);
  for (let index = 1; index < events.length; index += 1) {
    const event = events[index]!;
    const previous = events[index - 1]!;
    const currentLength = index - starts[starts.length - 1]!.index;
    if (event.boundary) {
      starts.push({ index, evidence: ['rehearsal or section mark', ...event.marks], confidence: 'high' });
    } else if (previous.melodyRest && previous.bassRest && (event.melodyAttacks > 0 || event.bassAttacks > 0)) {
      starts.push({ index, evidence: ['rest boundary before this bar'], confidence: 'medium' });
    } else if (event.melodyKey && motifAt.has(event.melodyKey) && index - motifAt.get(event.melodyKey)! >= 8 && currentLength >= 4) {
      starts.push({
        index,
        evidence: [`motif recurrence of the line first heard at ${events[motifAt.get(event.melodyKey)!]?.sourceLabel}`],
        confidence: 'medium',
      });
    } else if (currentLength >= 4 && index + 3 < events.length) {
      const before = events.slice(index - 4, index).map((item) => item.melodyAttacks + item.bassAttacks);
      const after = events.slice(index, index + 4).map((item) => item.melodyAttacks + item.bassAttacks);
      const beforeRegister = events.slice(index - 4, index).flatMap((item) => [...item.melodyMidis, ...item.bassMidis]);
      const afterRegister = events.slice(index, index + 4).flatMap((item) => [...item.melodyMidis, ...item.bassMidis]);
      const densityRatio = Math.max(mean(before), 0.25) / Math.max(mean(after), 0.25);
      const densityShift = densityRatio >= 2 || densityRatio <= 0.5;
      const beforeMedian = median(beforeRegister);
      const afterMedian = median(afterRegister);
      const registerShift = beforeMedian !== null && afterMedian !== null && Math.abs(beforeMedian - afterMedian) >= 7;
      if (densityShift && registerShift) {
        starts.push({ index, evidence: ['density change with a register change'], confidence: 'low' });
      }
    }
    if (event.melodyKey && !motifAt.has(event.melodyKey)) motifAt.set(event.melodyKey, index);
  }
  return starts;
}

function spanOf(events: readonly Prepared[], first: number, last: number, id: string, level: FormLevel, fn: FormFunction, confidence: FormConfidence, evidence: string[]): FormSpan {
  return {
    id,
    level,
    function: fn,
    confidence,
    firstSourceLabel: events[first]?.sourceLabel ?? '',
    lastSourceLabel: events[last]?.sourceLabel ?? '',
    firstIndex: first,
    lastIndex: last,
    evidence,
  };
}

function densityOf(events: readonly Prepared[], first: number, last: number): number {
  let total = 0;
  const count = last - first + 1;
  for (let index = first; index <= last; index += 1) total += events[index]!.melodyAttacks + events[index]!.bassAttacks;
  return count === 0 ? 0 : total / count;
}

function melodyPcsOf(events: readonly Prepared[], first: number, last: number): number[] {
  const out: number[] = [];
  for (let index = first; index <= last; index += 1) {
    for (const pc of events[index]!.melodyPcs) if (!out.includes(pc)) out.push(pc);
  }
  return out;
}

function assignFunctions(events: readonly Prepared[], ranges: { first: number; last: number; evidence: string[]; confidence: FormConfidence; sectionStart: boolean }[], endingDetected: boolean): FormFunction[] {
  const densities = ranges.map((range) => densityOf(events, range.first, range.last));
  const sorted = [...densities].sort((left, right) => left - right);
  const mid = sorted[Math.floor(sorted.length / 2)] ?? 0;
  let climaxIndex = -1;
  if (ranges.length >= 2) {
    const max = Math.max(...densities);
    const winners = densities.filter((value) => value === max).length;
    if (winners === 1 && max >= Math.max(1.8 * Math.max(mid, 0.5), mid + 1.5)) climaxIndex = densities.indexOf(max);
  }
  return ranges.map((range, index) => {
    if (ranges.length === 1 && !endingDetected) return 'unknown' as FormFunction;
    if ((index === 0 || range.sectionStart) && (range.confidence === 'high' || range.confidence === 'medium')) return 'opening' as FormFunction;
    if (index === 0) return 'unknown' as FormFunction;
    if (index === climaxIndex) return 'climax';
    if (climaxIndex >= 0 && index === climaxIndex + 1 && densities[index]! <= 0.75 * densities[climaxIndex]!) return 'release';
    const last = index === ranges.length - 1;
    const thinned = index > 0 && densities[index]! <= 0.5 * densities[index - 1]!;
    if (last && (endingDetected || thinned || (events[range.last]?.melodyRest && events[range.last]?.bassRest))) return 'ending';
    const openingPcs = melodyPcsOf(events, ranges[0]!.first, ranges[0]!.last);
    const here = melodyPcsOf(events, range.first, range.last);
    const overlap = shared(openingPcs, here);
    if (openingPcs.length >= 3 && here.length >= 3 && overlap.length > 0 && overlap.length < Math.min(openingPcs.length, here.length)) return 'development';
    const previousId = majorityId(events, ranges[index - 1]!.first, ranges[index - 1]!.last);
    const hereId = majorityId(events, range.first, range.last);
    if (previousId && hereId && previousId === hereId) return 'continuation';
    return 'unknown';
  });
}

function majorityId(events: readonly Prepared[], first: number, last: number): string | null {
  const counts = new Map<string, number>();
  for (let index = first; index <= last; index += 1) {
    const id = events[index]!.chosenId;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id;
      bestCount = count;
    }
  }
  return best;
}

function pairSpans(events: readonly Prepared[]): { start: number; end: number }[] {
  const groups: { id: string; pcs: number[] | null; first: number; last: number }[] = [];
  for (let index = 0; index < events.length; index += 1) {
    const id = events[index]!.chosenId ?? '';
    const last = groups[groups.length - 1];
    if (last && last.id === id) {
      last.last = index;
      continue;
    }
    groups.push({ id, pcs: events[index]!.chosenPcs, first: index, last: index });
  }
  const spans: { start: number; end: number }[] = [];
  let index = 0;
  while (index < groups.length) {
    const left = groups[index];
    const right = groups[index + 1];
    if (!left || !right || !left.id || !right.id || left.id === 'NONE' || right.id === 'NONE' || left.id === right.id || shared(left.pcs ?? [], right.pcs ?? []).length !== 0) {
      index += 1;
      continue;
    }
    let end = index + 1;
    while (end + 1 < groups.length) {
      const next = groups[end + 1]!;
      const previous = groups[end]!;
      if (!next.id || next.id === 'NONE' || next.id === previous.id) break;
      if (next.id !== left.id && next.id !== right.id) break;
      if (shared(next.pcs ?? [], previous.pcs ?? []).length !== 0) break;
      end += 1;
    }
    if (end - index >= 3) {
      spans.push({ start: groups[index]!.first, end: groups[end]!.last });
      index = end + 1;
    } else index += 1;
  }
  return spans;
}

function insideSpan(index: number, spans: readonly { start: number; end: number }[]): boolean {
  return spans.some((span) => index >= span.start && index <= span.end);
}

function dualRest(event: Prepared): boolean {
  return event.melodyRest && event.bassRest && event.melodyAttacks === 0 && event.bassAttacks === 0;
}

export function assessCommonTone(pitchClass: number, jobs: readonly CommonToneJob[]): { rewarded: boolean; reason: string } {
  if (jobs.length === 0) {
    return { rewarded: false, reason: `Pitch class ${pitchClass} is shared and does no continuity job.` };
  }
  return { rewarded: true, reason: `Pitch class ${pitchClass} ${jobs.join(', ')}.` };
}

export function classifyRegister(guitar: readonly number[], bass: readonly number[]): RegisterClass {
  if (guitar.length === 0 || bass.length === 0) return 'UNKNOWN';
  const guitarMedian = median(guitar);
  const bassMedian = median(bass);
  if (guitarMedian === null || bassMedian === null) return 'UNKNOWN';
  const gap = guitarMedian - bassMedian;
  const bassMax = Math.max(...bass);
  const overlap = guitar.filter((midi) => midi <= bassMax + 2).length / guitar.length;
  if (gap < 5 || overlap >= 0.34) return 'COLLIDING';
  if (gap < 12) return 'CLOSE';
  return 'CLEAR';
}

export function quartalMasksMelody(comp: readonly number[], melody: readonly number[]): boolean {
  if (comp.length === 0 || melody.length === 0) return false;
  const landing = median(melody);
  const compMedian = median(comp);
  if (landing === null || compMedian === null) return false;
  return Math.abs(landing - compMedian) <= 3;
}

function contourSign(midis: readonly number[]): number | null {
  if (midis.length < 2) return null;
  let sign = 0;
  for (let index = 1; index < midis.length; index += 1) {
    const delta = midis[index]! - midis[index - 1]!;
    if (delta > 0) sign += 1;
    else if (delta < 0) sign -= 1;
  }
  if (sign > 0) return 1;
  if (sign < 0) return -1;
  return 0;
}

export function assessQuartalStringSet(semitones: number): {
  interval: number;
  adjacentFourth: boolean;
  pairs: readonly string[];
  gbException: boolean;
  gbAcknowledged: true;
  note: string;
} {
  const reduced = Math.abs(semitones) % 12;
  const interval = reduced === 0 ? 0 : reduced > 6 ? 12 - reduced : reduced;
  const fourth = reduced === 5 || reduced === 7;
  const gb = reduced === 4 || reduced === 8;
  if (fourth && reduced === 5) {
    return {
      interval,
      adjacentFourth: true,
      pairs: ['E-A', 'A-D', 'D-G', 'B-E'],
      gbException: true,
      gbAcknowledged: true,
      note: 'Adjacent-string fourth on E-A, A-D, D-G, and B-E. G-B is a major third, so a fourth is not a same-fret shape there.',
    };
  }
  if (gb && reduced === 4) {
    return {
      interval,
      adjacentFourth: false,
      pairs: ['G-B'],
      gbException: true,
      gbAcknowledged: true,
      note: 'G-B tuning is a major third. This interval is the exception, not a quartal fourth.',
    };
  }
  return {
    interval,
    adjacentFourth: false,
    pairs: [],
    gbException: false,
    gbAcknowledged: true,
    note: 'Not an adjacent-string fourth. G-B remains a major-third exception on the guitar.',
  };
}

export function preferSlipFretShift(pitches: readonly number[], direction: 1 | -1): {
  direction: 1 | -1;
  frets: 1 | -1;
  shifted: number[];
  shapePreserved: boolean;
  practical: boolean;
  reason: string;
} {
  const shifted = pitches.map((pitch) => pitch + direction);
  const [low, high] = guitarRange();
  const outside = shifted.some((pitch) => pitch < low || pitch > high);
  const jump = registerCapFaults(shifted).includes('register jump') || registerCapFaults(pitches).includes('register jump');
  const practical = !outside && !jump;
  return {
    direction,
    frets: direction,
    shifted,
    shapePreserved: true,
    practical,
    reason: practical
      ? 'Same interval shape, one fret up or down. No fingering search.'
      : 'A one-fret shape would leave the guitar range or jump. The preference stops.',
  };
}

export function registerCapFaults(pitches: readonly number[]): string[] {
  const [low, high] = guitarRange();
  const faults: string[] = [];
  if (pitches.some((pitch) => pitch < low || pitch > high)) faults.push('outside guitar range');
  for (let index = 1; index < pitches.length; index += 1) {
    if (Math.abs(pitches[index]! - pitches[index - 1]!) > 12) {
      faults.push('register jump');
      break;
    }
  }
  return faults;
}

export function placeOperatorInForm(args: {
  operator: PentatonicOperator;
  formFunction: FormFunction;
  atPhraseBoundary: boolean;
  atPhraseEnding: boolean;
  atSectionBoundary: boolean;
  role: DuoRole;
  slipLanding?: SlipLandingClass | null;
  pairIsRegion: boolean;
  holdCredible: boolean;
  pathIsNone: boolean;
  purposeNoPhrase: boolean;
  structuralSilencePreferred: boolean;
  homeKnown: boolean;
  fieldIsHome: boolean;
}): OperatorPlacement {
  const rejected: string[] = [];
  if (args.pathIsNone) {
    return {
      operator: args.operator,
      texture: 'PATH_NONE',
      homeReturn: false,
      changed: false,
      reason: 'PATH NONE abstains from a pentatonic reading. It is not NO_PHRASE and not STRUCTURAL_SILENCE.',
      rejected,
    };
  }
  if (args.purposeNoPhrase) {
    return {
      operator: 'NONE',
      texture: 'NO_PHRASE',
      homeReturn: false,
      changed: args.operator !== 'NONE',
      reason: 'NO_PHRASE writes nothing because there is no phrase. The path field is untouched.',
      rejected,
    };
  }
  const homeReturn =
    args.atSectionBoundary &&
    (args.formFunction === 'ending' || args.formFunction === 'release') &&
    args.homeKnown &&
    !args.fieldIsHome;
  if (args.structuralSilencePreferred && (args.role === 'SPACE' || args.role.endsWith('_RESPONDS') || args.role.endsWith('_SUPPORTS') || args.role === 'BASS_LEADS' || args.role === 'GUITAR_LEADS')) {
    rejected.push('a new line here would cover the voice that already has the phrase');
    return {
      operator: 'NONE',
      texture: 'STRUCTURAL_SILENCE',
      homeReturn,
      changed: true,
      reason: 'STRUCTURAL_SILENCE leaves space. PATH NONE and NO_PHRASE stay separate.',
      rejected,
    };
  }
  let operator = args.operator;
  if (operator === 'SLIP' && args.atPhraseEnding && args.slipLanding !== 'STRONG') {
    rejected.push('SLIP at an exposed phrase ending without a strong landing');
    operator = args.holdCredible ? 'HOLD_FIELD' : 'RETAIN';
  }
  if (!args.atPhraseBoundary && (operator === 'SLIP' || (operator === 'TRITONE_PAIR' && !args.pairIsRegion))) {
    rejected.push('field change in the middle of a phrase');
    operator = args.holdCredible ? 'HOLD_FIELD' : 'CELL_LINEAGE';
  }
  if (operator === 'TRITONE_PAIR' && !args.pairIsRegion) {
    rejected.push('TRITONE_PAIR repeated as a bar-level decision');
    operator = 'RETAIN';
  }
  if (operator === 'QUARTAL_COMP' && args.role !== 'GUITAR_SUPPORTS' && args.role !== 'BASS_SUPPORTS') {
    rejected.push('QUARTAL_COMP outside a support role');
    operator = args.role === 'COUNTERPOINT' ? 'QUARTAL_LINE' : 'RETAIN';
  }
  if (operator === 'QUARTAL_LINE' && args.role !== 'COUNTERPOINT' && args.formFunction !== 'development') {
    rejected.push('QUARTAL_LINE where it is neither a counterline nor a development cell');
    operator = args.role.endsWith('_RESPONDS') ? 'RESEAT' : 'CELL_LINEAGE';
  }
  if (operator === 'CELL_LINEAGE' && (args.role === 'GUITAR_RESPONDS' || args.role === 'BASS_RESPONDS')) {
    rejected.push('a new cell where a reseat would answer');
    operator = 'RESEAT';
  }
  if ((args.formFunction === 'continuation' || args.formFunction === 'opening') && operator === 'SLIP' && !args.atPhraseBoundary) {
    rejected.push('SLIP restarted the colour inside a phrase');
    operator = 'HOLD_FIELD';
  }
  if (homeReturn && operator === 'SLIP') {
    rejected.push('SLIP across a section release');
    operator = 'RETAIN';
  }
  const texture: TextureChoice = 'SOUND';
  return {
    operator,
    texture,
    homeReturn,
    changed: operator !== args.operator,
    reason:
      operator === args.operator
        ? `${operator} still fits ${args.formFunction}.`
        : `${args.operator} became ${operator} for ${args.formFunction}.`,
    rejected,
  };
}

function roleOf(events: readonly Prepared[], first: number, last: number): { role: DuoRole; confidence: FormConfidence; guitarAttacks: number; bassAttacks: number; bassAgency: boolean } {
  let guitarAttacks = 0;
  let bassAttacks = 0;
  let firstGuitar = -1;
  let firstBass = -1;
  const bassPcs: number[] = [];
  const guitarPcs: number[] = [];
  for (let index = first; index <= last; index += 1) {
    const event = events[index]!;
    guitarAttacks += event.melodyAttacks;
    bassAttacks += event.bassAttacks;
    if (event.melodyAttacks > 0 && firstGuitar < 0) firstGuitar = index;
    if (event.bassAttacks > 0 && firstBass < 0) firstBass = index;
    for (const pc of event.bassPcs) if (!bassPcs.includes(pc)) bassPcs.push(pc);
    for (const pc of event.melodyPcs) if (!guitarPcs.includes(pc)) guitarPcs.push(pc);
  }
  const bassAgency = bassPcs.length >= 3 && bassAttacks >= 3;
  const bassPedal = bassPcs.length > 0 && bassPcs.length <= 2 && bassAttacks >= 2 && !bassAgency;
  if (guitarAttacks === 0 && bassAttacks === 0) {
    const rested = events.slice(first, last + 1).some((event) => event.melodyRest || event.bassRest);
    return { role: rested ? 'SPACE' : 'UNKNOWN', confidence: rested ? 'high' : 'unknown', guitarAttacks, bassAttacks, bassAgency };
  }
  if (guitarAttacks >= 3 && bassAttacks === 0) return { role: 'GUITAR_LEADS', confidence: 'high', guitarAttacks, bassAttacks, bassAgency };
  if (bassAttacks >= 3 && guitarAttacks === 0) return { role: 'BASS_LEADS', confidence: 'high', guitarAttacks, bassAttacks, bassAgency: true };
  if (bassAgency && guitarAttacks <= bassAttacks * 0.5) {
    return { role: 'BASS_LEADS', confidence: 'medium', guitarAttacks, bassAttacks, bassAgency: true };
  }
  if (firstBass >= 0 && firstGuitar > firstBass && guitarAttacks > 0 && guitarAttacks * 1.6 < bassAttacks && bassAttacks >= 3) {
    return { role: 'GUITAR_RESPONDS', confidence: 'medium', guitarAttacks, bassAttacks, bassAgency };
  }
  if (firstGuitar >= 0 && firstBass > firstGuitar && bassAttacks > 0 && bassAttacks * 1.6 < guitarAttacks && guitarAttacks >= 3) {
    return { role: 'BASS_RESPONDS', confidence: 'medium', guitarAttacks, bassAttacks, bassAgency };
  }
  if (bassPedal && guitarAttacks > bassAttacks && guitarAttacks >= 3 && firstBass === firstGuitar) {
    return { role: 'BASS_SUPPORTS', confidence: 'medium', guitarAttacks, bassAttacks, bassAgency: false };
  }
  if (guitarAttacks > 0 && guitarAttacks <= 2 && bassAgency) {
    return { role: 'GUITAR_SUPPORTS', confidence: 'low', guitarAttacks, bassAttacks, bassAgency: true };
  }
  if (guitarAttacks >= 3 && bassAttacks >= 3) {
    const guitarMidis = events.slice(first, last + 1).flatMap((event) => event.melodyMidis);
    const bassMidis = events.slice(first, last + 1).flatMap((event) => event.bassMidis);
    const reading = counterpointOf(events, first, last, 'phrase', guitarMidis, bassMidis);
    if (reading.suitability === 'suitable') return { role: 'COUNTERPOINT', confidence: 'medium', guitarAttacks, bassAttacks, bassAgency };
    const overlap = shared(guitarPcs, bassPcs);
    if (overlap.length >= 2 && guitarAttacks <= bassAttacks * 1.6 && bassAttacks <= guitarAttacks * 1.6) {
      return { role: 'SHARED_FIELD', confidence: 'low', guitarAttacks, bassAttacks, bassAgency };
    }
    if (firstGuitar >= 0 && (firstBass < 0 || firstGuitar < firstBass) && guitarAttacks > bassAttacks) {
      return { role: 'GUITAR_LEADS', confidence: 'medium', guitarAttacks, bassAttacks, bassAgency };
    }
    if (firstBass >= 0 && firstBass < firstGuitar && bassAttacks > guitarAttacks) {
      return { role: 'BASS_LEADS', confidence: 'medium', guitarAttacks, bassAttacks, bassAgency };
    }
  }
  if (guitarAttacks + bassAttacks < 3) return { role: 'UNKNOWN', confidence: 'unknown', guitarAttacks, bassAttacks, bassAgency };
  if (guitarAttacks > bassAttacks) return { role: 'GUITAR_LEADS', confidence: 'low', guitarAttacks, bassAttacks, bassAgency };
  if (bassAttacks > guitarAttacks) return { role: 'BASS_LEADS', confidence: 'low', guitarAttacks, bassAttacks, bassAgency: bassAttacks >= 3 };
  return { role: 'UNKNOWN', confidence: 'unknown', guitarAttacks, bassAttacks, bassAgency };
}

function counterpointOf(events: readonly Prepared[], first: number, last: number, phraseId: string, guitarMidis: readonly number[], bassMidis: readonly number[]): CounterpointReading {
  const register = classifyRegister(guitarMidis, bassMidis);
  const guitarSign = contourSign(guitarMidis);
  const bassSign = contourSign(bassMidis);
  const contrary = guitarSign !== null && bassSign !== null && guitarSign !== 0 && bassSign !== 0 && guitarSign !== bassSign;
  const oblique = guitarSign !== null && bassSign !== null && ((guitarSign === 0 && bassSign !== 0) || (bassSign === 0 && guitarSign !== 0));
  let either = 0;
  let onlyOne = 0;
  let unisonBars = 0;
  let both = 0;
  for (let index = first; index <= last; index += 1) {
    const event = events[index]!;
    const guitarOn = event.melodyAttacks > 0;
    const bassOn = event.bassAttacks > 0;
    if (guitarOn || bassOn) either += 1;
    if (guitarOn !== bassOn) onlyOne += 1;
    if (guitarOn && bassOn) {
      both += 1;
      const guitarSet = new Set(event.melodyMidis);
      if (event.bassMidis.some((midi) => guitarSet.has(midi))) unisonBars += 1;
    }
  }
  const rhythmicIndependence = either >= 3 && onlyOne / either >= 0.34;
  const unisonWarning = both >= 2 && unisonBars / both >= 0.4;
  const commonToneRetained = oblique && shared(
    events.slice(first, last + 1).flatMap((event) => event.melodyPcs),
    events.slice(first, last + 1).flatMap((event) => event.bassPcs)
  ).length > 0;
  let suitability: CounterpointReading['suitability'] = 'unknown';
  if (guitarMidis.length < 3 || bassMidis.length < 3 || register === 'UNKNOWN') suitability = 'unknown';
  else if ((contrary || oblique) && rhythmicIndependence && !unisonWarning && register !== 'COLLIDING') suitability = 'suitable';
  else suitability = 'weak';
  return {
    phraseId,
    firstSourceLabel: events[first]?.sourceLabel ?? '',
    lastSourceLabel: events[last]?.sourceLabel ?? '',
    suitability,
    contrary,
    oblique,
    commonToneRetained,
    register,
    rhythmicIndependence,
    unisonWarning,
    pitchClassOverlapIsVoiceLeading: false,
  };
}

function initiationOf(events: readonly Prepared[], first: number, last: number, phraseId: string, role: DuoRole): InitiationEvent {
  let firstGuitar = -1;
  let firstBass = -1;
  for (let index = first; index <= last; index += 1) {
    if (events[index]!.melodyAttacks > 0 && firstGuitar < 0) firstGuitar = index;
    if (events[index]!.bassAttacks > 0 && firstBass < 0) firstBass = index;
  }
  const base = {
    phraseId,
    firstSourceLabel: events[first]?.sourceLabel ?? '',
    lastSourceLabel: events[last]?.sourceLabel ?? '',
    imitationForced: false as const,
  };
  if (firstGuitar < 0 && firstBass < 0) {
    return { ...base, initiatingVoice: 'unknown', responseVoice: 'none', relation: 'unknown', imitated: false };
  }
  if (firstGuitar >= 0 && firstBass < 0) {
    return { ...base, initiatingVoice: 'guitar', responseVoice: 'bass', relation: 'silent', imitated: false };
  }
  if (firstBass >= 0 && firstGuitar < 0) {
    return { ...base, initiatingVoice: 'bass', responseVoice: 'guitar', relation: 'silent', imitated: false };
  }
  if (firstGuitar === firstBass) {
    return { ...base, initiatingVoice: 'unknown', responseVoice: 'none', relation: 'unknown', imitated: false };
  }
  const guitarStarts = firstGuitar < firstBass;
  const initiatorPcs = guitarStarts
    ? events.slice(firstGuitar, firstBass).flatMap((event) => event.melodyPcs)
    : events.slice(firstBass, firstGuitar).flatMap((event) => event.bassPcs);
  const responsePcs = guitarStarts
    ? events.slice(firstBass, last + 1).flatMap((event) => event.bassPcs)
    : events.slice(firstGuitar, last + 1).flatMap((event) => event.melodyPcs);
  const uniqueInit = [...new Set(initiatorPcs)];
  const uniqueResponse = [...new Set(responsePcs)];
  const overlap = shared(uniqueInit, uniqueResponse);
  let relation: ResponseRelation = 'unknown';
  if (uniqueResponse.length === 0) relation = 'silent';
  else if (uniqueInit.length > 0 && overlap.length >= Math.min(2, uniqueInit.length) && overlap.length >= uniqueResponse.length - 1) relation = 'retained';
  else if (uniqueResponse.length > 0) relation = 'transformed';
  const imitated =
    uniqueInit.length >= 3 &&
    uniqueInit.length === uniqueResponse.length &&
    uniqueInit.every((pc, index) => pc === uniqueResponse[index]);
  if (role === 'GUITAR_RESPONDS' || role === 'BASS_RESPONDS') {
    /* role already names the answer; relation stays as heard */
  }
  return {
    ...base,
    initiatingVoice: guitarStarts ? 'guitar' : 'bass',
    responseVoice: guitarStarts ? 'bass' : 'guitar',
    relation,
    imitated,
  };
}

export function assessPentatonicFormDuo(args: {
  events: readonly FormDuoEvent[];
  endingDetected?: boolean;
  homePitchClasses?: readonly number[] | null;
}): FormDuoAssessment {
  const events = prepare(args.events);
  const home = args.homePitchClasses ? [...args.homePitchClasses] : null;
  const cuts = phraseStarts(events);
  const ranges = cuts.map((cut, index) => ({
    first: cut.index,
    last: (cuts[index + 1]?.index ?? events.length) - 1,
    evidence: cut.evidence,
    confidence: cut.confidence,
    sectionStart: events[cut.index]?.boundary === true,
  }));
  const functions = assignFunctions(events, ranges, args.endingDetected === true);
  const phrases: FormSpan[] = ranges.map((range, index) =>
    spanOf(events, range.first, range.last, `phrase-${index + 1}`, 'PHRASE', functions[index] ?? 'unknown', functions[index] === 'unknown' ? 'unknown' : range.confidence, range.evidence)
  );
  const sectionCuts = [0, ...events.map((event, index) => (index > 0 && event.boundary ? index : -1)).filter((index) => index >= 0)];
  const sections: FormSpan[] = sectionCuts.map((start, index) => {
    const last = (sectionCuts[index + 1] ?? events.length) - 1;
    const marked = events[start]?.boundary === true;
    return spanOf(
      events,
      start,
      last,
      `section-${index + 1}`,
      'SECTION',
      marked ? 'opening' : 'unknown',
      marked ? 'high' : 'unknown',
      marked ? ['section mark'] : ['no section mark; section is unknown']
    );
  });
  const pairs = pairSpans(events);
  const decisions: FormDecision[] = [];
  const suppressed: { sourceLabel: string; from: string; to: string }[] = [];
  for (let index = 0; index < events.length; index += 1) {
    const phrase = phrases.find((span) => index >= span.firstIndex && index <= span.lastIndex) ?? phrases[0]!;
    const section = sections.find((span) => index >= span.firstIndex && index <= span.lastIndex) ?? sections[0]!;
    const event = events[index]!;
    const previous = index > 0 ? events[index - 1]! : null;
    const phraseStart = index === phrase.firstIndex;
    const sectionStart = index === section.firstIndex && index > 0 && event.boundary;
    const changed = Boolean(previous?.chosenId && event.chosenId && previous.chosenId !== event.chosenId);
    const inPair = insideSpan(index, pairs);
    const localSwitchSuppressed = changed && !phraseStart && !inPair && previous?.chosenId !== 'NONE' && event.chosenId !== 'NONE';
    if (localSwitchSuppressed && previous?.chosenId && event.chosenId) {
      suppressed.push({ sourceLabel: event.sourceLabel, from: previous.chosenId, to: event.chosenId });
    }
    const fieldIsHome = Boolean(home && event.chosenPcs && sameSet(event.chosenPcs, home));
    const homeReturn =
      sectionStart && (phrase.function === 'ending' || phrase.function === 'release') && Boolean(home) && !fieldIsHome;
    let continuity: ContinuityAdvice = 'PHRASE_RETENTION';
    if (dualRest(event) || (phraseStart && event.melodyAttacks + event.bassAttacks === 0)) continuity = 'STRUCTURAL_NONE';
    else if (homeReturn) continuity = 'SECTION_BOUNDARY_RETURN';
    else if (phraseStart && index > 0 && changed) continuity = 'PHRASE_BOUNDARY_CHANGE';
    else if (!phraseStart && localSwitchSuppressed) continuity = 'PHRASE_RETENTION';
    else if (section.function !== 'unknown' && majorityId(events, section.firstIndex, section.lastIndex) === event.chosenId) continuity = 'SECTION_RETENTION';
    else if (!phraseStart) continuity = 'PHRASE_RETENTION';
    decisions.push({
      sourceLabel: event.sourceLabel,
      index,
      level: phraseStart ? 'PHRASE' : 'LOCAL',
      phraseId: phrase.id,
      sectionId: section.id,
      function: phrase.function,
      confidence: phrase.confidence,
      continuity,
      homeReturn,
      localSwitchSuppressed,
    });
  }
  const roles: DuoRoleSpan[] = [];
  const initiations: InitiationEvent[] = [];
  const counterpoint: CounterpointReading[] = [];
  const register: RegisterReading[] = [];
  const structuralSilence: StructuralSilenceOpportunity[] = [];
  const operatorNotes: FormDuoAssessment['operatorNotes'][number][] = [];
  const deliberateNothing: string[] = [];
  const holdFieldSpans: string[] = [];
  for (const phrase of phrases) {
    const role = roleOf(events, phrase.firstIndex, phrase.lastIndex);
    roles.push({
      phraseId: phrase.id,
      firstSourceLabel: phrase.firstSourceLabel,
      lastSourceLabel: phrase.lastSourceLabel,
      role: role.role,
      confidence: role.confidence,
      guitarAttacks: role.guitarAttacks,
      bassAttacks: role.bassAttacks,
      bassAgency: role.bassAgency,
    });
    const guitarMidis = events.slice(phrase.firstIndex, phrase.lastIndex + 1).flatMap((event) => event.melodyMidis);
    const bassMidis = events.slice(phrase.firstIndex, phrase.lastIndex + 1).flatMap((event) => event.bassMidis);
    const line = counterpointOf(events, phrase.firstIndex, phrase.lastIndex, phrase.id, guitarMidis, bassMidis);
    counterpoint.push(line);
    const melodyLanding = median(guitarMidis.slice(-2));
    const compLike = bassMidis.length > 0 && guitarMidis.length > 0 ? quartalMasksMelody(guitarMidis.slice(0, 2), guitarMidis.slice(-2)) : false;
    register.push({
      phraseId: phrase.id,
      firstSourceLabel: phrase.firstSourceLabel,
      lastSourceLabel: phrase.lastSourceLabel,
      classification: line.register,
      masksMelodyLanding: Boolean(compLike && melodyLanding !== null && Math.abs((median(guitarMidis.slice(0, 2)) ?? 0) - melodyLanding) <= 3 && role.role === 'GUITAR_SUPPORTS'),
    });
    initiations.push(initiationOf(events, phrase.firstIndex, phrase.lastIndex, phrase.id, role.role));
    const response = initiations[initiations.length - 1]!;
    const silencePreferred =
      role.role === 'SPACE' ||
      response.relation === 'silent' ||
      (role.bassAgency && role.role === 'BASS_LEADS' && role.guitarAttacks === 0) ||
      densityOf(events, phrase.firstIndex, phrase.lastIndex) >= 6;
    if (silencePreferred && role.role !== 'UNKNOWN') {
      structuralSilence.push({
        sourceLabel: phrase.lastSourceLabel,
        phraseId: phrase.id,
        reason:
          role.role === 'SPACE'
            ? 'The phrase already rests.'
            : response.relation === 'silent'
              ? 'One voice carries the phrase. The answer can be silence.'
              : role.bassAgency && role.guitarAttacks === 0
                ? 'Bass agency stays exposed.'
                : 'Density is already high.',
        texture: 'STRUCTURAL_SILENCE',
        pathNone: false,
        noPhrase: false,
      });
    }
    const chords = new Set(events.slice(phrase.firstIndex, phrase.lastIndex + 1).map((event) => event.chord).filter((chord) => chord.length > 0));
    const holdCredible = chords.size > 1 && new Set(events.slice(phrase.firstIndex, phrase.lastIndex + 1).map((event) => event.chosenId).filter(Boolean)).size <= 1;
    if (holdCredible && phrase.function !== 'unknown') holdFieldSpans.push(`${phrase.firstSourceLabel}–${phrase.lastSourceLabel}`);
    const fieldPcs = events[phrase.firstIndex]?.chosenPcs;
    const placement = placeOperatorInForm({
      operator: response.relation === 'silent' ? 'NONE' : role.role.endsWith('_RESPONDS') ? 'CELL_LINEAGE' : holdCredible ? 'HOLD_FIELD' : 'CELL_LINEAGE',
      formFunction: phrase.function,
      atPhraseBoundary: true,
      atPhraseEnding: phrase.function === 'ending',
      atSectionBoundary: events[phrase.firstIndex]?.boundary === true || phrase.firstIndex === 0,
      role: response.relation === 'silent' ? (response.initiatingVoice === 'bass' ? 'GUITAR_RESPONDS' : 'BASS_RESPONDS') : role.role,
      slipLanding: 'WEAK',
      pairIsRegion: pairs.some((span) => phrase.firstIndex >= span.start && phrase.lastIndex <= span.end),
      holdCredible,
      pathIsNone: false,
      purposeNoPhrase: false,
      structuralSilencePreferred: silencePreferred && response.relation === 'silent',
      homeKnown: Boolean(home),
      fieldIsHome: Boolean(home && fieldPcs && sameSet(fieldPcs, home)),
    });
    operatorNotes.push({ phraseId: phrase.id, operator: placement.operator, texture: placement.texture, reason: placement.reason });
    if (placement.texture === 'STRUCTURAL_SILENCE' || placement.operator === 'HOLD_FIELD' || placement.operator === 'RETAIN' || role.role === 'SPACE') {
      deliberateNothing.push(phrase.id);
    }
  }
  const commonTones = collectCommonTones(events, phrases, home);
  return {
    version: PENTATONIC_FORM_DUO_VERSION,
    phrases,
    sections,
    decisions,
    roles,
    initiations,
    counterpoint,
    register,
    commonTones,
    structuralSilence,
    suppressedLocalSwitches: suppressed,
    deliberateNothing,
    holdFieldSpans,
    tritonePairSpans: pairs.map((span) => `${events[span.start]?.sourceLabel}–${events[span.end]?.sourceLabel}`),
    operatorNotes,
    pathRewritten: false,
  };
}

function collectCommonTones(events: readonly Prepared[], phrases: readonly FormSpan[], home: readonly number[] | null): CommonToneAnchor[] {
  const anchors: CommonToneAnchor[] = [];
  const push = (pitchClass: number, sourceLabel: string, jobs: CommonToneJob[], voice: CommonToneAnchor['voice']) => {
    const verdict = assessCommonTone(pitchClass, jobs);
    anchors.push({ pitchClass, sourceLabel, jobs, rewarded: verdict.rewarded, reason: verdict.reason, voice });
  };
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]!;
    const both = shared(event.melodyPcs, event.bassPcs);
    for (const pc of both) {
      const jobs: CommonToneJob[] = [];
      if (home && home.includes(pc) && event.chosenPcs && !sameSet(event.chosenPcs, home) && event.chosenPcs.includes(pc)) jobs.push('outside-ground');
      const phrase = phrases.find((span) => index >= span.firstIndex && index <= span.lastIndex);
      if (phrase && index === phrase.firstIndex && index > 0) {
        const previous = events[index - 1]!;
        if (previous.melodyPcs.includes(pc) || previous.bassPcs.includes(pc)) jobs.push('phrase-boundary');
      }
      if (index > 0 && event.chosenPcs && events[index - 1]!.chosenPcs && !sameSet(event.chosenPcs, events[index - 1]!.chosenPcs)) {
        if (shared(event.chosenPcs, events[index - 1]!.chosenPcs!).includes(pc)) jobs.push('field-link');
      }
      if (index > 0 && event.chosenId && event.chosenId === events[index - 1]!.chosenId && event.chord && events[index - 1]!.chord && event.chord !== events[index - 1]!.chord && event.chosenPcs?.includes(pc)) {
        jobs.push('hold-field');
      }
      push(pc, event.sourceLabel, jobs, 'both');
    }
  }
  for (let index = 1; index < phrases.length; index += 1) {
    const previous = phrases[index - 1]!;
    const current = phrases[index]!;
    const end = events[previous.lastIndex]!;
    const start = events[current.firstIndex]!;
    const handoff = shared([...end.melodyPcs, ...end.bassPcs], [...start.melodyPcs, ...start.bassPcs]);
    for (const pc of handoff) {
      const fromGuitar = end.melodyPcs.includes(pc) && start.bassPcs.includes(pc);
      const fromBass = end.bassPcs.includes(pc) && start.melodyPcs.includes(pc);
      if (fromGuitar || fromBass) push(pc, start.sourceLabel, ['duo-handoff'], 'handoff');
    }
  }
  for (const phrase of phrases) {
    const pcs = events[phrase.firstIndex]?.chosenPcs;
    const next = events[phrase.lastIndex]?.melodyPcs ?? [];
    if (!pcs) continue;
    for (const pc of shared(pcs, next)) {
      if (phrase.function === 'continuation' || phrase.function === 'development') {
        push(pc, phrase.lastSourceLabel, ['reseat'], events[phrase.lastIndex]!.bassPcs.includes(pc) ? 'both' : 'guitar');
      }
    }
  }
  return anchors;
}

export function formDuoEventsFromAnalysis(analysis: PentatonicScoreAnalysis): FormDuoEvent[] {
  const byId = new Map(analysis.path.events.map((event) => [event.eventId, event]));
  return analysis.score.events.map((event) => {
    const decision = byId.get(event.id);
    const melodyMidis = (event.registerAttacks ?? []).filter((attack) => attack.role === 'melody').map((attack) => attack.midi);
    const bassMidis = (event.registerAttacks ?? []).filter((attack) => attack.role === 'bass').map((attack) => attack.midi);
    return {
      sourceLabel: event.sourceLabel,
      ...(event.melodyNotes ? { melodyNotes: event.melodyNotes } : {}),
      ...(event.bassNotes ? { bassNotes: event.bassNotes } : {}),
      ...(event.melodyRest ? { melodyRest: true } : {}),
      ...(event.bassRest ? { bassRest: true } : {}),
      ...(melodyMidis.length > 0 ? { melodyMidis } : {}),
      ...(bassMidis.length > 0 ? { bassMidis } : {}),
      ...(event.sourceBoundary ? { sourceBoundary: true } : {}),
      ...(event.sectionMarks.length > 0 ? { sectionMarks: event.sectionMarks } : {}),
      ...(event.chordSymbol ? { chordSymbol: event.chordSymbol } : {}),
      chosenId: decision?.chosenId ?? null,
      chosenPitchClasses: decision?.canonicalPitchSet ? [...decision.canonicalPitchSet] : null,
    };
  });
}

export function reportPentatonicFormDuo(title: string, sourceSha256: string, analysis: PentatonicScoreAnalysis): FormDuoTrackReport {
  const home = analysis.identity.home?.pitchClasses ? [...analysis.identity.home.pitchClasses] : null;
  const assessment = assessPentatonicFormDuo({
    events: formDuoEventsFromAnalysis(analysis),
    endingDetected: analysis.score.endingDetected,
    homePitchClasses: home,
  });
  const slices: PathSlice[] = analysis.path.events.map((event) => ({
    sourceLabel: event.sourceLabel,
    chosenId: event.chosenId,
    chosenName: event.chosenName,
    pitchClasses: event.canonicalPitchSet,
  }));
  const intelligence = interpretPentatonicPath(slices, home);
  const slipAvoided = assessment.operatorNotes.filter((note) => note.reason.includes('SLIP')).length;
  const reseatResponses = assessment.operatorNotes.filter((note) => note.operator === 'RESEAT').length;
  return {
    title,
    sourceSha256,
    phrases: assessment.phrases,
    sections: assessment.sections,
    unknownPhraseCount: assessment.phrases.filter((phrase) => phrase.function === 'unknown').length,
    unknownSectionCount: assessment.sections.filter((section) => section.confidence === 'unknown' || section.function === 'unknown').length,
    roles: assessment.roles,
    roleChanges: assessment.roles.filter((role, index) => index > 0 && role.role !== assessment.roles[index - 1]?.role).length,
    initiations: assessment.initiations,
    counterpoint: assessment.counterpoint,
    registerCollisions: assessment.register.filter((row) => row.classification === 'COLLIDING').length,
    closeRegisters: assessment.register.filter((row) => row.classification === 'CLOSE').length,
    clearRegisters: assessment.register.filter((row) => row.classification === 'CLEAR').length,
    commonToneAnchors: assessment.commonTones.filter((tone) => tone.rewarded),
    unrewardedCommonTones: assessment.commonTones.filter((tone) => !tone.rewarded).length,
    structuralSilence: assessment.structuralSilence,
    holdFieldSpans: assessment.holdFieldSpans.length > 0 ? assessment.holdFieldSpans : intelligence.regions.filter((region) => region.trajectory === 'RETAIN_CURRENT_FIELD' || region.trajectory === 'CONTINUITY').map((region) => `${region.firstSourceLabel}–${region.lastSourceLabel}`),
    reseatResponses,
    slipAvoidedAtEndings: slipAvoided,
    tritonePairSpans: assessment.tritonePairSpans.length > 0 ? assessment.tritonePairSpans : intelligence.regions.filter((region) => region.tritonePair).map((region) => `${region.firstSourceLabel}–${region.lastSourceLabel}`),
    suppressedLocalSwitches: assessment.suppressedLocalSwitches.length,
    deliberateNothing: assessment.deliberateNothing,
    homeForcedAtEveryBoundary: false,
    sectionBoundaryReturns: assessment.decisions.filter((decision) => decision.homeReturn).length,
    phraseBoundaries: Math.max(0, assessment.phrases.length - 1),
  };
}
