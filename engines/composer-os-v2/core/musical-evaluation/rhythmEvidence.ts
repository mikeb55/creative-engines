/**
 * Rhythm, silence, and duo interaction.
 * Each instrument is counted before any relationship.
 * Density, silence, and displacement are descriptions. None of them is a quality.
 */

import { formatRational, qAdd, qCmp, qEq, readBhlEvidence, type Rational } from '../bhl/bhlEvidence';
import { eventSignature, ingestCanonicalScore, type CanonicalEvent } from './canonicalScore';
import type { MusicalFinding } from './harmonicEvidence';

export const RHYTHM_EVIDENCE_VERSION = 'rhythm-evidence-1';

export const EXPERIMENTAL_RHYTHM_METRICS = [
  'syncopation-longuet-higgins-lee',
  'inter-onset-interval-entropy',
  'lbdm-phrase-boundaries',
] as const;

export interface RhythmEvidenceRequest {
  xml: string;
  compareXml?: string;
  intentionId?: string | null;
}

export interface RhythmEvidence {
  version: typeof RHYTHM_EVIDENCE_VERSION;
  sha256: string;
  findings: MusicalFinding[];
  unsupportedMetrics: readonly string[];
}

function ratio(part: Rational, whole: Rational): string {
  if (whole.n === 0) return '0';
  const value = (part.n * whole.d) / (part.d * whole.n);
  return String(Math.round(value * 1000) / 1000);
}

function attacks(events: readonly CanonicalEvent[]): CanonicalEvent[] {
  return events.filter((event) => !event.rest && !event.tieStop);
}

