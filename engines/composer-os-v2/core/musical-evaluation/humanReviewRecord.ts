/**
 * BMEF-100 V2.0 human review record.
 * The machine stores what a person typed. It does not rate, total, or decide.
 */

import fs from 'node:fs';
import path from 'node:path';
import { resolveComposerLibraryRoot } from '../../app-api/composerOsOutputPaths';
import {
  BMEF_CORE,
  BMEF_DECISIONS,
  BMEF_GATES,
  BMEF_MODULE_J,
  BMEF_VERSION,
} from './bmefCatalog';
import type { EvidenceReceipt, ScoreDifference } from './service';

export const HUMAN_REVIEW_VERSION = 'bmef-human-review-1';

const EVIDENCE = ['E1', 'E2', 'E3', 'A'] as const;
const CONFIDENCE = ['Low', 'Medium', 'High'] as const;

export type HumanEvidence = (typeof EVIDENCE)[number];
export type HumanConfidence = (typeof CONFIDENCE)[number];
export type HumanDecision = (typeof BMEF_DECISIONS)[number];

export interface HumanRating {
  criterion: string;
  name: string;
  weight: number;
  weightStatus: 'proposed';
  layer: 'core' | 'module';
  rating: number | null;
  evidence: HumanEvidence | null;
  confidence: HumanConfidence | null;
  bars: string;
  notes: string;
  evidenceRefs: string[];
}

export interface HumanReviewRecord {
  recordVersion: typeof HUMAN_REVIEW_VERSION;
  bmefVersion: typeof BMEF_VERSION;
  weightStatus: 'proposed';
  thresholdStatus: 'proposed';
  weightNotice: string;
  source: { label: string; sha256: string };
  receiptSha256: string;
  metricVersions: string[];
  gates: Record<'G1' | 'G2' | 'G3' | 'G4', 'pass' | 'fail' | null>;
  ratings: HumanRating[];
  decision: HumanDecision | null;
  decisionSource: 'human' | null;
  notes: string;
  outstandingChecks: string[];
  e2Available: false;
  e3Available: false;
  e2Notice: string;
  e3Notice: string;
  machineArtisticScore: null;
  machineDecision: null;
  coreTotal: null;
  moduleTotal: null;
  combinedTotal: null;
  comparison: { labels: string[]; differenceCount: number; rank: null; differences: ScoreDifference[] } | null;
  receipt: EvidenceReceipt;
}

export interface HumanReviewPatch {
  gates?: Partial<HumanReviewRecord['gates']>;
  ratings?: Array<Partial<HumanRating> & { criterion: string }>;
  decision?: HumanDecision | null;
  notes?: string;
  outstandingChecks?: string[];
  coreTotal?: unknown;
  moduleTotal?: unknown;
  combinedTotal?: unknown;
  machineArtisticScore?: unknown;
  machineDecision?: unknown;
}

const WEIGHT_NOTICE = 'BMEF-100 V2.0 weights, thresholds, and confidence caps are proposed. This program does not apply them and does not total a score.';

function blankRating(criterion: { id: string; name: string; weight: number; layer: 'core' | 'module' }): HumanRating {
  return {
    criterion: criterion.id,
    name: criterion.name,
    weight: criterion.weight,
    weightStatus: 'proposed',
    layer: criterion.layer,
    rating: null,
    evidence: null,
    confidence: null,
    bars: '',
    notes: '',
    evidenceRefs: [],
  };
}

function metricVersions(receipt: EvidenceReceipt): string[] {
  const versions = new Set<string>();
  for (const block of receipt.structural) {
    for (const finding of block.findings) versions.add(`${finding.metricId}@${finding.metricVersion}`);
  }
  return [...versions].sort();
}

export function createHumanReview(input: {
  label?: string;
  receipt: EvidenceReceipt;
  comparison?: { labels: string[]; differenceCount: number; differences?: ScoreDifference[] } | null;
}): HumanReviewRecord {
  const score = input.receipt.scores[0];
  return {
    recordVersion: HUMAN_REVIEW_VERSION,
    bmefVersion: BMEF_VERSION,
    weightStatus: 'proposed',
    thresholdStatus: 'proposed',
    weightNotice: WEIGHT_NOTICE,
    source: { label: input.label?.trim() || score?.label || 'score', sha256: score?.sha256 ?? '' },
    receiptSha256: input.receipt.receiptSha256,
    metricVersions: metricVersions(input.receipt),
    gates: { G1: null, G2: null, G3: null, G4: null },
    ratings: [
      ...BMEF_CORE.map((criterion) => blankRating(criterion)),
      ...BMEF_MODULE_J.map((criterion) => blankRating(criterion)),
    ],
    decision: null,
    decisionSource: null,
    notes: '',
    outstandingChecks: ['Listening check not done.', 'Performance check not done.'],
    e2Available: false,
    e3Available: false,
    e2Notice: 'No audition recording is attached. E2 is missing.',
    e3Notice: 'No performance check is attached. E3 is missing.',
    machineArtisticScore: null,
    machineDecision: null,
    coreTotal: null,
    moduleTotal: null,
    combinedTotal: null,
    comparison: input.comparison
      ? { labels: input.comparison.labels, differenceCount: input.comparison.differenceCount, rank: null, differences: input.comparison.differences ?? [] }
      : null,
    receipt: input.receipt,
  };
}

function validRating(value: unknown): value is number | null {
  if (value === null) return true;
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  if (value < 1 || value > 10) return false;
  return Math.round(value * 2) === value * 2;
}

