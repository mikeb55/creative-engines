/**
 * Hexatonic H6-A3 — provisional Core triad pairs.
 * Analysis only. Nothing here is musically approved.
 */

import { placeTriad, parseSpelledPitch, type FretPlacement } from '../wwh/wwhTriadPair';
import { listCatalogueContexts } from './catalogueIdentity';
import { listHexatonicScalars } from './collections';
import { classifyPitchClassSet, transposePitchClassSet } from './setClass';
import { listHexatonicWpsPairs } from './triadPairs';
import {
  commonToneCount,
  disjointTertianSplits,
  minVoiceLeading,
  triadsInterleave,
  triadAt,
} from './tertianTriadUniverse';
import type { VaultTriadQuality } from '../wwh/wps/wpsTonalityVaultRecord';

export const CORE_LABORATORY_STATUS = 'PROVISIONAL — NOT MUSICALLY APPROVED' as const;

export type LaboratoryAnswer = 'YES' | 'NO' | 'UNDECIDED';
export type LaboratoryDecision = 'KEEP' | 'REFINE' | 'REJECT' | 'UNDECIDED';

const OPEN_STRINGS = [4, 9, 2, 7, 11];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export interface CoreCandidate {
  id: string;
  label: string;
  leftSpelling: readonly [string, string, string];
  rightSpelling: readonly [string, string, string];
  leftQuality: VaultTriadQuality;
  rightQuality: VaultTriadQuality;
  provenance: string;
  vaultNote: string | null;
}

export const CORE_CANDIDATES: readonly CoreCandidate[] = [
  { id: 'cm-dbm', label: 'C minor / Db minor', leftSpelling: ['C', 'Eb', 'G'], rightSpelling: ['Db', 'Fb', 'Ab'], leftQuality: 'minor', rightQuality: 'minor', provenance: 'computed', vaultNote: 'notation-checked 2026-10-15: Vol 15 pp. 523-524 names chaos pitches B C# E F# G# and triads E major and C# minor. C minor / Db minor is not printed. Provenance stays computed.' },
  { id: 'cm-bd', label: 'C minor / B diminished', leftSpelling: ['C', 'Eb', 'G'], rightSpelling: ['B', 'D', 'F'], leftQuality: 'minor', rightQuality: 'diminished', provenance: 'computed', vaultNote: null },
  { id: 'cM-bd', label: 'C major / B diminished', leftSpelling: ['C', 'E', 'G'], rightSpelling: ['B', 'D', 'F'], leftQuality: 'major', rightQuality: 'diminished', provenance: 'computed', vaultNote: null },
  { id: 'cM-ebd', label: 'C major / Eb diminished', leftSpelling: ['C', 'E', 'G'], rightSpelling: ['Eb', 'Gb', 'Bbb'], leftQuality: 'major', rightQuality: 'diminished', provenance: 'computed', vaultNote: null },
  { id: 'cm-bbd', label: 'C minor / Bb diminished', leftSpelling: ['C', 'Eb', 'G'], rightSpelling: ['Bb', 'Db', 'Fb'], leftQuality: 'minor', rightQuality: 'diminished', provenance: 'computed', vaultNote: null },
  { id: 'cM-bbm', label: 'C major / Bb minor', leftSpelling: ['C', 'E', 'G'], rightSpelling: ['Bb', 'Db', 'F'], leftQuality: 'major', rightQuality: 'minor', provenance: 'computed', vaultNote: null },
  { id: 'cm-fsm', label: 'C minor / F# minor', leftSpelling: ['C', 'Eb', 'G'], rightSpelling: ['F#', 'A', 'C#'], leftQuality: 'minor', rightQuality: 'minor', provenance: 'computed', vaultNote: null },
  { id: 'cm-dA', label: 'C minor / D augmented', leftSpelling: ['C', 'Eb', 'G'], rightSpelling: ['D', 'F#', 'A#'], leftQuality: 'minor', rightQuality: 'augmented', provenance: 'computed', vaultNote: null },
  { id: 'cM-dA', label: 'C major / D augmented', leftSpelling: ['C', 'E', 'G'], rightSpelling: ['D', 'F#', 'A#'], leftQuality: 'major', rightQuality: 'augmented', provenance: 'computed', vaultNote: null },
  { id: 'cm-dbA', label: 'C minor / Db augmented', leftSpelling: ['C', 'Eb', 'G'], rightSpelling: ['Db', 'F', 'A'], leftQuality: 'minor', rightQuality: 'augmented', provenance: 'computed', vaultNote: null },
  { id: 'cM-ebm', label: 'C major / Eb minor', leftSpelling: ['C', 'E', 'G'], rightSpelling: ['Eb', 'Gb', 'Bb'], leftQuality: 'major', rightQuality: 'minor', provenance: 'computed', vaultNote: 'notation-checked 2026-10-15: Vol 15 pp. 523-524 names E major and C# minor, not C major / Eb minor. Provenance stays computed.' },
  { id: 'cM-fsm', label: 'C major / F# minor', leftSpelling: ['C', 'E', 'G'], rightSpelling: ['F#', 'A', 'C#'], leftQuality: 'major', rightQuality: 'minor', provenance: 'computed', vaultNote: null },
];

