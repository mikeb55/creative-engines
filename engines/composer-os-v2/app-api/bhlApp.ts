/**
 * BHL GUI API. Calls the production composer in core/bhl.
 * Reads the album. Writes only under the BHL export directory.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BHL_ALBUM_ROOT, BhlExportRejected, assertBhlExportPath } from '../core/bhl/bhlCopy';
import { composeBhlGuitar } from '../core/bhl/bhlCompose';
import {
  compareBhlCandidateXml,
  generateBhlCandidateSet,
  refineBhlCandidate,
} from '../core/bhl/bhlCandidates';
import { loadBhlProject, saveBhlProject, type BhlProjectV1 } from '../core/bhl/bhlProject';
import { bhlProfileById } from '../core/bhl/bhlProfiles';
import { bhlResourceCatalog, prepareBhlMusic, type BhlMusicalRequest } from '../core/bhl/bhlResources';
import { presentBhlScore } from '../core/bhl/bhlPresent';
import { buildBhlScratchScore, writeBhlScratchScore } from '../core/bhl/bhlScratch';
import { extractBhlSnapshot, ingestBhlSource, lockSpecOf, sha256File } from '../core/bhl/bhlIngest';
import type { BhlFeasibilityNote } from '../core/bhl/bhlGenerate';
import {
  deriveBhlPhrasePlan,
  listBhlFieldChoices,
  type BhlDialogue,
  type BhlDensity,
  type BhlFieldChoice,
  type BhlFieldSnap,
  type BhlGuitarEvent,
  type BhlPhrasePlan,
  type BhlContinuationStrategy,
  type BhlPitchTransform,
  type BhlPredicateResult,
} from '../core/bhl/bhlPhrase';
import type { BhlFieldNote } from '../core/bhl/bhlRealise';
import type { BhlPhraseArc, BhlPhraseBinderReport, BhlRhythmMode } from '../core/bhl/bhlPhraseShape';
import { BHL_WORLDS, isBhlWorldId, type BhlWorldId } from '../core/bhl/bhlWorlds';
import type { BhlLockReport, BhlSpan } from '../core/bhl/bhlTypes';
import type { BhlHarmonyChange } from '../core/bhl/bhlWrite';
import { verifyBhlLocks } from '../core/bhl/bhlVerify';
import { auditBhlIntentions, type BhlIntentCheck } from '../core/bhl/bhlIntentAudit';
import {
  compareBhlEvidence,
  readBhlEvidence,
  type BhlEvidenceComparison,
  type BhlEvidenceReport,
} from '../core/bhl/bhlEvidence';
import { parseScoreDocument, partElements, partNames } from '../core/performance-composer/pcScore';

const DIALOGUES: readonly BhlDialogue[] = [
  'answer-after-bass',
  'counter-motion',
  'leave-space',
  'handoff-before-bass',
];
const DENSITIES: readonly BhlDensity[] = ['dyad', 'single', 'alternate', 'triad', 'counterline'];
const ARCS: readonly BhlPhraseArc[] = ['derived', 'invert', 'recall'];
const RHYTHMS: readonly BhlRhythmMode[] = ['derived', 'displace', 'syncopate', 'sparse'];
const PITCHES: readonly BhlPitchTransform[] = [
  'neighbor-statement',
  'invert-into-field',
  'reproject-neighbor',
  'recall-cell',
  'retain-and-admit-bass',
];
const CONTINUATIONS: readonly BhlContinuationStrategy[] = ['extend', 'fragment', 'sequence', 'rhythm', 'converse'];

export const BHL_WRONG_TURNING_RELATIVE =
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml';

export function bhlWrongTurningPath(): string {
  return path.join(BHL_ALBUM_ROOT, BHL_WRONG_TURNING_RELATIVE);
}

export function bhlExportDir(): string {
  const dir = process.env.BHL_EXPORT_DIR?.trim() || path.join(os.homedir(), 'Downloads', 'BHL-Composer');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export interface BhlApiFailure {
  ok: false;
  error: string;
}

export interface BhlRegionControl {
  id: string;
  fieldChoiceId?: string;
  density?: BhlDensity;
  dialogue?: BhlDialogue;
  pitchTransform?: BhlPitchTransform;
}

export interface BhlDefaultsResponse {
  ok: true;
  sourcePath: string;
  sourceExists: boolean;
  exportDir: string;
  span: BhlSpan;
}

export interface BhlInspectResponse {
  ok: true;
  sourcePath: string;
  sourceSha256: string;
  guitarPartId: string;
  bassPartId: string;
  guitarName: string;
  bassName: string;
  barCount: number;
  span: BhlSpan;
  metres: Array<{ partId: string; bar: number; beats: number; beatType: number; stated: boolean }>;
  tempo: { beatUnit: string | null; perMinute: string | null; statedAtBar: number | null } | null;
  rehearsal: Array<{ partId: string; bar: number; text: string }>;
  bassEventCount: number;
  protectedGuitarBars: number[];
  plan: BhlPhrasePlan;
  fieldChoices: Record<string, BhlFieldChoice[]>;
  worlds: typeof BHL_WORLDS;
  /** Stored on the plan. A harmonic world makes the seed change the guitar. */
  seedStoredOnly: boolean;
  evidence: BhlEvidenceReport;
}

