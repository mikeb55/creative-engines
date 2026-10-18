/**
 * E2 exact source locks.
 * Declared harmony is not complete-sonority locking.
 */

import { formatRational, qEq } from '../bhl/bhlEvidence';
import type { CanonicalEvent, CanonicalHarmonyMark } from '../musical-evaluation/canonicalScore';
import { sha256Text } from '../musical-evaluation/canonicalScore';
import { sameRational, type SourceBundle, type SourceRecord } from './sourceFoundation';

export interface LockSpan {
  onset: { n: number; d: number };
  duration: { n: number; d: number };
}

export interface LockPolicy {
  selectedSourceEventIds: readonly string[];
  spans: readonly LockSpan[];
  preserve: {
    pitch: boolean;
    spelling: boolean;
    rhythm: boolean;
    silence: boolean;
    harmony: boolean;
    form: boolean;
    tempo: boolean;
  };
  harmonyMeaning: 'declared-intent' | 'complete-sonority';
}

export interface LockFailure {
  lock: 'pitch' | 'spelling' | 'rhythm' | 'silence' | 'harmony' | 'form' | 'tempo' | 'tie' | 'source-bytes' | 'sonority';
  detail: string;
}

export interface LockReport {
  ok: boolean;
  failures: readonly LockFailure[];
}

function inSpan(record: SourceRecord, spans: readonly LockSpan[]): boolean {
  if (!spans.length) return true;
  return spans.some((span) => qEq(record.canonical.onset, span.onset) || (
    record.canonical.onset.n * span.duration.d >= span.onset.n * record.canonical.onset.d
    && record.canonical.onset.n * span.duration.d < (span.onset.n * record.canonical.duration.d + span.duration.n * record.canonical.onset.d)
  ));
}

function selected(bundle: SourceBundle, policy: LockPolicy): SourceRecord[] {
  const ids = new Set(policy.selectedSourceEventIds);
  return bundle.records.filter((record) => {
    if (ids.size && !ids.has(record.canonical.id)) return false;
    return inSpan(record, policy.spans);
  });
}

function byXml(records: readonly SourceRecord[]): Map<string, SourceRecord> {
  return new Map(records.flatMap((record) => record.canonical.xmlId ? [[record.canonical.xmlId, record] as const] : []));
}

function matchRecord(source: SourceRecord, candidate: SourceBundle): SourceRecord | undefined {
  if (source.canonical.xmlId) {
    const hit = byXml(candidate.records).get(source.canonical.xmlId);
    if (hit) return hit;
  }
  return candidate.records.find((record) =>
    record.canonical.partId === source.canonical.partId
    && record.canonical.noteOrdinal === source.canonical.noteOrdinal
    && record.canonical.bar === source.canonical.bar);
}

function harmonyKey(mark: CanonicalHarmonyMark): string {
  return [
    mark.partId,
    mark.bar,
    formatRational(mark.onsetInBar),
    mark.rootStep ?? '',
    String(mark.rootAlter ?? ''),
    mark.kindValue ?? mark.text,
    mark.bassStep ?? '',
    String(mark.bassAlter ?? ''),
  ].join('|');
}

function sonorityKey(event: CanonicalEvent): string {
  return `${formatRational(event.onset)}|${event.soundingMidi ?? 'rest'}|${event.partId}|${event.staff ?? ''}|${event.voice}`;
}