export interface LaboratoryReviewEntry {
  distinct: LaboratoryAnswer;
  useful: LaboratoryAnswer;
  guitarPlayable: LaboratoryAnswer;
  colour: string;
  decision: LaboratoryDecision;
}

export type BlindItemKind = 'primary' | 'reference' | 'repeat';
export type BlindDistinctAnswer = 'YES' | 'NO' | 'UNSURE' | 'UNDECIDED';
export type BlindComposeAnswer = 'YES' | 'MAYBE' | 'NO' | 'UNDECIDED';
export type BlindDisposition = 'ACCEPT' | 'REFINE' | 'REJECT' | 'KEEP_PROVISIONAL' | 'UNDECIDED';

export interface BlindAuditionItem {
  code: string;
  kind: BlindItemKind;
  candidateId?: string;
  catalogueId?: string;
  sourceCode?: string;
}

export interface BlindAuditionSession {
  index: number;
  items: BlindAuditionItem[];
}

export interface BlindListeningAnswer {
  distinct: BlindDistinctAnswer;
  compose: BlindComposeAnswer;
  colour: string;
  saved: boolean;
  guitarPlaythrough: string;
  disposition: BlindDisposition;
}

/** Optional block on laboratory review version 1. Absent on older files. */
export interface BlindAuditionRecord {
  seed: number;
  cursor: { session: number; item: number };
  sessions: readonly BlindAuditionSession[];
  answers: Record<string, BlindListeningAnswer>;
}

export interface CoreLaboratoryReview {
  format: 'hexatonic-laboratory-review';
  version: 1;
  id: string;
  savedAt: string;
  artisticApproval: false;
  candidates: Record<string, LaboratoryReviewEntry>;
  blind?: BlindAuditionRecord;
}

export interface CoreCandidateAnalysis {
  candidate: CoreCandidate;
  status: typeof CORE_LABORATORY_STATUS;
  leftPitchClasses: readonly number[];
  rightPitchClasses: readonly number[];
  union: readonly number[];
  unionSpelling: readonly string[];
  forte: string;
  normalForm: readonly number[];
  commonTones: number;
  interleaves: boolean;
  minVoiceLeading: number;
  alternateConstructions: number;
  nearestCatalogueIds: readonly string[];
  sharedWithNearest: number;
  wpsIdsOnNearest: readonly string[];
  bhlNote: string;
  guitarTranspositions: readonly { semitones: number; openStrings: number; spelling: string }[];
  inversions: readonly { triad: string; inversion: string; withinFourFrets: boolean }[];
  dyadsAvailable: boolean;
  bassPedals: readonly string[];
}

function orderedPcs(tokens: readonly string[]): number[] {
  return tokens.map((token) => parseSpelledPitch(token).pc);
}

