/**
 * Dashboard API for the V3.1-B evaluation service.
 * Score loading is read-only. Human review records are a separate JSON file.
 */

import path from 'node:path';
import type { BhlLockSpec } from '../core/bhl/bhlTypes';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import {
  compareScores,
  describeScoreIdentity,
  evaluateScore,
  type EvaluationRequest,
  type EvidenceReceipt,
  type ScoreIdentity,
} from '../core/musical-evaluation/service';
import type { DeclaredField } from '../core/musical-evaluation/harmonicEvidence';
import {
  applyHumanReview,
  createHumanReview,
  evaluationRecordDir,
  loadHumanReviewFile,
  saveHumanReviewFile,
  type HumanReviewPatch,
  type HumanReviewRecord,
} from '../core/musical-evaluation/humanReviewRecord';

export interface EvaluationApiFailure {
  ok: false;
  error: string;
}

export interface EvaluationApiSuccess {
  ok: true;
  identity: ScoreIdentity;
  receipt: EvidenceReceipt;
  sourceWritten: false;
}

function asRecord(body: unknown): Record<string, unknown> {
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : {};
}

function declaredField(value: unknown): DeclaredField | undefined | EvaluationApiFailure {
  if (value == null) return undefined;
  if (!value || typeof value !== 'object') return { ok: false, error: 'declared field must be an object' };
  const row = value as Record<string, unknown>;
  const label = typeof row.label === 'string' ? row.label.trim() : '';
  const family = row.family;
  const pitchClasses = Array.isArray(row.pitchClasses) ? row.pitchClasses : null;
  if (!label) return { ok: false, error: 'declared field needs a label' };
  if (family !== 'pentatonic' && family !== 'hexatonic' && family !== 'bhl' && family !== 'wps' && family !== 'other') {
    return { ok: false, error: 'declared field family is not recognised' };
  }
  if (!pitchClasses || pitchClasses.some((item) => typeof item !== 'number' || !Number.isInteger(item))) {
    return { ok: false, error: 'declared field pitch classes must be integers' };
  }
  return { label, family, pitchClasses };
}

function lockSpec(row: Record<string, unknown>): EvaluationRequest['lock'] | undefined | EvaluationApiFailure {
  const baseline = typeof row.baselineXml === 'string' ? row.baselineXml : '';
  if (!baseline.trim()) return undefined;
  const source = ingestCanonicalScore(baseline);
  if (!source.score) return { ok: false, error: source.parseError ?? 'lock baseline did not parse' };
  const explicit = asRecord(row.lock);
  const bass = source.score.parts.find((part) => part.role === 'bass');
  const guitar = source.score.parts.find((part) => part.role === 'guitar');
  const bassPartId = typeof explicit.bassPartId === 'string' && explicit.bassPartId.trim() ? explicit.bassPartId.trim() : bass?.id;
  const guitarPartId = typeof explicit.guitarPartId === 'string' && explicit.guitarPartId.trim() ? explicit.guitarPartId.trim() : guitar?.id;
  if (!bassPartId || !guitarPartId) {
    return { ok: false, error: 'lock baseline needs a guitar part and a bass part' };
  }
  const bars = [...new Set(source.score.measures.map((measure) => measure.bar))].sort((a, b) => a - b);
  const spanFrom = typeof explicit.spanFrom === 'number' ? explicit.spanFrom : bars[0] ?? 1;
  const spanTo = typeof explicit.spanTo === 'number' ? explicit.spanTo : bars[bars.length - 1] ?? spanFrom;
  const protectedGuitarBars = Array.isArray(explicit.protectedGuitarBars)
    ? explicit.protectedGuitarBars.filter((item): item is number => typeof item === 'number')
    : [];
  const spec: BhlLockSpec = {
    span: { from: spanFrom, to: spanTo },
    bassPartId,
    guitarPartId,
    protectedGuitarBars,
  };
  return { sourceXml: baseline, spec };
}

export function apiEvaluateMusicalScore(body: unknown): EvaluationApiSuccess | EvaluationApiFailure {
  const row = asRecord(body);
  const xml = typeof row.xml === 'string' ? row.xml : '';
  if (!xml.trim()) return { ok: false, error: 'MusicXML is empty. Paste a score-partwise file or choose one. The file is not modified.' };
  const label = typeof row.label === 'string' && row.label.trim() ? row.label.trim() : 'score';
  const declared = declaredField(row.declared);
  if (declared && 'ok' in declared) return declared;
  const lock = lockSpec(row);
  if (lock && 'ok' in lock) return lock;
  const intentionId = typeof row.intentionId === 'string' ? row.intentionId : null;
  const reimportXml = typeof row.reimportXml === 'string' && row.reimportXml.trim() ? row.reimportXml : undefined;
  try {
    const receipt = evaluateScore({
      score: { label, xml },
      declared,
      intentionId,
      lock,
      reimportXml,
    });
    return {
      ok: true,
      identity: describeScoreIdentity(xml),
      receipt,
      sourceWritten: false,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'evaluation failed' };
  }
}