export interface BhlComposeResponse {
  ok: true;
  sourcePath: string;
  sourceSha256: string;
  sourceUnchanged: boolean;
  seed: number;
  span: BhlSpan;
  protectedGuitarBars: number[];
  plan: BhlPhrasePlan;
  fieldChoices: Record<string, BhlFieldChoice[]>;
  events: BhlGuitarEvent[];
  snaps: BhlFieldSnap[];
  predicates: BhlPredicateResult[];
  feasibility: BhlFeasibilityNote[];
  harmony: BhlHarmonyChange[];
  verification: BhlLockReport;
  outsideIdentical: boolean;
  guitarChanged: boolean;
  xml: string;
  gce: BhlGceEvidence;
  world: BhlWorldId | null;
  worldName: string | null;
  resource: string | null;
  worldPitchClasses: number[];
  commonToneRetentions: number;
  contrastingMoves: number;
  binder: BhlPhraseBinderReport | null;
  musicalEvidence: {
    original: BhlEvidenceReport;
    candidate: BhlEvidenceReport;
    comparison: BhlEvidenceComparison;
    intentions: BhlIntentCheck[];
    limitations: Array<{ regionId: string; intention: string; reason: string }>;
    fieldNotes: BhlFieldNote[];
    provisional: true;
  };
}

export interface BhlGceEvidence {
  framework: 'GCE V3.0';
  technicalLabel: 'TECHNICAL FAIL' | 'technical checks passed';
  musicalLabel: 'MUSICAL REVISE' | 'human audition still required';
  musicallyApproved: false;
  candidateForAudition: false;
  notes: string[];
}

export interface BhlExportResponse {
  ok: true;
  outputPath: string;
  bytes: number;
  sourceSha256: string;
  sourceUnchanged: boolean;
  verification: BhlLockReport;
}

export interface BhlOpenResponse {
  ok: true;
  outputPath: string;
  openedWith: string;
}

function fail(error: string): BhlApiFailure {
  return { ok: false, error };
}

function readMusical(raw: unknown): BhlMusicalRequest | null | BhlApiFailure {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return fail('musical must be an object');
  const row = raw as Record<string, unknown>;
  const musical: BhlMusicalRequest = {};
  if (row.profileId != null && row.profileId !== '') {
    if (typeof row.profileId !== 'string' || !bhlProfileById(row.profileId)) return fail(`style profile ${String(row.profileId)} is not available`);
    musical.profileId = row.profileId;
  }
  if (row.pentatonic != null) {
    if (typeof row.pentatonic !== 'object' || Array.isArray(row.pentatonic)) return fail('pentatonic must be an object');
    const pent = row.pentatonic as Record<string, unknown>;
    if (typeof pent.archetypeId !== 'string' || typeof pent.referenceNote !== 'string' || typeof pent.relationshipId !== 'string') {
      return fail('pentatonic needs archetypeId, referenceNote, and relationshipId');
    }
    musical.pentatonic = {
      archetypeId: pent.archetypeId,
      referenceNote: pent.referenceNote,
      relationshipId: pent.relationshipId,
    };
  }
  if (Array.isArray(row.parentPitchClasses)) {
    const pcs = row.parentPitchClasses.filter((value) => Number.isInteger(value));
    if (pcs.length !== row.parentPitchClasses.length) return fail('parentPitchClasses must be integers');
    musical.parentPitchClasses = pcs as number[];
  }
  if (row.motif != null) {
    if (typeof row.motif !== 'object' || Array.isArray(row.motif)) return fail('motif must be an object');
    const motif = row.motif as Record<string, unknown>;
    if (motif.kind !== 'import' && motif.kind !== 'riff' && motif.kind !== 'constraints') {
      return fail('motif.kind must be import, riff, or constraints');
    }
    const pitchTransform = motif.pitchTransform ?? 'none';
    if (
      pitchTransform !== 'none' &&
      pitchTransform !== 'transpose' &&
      pitchTransform !== 'invert' &&
      pitchTransform !== 'fragment' &&
      pitchTransform !== 'register'
    ) {
      return fail(`motif transform ${String(pitchTransform)} is not available`);
    }
    musical.motif = {
      kind: motif.kind,
      pitches: Array.isArray(motif.pitches) ? (motif.pitches.filter((value) => Number.isInteger(value)) as number[]) : undefined,
      intervals: Array.isArray(motif.intervals) ? (motif.intervals.filter((value) => Number.isInteger(value)) as number[]) : undefined,
      riffSeed: intField(motif.riffSeed) ?? undefined,
      pitchTransform,
      semitones: intField(motif.semitones) ?? undefined,
    };
  }
  if (row.quartal === true || row.quartal === false) musical.quartal = row.quartal;
  return musical;
}