export function verifySourceLocks(source: SourceBundle, candidate: SourceBundle, policy: LockPolicy, sourceXml?: string): LockReport {
  const failures: LockFailure[] = [];
  if (sourceXml !== undefined && sha256Text(sourceXml) !== source.sha256) {
    failures.push({ lock: 'source-bytes', detail: 'source bytes changed after ingestion' });
  }
  if (candidate.sha256 !== source.sha256 && sourceXml === undefined && policy.preserve.form) {
    failures.push({ lock: 'source-bytes', detail: 'candidate document hash differs from the frozen source' });
  }
  const rows = selected(source, policy);
  for (const row of rows) {
    const other = matchRecord(row, candidate);
    if (!other) {
      failures.push({ lock: 'form', detail: `missing source event ${row.canonical.id}` });
      continue;
    }
    const left = row.canonical;
    const right = other.canonical;
    if (policy.preserve.pitch && !left.rest && left.soundingMidi !== right.soundingMidi) {
      failures.push({ lock: 'pitch', detail: `${left.id} pitch ${left.soundingMidi} to ${right.soundingMidi}` });
    }
    if (policy.preserve.spelling && !left.rest && (
      left.written?.step !== right.written?.step || left.written?.alter !== right.written?.alter
    )) {
      failures.push({ lock: 'spelling', detail: `${left.id} spelling changed` });
    }
    if (policy.preserve.rhythm && !left.rest && (!sameRational(left.onset, right.onset) || !sameRational(left.duration, right.duration))) {
      failures.push({ lock: 'rhythm', detail: `${left.id} timing ${formatRational(left.onset)}/${formatRational(left.duration)}` });
    }
    if (policy.preserve.rhythm && (left.tieStart !== right.tieStart || left.tieStop !== right.tieStop || (left.tieChainId ?? null) !== (right.tieChainId ?? null))) {
      failures.push({ lock: 'tie', detail: `${left.id} tie chain changed` });
    }
    if (policy.preserve.silence && left.rest !== right.rest) {
      failures.push({ lock: 'silence', detail: `${left.id} rest flag changed` });
    }
    if (policy.preserve.silence && left.rest && (!sameRational(left.onset, right.onset) || !sameRational(left.duration, right.duration))) {
      failures.push({ lock: 'silence', detail: `${left.id} rest timing changed` });
    }
  }
  if (policy.preserve.form) {
    const left = source.score.measures.map((measure) => [
      measure.partId,
      measure.bar,
      measure.printedBar,
      measure.beats,
      measure.beatType,
      (measure.beatGroups ?? []).join('+'),
      measure.pickup ? 'pickup' : 'bar',
      formatRational(measure.advance ?? measure.expected),
    ].join(':'));
    const right = candidate.score.measures.map((measure) => [
      measure.partId,
      measure.bar,
      measure.printedBar,
      measure.beats,
      measure.beatType,
      (measure.beatGroups ?? []).join('+'),
      measure.pickup ? 'pickup' : 'bar',
      formatRational(measure.advance ?? measure.expected),
    ].join(':'));
    if (left.join('\n') !== right.join('\n')) failures.push({ lock: 'form', detail: 'measure structure changed' });
  }
  if (policy.preserve.tempo) {
    const tempo = (bundle: SourceBundle) => bundle.score.directions
      .filter((direction) => direction.kind === 'tempo')
      .map((direction) => `${direction.partId}|${formatRational(direction.onsetInBar)}|${direction.text}|${direction.playbackBpm ?? ''}`)
      .join('\n');
    if (tempo(source) !== tempo(candidate)) failures.push({ lock: 'tempo', detail: 'tempo marks changed' });
  }
  if (policy.preserve.harmony) {
    const left = source.score.harmony.map(harmonyKey).join('\n');
    const right = candidate.score.harmony.map(harmonyKey).join('\n');
    if (left !== right) failures.push({ lock: 'harmony', detail: 'declared harmony changed' });
    if (policy.harmonyMeaning === 'complete-sonority') {
      const sounding = (bundle: SourceBundle) => bundle.score.soundingEvents
        .filter((event) => !event.rest)
        .map(sonorityKey)
        .sort()
        .join('\n');
      if (sounding(source) !== sounding(candidate)) failures.push({ lock: 'sonority', detail: 'complete sonority changed' });
    }
  }
  return { ok: failures.length === 0, failures };
}

export function allLocks(ids: readonly string[] = []): LockPolicy {
  return {
    selectedSourceEventIds: ids,
    spans: [],
    preserve: {
      pitch: true,
      spelling: true,
      rhythm: true,
      silence: true,
      harmony: true,
      form: true,
      tempo: true,
    },
    harmonyMeaning: 'complete-sonority',
  };
}
