/**
 * Read-only dashboard API for the V3.1-B evaluation service.
 * Loads MusicXML text. Does not write the source score.
 */

import type { BhlLockSpec } from '../core/bhl/bhlTypes';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import {
  describeScoreIdentity,
  evaluateScore,
  type EvaluationRequest,
  type EvidenceReceipt,
  type ScoreIdentity,
} from '../core/musical-evaluation/service';
import type { DeclaredField } from '../core/musical-evaluation/harmonicEvidence';

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