function pcsOf(tokens: readonly string[]): number[] {
  const pitchClasses = [...new Set(orderedPcs(tokens))].sort((left, right) => left - right);
  if (pitchClasses.length !== tokens.length) throw new Error(`spelling collapses ${tokens.join(' ')}`);
  return pitchClasses;
}

function gripsOf(spelling: readonly string[], quality: VaultTriadQuality): FretPlacement[][] {
  const pitchClasses = orderedPcs(spelling);
  let placements: FretPlacement[] = [];
  try {
    placements = placeTriad({
      id: 'lab',
      rootSpelling: spelling[0] ?? 'C',
      quality,
      notes: [...spelling],
      pitchClasses,
      provenance: 'user',
    });
  } catch {
    return [];
  }
  const groups = pitchClasses.map((pitchClass) => placements.filter((placement) => placement.midi % 12 === pitchClass));
  if (groups.some((group) => group.length === 0)) return [];
  const found: FretPlacement[][] = [];
  const limits = groups.map((group) => Math.min(group.length, 6));
  const index = [0, 0, 0];
  const walk = (digit: number) => {
    if (digit === 3) {
      const chosen = index.map((at, note) => groups[note]![at]!);
      const strings = new Set(chosen.map((placement) => placement.stringNumber));
      if (strings.size !== 3) return;
      const frets = chosen.map((placement) => placement.fret).filter((fret) => fret > 0);
      const span = frets.length ? Math.max(...frets) - Math.min(...frets) : 0;
      if (span <= 4) found.push(chosen);
      return;
    }
    for (let at = 0; at < limits[digit]!; at += 1) {
      index[digit] = at;
      walk(digit + 1);
      if (found.length > 24) return;
    }
  };
  walk(0);
  return found;
}

function spellSet(pitchClasses: readonly number[]): string[] {
  return pitchClasses.map((pitchClass) => FLAT_NAMES[pitchClass] ?? String(pitchClass));
}

export function getCoreCandidate(id: string): CoreCandidate | undefined {
  return CORE_CANDIDATES.find((row) => row.id === id);
}

