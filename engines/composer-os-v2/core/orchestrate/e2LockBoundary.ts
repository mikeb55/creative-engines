/**
 * E2 boundary for source locks.
 * sourceLocks.ts::inSpan stays as shipped in A+B.
 * This module expands a policy into explicit event ids with exact overlap arithmetic,
 * then calls the existing verifier with those ids and no span filter.
 */

import { qAdd, qCmp, type ExactQuarter } from '../piano/pianoExactTiming';
import type { SourceBundle, SourceRecord } from './sourceFoundation';
import { verifySourceLocks, type LockPolicy, type LockReport, type LockSpan } from './sourceLocks';

export const E2_EMPTY_SELECTION_ID = '__e2_zero_selected_events__';

export type LockSelectionMode = 'unrestricted' | 'restricted' | 'zero';

export interface ExpandedLock {
  original: LockPolicy;
  mode: LockSelectionMode;
  expandedIds: readonly string[];
  verifierPolicy: LockPolicy;
}

export function spansOverlap(
  onset: ExactQuarter,
  duration: ExactQuarter,
  span: LockSpan,
): boolean {
  const eventEnd = qAdd(onset, duration);
  const spanEnd = qAdd(span.onset, span.duration);
  return qCmp(onset, spanEnd) < 0 && qCmp(eventEnd, span.onset) > 0;
}

export function recordInSpans(record: SourceRecord, spans: readonly LockSpan[]): boolean {
  if (!spans.length) return true;
  return spans.some((span) => spansOverlap(record.canonical.onset, record.canonical.duration, span));
}

export function expandLockPolicy(source: SourceBundle, policy: LockPolicy): ExpandedLock {
  const unrestricted = policy.selectedSourceEventIds.length === 0 && policy.spans.length === 0;
  const idFilter = new Set(policy.selectedSourceEventIds);
  const matched = source.records.filter((record) => {
    if (!unrestricted && idFilter.size > 0 && !idFilter.has(record.canonical.id)) return false;
    return recordInSpans(record, policy.spans);
  });
  const expandedIds = matched.map((record) => record.canonical.id);
  const mode: LockSelectionMode = unrestricted ? 'unrestricted' : expandedIds.length === 0 ? 'zero' : 'restricted';
  const verifierIds = mode === 'zero' ? [E2_EMPTY_SELECTION_ID] : expandedIds;
  return {
    original: policy,
    mode,
    expandedIds,
    verifierPolicy: {
      ...policy,
      selectedSourceEventIds: verifierIds,
      spans: [],
    },
  };
}

export function verifyExpandedLocks(
  source: SourceBundle,
  candidate: SourceBundle,
  policy: LockPolicy,
  sourceXml?: string,
): { expansion: ExpandedLock; report: LockReport } {
  const expansion = expandLockPolicy(source, policy);
  return {
    expansion,
    report: verifySourceLocks(source, candidate, expansion.verifierPolicy, sourceXml),
  };
}