function underExport(filePath: string): string | BhlApiFailure {
  const resolved = path.resolve(filePath);
  const dir = path.resolve(bhlExportDir());
  const relative = path.relative(dir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return fail('path must stay inside the BHL export directory');
  if (BHL_ALBUM_ROOT && resolved.startsWith(path.resolve(BHL_ALBUM_ROOT))) return fail('refusing to write inside the album tree');
  return resolved;
}

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

function intField(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isInteger(n)) return null;
  return n;
}

function readSpan(raw: unknown, fallback: BhlSpan): BhlSpan | BhlApiFailure {
  if (raw === undefined || raw === null) return fallback;
  if (typeof raw !== 'object' || Array.isArray(raw)) return fail('span must be { from, to }');
  const o = raw as Record<string, unknown>;
  const from = intField(o.from);
  const to = intField(o.to);
  if (from === null || to === null || from < 1 || to < from) return fail('span needs integer bars, from ≤ to');
  return { from, to };
}

function readProtected(raw: unknown): number[] | BhlApiFailure {
  if (raw === undefined || raw === null || raw === '') return [];
  const parts = Array.isArray(raw) ? raw : String(raw).split(/[^0-9]+/);
  const bars: number[] = [];
  for (const part of parts) {
    if (part === '' || part === undefined) continue;
    const n = intField(part);
    if (n === null || n < 1) return fail(`protected guitar bar "${String(part)}" is not a bar number`);
    if (!bars.includes(n)) bars.push(n);
  }
  return bars.sort((a, b) => a - b);
}

export function defaultBhlSpan(sourcePath: string, barCount: number): BhlSpan {
  if (/wrong-turning/i.test(path.basename(sourcePath)) && barCount >= 40) return { from: 33, to: 40 };
  return { from: 1, to: Math.max(1, Math.min(barCount, 8)) };
}

function sourceOrDefault(raw: unknown): string | BhlApiFailure {
  const text = typeof raw === 'string' ? raw.trim() : '';
  const sourcePath = text || bhlWrongTurningPath();
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
    return fail(`MusicXML not found: ${sourcePath}`);
  }
  return sourcePath;
}

function barCountOf(xml: string): number {
  const doc = parseScoreDocument(xml);
  const part = partElements(doc)[0];
  if (!part) throw new Error('score has no parts');
  return part.getElementsByTagName('measure').length;
}

function applyControls(plan: BhlPhrasePlan, raw: unknown): BhlPhrasePlan | BhlApiFailure {
  if (raw === undefined || raw === null) return plan;
  if (!Array.isArray(raw)) return fail('regions must be a list');
  const next: BhlPhrasePlan = structuredClone(plan);
  for (const item of raw) {
    if (!item || typeof item !== 'object') return fail('region control must be an object');
    const row = item as Record<string, unknown>;
    const id = typeof row.id === 'string' ? row.id : '';
    const region = next.regions.find((candidate) => candidate.id === id);
    if (!region) return fail(`unknown phrase region ${id}`);
    if (row.density !== undefined) {
      if (!DENSITIES.includes(row.density as BhlDensity)) return fail(`density ${String(row.density)} is not available`);
      region.density = row.density as BhlDensity;
    }
    if (row.dialogue !== undefined) {
      if (!DIALOGUES.includes(row.dialogue as BhlDialogue)) return fail(`dialogue ${String(row.dialogue)} is not available`);
      region.dialogue = row.dialogue as BhlDialogue;
    }
    if (row.pitchTransform !== undefined) {
      if (!PITCHES.includes(row.pitchTransform as BhlPitchTransform)) {
        return fail(`pitch transform ${String(row.pitchTransform)} is not available`);
      }
      region.pitchTransform = row.pitchTransform as BhlPitchTransform;
    }
    const choiceId = typeof row.fieldChoiceId === 'string' ? row.fieldChoiceId : 'bass-field';
    if (choiceId === 'bass-field') continue;
    const choice = listBhlFieldChoices(region.pitchClasses, region.vaultRootPc).find((item) => item.id === choiceId);
    if (!choice) return fail(`harmonic field ${choiceId} is not available for ${id}`);
    region.pitchClasses = [...choice.pitchClasses];
    region.vaultChordType = choice.vaultChordType;
    region.vaultRootPc = choice.vaultRootPc;
  }
  return next;
}