export function analyzeCoreCandidate(id: string): CoreCandidateAnalysis {
  const candidate = getCoreCandidate(id);
  if (!candidate) throw new Error(`unknown core candidate ${id}`);
  const leftPitchClasses = pcsOf(candidate.leftSpelling);
  const rightPitchClasses = pcsOf(candidate.rightSpelling);
  const union = [...new Set([...leftPitchClasses, ...rightPitchClasses])].sort((a, b) => a - b);
  const setClass = classifyPitchClassSet(union);
  const contexts = listCatalogueContexts();
  let best = -1;
  const nearest: typeof contexts = [];
  for (const context of contexts) {
    const shared = context.pitchClasses.filter((pitchClass) => union.includes(pitchClass)).length;
    if (shared > best) {
      best = shared;
      nearest.length = 0;
      nearest.push(context);
    } else if (shared === best) nearest.push(context);
  }
  const nearestIds = nearest.map((row) => row.id);
  const wpsIdsOnNearest = nearest.filter((row) => row.kind === 'wps-pair').map((row) => row.id);
  let bhlNote = 'No BHL world is renamed by this candidate.';
  if (nearestIds.includes('hex_lydian_triad_pair') || setClass.forte === '6-33') {
    bhlNote = 'World A is the existing major-second pair, a different object when this union is not that pair.';
  }
  if (setClass.forte === '6-30') {
    bhlNote = 'World F’s tritone major pair is an existing 6-30 construction. This candidate is not that pair.';
  }
  const guitarTranspositions = Array.from({ length: 12 }, (_, semitones) => {
    const moved = transposePitchClassSet(union, semitones);
    return {
      semitones,
      openStrings: moved.filter((pitchClass) => OPEN_STRINGS.includes(pitchClass)).length,
      spelling: spellSet(moved).join(' '),
    };
  }).sort((left, right) => right.openStrings - left.openStrings || left.semitones - right.semitones);
  const sides = [
    { name: 'left', spelling: candidate.leftSpelling, quality: candidate.leftQuality },
    { name: 'right', spelling: candidate.rightSpelling, quality: candidate.rightQuality },
  ] as const;
  const inversions = sides.flatMap((side) => {
    const grips = gripsOf(side.spelling, side.quality);
    const pcs = orderedPcs(side.spelling);
    return [0, 1, 2].map((inversion) => ({
      triad: side.name,
      inversion: ['root position', 'first inversion', 'second inversion'][inversion]!,
      withinFourFrets: grips.some((grip) => {
        const lowest = grip.reduce((best, placement) => (placement.midi < best.midi ? placement : best));
        return lowest.midi % 12 === pcs[inversion];
      }),
    }));
  });
  const dyadsAvailable = sides.some((side) => {
    const grips = gripsOf(side.spelling, side.quality);
    return grips.some((grip) =>
      [[0, 1], [1, 2], [0, 2]].some(([left, right]) => {
        const pair = [grip[left]!, grip[right]!];
        if (pair[0].stringNumber === pair[1].stringNumber) return false;
        const frets = pair.map((placement) => placement.fret).filter((fret) => fret > 0);
        return frets.length === 0 || Math.max(...frets) - Math.min(...frets) <= 4;
      }),
    );
  });
  return {
    candidate,
    status: CORE_LABORATORY_STATUS,
    leftPitchClasses,
    rightPitchClasses,
    union,
    unionSpelling: spellSet(union),
    forte: setClass.forte,
    normalForm: setClass.normalForm,
    commonTones: commonToneCount(leftPitchClasses, rightPitchClasses),
    interleaves: triadsInterleave(leftPitchClasses, rightPitchClasses),
    minVoiceLeading: minVoiceLeading(leftPitchClasses, rightPitchClasses),
    alternateConstructions: disjointTertianSplits(union).length,
    nearestCatalogueIds: nearestIds,
    sharedWithNearest: best,
    wpsIdsOnNearest,
    bhlNote,
    guitarTranspositions: guitarTranspositions.slice(0, 3),
    inversions,
    dyadsAvailable,
    bassPedals: [`${candidate.leftSpelling[0]} pedal`, `${candidate.rightSpelling[0]} pedal`, 'C pedal'],
  };
}

export function listCoreCandidateAnalyses(): readonly CoreCandidateAnalysis[] {
  return CORE_CANDIDATES.map((row) => analyzeCoreCandidate(row.id));
}

function blankEntry(): LaboratoryReviewEntry {
  return { distinct: 'UNDECIDED', useful: 'UNDECIDED', guitarPlayable: 'UNDECIDED', colour: '', decision: 'UNDECIDED' };
}

export function blankCoreLaboratoryReview(id = 'core-laboratory', savedAt = new Date().toISOString()): CoreLaboratoryReview {
  const candidates: Record<string, LaboratoryReviewEntry> = {};
  for (const row of CORE_CANDIDATES) candidates[row.id] = blankEntry();
  return {
    format: 'hexatonic-laboratory-review',
    version: 1,
    id,
    savedAt,
    artisticApproval: false,
    candidates,
  };
}

const ANSWERS = new Set(['YES', 'NO', 'UNDECIDED']);
const DECISIONS = new Set(['KEEP', 'REFINE', 'REJECT', 'UNDECIDED']);
const BLIND_DISTINCT = new Set(['YES', 'NO', 'UNSURE', 'UNDECIDED']);
const BLIND_COMPOSE = new Set(['YES', 'MAYBE', 'NO', 'UNDECIDED']);
const BLIND_DISPOSITION = new Set(['ACCEPT', 'REFINE', 'REJECT', 'KEEP_PROVISIONAL', 'UNDECIDED']);
const BLIND_CODE = /^mark-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function catalogueIdSet(): Set<string> {
  return new Set([...listHexatonicScalars().map((row) => row.id), ...listHexatonicWpsPairs().map((row) => row.id)]);
}