export interface ComparisonApiSuccess {
  ok: true;
  identities: ScoreIdentity[];
  intentions: Array<{ label: string; note: string }>;
  receipt: EvidenceReceipt;
  sourceWritten: false;
}

export function apiCompareMusicalScores(body: unknown): ComparisonApiSuccess | EvaluationApiFailure {
  const row = asRecord(body);
  const scores = Array.isArray(row.scores) ? row.scores : null;
  if (!scores) return { ok: false, error: 'comparison needs two or three scores' };
  const packed = scores.map((item, index) => {
    const score = asRecord(item);
    const xml = typeof score.xml === 'string' ? score.xml : '';
    const label = typeof score.label === 'string' && score.label.trim() ? score.label.trim() : `score-${index + 1}`;
    const note = typeof score.intention === 'string' ? score.intention.trim() : '';
    return { label, xml, note };
  });
  if (packed.length < 2 || packed.length > 3) return { ok: false, error: 'comparison accepts two or three scores' };
  if (packed.some((score) => !score.xml.trim())) return { ok: false, error: 'each compared score needs MusicXML. No score is written.' };
  const declared = declaredField(row.declared);
  if (declared && 'ok' in declared) return declared;
  try {
    const receipt = compareScores({
      scores: packed.map((score) => ({ label: score.label, xml: score.xml })),
      declared,
      intentionId: packed.map((score) => score.note).find((note) => note) ?? null,
    });
    return {
      ok: true,
      identities: packed.map((score) => describeScoreIdentity(score.xml)),
      intentions: packed.map((score) => ({ label: score.label, note: score.note })),
      receipt,
      sourceWritten: false,
    };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'comparison failed' };
  }
}

function libraryRootOf(row: Record<string, unknown>): string | undefined {
  return typeof row.libraryRoot === 'string' && row.libraryRoot.trim() ? row.libraryRoot.trim() : undefined;
}

export function apiCreateHumanReview(body: unknown): { ok: true; record: HumanReviewRecord } | EvaluationApiFailure {
  const row = asRecord(body);
  const receipt = row.receipt as EvidenceReceipt | undefined;
  if (!receipt || typeof receipt !== 'object' || !receipt.receiptSha256) return { ok: false, error: 'a score receipt is required before a human review' };
  const comparison = asRecord(row.comparison);
  const labels = Array.isArray(comparison.labels) ? comparison.labels.filter((item): item is string => typeof item === 'string') : [];
  try {
    const record = createHumanReview({
      label: typeof row.label === 'string' ? row.label : undefined,
      receipt,
      comparison: labels.length ? { labels, differenceCount: typeof comparison.differenceCount === 'number' ? comparison.differenceCount : 0, differences: Array.isArray(comparison.differences) ? comparison.differences : [] } : null,
    });
    return { ok: true, record };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'human review could not be started' };
  }
}

export function apiSaveHumanReview(body: unknown): { ok: true; path: string; bytes: number; record: HumanReviewRecord } | EvaluationApiFailure {
  const row = asRecord(body);
  const current = row.record as HumanReviewRecord | undefined;
  if (!current || typeof current !== 'object') return { ok: false, error: 'record is required' };
  const patch = row.patch && typeof row.patch === 'object' ? row.patch as HumanReviewPatch : null;
  const reviewed = patch ? applyHumanReview(current, patch) : current;
  if ('error' in reviewed) return { ok: false, error: reviewed.error };
  const libraryRoot = libraryRootOf(row);
  const requested = typeof row.path === 'string' && row.path.trim() ? row.path.trim() : '';
  const rawName = typeof row.fileName === 'string' && row.fileName.trim() ? row.fileName.trim() : `${reviewed.source.label}-${reviewed.source.sha256.slice(0, 12)}`;
  const safeName = path.basename(rawName).replace(/[^A-Za-z0-9._-]+/g, '-');
  const target = requested || path.join(evaluationRecordDir(libraryRoot), safeName.endsWith('.evaluation.json') ? safeName : `${safeName}.evaluation.json`);
  const saved = saveHumanReviewFile(target, reviewed, libraryRoot, row.overwrite === true);
  if ('error' in saved) return { ok: false, error: saved.error };
  return { ok: true, path: saved.path, bytes: saved.bytes, record: reviewed };
}

export function apiOpenHumanReview(body: unknown): { ok: true; path: string; record: HumanReviewRecord } | EvaluationApiFailure {
  const row = asRecord(body);
  const requested = typeof row.path === 'string' ? row.path.trim() : '';
  if (!requested) return { ok: false, error: 'path is required' };
  const loaded = loadHumanReviewFile(requested, libraryRootOf(row));
  if ('error' in loaded) return { ok: false, error: loaded.error };
  return { ok: true, path: loaded.path, record: loaded.record };
}
