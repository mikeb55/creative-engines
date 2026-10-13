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
  type BhlPitchTransform,
  type BhlPredicateResult,
} from '../core/bhl/bhlPhrase';
import type { BhlLockReport, BhlSpan } from '../core/bhl/bhlTypes';
import type { BhlHarmonyChange } from '../core/bhl/bhlWrite';
import { verifyBhlLocks } from '../core/bhl/bhlVerify';
import { parseScoreDocument, partElements, partNames } from '../core/performance-composer/pcScore';

const DIALOGUES: readonly BhlDialogue[] = [
  'answer-after-bass',
  'counter-motion',
  'leave-space',
  'handoff-before-bass',
];
const DENSITIES: readonly BhlDensity[] = ['dyad', 'single', 'alternate'];
const PITCHES: readonly BhlPitchTransform[] = [
  'neighbor-statement',
  'invert-into-field',
  'reproject-neighbor',
  'recall-cell',
  'retain-and-admit-bass',
];

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
  /** Stored on the plan. This planner repeats one guitar for one locked passage and these controls. */
  seedStoredOnly: true;
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
      seedStoredOnly: true,
    };
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }
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
    const plan = applyControls(derived, o.regions);
    if ('ok' in plan) return plan;
    plan.seed = seed;
    const written = composeBhlGuitar({
      sourcePath: source,
      span,
      seed,
      protectedGuitarBars,
      plan,
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
      }),
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
    fs.writeFileSync(outputPath, xml, { flag: 'wx' });
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