function blindRecordErrors(raw: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(raw)) return ['blind must be an object'];
  if (!Number.isInteger(raw.seed) || Number(raw.seed) < 0 || Number(raw.seed) > 2147483647) errors.push('blind seed');
  if (!isRecord(raw.cursor) || !Number.isInteger(raw.cursor.session) || !Number.isInteger(raw.cursor.item)) errors.push('blind cursor');
  if (!Array.isArray(raw.sessions) || raw.sessions.length !== 4) {
    errors.push('blind sessions');
    return errors;
  }
  const catalogue = catalogueIdSet();
  const candidateIds = new Set(CORE_CANDIDATES.map((row) => row.id));
  const codes = new Set<string>();
  const primaries: string[] = [];
  const items: BlindAuditionItem[] = [];
  raw.sessions.forEach((sessionRaw, sessionIndex) => {
    if (!isRecord(sessionRaw) || sessionRaw.index !== sessionIndex || !Array.isArray(sessionRaw.items)) {
      errors.push(`blind session ${sessionIndex}`);
      return;
    }
    let primaryCount = 0;
    let referenceCount = 0;
    let repeatCount = 0;
    for (const itemRaw of sessionRaw.items) {
      if (!isRecord(itemRaw) || typeof itemRaw.code !== 'string' || !BLIND_CODE.test(itemRaw.code)) {
        errors.push(`blind code ${sessionIndex}`);
        continue;
      }
      if (codes.has(itemRaw.code)) errors.push(`blind duplicate ${itemRaw.code}`);
      codes.add(itemRaw.code);
      const kind = itemRaw.kind;
      const candidateId = typeof itemRaw.candidateId === 'string' ? itemRaw.candidateId : undefined;
      const catalogueId = typeof itemRaw.catalogueId === 'string' ? itemRaw.catalogueId : undefined;
      const sourceCode = typeof itemRaw.sourceCode === 'string' ? itemRaw.sourceCode : undefined;
      if (kind === 'primary') {
        primaryCount += 1;
        if (!candidateId || !candidateIds.has(candidateId) || catalogueId || sourceCode) errors.push(`blind primary ${itemRaw.code}`);
        else primaries.push(candidateId);
      } else if (kind === 'reference') {
        referenceCount += 1;
        if (!catalogueId || !catalogue.has(catalogueId) || candidateIds.has(catalogueId) || candidateId || sourceCode) {
          errors.push(`blind reference ${itemRaw.code}`);
        }
      } else if (kind === 'repeat') {
        repeatCount += 1;
        if (!candidateId || !candidateIds.has(candidateId) || !sourceCode || !BLIND_CODE.test(sourceCode) || catalogueId) {
          errors.push(`blind repeat ${itemRaw.code}`);
        }
      } else errors.push(`blind kind ${itemRaw.code}`);
      items.push({
        code: itemRaw.code,
        kind: kind as BlindItemKind,
        ...(candidateId ? { candidateId } : {}),
        ...(catalogueId ? { catalogueId } : {}),
        ...(sourceCode ? { sourceCode } : {}),
      });
    }
    if (primaryCount !== 3 || referenceCount !== 1) errors.push(`blind session shape ${sessionIndex}`);
    if ((sessionIndex < 2 && repeatCount !== 0) || (sessionIndex >= 2 && repeatCount !== 1)) errors.push(`blind repeats ${sessionIndex}`);
  });
  if (new Set(primaries).size !== 12 || primaries.length !== 12) errors.push('blind primaries');
  const byCode = new Map(items.map((item) => [item.code, item]));
  const sessionItems = raw.sessions.map((sessionRaw) => (isRecord(sessionRaw) && Array.isArray(sessionRaw.items) ? sessionRaw.items : []));
  items.forEach((item) => {
    if (item.kind !== 'repeat' || !item.sourceCode) return;
    const source = byCode.get(item.sourceCode);
    const sessionIndex = raw.sessions.findIndex((sessionRaw) => Array.isArray((sessionRaw as { items?: unknown }).items) && ((sessionRaw as { items: { code?: string }[] }).items).some((row) => row.code === item.code));
    const expectedSession = sessionIndex === 2 ? 0 : sessionIndex === 3 ? 1 : -1;
    const sourceSession = sessionItems.findIndex((rows) => rows.some((row) => isRecord(row) && row.code === item.sourceCode));
    if (!source || source.kind !== 'primary' || source.candidateId !== item.candidateId || sourceSession !== expectedSession) {
      errors.push(`blind repeat source ${item.code}`);
    }
  });
  if (isRecord(raw.cursor)) {
    const session = Number(raw.cursor.session);
    const item = Number(raw.cursor.item);
    const length = Array.isArray((raw.sessions[session] as { items?: unknown } | undefined)?.items)
      ? (raw.sessions[session] as { items: unknown[] }).items.length
      : 0;
    if (session < 0 || session > 3 || item < 0 || item >= length) errors.push('blind cursor range');
  }
  if (!isRecord(raw.answers)) errors.push('blind answers');
  else {
    for (const [code, answerRaw] of Object.entries(raw.answers)) {
      if (!codes.has(code) || !isRecord(answerRaw)) {
        errors.push(`blind answer ${code}`);
        continue;
      }
      if (!BLIND_DISTINCT.has(String(answerRaw.distinct))) errors.push(`${code} distinct`);
      if (!BLIND_COMPOSE.has(String(answerRaw.compose))) errors.push(`${code} compose`);
      if (typeof answerRaw.colour !== 'string' || answerRaw.colour.length > 240) errors.push(`${code} colour`);
      if (typeof answerRaw.saved !== 'boolean') errors.push(`${code} saved`);
      if (typeof answerRaw.guitarPlaythrough !== 'string' || answerRaw.guitarPlaythrough.length > 240) errors.push(`${code} guitar`);
      if (!BLIND_DISPOSITION.has(String(answerRaw.disposition))) errors.push(`${code} disposition`);
    }
  }
  return errors;
}