function applyContinuation(plan: BhlPhrasePlan, raw: unknown, outsideColour: boolean): BhlPhrasePlan | BhlApiFailure {
  if (raw === undefined || raw === null || raw === '' || raw === 'hold') return plan;
  if (!CONTINUATIONS.includes(raw as BhlContinuationStrategy)) return fail(`continuation ${String(raw)} is not available`);
  for (const region of plan.regions) {
    if (region.role !== 'continuation') continue;
    region.continuation = raw as BhlContinuationStrategy;
    region.outsideColour = outsideColour;
  }
  return plan;
}

function fieldMap(plan: BhlPhrasePlan): Record<string, BhlFieldChoice[]> {
  const out: Record<string, BhlFieldChoice[]> = {};
  for (const region of plan.regions) out[region.id] = listBhlFieldChoices(region.pitchClasses, region.vaultRootPc);
  return out;
}

function gceEvidence(input: {
  verificationOk: boolean;
  predicatesOk: boolean;
  feasibilityOk: boolean;
  guitarChanged: boolean;
  world: boolean;
}): BhlGceEvidence {
  const notes = [
    'GCE V3.0 is an evidence record. This panel does not give a numerical GCE score.',
    'MUSICALLY APPROVED needs a human audition and explicit acceptance. This build does not assign it.',
    'CANDIDATE FOR AUDITION needs a source-specific musical critique. This build does not assign it.',
  ];
  if (!input.verificationOk) {
    return {
      framework: 'GCE V3.0',
      technicalLabel: 'TECHNICAL FAIL',
      musicalLabel: 'human audition still required',
      musicallyApproved: false,
      candidateForAudition: false,
      notes: ['Source locks, metre, tempo, rehearsal marks, or reimport failed.', ...notes],
    };
  }
  if (!input.predicatesOk || !input.feasibilityOk) {
    return {
      framework: 'GCE V3.0',
      technicalLabel: 'technical checks passed',
      musicalLabel: 'MUSICAL REVISE',
      musicallyApproved: false,
      candidateForAudition: false,
      notes: ['Phrase, rhythm, or guitar-feasibility checks still need a revision.', ...notes],
    };
  }
  if (!input.guitarChanged) {
    return {
      framework: 'GCE V3.0',
      technicalLabel: 'technical checks passed',
      musicalLabel: 'MUSICAL REVISE',
      musicallyApproved: false,
      candidateForAudition: false,
      notes: ['Generated guitar matches the source guitar in the writable bars.', ...notes],
    };
  }
  if (input.world) {
    return {
      framework: 'GCE V3.0',
      technicalLabel: 'technical checks passed',
      musicalLabel: 'CANDIDATE FOR AUDITION',
      musicallyApproved: false,
      candidateForAudition: true,
      notes: ['Locks, phrase checks, and guitar feasibility passed. Listening is still required.', ...notes],
    };
  }
  return {
    framework: 'GCE V3.0',
    technicalLabel: 'technical checks passed',
    musicalLabel: 'human audition still required',
    musicallyApproved: false,
    candidateForAudition: false,
    notes,
  };
}

export function apiBhlDefaults(): BhlDefaultsResponse {
  const sourcePath = bhlWrongTurningPath();
  return {
    ok: true,
    sourcePath,
    sourceExists: fs.existsSync(sourcePath),
    exportDir: bhlExportDir(),
    span: { from: 33, to: 40 },
  };
}

