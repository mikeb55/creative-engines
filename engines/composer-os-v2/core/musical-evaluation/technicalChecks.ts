/**
 * Technical checks on a canonical score.
 * Pass and fail describe the file. They do not describe musical quality.
 */

import { assessGuitarFeasibility } from '../barry-harris/guitarVoicingFeasibility';
import { formatRational, qAdd, qCmp, qEq, type Rational } from '../bhl/bhlEvidence';
import { verifyBhlLocks } from '../bhl/bhlVerify';
import type { BhlLockSpec } from '../bhl/bhlTypes';
import {
  eventSignature,
  ingestCanonicalScore,
  type CanonicalEvaluationScore,
  type CanonicalEvent,
} from './canonicalScore';

export const TECHNICAL_CHECKS_VERSION = 'technical-checks-1';

export type TechnicalCheckId =
  | 'parse'
  | 'measure-duration'
  | 'part-voice'
  | 'pitch-range'
  | 'source-lock'
  | 'guitar-feasibility'
  | 'reimport';

export type TechnicalStatus = 'pass' | 'fail' | 'reported' | 'not-requested';

export interface TechnicalFinding {
  id: string;
  check: TechnicalCheckId;
  status: TechnicalStatus;
  bar: number | null;
  onsetInBar: Rational | null;
  instrument: string | null;
  partId: string | null;
  voice: string | null;
  eventIds: string[];
  observation: string;
}

export interface TechnicalReport {
  version: typeof TECHNICAL_CHECKS_VERSION;
  sha256: string;
  summary: Record<TechnicalCheckId, TechnicalStatus>;
  findings: TechnicalFinding[];
}

export interface TechnicalCheckRequest {
  xml: string;
  lock?: { sourceXml: string; spec: BhlLockSpec };
  /** Second serialisation. Same musical events must match. */
  reimportXml?: string;
}

const GUITAR_RANGE = { low: 40, high: 88 };
const BASS_RANGE = { low: 28, high: 72 };

function voiceDuration(events: readonly CanonicalEvent[]): Rational {
  return events.filter((event) => !event.chord).reduce((sum, event) => qAdd(sum, event.duration), { n: 0, d: 1 });
}

function barOf(text: string): number | null {
  const match = /bar (\d+)/.exec(text);
  return match ? Number(match[1]) : null;
}

export function runTechnicalChecks(request: TechnicalCheckRequest): TechnicalReport {
  const ingest = ingestCanonicalScore(request.xml);
  const findings: TechnicalFinding[] = [];
  let serial = 0;
  const add = (finding: Omit<TechnicalFinding, 'id'>): void => {
    serial += 1;
    findings.push({ ...finding, id: `T${serial}` });
  };

  const summary: TechnicalReport['summary'] = {
    parse: 'pass',
    'measure-duration': 'pass',
    'part-voice': 'pass',
    'pitch-range': 'pass',
    'source-lock': request.lock ? 'pass' : 'not-requested',
    'guitar-feasibility': 'pass',
    reimport: 'pass',
  };

  if (!ingest.score || ingest.parseError) {
    summary.parse = 'fail';
    add({
      check: 'parse',
      status: 'fail',
      bar: null,
      onsetInBar: null,
      instrument: null,
      partId: null,
      voice: null,
      eventIds: [],
      observation: ingest.parseError ?? 'MusicXML did not parse',
    });
    summary['measure-duration'] = 'not-requested';
    summary['part-voice'] = 'not-requested';
    summary['pitch-range'] = 'not-requested';
    summary['guitar-feasibility'] = 'not-requested';
    summary.reimport = 'not-requested';
    return { version: TECHNICAL_CHECKS_VERSION, sha256: ingest.sha256, summary, findings };
  }

  const score = ingest.score;
  for (const item of score.unsupported) {
    add({
      check: 'parse',
      status: 'reported',
      bar: item.bar || null,
      onsetInBar: item.onsetInBar,
      instrument: item.instrument,
      partId: item.partId,
      voice: null,
      eventIds: [],
      observation: `${item.kind}: ${item.detail}`,
    });
  }

  checkDurations(score, add, summary);
  checkParts(score, add, summary);
  checkRange(score, add, summary);
  checkFeasibility(score, add, summary);
  checkLock(request, add, summary);
  checkReimport(score, request, add, summary);

  return { version: TECHNICAL_CHECKS_VERSION, sha256: ingest.sha256, summary, findings };
}