export function applyHumanReview(record: HumanReviewRecord, patch: HumanReviewPatch): HumanReviewRecord | { error: string } {
  if (patch.coreTotal != null || patch.moduleTotal != null || patch.combinedTotal != null || patch.machineArtisticScore != null || patch.machineDecision != null) {
    return { error: 'The evaluation record cannot store an artistic total or a machine decision.' };
  }
  const next: HumanReviewRecord = {
    ...record,
    gates: { ...record.gates },
    ratings: record.ratings.map((rating) => ({ ...rating, evidenceRefs: [...rating.evidenceRefs] })),
    machineArtisticScore: null,
    machineDecision: null,
    coreTotal: null,
    moduleTotal: null,
    combinedTotal: null,
    e2Available: false,
    e3Available: false,
  };
  if (patch.gates) {
    for (const gate of BMEF_GATES) {
      const value = patch.gates[gate.id];
      if (value === undefined) continue;
      if (value !== null && value !== 'pass' && value !== 'fail') return { error: `${gate.id} must be pass, fail, or empty` };
      next.gates[gate.id] = value;
    }
  }
  if (patch.ratings) {
    for (const row of patch.ratings) {
      const target = next.ratings.find((rating) => rating.criterion === row.criterion);
      if (!target) return { error: `unknown criterion ${row.criterion}` };
      if (row.rating !== undefined && !validRating(row.rating)) return { error: `${row.criterion} rating must be empty or a half-point from 1 to 10` };
      if (row.evidence !== undefined && row.evidence !== null && !EVIDENCE.includes(row.evidence)) return { error: `${row.criterion} evidence is not E1, E2, E3, or A` };
      if (row.confidence !== undefined && row.confidence !== null && !CONFIDENCE.includes(row.confidence)) return { error: `${row.criterion} confidence is not a human Low, Medium, or High mark` };
      if (row.rating !== undefined) target.rating = row.rating;
      if (row.evidence !== undefined) target.evidence = row.evidence;
      if (row.confidence !== undefined) target.confidence = row.confidence;
      if (row.bars !== undefined) target.bars = row.bars;
      if (row.notes !== undefined) target.notes = row.notes;
      if (row.evidenceRefs !== undefined) target.evidenceRefs = [...row.evidenceRefs];
      target.weightStatus = 'proposed';
    }
  }
  if (patch.decision !== undefined) {
    if (patch.decision !== null && !BMEF_DECISIONS.includes(patch.decision)) return { error: 'decision must be ACCEPT, REFINE, REJECT, FORK, or empty' };
    next.decision = patch.decision;
    next.decisionSource = patch.decision === null ? null : 'human';
  }
  if (patch.notes !== undefined) next.notes = patch.notes;
  if (patch.outstandingChecks !== undefined) next.outstandingChecks = [...patch.outstandingChecks];
  return next;
}

export function assertHumanReview(record: HumanReviewRecord): { ok: true } | { error: string } {
  if (record.recordVersion !== HUMAN_REVIEW_VERSION) return { error: 'unrecognised evaluation record' };
  if (record.machineArtisticScore !== null || record.machineDecision !== null) return { error: 'record contains a machine artistic decision' };
  if (record.coreTotal !== null || record.moduleTotal !== null || record.combinedTotal !== null) return { error: 'record contains an artistic total' };
  if (record.decision !== null && !BMEF_DECISIONS.includes(record.decision)) return { error: 'decision is not a human BMEF choice' };
  if (record.e2Available !== false || record.e3Available !== false) return { error: 'E2 and E3 data are not stored by this record' };
  if (record.weightStatus !== 'proposed' || record.thresholdStatus !== 'proposed') return { error: 'weights and thresholds must stay marked proposed' };
  for (const rating of record.ratings) {
    if (!validRating(rating.rating)) return { error: `${rating.criterion} rating is not a human half-point` };
    if (rating.weightStatus !== 'proposed') return { error: `${rating.criterion} weight is not marked proposed` };
  }
  return { ok: true };
}

export function evaluationRecordDir(libraryRoot?: string): string {
  return path.join(resolveComposerLibraryRoot(libraryRoot), 'Evaluation Records');
}

export function resolveEvaluationRecordPath(filePath: string, libraryRoot?: string): string | { error: string } {
  const resolved = path.resolve(filePath);
  const dir = path.resolve(evaluationRecordDir(libraryRoot));
  const relative = path.relative(dir, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return { error: 'path must stay inside Evaluation Records' };
  if (!resolved.endsWith('.evaluation.json')) return { error: 'path must be an .evaluation.json record' };
  return resolved;
}

export function saveHumanReviewFile(filePath: string, record: HumanReviewRecord, libraryRoot?: string, overwrite = false): { path: string; bytes: number } | { error: string } {
  const checked = assertHumanReview(record);
  if ('error' in checked) return checked;
  const resolved = resolveEvaluationRecordPath(filePath, libraryRoot);
  if (typeof resolved !== 'string') return resolved;
  const text = `${JSON.stringify(record, null, 2)}\n`;
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  if (fs.existsSync(resolved) && !overwrite) return { error: `record already exists: ${resolved}` };
  fs.writeFileSync(resolved, text, { flag: overwrite ? 'w' : 'wx' });
  return { path: resolved, bytes: Buffer.byteLength(text) };
}

export function loadHumanReviewFile(filePath: string, libraryRoot?: string): { record: HumanReviewRecord; path: string } | { error: string } {
  const resolved = resolveEvaluationRecordPath(filePath, libraryRoot);
  if (typeof resolved !== 'string') return resolved;
  let text: string;
  try {
    text = fs.readFileSync(resolved, 'utf8');
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  let parsed: HumanReviewRecord;
  try {
    parsed = JSON.parse(text) as HumanReviewRecord;
  } catch {
    return { error: 'evaluation record is not JSON' };
  }
  const checked = assertHumanReview(parsed);
  if ('error' in checked) return checked;
  return { record: parsed, path: resolved };
}