export function apiBhlInspect(body: unknown): BhlInspectResponse | BhlApiFailure {
  try {
    const o = asRecord(body);
    const source = sourceOrDefault(o.sourcePath);
    if (typeof source !== 'string') return source;
    const xml = fs.readFileSync(source, 'utf8');
    const barCount = barCountOf(xml);
    const span = readSpan(o.span, defaultBhlSpan(source, barCount));
    if ('ok' in span) return span;
    const protectedGuitarBars = readProtected(o.protectedGuitarBars);
    if (!Array.isArray(protectedGuitarBars)) return protectedGuitarBars;
    const lock = ingestBhlSource({ sourcePath: source, span, protectedGuitarBars });
    const doc = parseScoreDocument(xml);
    const names = partNames(doc);
    const plan = composePlan(lock, o.seed);
    const tempo = lock.tempos[0];
    return {
      ok: true,
      sourcePath: source,
      sourceSha256: lock.sourceSha256,
      guitarPartId: lock.guitarPartId,
      bassPartId: lock.bassPartId,
      guitarName: names.get(lock.guitarPartId) ?? lock.guitarPartId,
      bassName: names.get(lock.bassPartId) ?? lock.bassPartId,
      barCount,
      span,
      metres: lock.metres.map((metre) => ({
        partId: metre.partId,
        bar: metre.bar,
        beats: metre.beats,
        beatType: metre.beatType,
        stated: metre.stated,
      })),
      tempo: tempo
        ? { beatUnit: tempo.beatUnit, perMinute: tempo.perMinute, statedAtBar: tempo.statedAtBar }
        : null,
      rehearsal: lock.rehearsal.map((mark) => ({ partId: mark.partId, bar: mark.bar, text: mark.text })),
      bassEventCount: lock.bass.length,
      protectedGuitarBars,
      plan,
      fieldChoices: fieldMap(plan),
      worlds: BHL_WORLDS,
      seedStoredOnly: false,
      evidence: readBhlEvidence(xml, span),
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function musicalEvidenceOf(
  sourceXml: string,
  writtenXml: string,
  span: BhlSpan,
  plan: BhlPhrasePlan,
  limitations: BhlComposeResponse['musicalEvidence']['limitations'],
  fieldNotes: BhlFieldNote[],
): BhlComposeResponse['musicalEvidence'] {
  const original = readBhlEvidence(sourceXml, span);
  const candidate = readBhlEvidence(writtenXml, span);
  return {
    original,
    candidate,
    comparison: compareBhlEvidence(original, candidate),
    intentions: auditBhlIntentions(writtenXml, plan),
    limitations,
    fieldNotes,
    provisional: true,
  };
}

function composePlan(lock: ReturnType<typeof ingestBhlSource>, seedRaw: unknown): BhlPhrasePlan {
  const seed = intField(seedRaw) ?? 3340;
  return deriveBhlPhrasePlan(lock.bass, lock.metres, lock.bassPartId, lock.span, seed);
}

export function apiBhlCompose(body: unknown): BhlComposeResponse | BhlApiFailure {
  try {
    const o = asRecord(body);
    const source = sourceOrDefault(o.sourcePath);
    if (typeof source !== 'string') return source;
    const before = sha256File(source);
    const xml = fs.readFileSync(source, 'utf8');
    const barCount = barCountOf(xml);
    const span = readSpan(o.span, defaultBhlSpan(source, barCount));
    if ('ok' in span) return span;
    const protectedGuitarBars = readProtected(o.protectedGuitarBars);
    if (!Array.isArray(protectedGuitarBars)) return protectedGuitarBars;
    const seed = intField(o.seed) ?? 3340;
    const lock = ingestBhlSource({ sourcePath: source, span, protectedGuitarBars });
    const derived = composePlan(lock, seed);
    const musical = readMusical(o.musical);
    if (musical && 'ok' in musical) return musical;
    const prepared = prepareBhlMusic(derived, musical);
    const controlled = applyControls(prepared.plan, o.regions);
    if ('ok' in controlled) return controlled;
    const world = o.world === undefined || o.world === null || o.world === '' ? undefined : o.world;
    if (world !== undefined && !isBhlWorldId(world)) return fail(`harmonic world ${String(world)} is not one of A–F`);
    const phraseArc =
      o.phraseArc === undefined || o.phraseArc === null || o.phraseArc === ''
        ? prepared.phraseArc ?? 'derived'
        : o.phraseArc;
    if (!ARCS.includes(phraseArc as BhlPhraseArc)) return fail(`phrase arc ${String(phraseArc)} is not available`);
    const rhythm = o.rhythm === undefined || o.rhythm === null || o.rhythm === '' ? prepared.rhythm ?? 'derived' : o.rhythm;
    if (!RHYTHMS.includes(rhythm as BhlRhythmMode)) return fail(`rhythm ${String(rhythm)} is not available`);
    const continuationRaw =
      o.continuation === undefined || o.continuation === null || o.continuation === ''
        ? prepared.continuation ?? 'hold'
        : o.continuation;
    const continued = applyContinuation(controlled, continuationRaw, o.outsideColour === true);
    if ('ok' in continued) return continued;
    continued.seed = seed;
    const quartal = o.quartal === true || (o.quartal == null && prepared.quartal);
    const written = composeBhlGuitar({
      sourcePath: source,
      span,
      seed,
      protectedGuitarBars,
      plan: continued,
      world: world as BhlWorldId | undefined,
      phraseArc: phraseArc as BhlPhraseArc,
      rhythm: rhythm as BhlRhythmMode,
      pentatonicPcs: prepared.pentatonicPcs,
      quartal,
    });
    const after = sha256File(source);
    const writable: number[] = [];
    for (let bar = span.from; bar <= span.to; bar++) {
      if (!protectedGuitarBars.includes(bar)) writable.push(bar);
    }
    const sourceGuitar = extractBhlSnapshot(xml, { span, protectedGuitarBars: writable }).guitar;
    const sourceSig = sourceGuitar
      .filter((event) => !event.rest)
      .map((event) => `${event.bar}@${event.onsetQuarters}:${[...event.midis].sort((a, b) => a - b).join('.')}`)
      .join('|');
    const nextSig = written.events
      .map((event) => `${event.bar}@${event.onsetQuarters}:${[...event.midis].sort((a, b) => a - b).join('.')}`)
      .join('|');
    const guitarChanged = sourceSig !== nextSig;
    const predicatesOk = written.predicates.every((item) => item.ok);
    const feasibilityOk = written.feasibility.every((note) => note.feasible);
    return {
      ok: true,
      sourcePath: source,
      sourceSha256: before,
      sourceUnchanged: after === before && written.sourceSha256 === before,
      seed,
      span,
      protectedGuitarBars,
      plan: written.plan,
      fieldChoices: fieldMap(derived),
      events: written.events,
      snaps: written.snaps,
      predicates: written.predicates,
      feasibility: written.feasibility,
      harmony: written.harmony,
      verification: written.verification,
      outsideIdentical: written.outsideIdentical,
      guitarChanged,
      xml: written.xml,
      gce: gceEvidence({
        verificationOk: written.verification.ok && written.outsideIdentical && after === before,
        predicatesOk,
        feasibilityOk,
        guitarChanged,
        world: Boolean(written.world),
      }),
      world: written.world?.worldId ?? null,
      worldName: written.world?.worldName ?? null,
      resource: written.world?.resource ?? null,
      worldPitchClasses: written.world?.pitchClasses ?? [],
      commonToneRetentions: written.world?.commonToneRetentions ?? 0,
      contrastingMoves: written.world?.contrastingMoves ?? 0,
      binder: written.binder,
      musicalEvidence: musicalEvidenceOf(xml, written.xml, span, written.plan, written.limitations, written.fieldNotes),
      profileId: prepared.profile?.id ?? null,
      pentatonicLabel: prepared.pentatonicLabel,
      motifSource: prepared.motif?.source ?? null,
      quartalApplied: written.quartalApplied,
      quartalNote: written.quartalNote,
      resourceLimitations: prepared.limitations,
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export function apiBhlExport(body: unknown): BhlExportResponse | BhlApiFailure {
  try {
    const o = asRecord(body);
    const source = sourceOrDefault(o.sourcePath);
    if (typeof source !== 'string') return source;
    const xml = typeof o.xml === 'string' ? o.xml : '';
    if (!xml.includes('<score-partwise') && !xml.includes('<score-timewise')) return fail('export needs the generated MusicXML');
    const span = readSpan(o.span, { from: 1, to: 1 });
    if ('ok' in span) return span;
    const protectedGuitarBars = readProtected(o.protectedGuitarBars);
    if (!Array.isArray(protectedGuitarBars)) return protectedGuitarBars;
    const expected = typeof o.sourceSha256 === 'string' ? o.sourceSha256 : '';
    const live = sha256File(source);
    if (expected && live !== expected) return fail('source SHA-256 changed before export');
    const sourceXml = fs.readFileSync(source, 'utf8');
    const lock = ingestBhlSource({ sourcePath: source, span, protectedGuitarBars });
    const verification = verifyBhlLocks(sourceXml, xml, lockSpecOf(lock));
    if (!verification.ok) return fail(verification.errors.join('; ') || 'locks failed');
    const seed = intField(o.seed) ?? 3340;
    const dir = bhlExportDir();
    const base = path.basename(source, path.extname(source)).replace(/[^A-Za-z0-9._-]+/g, '-');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputPath = path.join(dir, `${base}-BHL-GUI-seed${seed}-${stamp}.musicxml`);
    assertBhlExportPath({ sourcePath: source, outputPath, permittedOutputDir: dir });
    fs.writeFileSync(outputPath, presentBhlScore(xml), { flag: 'wx' });
    if (sha256File(source) !== live) return fail('source SHA-256 changed during export');
    return {
      ok: true,
      outputPath,
      bytes: fs.statSync(outputPath).size,
      sourceSha256: live,
      sourceUnchanged: true,
      verification,
    };
  } catch (error) {
    if (error instanceof BhlExportRejected) return fail(error.message);
    return fail(error instanceof Error ? error.message : String(error));
  }
}

function sibeliusApp(): string | null {
  if (process.platform !== 'darwin') return null;
  const candidates = ['/Applications/Sibelius.app', '/Applications/Sibelius Ultimate.app'];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

export function apiBhlOpen(body: unknown): BhlOpenResponse | BhlApiFailure {
  try {
    const o = asRecord(body);
    const outputPath = typeof o.outputPath === 'string' ? path.resolve(o.outputPath) : '';
    if (!outputPath) return fail('outputPath is required');
    const dir = bhlExportDir();
    const relative = path.relative(path.resolve(dir), outputPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return fail('open is limited to the BHL export directory');
    if (BHL_ALBUM_ROOT && outputPath.startsWith(path.resolve(BHL_ALBUM_ROOT))) {
      return fail('refusing to open a file inside the album tree');
    }
    if (!fs.existsSync(outputPath)) return fail(`export not found: ${outputPath}`);
    const sib = sibeliusApp();
    const args = sib ? ['-a', sib, outputPath] : [outputPath];
    const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const finalArgs = process.platform === 'win32' ? ['/c', 'start', '', outputPath] : args;
    const child = spawn(command, finalArgs, { detached: true, stdio: 'ignore' });
    child.unref();
    return { ok: true, outputPath, openedWith: sib ? 'Sibelius' : command };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export function apiBhlCatalog(): { ok: true; catalog: ReturnType<typeof bhlResourceCatalog> } {
  return { ok: true, catalog: bhlResourceCatalog() };
}

function prepareLocked(body: Record<string, unknown>) {
  const source = sourceOrDefault(body.sourcePath);
  if (typeof source !== 'string') return source;
  const xml = fs.readFileSync(source, 'utf8');
  const span = readSpan(body.span, defaultBhlSpan(source, barCountOf(xml)));
  if ('ok' in span) return span;
  const protectedGuitarBars = readProtected(body.protectedGuitarBars);
  if (!Array.isArray(protectedGuitarBars)) return protectedGuitarBars;
  const seed = intField(body.seed) ?? 3340;
  const world = body.world;
  if (!isBhlWorldId(world)) return fail(`harmonic world ${String(world)} is not one of A–F`);
  const musical = readMusical(body.musical);
  if (musical && 'ok' in musical) return musical;
  const lock = ingestBhlSource({ sourcePath: source, span, protectedGuitarBars });
  const prepared = prepareBhlMusic(composePlan(lock, seed), musical);
  const controlled = applyControls(prepared.plan, body.regions);
  if ('ok' in controlled) return controlled;
  const phraseArc = body.phraseArc === undefined || body.phraseArc === null || body.phraseArc === '' ? prepared.phraseArc ?? 'derived' : body.phraseArc;
  if (!ARCS.includes(phraseArc as BhlPhraseArc)) return fail(`phrase arc ${String(phraseArc)} is not available`);
  const rhythm = body.rhythm === undefined || body.rhythm === null || body.rhythm === '' ? prepared.rhythm ?? 'derived' : body.rhythm;
  if (!RHYTHMS.includes(rhythm as BhlRhythmMode)) return fail(`rhythm ${String(rhythm)} is not available`);
  const quartal = body.quartal === true || (body.quartal == null && prepared.quartal);
  return {
    source,
    span,
    seed,
    world,
    protectedGuitarBars,
    plan: controlled,
    musical,
    phraseArc: phraseArc as BhlPhraseArc,
    rhythm: rhythm as BhlRhythmMode,
    pentatonicPcs: prepared.pentatonicPcs,
    quartal,
    prepared,
  };
}

export function apiBhlCandidates(body: unknown): { ok: true; candidates: BhlProjectV1['candidates'] } | BhlApiFailure {
  try {
    const locked = prepareLocked(asRecord(body));
    if ('ok' in locked) return locked;
    const set = generateBhlCandidateSet({
      sourcePath: locked.source,
      span: locked.span,
      seed: locked.seed,
      world: locked.world,
      plan: locked.plan,
      musical: locked.musical,
      rhythm: locked.rhythm,
      phraseArc: locked.phraseArc,
      pentatonicPcs: locked.pentatonicPcs,
      quartal: locked.quartal,
      protectedGuitarBars: locked.protectedGuitarBars,
    });
    return { ok: true, candidates: set.candidates };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export function apiBhlRefine(body: unknown): { ok: true; original: BhlProjectV1['candidates'][number]; refined: BhlProjectV1['candidates'][number] } | BhlApiFailure {
  try {
    const o = asRecord(body);
    const locked = prepareLocked(o);
    if ('ok' in locked) return locked;
    const original = o.original;
    if (!original || typeof original !== 'object') return fail('original candidate is required');
    const row = original as BhlProjectV1['candidates'][number];
    if (typeof row.xml !== 'string' || typeof row.id !== 'string') return fail('original candidate needs id and xml');
    const refined = refineBhlCandidate({
      sourcePath: locked.source,
      span: locked.span,
      world: locked.world,
      plan: locked.plan,
      original: row,
      musical: locked.musical,
      rhythm: locked.rhythm,
      phraseArc: locked.phraseArc,
      pentatonicPcs: locked.pentatonicPcs,
      quartal: locked.quartal,
      protectedGuitarBars: locked.protectedGuitarBars,
      seed: intField(o.seed) ?? undefined,
    });
    return { ok: true, original: row, refined };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export function apiBhlCompare(body: unknown): { ok: true; left: Record<string, unknown>; right: Record<string, unknown>; comparison: ReturnType<typeof compareBhlCandidateXml>['comparison'] } | BhlApiFailure {
  try {
    const o = asRecord(body);
    const leftXml = typeof o.leftXml === 'string' ? o.leftXml : '';
    const rightXml = typeof o.rightXml === 'string' ? o.rightXml : '';
    if (!leftXml.includes('<score-partwise') || !rightXml.includes('<score-partwise')) {
      return fail('compare needs the stored MusicXML for both candidates');
    }
    const span = readSpan(o.span, { from: 1, to: 1 });
    if ('ok' in span) return span;
    const compared = compareBhlCandidateXml(leftXml, rightXml, span);
    return { ok: true, ...compared };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export function apiBhlSaveProject(body: unknown): { ok: true; path: string; bytes: number } | BhlApiFailure {
  try {
    const o = asRecord(body);
    const project = o.project;
    if (!project || typeof project !== 'object') return fail('project is required');
    const row = project as BhlProjectV1;
    const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : '';
    if (!id) return fail('project.id is required');
    const requested = typeof o.path === 'string' && o.path.trim() ? o.path.trim() : path.join(bhlExportDir(), 'projects', `${id}.bhl.json`);
    const filePath = underExport(requested);
    if (typeof filePath !== 'string') return filePath;
    const overwrite = o.overwrite === true;
    const saved = saveBhlProject(filePath, { ...row, savedAt: row.savedAt || new Date().toISOString() }, overwrite);
    return { ok: true, path: saved.path, bytes: saved.bytes };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export function apiBhlOpenProject(body: unknown): { ok: true; path: string; project: BhlProjectV1 } | BhlApiFailure {
  try {
    const o = asRecord(body);
    const requested = typeof o.path === 'string' ? o.path.trim() : '';
    if (!requested) return fail('path is required');
    const filePath = underExport(requested);
    if (typeof filePath !== 'string') return filePath;
    const loaded = loadBhlProject(filePath);
    if (!loaded.ok || !loaded.project) return fail(loaded.errors.join('; ') || 'invalid project');
    return { ok: true, path: filePath, project: loaded.project };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}

export function apiBhlScratch(body: unknown): { ok: true; sourcePath: string; sha256: string; bars: number; span: { from: number; to: number }; sections: ReturnType<typeof buildBhlScratchScore>['sections']; xml: string } | BhlApiFailure {
  try {
    const o = asRecord(body);
    const bars = intField(o.bars) ?? 16;
    const beats = intField(o.beats) ?? 4;
    const beatType = intField(o.beatType) ?? 4;
    const tempo = intField(o.tempo) ?? 92;
    const seed = intField(o.seed) ?? 4400;
    const title = typeof o.title === 'string' ? o.title : 'BHL from scratch';
    const score = buildBhlScratchScore({ bars, beats, beatType, tempo, seed, title });
    const safe = title.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'bhl-scratch';
    const filePath = path.join(bhlExportDir(), 'scratch', `${safe}-seed${seed}-${bars}bars.musicxml`);
    const checked = underExport(filePath);
    if (typeof checked !== 'string') return checked;
    if (fs.existsSync(checked) && o.overwrite !== true) return fail(`scratch score already exists: ${checked}`);
    writeBhlScratchScore(checked, { bars, beats, beatType, tempo, seed, title }, o.overwrite === true);
    return {
      ok: true,
      sourcePath: checked,
      sha256: score.sha256,
      bars: score.bars,
      span: { from: 1, to: score.bars },
      sections: score.sections,
      xml: score.xml,
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
}