function checkDurations(
  score: CanonicalEvaluationScore,
  add: (finding: Omit<TechnicalFinding, 'id'>) => void,
  summary: TechnicalReport['summary'],
): void {
  const byPart = new Map<string, CanonicalEvaluationScore['measures']>();
  for (const measure of score.measures) {
    const list = byPart.get(measure.partId) ?? [];
    list.push(measure);
    byPart.set(measure.partId, list);
  }
  for (const [partId, measures] of byPart) {
    for (const measure of measures) {
      const events = score.sourceEvents.filter((event) => event.partId === partId && event.bar === measure.bar);
      const voices = [...new Set(events.map((event) => event.voice))];
      if (voices.length === 0) {
        summary['measure-duration'] = 'fail';
        summary['part-voice'] = 'fail';
        add({
          check: 'measure-duration',
          status: 'fail',
          bar: measure.bar,
          onsetInBar: { n: 0, d: 1 },
          instrument: score.parts.find((part) => part.id === partId)?.name ?? partId,
          partId,
          voice: null,
          eventIds: [],
          observation: `bar ${measure.bar} has no notes or rests; stated metre is ${measure.beats}/${measure.beatType}`,
        });
        continue;
      }
      for (const voice of voices) {
        const voiceEvents = events.filter((event) => event.voice === voice);
        const total = voiceDuration(voiceEvents);
        if (qEq(total, measure.expected)) continue;
        if (measure.pickup && qCmp(total, measure.expected) < 0) {
          add({
            check: 'measure-duration',
            status: 'reported',
            bar: measure.bar,
            onsetInBar: { n: 0, d: 1 },
            instrument: voiceEvents[0]?.instrument ?? partId,
            partId,
            voice,
            eventIds: voiceEvents.map((event) => event.id),
            observation: `pickup bar ${measure.bar} voice ${voice} lasts ${formatRational(total)} against stated ${formatRational(measure.expected)}`,
          });
          continue;
        }
        summary['measure-duration'] = 'fail';
        add({
          check: 'measure-duration',
          status: 'fail',
          bar: measure.bar,
          onsetInBar: voiceEvents[0]?.onsetInBar ?? { n: 0, d: 1 },
          instrument: voiceEvents[0]?.instrument ?? partId,
          partId,
          voice,
          eventIds: voiceEvents.map((event) => event.id),
          observation: `voice ${voice} sums to ${formatRational(total)}; ${measure.beats}/${measure.beatType} requires ${formatRational(measure.expected)}`,
        });
      }
    }
  }
}

function checkParts(
  score: CanonicalEvaluationScore,
  add: (finding: Omit<TechnicalFinding, 'id'>) => void,
  summary: TechnicalReport['summary'],
): void {
  if (score.parts.length === 0) {
    summary['part-voice'] = 'fail';
    add({
      check: 'part-voice',
      status: 'fail',
      bar: null,
      onsetInBar: null,
      instrument: null,
      partId: null,
      voice: null,
      eventIds: [],
      observation: 'score-partwise file has no parts',
    });
  }
  for (const item of score.unsupported.filter((entry) => entry.kind === 'missing-part')) {
    summary['part-voice'] = 'fail';
    add({
      check: 'part-voice',
      status: 'fail',
      bar: null,
      onsetInBar: null,
      instrument: item.instrument,
      partId: item.partId,
      voice: null,
      eventIds: [],
      observation: item.detail,
    });
  }
  const tempo = score.directions.some((direction) => direction.kind === 'tempo');
  if (!tempo) {
    add({
      check: 'part-voice',
      status: 'reported',
      bar: score.measures[0]?.bar ?? null,
      onsetInBar: { n: 0, d: 1 },
      instrument: score.parts[0]?.name ?? null,
      partId: score.parts[0]?.id ?? null,
      voice: null,
      eventIds: [],
      observation: 'no tempo mark is present',
    });
  }
}

function checkRange(
  score: CanonicalEvaluationScore,
  add: (finding: Omit<TechnicalFinding, 'id'>) => void,
  summary: TechnicalReport['summary'],
): void {
  for (const part of score.parts) {
    if (part.transposition.chromatic !== 0 || part.transposition.octaveChange !== 0) {
      const first = score.sourceEvents.find((event) => event.partId === part.id && event.written);
      add({
        check: 'pitch-range',
        status: 'reported',
        bar: first?.bar ?? null,
        onsetInBar: first?.onsetInBar ?? null,
        instrument: part.name,
        partId: part.id,
        voice: first?.voice ?? null,
        eventIds: first ? [first.id] : [],
        observation: `written pitch is transposed by chromatic ${part.transposition.chromatic}, octave-change ${part.transposition.octaveChange}`,
      });
    }
  }
  for (const event of score.sourceEvents) {
    if (event.rest || event.soundingMidi === null) continue;
    const band = event.role === 'guitar' ? GUITAR_RANGE : event.role === 'bass' ? BASS_RANGE : null;
    if (!band) continue;
    if (event.soundingMidi < band.low || event.soundingMidi > band.high) {
      summary['pitch-range'] = 'fail';
      add({
        check: 'pitch-range',
        status: 'fail',
        bar: event.bar,
        onsetInBar: event.onsetInBar,
        instrument: event.instrument,
        partId: event.partId,
        voice: event.voice,
        eventIds: [event.id],
        observation: `sounding MIDI ${event.soundingMidi} is outside ${band.low}–${band.high}; written ${event.written ? `${event.written.step}${event.written.octave}` : 'none'}`,
      });
    }
  }
}