export function analyseRhythm(request: RhythmEvidenceRequest): RhythmEvidence {
  const ingest = ingestCanonicalScore(request.xml);
  const findings: MusicalFinding[] = [];
  const unsupportedMetrics = [...EXPERIMENTAL_RHYTHM_METRICS];
  if (!ingest.score) {
    return { version: RHYTHM_EVIDENCE_VERSION, sha256: ingest.sha256, findings, unsupportedMetrics };
  }
  const score = ingest.score;
  let serial = 0;
  const add = (finding: Omit<MusicalFinding, 'id' | 'scoreSha256' | 'intentionId' | 'treatsOutsideAsError'>): void => {
    serial += 1;
    findings.push({
      ...finding,
      id: `R${serial}`,
      scoreSha256: score.sha256,
      intentionId: request.intentionId ?? null,
      treatsOutsideAsError: false,
    });
  };

  const bars = [...new Set(score.measures.map((measure) => measure.bar))].sort((a, b) => a - b);
  for (const part of score.parts) {
    for (const bar of bars) {
      const events = score.soundingEvents.filter((event) => event.partId === part.id && event.bar === bar);
      const metre = score.measures.find((measure) => measure.partId === part.id && measure.bar === bar);
      const sounding = events.filter((event) => !event.rest).reduce((sum, event) => qAdd(sum, event.duration), { n: 0, d: 1 });
      const rest = events.filter((event) => event.rest && !event.chord).reduce((sum, event) => qAdd(sum, event.duration), { n: 0, d: 1 });
      const attackEvents = attacks(events);
      add({
        metricId: 'note-density',
        metricVersion: 'note-density-1',
        bars: [bar],
        onsetInBar: attackEvents[0]?.onsetInBar ?? { n: 0, d: 1 },
        instrument: part.name,
        partId: part.id,
        voice: attackEvents[0]?.voice ?? events[0]?.voice ?? null,
        eventIds: attackEvents.flatMap((event) => event.sourceEventIds),
        observations: { attacks: attackEvents.length, instrumentFirst: true },
        confidence: 'descriptive',
        limitation: 'attack count is not a judgement that more activity is better',
        bmefCriterion: 'J3',
      });
      add({
        metricId: 'sounding-rest-proportion',
        metricVersion: 'sounding-rest-proportion-1',
        bars: [bar],
        onsetInBar: { n: 0, d: 1 },
        instrument: part.name,
        partId: part.id,
        voice: events[0]?.voice ?? null,
        eventIds: events.flatMap((event) => event.sourceEventIds),
        observations: {
          sounding: formatRational(sounding),
          rest: formatRational(rest),
          metre: metre ? formatRational(metre.expected) : null,
          soundingShare: metre ? ratio(sounding, metre.expected) : null,
          restShare: metre ? ratio(rest, metre.expected) : null,
        },
        confidence: 'descriptive',
        limitation: 'silence share is not a judgement that more space is better',
        bmefCriterion: 'J3',
      });
    }
  }

  const guitar = score.parts.find((part) => part.role === 'guitar');
  const bass = score.parts.find((part) => part.role === 'bass');
  if (guitar && bass) {
    for (const bar of bars) {
      const guitarEvents = score.soundingEvents.filter((event) => event.partId === guitar.id && event.bar === bar);
      const bassEvents = score.soundingEvents.filter((event) => event.partId === bass.id && event.bar === bar);
      const guitarRests = guitarEvents.filter((event) => event.rest);
      const bassRests = bassEvents.filter((event) => event.rest);
      const overlaps = (rests: CanonicalEvent[], soundingEvents: CanonicalEvent[]) =>
        rests.filter((rest) =>
          soundingEvents.some(
            (event) =>
              !event.rest &&
              qCmp(event.onset, qAdd(rest.onset, rest.duration)) < 0 &&
              qCmp(rest.onset, qAdd(event.onset, event.duration)) < 0,
          ),
        );
      const guitarDuringBass = overlaps(bassRests, guitarEvents);
      const bassDuringGuitar = overlaps(guitarRests, bassEvents);
      const joint = guitarRests.filter((rest) =>
        bassRests.some(
          (other) =>
            qCmp(rest.onset, qAdd(other.onset, other.duration)) < 0 &&
            qCmp(other.onset, qAdd(rest.onset, rest.duration)) < 0,
        ),
      );
      add({
        metricId: 'duo-activity',
        metricVersion: 'duo-activity-1',
        bars: [bar],
        onsetInBar: { n: 0, d: 1 },
        instrument: null,
        partId: null,
        voice: null,
        eventIds: [...guitarDuringBass, ...bassDuringGuitar, ...joint].flatMap((event) => event.sourceEventIds),
        observations: {
          guitarDuringBassRest: guitarDuringBass.length > 0,
          bassDuringGuitarRest: bassDuringGuitar.length > 0,
          jointSilence: joint.length > 0,
          instrumentsCountedFirst: true,
        },
        confidence: 'descriptive',
        limitation: null,
        bmefCriterion: 'J3',
      });

      const guitarAttacks = attacks(guitarEvents);
      const bassAttacks = attacks(bassEvents);
      const shared = guitarAttacks.filter((event) => bassAttacks.some((other) => qEq(event.onset, other.onset)));
      const guitarAlone = guitarAttacks.filter((event) => !shared.some((other) => other.id === event.id));
      const bassAlone = bassAttacks.filter((event) => !guitarAttacks.some((other) => qEq(event.onset, other.onset)));
      add({
        metricId: 'attack-relationship',
        metricVersion: 'attack-relationship-1',
        bars: [bar],
        onsetInBar: shared[0]?.onsetInBar ?? guitarAlone[0]?.onsetInBar ?? bassAlone[0]?.onsetInBar ?? null,
        instrument: null,
        partId: null,
        voice: null,
        eventIds: [...shared, ...guitarAlone, ...bassAlone].flatMap((event) => event.sourceEventIds),
        observations: {
          sharedAttacks: shared.length,
          guitarAttacksNotShared: guitarAlone.length,
          bassAttacksNotShared: bassAlone.length,
          alternating: guitarAlone.length > 0 && bassAlone.length > 0,
        },
        confidence: 'descriptive',
        limitation: null,
        bmefCriterion: 'J3',
      });

      const guitarCount = guitarAttacks.length;
      const bassCount = bassAttacks.length;
      const role = guitarCount > bassCount ? 'guitar-more-attacks' : bassCount > guitarCount ? 'bass-more-attacks' : 'equal-attacks';
      add({
        metricId: 'role-indicator',
        metricVersion: 'role-indicator-1',
        bars: [bar],
        onsetInBar: { n: 0, d: 1 },
        instrument: null,
        partId: null,
        voice: null,
        eventIds: [...guitarAttacks, ...bassAttacks].flatMap((event) => event.sourceEventIds),
        observations: { role, guitarAttacks: guitarCount, bassAttacks: bassCount, experimental: true },
        confidence: 'limited',
        limitation: 'attack count is an experimental role hint, not a musical role',
        bmefCriterion: 'J3',
      });
    }
  }

  for (const direction of score.directions.filter((item) => item.kind === 'rehearsal')) {
    add({
      metricId: 'phrase-boundary',
      metricVersion: 'phrase-boundary-1',
      bars: [direction.bar],
      onsetInBar: direction.onsetInBar,
      instrument: direction.instrument,
      partId: direction.partId,
      voice: null,
      eventIds: [],
      observations: { indicator: 'rehearsal', text: direction.text, experimental: false },
      confidence: 'descriptive',
      limitation: null,
      bmefCriterion: 'U3',
    });
  }
  for (const part of score.parts) {
    for (const bar of bars) {
      const events = score.soundingEvents.filter((event) => event.partId === part.id && event.bar === bar);
      const metre = score.measures.find((measure) => measure.partId === part.id && measure.bar === bar);
      const rest = events.filter((event) => event.rest).reduce((sum, event) => qAdd(sum, event.duration), { n: 0, d: 1 });
      if (!metre || !qEq(rest, metre.expected) || events.length === 0) continue;
      add({
        metricId: 'phrase-boundary',
        metricVersion: 'phrase-boundary-1',
        bars: [bar],
        onsetInBar: { n: 0, d: 1 },
        instrument: part.name,
        partId: part.id,
        voice: events[0]?.voice ?? null,
        eventIds: events.flatMap((event) => event.sourceEventIds),
        observations: { indicator: 'whole-bar-rest', experimental: true },
        confidence: 'limited',
        limitation: 'a whole-bar rest is a boundary indicator, not an LBDM phrase segmentation',
        bmefCriterion: 'U3',
      });
    }
  }

  const bhl = readBhlEvidence(request.xml);
  for (const motion of bhl.motions) {
    add({
      metricId: 'relative-motion',
      metricVersion: 'bhl-motion-1',
      bars: [motion.bar],
      onsetInBar: motion.onsetInBar,
      instrument: null,
      partId: null,
      voice: null,
      eventIds: score.sourceEvents
        .filter((event) => event.bar === motion.bar && formatRational(event.onsetInBar) === formatRational(motion.onsetInBar))
        .map((event) => event.id),
      observations: {
        kind: motion.kind,
        voiceA: motion.voiceA,
        voiceB: motion.voiceB,
        semitonesA: motion.pitchA - motion.previousA,
        semitonesB: motion.pitchB - motion.previousB,
      },
      confidence: 'descriptive',
      limitation: 'motion kind is not a judgement that contrary motion is better',
      bmefCriterion: 'J2',
    });
  }
  for (const crossing of bhl.crossings) {
    add({
      metricId: 'register-crossing',
      metricVersion: 'bhl-crossing-1',
      bars: [crossing.bar],
      onsetInBar: crossing.onsetInBar,
      instrument: null,
      partId: null,
      voice: null,
      eventIds: score.sourceEvents
        .filter((event) => event.bar === crossing.bar && formatRational(event.onsetInBar) === formatRational(crossing.onsetInBar))
        .map((event) => event.id),
      observations: { pitchA: crossing.pitchA, pitchB: crossing.pitchB, voiceA: crossing.voiceA, voiceB: crossing.voiceB },
      confidence: 'descriptive',
      limitation: null,
      bmefCriterion: 'U6',
    });
  }
  for (const motif of bhl.motifs) {
    for (const match of motif.matches.filter((item) => item.kind === 'rhythmic-displacement')) {
      add({
        metricId: 'rhythmic-displacement',
        metricVersion: 'bhl-opening-cell-1',
        bars: [match.bar],
        onsetInBar: match.onsetInBar,
        instrument: null,
        partId: motif.voice.split(':')[0] ?? null,
        voice: motif.voice.split(':')[1] ?? null,
        eventIds: [],
        observations: { kind: match.kind, detail: match.detail },
        confidence: 'limited',
        limitation: 'displacement is an opening-cell window match',
        bmefCriterion: 'J3',
      });
    }
  }

  if (request.compareXml) {
    const other = ingestCanonicalScore(request.compareXml);
    const left = new Set(score.sourceEvents.map(eventSignature));
    const rightEvents = other.score?.sourceEvents ?? [];
    const right = new Set(rightEvents.map(eventSignature));
    for (const event of score.sourceEvents) {
      const signature = eventSignature(event);
      if (right.has(signature)) continue;
      add({
        metricId: 'candidate-difference',
        metricVersion: 'candidate-difference-1',
        bars: [event.bar],
        onsetInBar: event.onsetInBar,
        instrument: event.instrument,
        partId: event.partId,
        voice: event.voice,
        eventIds: [event.id],
        observations: { change: 'only-in-first', signature, rank: null },
        confidence: 'descriptive',
        limitation: 'a difference is not a ranking',
        bmefCriterion: null,
      });
    }
    for (const event of rightEvents) {
      const signature = eventSignature(event);
      if (left.has(signature)) continue;
      add({
        metricId: 'candidate-difference',
        metricVersion: 'candidate-difference-1',
        bars: [event.bar],
        onsetInBar: event.onsetInBar,
        instrument: event.instrument,
        partId: event.partId,
        voice: event.voice,
        eventIds: [event.id],
        observations: { change: 'only-in-second', signature, rank: null },
        confidence: 'descriptive',
        limitation: 'a difference is not a ranking',
        bmefCriterion: null,
      });
    }
  }

  add({
    metricId: 'unsupported-rhythm-metrics',
    metricVersion: RHYTHM_EVIDENCE_VERSION,
    bars: [],
    onsetInBar: null,
    instrument: null,
    partId: null,
    voice: null,
    eventIds: [],
    observations: { metrics: unsupportedMetrics.join(',') },
    confidence: 'limited',
    limitation: 'syncopation, onset entropy, and LBDM boundaries are not reliable enough to report as established',
    bmefCriterion: null,
  });

  return { version: RHYTHM_EVIDENCE_VERSION, sha256: score.sha256, findings, unsupportedMetrics };
}