export function validateCoreLaboratoryReview(raw: unknown): { ok: true; review: CoreLaboratoryReview } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: ['review must be an object'] };
  const row = raw as Record<string, unknown>;
  if (row.format !== 'hexatonic-laboratory-review') errors.push('format must be hexatonic-laboratory-review');
  if (row.version !== 1) errors.push('version must be 1');
  if (row.artisticApproval !== false) errors.push('artisticApproval must stay false');
  if (typeof row.id !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(row.id)) errors.push('review id is unsafe');
  if (typeof row.savedAt !== 'string' || Number.isNaN(Date.parse(row.savedAt))) errors.push('savedAt must be a time');
  const candidates = row.candidates;
  if (!candidates || typeof candidates !== 'object' || Array.isArray(candidates)) errors.push('candidates are required');
  else {
    for (const candidate of CORE_CANDIDATES) {
      const entry = (candidates as Record<string, unknown>)[candidate.id];
      if (!entry || typeof entry !== 'object') {
        errors.push(`missing ${candidate.id}`);
        continue;
      }
      const fields = entry as Record<string, unknown>;
      if (!ANSWERS.has(String(fields.distinct))) errors.push(`${candidate.id} distinct`);
      if (!ANSWERS.has(String(fields.useful))) errors.push(`${candidate.id} useful`);
      if (!ANSWERS.has(String(fields.guitarPlayable))) errors.push(`${candidate.id} guitar`);
      if (typeof fields.colour !== 'string' || fields.colour.length > 240) errors.push(`${candidate.id} colour`);
      if (!DECISIONS.has(String(fields.decision))) errors.push(`${candidate.id} decision`);
    }
  }
  if ('blind' in row && row.blind !== undefined) errors.push(...blindRecordErrors(row.blind));
  if (errors.length) return { ok: false, errors };
  return { ok: true, review: row as unknown as CoreLaboratoryReview };
}

export function triadTemplateAtCandidate(candidate: CoreCandidate, side: 'left' | 'right') {
  const spelling = side === 'left' ? candidate.leftSpelling : candidate.rightSpelling;
  const quality = side === 'left' ? candidate.leftQuality : candidate.rightQuality;
  return triadAt(quality, orderedPcs(spelling)[0]!);
}