function checkFeasibility(
  score: CanonicalEvaluationScore,
  add: (finding: Omit<TechnicalFinding, 'id'>) => void,
  summary: TechnicalReport['summary'],
): void {
  const guitar = score.soundingEvents.filter((event) => event.role === 'guitar' && !event.rest && event.soundingMidi !== null);
  const onsets = new Map<string, CanonicalEvent[]>();
  for (const event of guitar) {
    const key = `${event.bar}|${formatRational(event.onsetInBar)}`;
    const list = onsets.get(key) ?? [];
    list.push(event);
    onsets.set(key, list);
  }
  for (const group of onsets.values()) {
    const midis = [...new Set(group.map((event) => event.soundingMidi!))];
    if (midis.length < 2) continue;
    const result = assessGuitarFeasibility(midis);
    if (result.feasible) continue;
    summary['guitar-feasibility'] = 'fail';
    const head = group[0]!;
    add({
      check: 'guitar-feasibility',
      status: 'fail',
      bar: head.bar,
      onsetInBar: head.onsetInBar,
      instrument: head.instrument,
      partId: head.partId,
      voice: head.voice,
      eventIds: group.flatMap((event) => event.sourceEventIds),
      observation: `guitar simultaneity ${midis.join(',')} is not feasible under the existing fret-span check`,
    });
  }
}

function checkLock(
  request: TechnicalCheckRequest,
  add: (finding: Omit<TechnicalFinding, 'id'>) => void,
  summary: TechnicalReport['summary'],
): void {
  if (!request.lock) return;
  const report = verifyBhlLocks(request.lock.sourceXml, request.xml, request.lock.spec);
  if (report.ok) return;
  summary['source-lock'] = 'fail';
  for (const error of report.errors) {
    add({
      check: 'source-lock',
      status: 'fail',
      bar: barOf(error),
      onsetInBar: null,
      instrument: /bass/i.test(error) ? 'bass' : /guitar/i.test(error) ? 'guitar' : null,
      partId: null,
      voice: null,
      eventIds: [],
      observation: error,
    });
  }
}

function checkReimport(
  score: CanonicalEvaluationScore,
  request: TechnicalCheckRequest,
  add: (finding: Omit<TechnicalFinding, 'id'>) => void,
  summary: TechnicalReport['summary'],
): void {
  const again = ingestCanonicalScore(request.xml);
  const left = score.sourceEvents.map(eventSignature);
  const right = again.score?.sourceEvents.map(eventSignature) ?? [];
  if (left.join('\n') !== right.join('\n')) {
    summary.reimport = 'fail';
    add({
      check: 'reimport',
      status: 'fail',
      bar: null,
      onsetInBar: null,
      instrument: null,
      partId: null,
      voice: null,
      eventIds: [],
      observation: 'parsing the same MusicXML twice did not reproduce the same events',
    });
  }
  if (!request.reimportXml) return;
  const other = ingestCanonicalScore(request.reimportXml);
  if (!other.score) {
    summary.reimport = 'fail';
    add({
      check: 'reimport',
      status: 'fail',
      bar: null,
      onsetInBar: null,
      instrument: null,
      partId: null,
      voice: null,
      eventIds: [],
      observation: other.parseError ?? 'reimport MusicXML did not parse',
    });
    return;
  }
  const sourceSet = new Set(left);
  const otherSet = new Set(other.score.sourceEvents.map(eventSignature));
  for (const signature of sourceSet) {
    if (otherSet.has(signature)) continue;
    summary.reimport = 'fail';
    const event = score.sourceEvents.find((item) => eventSignature(item) === signature);
    add({
      check: 'reimport',
      status: 'fail',
      bar: event?.bar ?? null,
      onsetInBar: event?.onsetInBar ?? null,
      instrument: event?.instrument ?? null,
      partId: event?.partId ?? null,
      voice: event?.voice ?? null,
      eventIds: event ? [event.id] : [],
      observation: `event missing after reimport: ${signature}`,
    });
  }
  for (const signature of otherSet) {
    if (sourceSet.has(signature)) continue;
    summary.reimport = 'fail';
    const event = other.score.sourceEvents.find((item) => eventSignature(item) === signature);
    add({
      check: 'reimport',
      status: 'fail',
      bar: event?.bar ?? null,
      onsetInBar: event?.onsetInBar ?? null,
      instrument: event?.instrument ?? null,
      partId: event?.partId ?? null,
      voice: event?.voice ?? null,
      eventIds: event ? [event.id] : [],
      observation: `event added after reimport: ${signature}`,
    });
  }
}
