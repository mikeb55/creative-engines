/**
 * E2 source bundle. Opt-in strict canonical read, frozen anchors, explicit selection.
 * Does not call readSource() or orchestrate().
 */

import fs from 'node:fs';
import path from 'node:path';
import { formatRational, qEq, type Rational } from '../bhl/bhlEvidence';
import {
  ingestCanonicalScore,
  sha256Text,
  type CanonicalDirection,
  type CanonicalEvaluationScore,
  type CanonicalEvent,
  type CanonicalHarmonyMark,
  type CanonicalMeasure,
} from '../musical-evaluation/canonicalScore';
import { exportResolution, type ExactQuarter } from '../piano/pianoExactTiming';

export const E2_SOURCE_FOUNDATION_VERSION = 'e2-source-foundation-1';

export const BLOCKING_UNSUPPORTED = [
  'grace',
  'cue',
  'microtone',
  'mixed-denominator',
  'senza-misura',
  'ambiguous-tie',
  'orphan-tie',
  'nested-tuplet',
  'diatonic-transpose',
  'pickup-span-disagreement',
  'mid-measure-divisions',
  'mid-measure-time',
  'mid-measure-attribute',
  'navigation-mark',
  'unpitched',
  'duration',
  'time-signature',
] as const;

export interface SourceAnchor {
  documentSha256: string;
  partId: string;
  measureOrdinal: number;
  noteOrdinal: number;
  originalXmlId?: string;
}

export interface EventOperation {
  id: string;
  version: string;
  parametersHash: string;
}

export interface EventLineage {
  eventId: string;
  origin: 'source' | 'derived' | 'generated';
  sourceEventIds: readonly string[];
  parentEventIds: readonly string[];
  operation?: EventOperation;
  seed?: number;
}

export interface SourceRecord {
  anchor: SourceAnchor;
  canonical: CanonicalEvent;
  lineage: EventLineage;
  sourceFragmentHash: string;
  tieChainId?: string;
  tupletGroupIds: readonly string[];
}

export interface SourceSelection {
  partId: string;
  staff?: string | null;
  voice?: string | null;
}

export interface SourceBundle {
  version: typeof E2_SOURCE_FOUNDATION_VERSION;
  filename: string | null;
  sha256: string;
  bytesPreserved: true;
  semanticsUnderstood: boolean;
  score: CanonicalEvaluationScore;
  records: readonly SourceRecord[];
  importOperation: EventOperation;
}

export class E2ExportRejected extends Error {
  readonly reason: 'overwrites-source' | 'outside-permitted-output';

  constructor(reason: 'overwrites-source' | 'outside-permitted-output', message: string) {
    super(message);
    this.name = 'E2ExportRejected';
    this.reason = reason;
  }
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const key of Object.keys(value as object)) deepFreeze((value as Record<string, unknown>)[key]);
  return Object.freeze(value);
}

function canonicalPath(filePath: string): string {
  const resolved = path.resolve(filePath);
  try {
    return fs.realpathSync(resolved);
  } catch {
    const parent = path.dirname(resolved);
    try {
      return path.join(fs.realpathSync(parent), path.basename(resolved));
    } catch {
      return resolved;
    }
  }
}

function inside(parent: string, child: string): boolean {
  const root = canonicalPath(parent);
  const target = canonicalPath(child);
  if (target === root) return true;
  const relative = path.relative(root, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export function parametersHash(parameters: unknown): string {
  return sha256Text(stableJson(parameters));
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).filter((key) => key !== 'generatedAt').sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function fragmentHash(event: CanonicalEvent): string {
  return sha256Text([
    event.partId,
    event.staff ?? '',
    event.voice,
    String(event.noteOrdinal ?? ''),
    event.xmlId ?? '',
    formatRational(event.onset),
    formatRational(event.duration),
    event.rest ? 'rest' : `${event.written?.step ?? ''}${event.written?.alter ?? ''}${event.written?.octave ?? ''}`,
    event.tieStart ? 'tie-start' : '',
    event.tieStop ? 'tie-stop' : '',
  ].join('|'));
}

export function captureSource(xml: string, filename: string | null = null): SourceBundle {
  const imported = ingestCanonicalScore(xml, { strictSource: true });
  if (!imported.score || imported.parseError) {
    throw new Error(imported.parseError ?? 'strict source parse failed');
  }
  const operation: EventOperation = {
    id: 'e2-strict-import',
    version: E2_SOURCE_FOUNDATION_VERSION,
    parametersHash: parametersHash({ strictSource: true }),
  };
  const records = imported.score.sourceEvents.map((event) => {
    const anchor: SourceAnchor = {
      documentSha256: imported.sha256,
      partId: event.partId,
      measureOrdinal: event.bar,
      noteOrdinal: event.noteOrdinal ?? 0,
      ...(event.xmlId ? { originalXmlId: event.xmlId } : {}),
    };
    const lineage: EventLineage = {
      eventId: event.id,
      origin: 'source',
      sourceEventIds: [event.id],
      parentEventIds: [],
      operation,
    };
    return {
      anchor,
      canonical: event,
      lineage,
      sourceFragmentHash: fragmentHash(event),
      ...(event.tieChainId ? { tieChainId: event.tieChainId } : {}),
      tupletGroupIds: event.tupletGroupId ? [event.tupletGroupId] : [],
    };
  });
  const blocking = imported.score.unsupported.some((item) => (BLOCKING_UNSUPPORTED as readonly string[]).includes(item.kind));
  return deepFreeze({
    version: E2_SOURCE_FOUNDATION_VERSION,
    filename,
    sha256: imported.sha256,
    bytesPreserved: true,
    semanticsUnderstood: !blocking,
    score: imported.score,
    records,
    importOperation: operation,
  });
}

export function selectSourceEvents(bundle: SourceBundle, selections: readonly SourceSelection[]): readonly SourceRecord[] {
  if (!selections.length) return [];
  return bundle.records.filter((record) => selections.some((selection) => {
    if (selection.partId !== record.canonical.partId) return false;
    if (selection.staff !== undefined && selection.staff !== record.canonical.staff) return false;
    if (selection.voice !== undefined && selection.voice !== record.canonical.voice) return false;
    return true;
  }));
}

export function assertE2ExportPath(sourcePath: string, outputPath: string, permittedOutputDir: string): void {
  const source = canonicalPath(sourcePath);
  const output = canonicalPath(outputPath);
  if (output === source) {
    throw new E2ExportRejected('overwrites-source', `refusing to export over source ${source}`);
  }
  if (!inside(permittedOutputDir, output) || output === canonicalPath(permittedOutputDir)) {
    throw new E2ExportRejected('outside-permitted-output', `refusing to write ${output} outside ${canonicalPath(permittedOutputDir)}`);
  }
}

export interface SourceSidecar {
  version: 'e2-source-sidecar-1';
  documentSha256: string;
  semanticsUnderstood: boolean;
  anchors: readonly SourceAnchor[];
  measures: readonly Pick<CanonicalMeasure, 'bar' | 'partId' | 'beats' | 'beatType' | 'pickup' | 'beatGroups' | 'advance'>[];
  harmony: readonly CanonicalHarmonyMark[];
  directions: readonly CanonicalDirection[];
}

export function sourceSidecar(bundle: SourceBundle): SourceSidecar {
  return {
    version: 'e2-source-sidecar-1',
    documentSha256: bundle.sha256,
    semanticsUnderstood: bundle.semanticsUnderstood,
    anchors: bundle.records.map((record) => record.anchor),
    measures: bundle.score.measures.map((measure) => ({
      bar: measure.bar,
      partId: measure.partId,
      beats: measure.beats,
      beatType: measure.beatType,
      pickup: measure.pickup,
      beatGroups: measure.beatGroups,
      advance: measure.advance,
    })),
    harmony: bundle.score.harmony,
    directions: bundle.score.directions,
  };
}

export type ProvenanceRecovery =
  | { status: 'exact'; pairs: readonly { sourceId: string; candidateId: string }[] }
  | { status: 'provenance-unverified'; reason: string };

function identitySignature(event: CanonicalEvent): string {
  const pitch = event.rest || !event.written
    ? 'rest'
    : `${event.written.step}${event.written.alter}${event.written.octave}`;
  return [
    event.partId,
    event.staff ?? '',
    event.voice,
    formatRational(event.onset),
    formatRational(event.duration),
    pitch,
  ].join('|');
}

export function recoverProvenance(bundle: SourceBundle, xml: string): ProvenanceRecovery {
  let candidate: SourceBundle;
  try {
    candidate = captureSource(xml);
  } catch (error) {
    return { status: 'provenance-unverified', reason: error instanceof Error ? error.message : String(error) };
  }
  const sourceIds = bundle.records.map((record) => record.canonical.xmlId).filter((id): id is string => Boolean(id));
  const candidateIds = candidate.records.map((record) => record.canonical.xmlId).filter((id): id is string => Boolean(id));
  const sourceUnique = new Set(sourceIds).size === sourceIds.length && sourceIds.length === bundle.records.length;
  const candidateByXml = new Map(candidate.records.map((record) => [record.canonical.xmlId, record]));
  if (sourceUnique && candidateIds.length === candidate.records.length) {
    const pairs = [];
    for (const record of bundle.records) {
      const hit = candidateByXml.get(record.canonical.xmlId);
      if (!hit || hit.canonical.xmlId !== record.canonical.xmlId) {
        return { status: 'provenance-unverified', reason: `missing xml id ${record.canonical.xmlId ?? record.canonical.id}` };
      }
      pairs.push({ sourceId: record.canonical.id, candidateId: hit.canonical.id });
    }
    return { status: 'exact', pairs };
  }
  const counts = new Map<string, number>();
  for (const record of bundle.records) {
    const key = identitySignature(record.canonical);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if ([...counts.values()].some((count) => count > 1)) {
    return { status: 'provenance-unverified', reason: 'repeated notes have no xml id; identity is ambiguous' };
  }
  const used = new Set<string>();
  const pairs = [];
  for (const record of bundle.records) {
    const key = identitySignature(record.canonical);
    const hits = candidate.records.filter((item) => identitySignature(item.canonical) === key && !used.has(item.canonical.id));
    if (hits.length !== 1) {
      return { status: 'provenance-unverified', reason: `no unambiguous match for ${record.canonical.id}` };
    }
    used.add(hits[0]!.canonical.id);
    pairs.push({ sourceId: record.canonical.id, candidateId: hits[0]!.canonical.id });
  }
  return { status: 'exact', pairs };
}

export function refuseProtectedMutation(): { ok: false; reason: 'protected-source-mutation' } {
  return { ok: false, reason: 'protected-source-mutation' };
}

export function ppqExport(values: readonly Rational[]): { ppq: 480 } | { error: string; required: number } {
  return exportResolution(values as readonly ExactQuarter[]);
}

export function sameRational(left: Rational | undefined, right: Rational | undefined): boolean {
  if (!left || !right) return left === right;
  return qEq(left, right);
}
