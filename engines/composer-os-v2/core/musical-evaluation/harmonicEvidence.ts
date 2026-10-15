/**
 * Harmonic and melodic evidence.
 * Describes collections, motion, and motifs. Does not score them.
 * Pentatonic distance, hexatonic distance, and M-DEG / M-NEAR stay separate.
 */

import { formatRational, readBhlEvidence, type Rational } from '../bhl/bhlEvidence';
import { placementAgainstHome, measureHexatonicDistance } from '../hexatonic/relations';
import {
  fieldFromPitchClasses,
  measureFieldDistance,
  minimumAssignment,
  PENTATONIC_FIELD_DISTANCE_VERSION,
} from '../pentatonic/fieldDistance';
import { mapMotifPitches, type MotifMapMethod, type PentatonicCollectionView } from '../pentatonic/motifTransform';
import { mod12 } from '../pentatonic/pitch';
import { ingestCanonicalScore, type CanonicalEvent } from './canonicalScore';

export const HARMONIC_EVIDENCE_VERSION = 'harmonic-evidence-1';

export interface DeclaredField {
  label: string;
  pitchClasses: readonly number[];
  family: 'pentatonic' | 'hexatonic' | 'bhl' | 'wps' | 'other';
}

export interface HarmonicEvidenceRequest {
  xml: string;
  declared?: DeclaredField;
  intentionId?: string | null;
  motifMap?: {
    method: MotifMapMethod;
    source: PentatonicCollectionView;
    target: PentatonicCollectionView;
    notes: Array<{ pitch: number; startBeat: number; duration: number }>;
  };
}

export interface MusicalFinding {
  id: string;
  metricId: string;
  metricVersion: string;
  scoreSha256: string;
  bars: number[];
  onsetInBar: Rational | null;
  instrument: string | null;
  partId: string | null;
  voice: string | null;
  eventIds: string[];
  observations: Record<string, string | number | boolean | null>;
  confidence: 'descriptive' | 'limited';
  limitation: string | null;
  bmefCriterion: string | null;
  intentionId: string | null;
  treatsOutsideAsError: false;
}

export interface HarmonicEvidence {
  version: typeof HARMONIC_EVIDENCE_VERSION;
  sha256: string;
  findings: MusicalFinding[];
}

function pcsOf(events: readonly CanonicalEvent[]): number[] {
  return [...new Set(events.filter((event) => event.soundingMidi !== null).map((event) => mod12(event.soundingMidi!)))].sort((a, b) => a - b);
}

function mean(values: readonly number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 1000) / 1000;
}

export function analyseHarmony(request: HarmonicEvidenceRequest): HarmonicEvidence {
  const ingest = ingestCanonicalScore(request.xml);
  const findings: MusicalFinding[] = [];
  if (!ingest.score) {
    findings.push({
      id: 'H1',
      metricId: 'pitch-class-collection',
      metricVersion: HARMONIC_EVIDENCE_VERSION,
      scoreSha256: ingest.sha256,
      bars: [],
      onsetInBar: null,
      instrument: null,
      partId: null,
      voice: null,
      eventIds: [],
      observations: { parsed: false },
      confidence: 'limited',
      limitation: ingest.parseError,
      bmefCriterion: 'G3',
      intentionId: request.intentionId ?? null,
      treatsOutsideAsError: false,
    });
    return { version: HARMONIC_EVIDENCE_VERSION, sha256: ingest.sha256, findings };
  }
  const score = ingest.score;
  let serial = 0;
  const add = (finding: Omit<MusicalFinding, 'id' | 'scoreSha256' | 'intentionId' | 'treatsOutsideAsError'>): void => {
    serial += 1;
    findings.push({
      ...finding,
      id: `H${serial}`,
      scoreSha256: score.sha256,
      intentionId: request.intentionId ?? null,
      treatsOutsideAsError: false,
    });
  };

  const bars = [...new Set(score.soundingEvents.map((event) => event.bar))].sort((a, b) => a - b);
  const barSets = new Map<number, { events: CanonicalEvent[]; pcs: number[] }>();
  for (const bar of bars) {
    const events = score.soundingEvents.filter((event) => event.bar === bar && !event.rest);
    barSets.set(bar, { events, pcs: pcsOf(events) });
  }

  for (const [bar, row] of barSets) {
    add({
      metricId: 'pitch-class-collection',
      metricVersion: 'pitch-class-collection-1',
      bars: [bar],
      onsetInBar: row.events[0]?.onsetInBar ?? { n: 0, d: 1 },
      instrument: null,
      partId: null,
      voice: null,
      eventIds: row.events.flatMap((event) => event.sourceEventIds),
      observations: { pitchClasses: row.pcs.join(','), count: row.pcs.length },
      confidence: 'descriptive',
      limitation: null,
      bmefCriterion: 'J1',
    });
  }

  const declared = request.declared ? [...new Set(request.declared.pitchClasses.map(mod12))].sort((a, b) => a - b) : null;
  if (declared) {
    const family = request.declared!.family;
    for (const [bar, row] of barSets) {
      const placement = row.pcs.length ? placementAgainstHome(declared, row.pcs) : 'outside';
      add({
        metricId: 'field-membership',
        metricVersion: 'field-membership-1',
        bars: [bar],
        onsetInBar: row.events[0]?.onsetInBar ?? null,
        instrument: null,
        partId: null,
        voice: null,
        eventIds: row.events.flatMap((event) => event.sourceEventIds),
        observations: {
          field: request.declared!.label,
          family,
          membership: placement,
          error: false,
        },
        confidence: 'descriptive',
        limitation: placement === 'outside' ? 'outside the declared field is a description, not a defect' : null,
        bmefCriterion: 'J1',
      });
      for (const event of row.events) {
        const pc = mod12(event.soundingMidi!);
        if (declared.includes(pc)) continue;
        add({
          metricId: 'field-membership',
          metricVersion: 'field-membership-1',
          bars: [bar],
          onsetInBar: event.onsetInBar,
          instrument: event.instrument,
          partId: event.partId,
          voice: event.voice,
          eventIds: event.sourceEventIds,
          observations: { pitchClass: pc, membership: 'outside', error: false, soundingMidi: event.soundingMidi },
          confidence: 'descriptive',
          limitation: 'a deliberately outside note is not an error',
          bmefCriterion: 'J1',
        });
      }
      const sameSize = row.pcs.length === declared.length;
      if ((family === 'pentatonic' || family === 'bhl') && declared.length === 5 && row.pcs.length === 5) {
        const source = fieldFromPitchClasses(declared, null);
        const destination = fieldFromPitchClasses(row.pcs, null);
        if (source && destination) {
          const distance = measureFieldDistance(source, destination);
          add({
            metricId: 'collection-distance',
            metricVersion: PENTATONIC_FIELD_DISTANCE_VERSION,
            bars: [bar],
            onsetInBar: row.events[0]?.onsetInBar ?? null,
            instrument: null,
            partId: null,
            voice: null,
            eventIds: row.events.flatMap((event) => event.sourceEventIds),
            observations: {
              classifier: 'pentatonic',
              distanceClass: distance.distanceClass,
              sharedCount: distance.sharedCount,
              chromaticDisplacement: distance.chromaticDisplacement,
              mapMethod: null,
            },
            confidence: 'descriptive',
            limitation: 'pentatonic NEAR is a five-note distance class, not M-NEAR',
            bmefCriterion: 'J1',
          });
        }
      } else if ((family === 'hexatonic' || family === 'wps' || family === 'bhl') && declared.length === 6 && sameSize) {
        const distance = measureHexatonicDistance(declared, row.pcs);
        add({
          metricId: 'collection-distance',
          metricVersion: 'hexatonic-distance-h2',
          bars: [bar],
          onsetInBar: row.events[0]?.onsetInBar ?? null,
          instrument: null,
          partId: null,
          voice: null,
          eventIds: row.events.flatMap((event) => event.sourceEventIds),
          observations: {
            classifier: family === 'hexatonic' || family === 'wps' ? 'hexatonic' : 'six-note-cardinality',
            distanceClass: distance.distanceClass,
            sharedCount: distance.sharedCount,
            meanMotion: distance.meanMotion,
            mapMethod: null,
          },
          confidence: 'descriptive',
          limitation: 'hexatonic cutoffs follow six-note cardinality',
          bmefCriterion: 'J1',
        });
      } else if (row.pcs.length > 0) {
        const onlyBar = row.pcs.filter((pc) => !declared.includes(pc));
        const onlyField = declared.filter((pc) => !row.pcs.includes(pc));
        const assignment = minimumAssignment(onlyBar, onlyField);
        add({
          metricId: 'collection-distance',
          metricVersion: 'pitch-class-assignment-1',
          bars: [bar],
          onsetInBar: row.events[0]?.onsetInBar ?? null,
          instrument: null,
          partId: null,
          voice: null,
          eventIds: row.events.flatMap((event) => event.sourceEventIds),
          observations: {
            classifier: 'none',
            distanceClass: null,
            sharedCount: row.pcs.filter((pc) => declared.includes(pc)).length,
            assignmentSum: assignment.sum,
            mapMethod: null,
          },
          confidence: 'limited',
          limitation: 'cardinality does not match a pentatonic or hexatonic classifier, so no distance class is assigned',
          bmefCriterion: 'J1',
        });
      }
    }
    const roles: string[] = [];
    for (const bar of bars) {
      const row = barSets.get(bar)!;
      roles.push(row.pcs.length ? placementAgainstHome(declared, row.pcs) : 'outside');
    }
    const path = roles.map((role, index) => {
      if (role === 'inside' && index > 0 && roles[index - 1] === 'outside') return 'return';
      return role;
    });
    add({
      metricId: 'inside-outside-return',
      metricVersion: 'inside-outside-return-1',
      bars,
      onsetInBar: { n: 0, d: 1 },
      instrument: null,
      partId: null,
      voice: null,
      eventIds: [],
      observations: { path: path.join(','), error: false },
      confidence: 'descriptive',
      limitation: 'return means the sounding set comes back inside the declared field',
      bmefCriterion: 'J1',
    });
  }

  let previous: number[] | null = null;
  let previousBar = 0;
  for (const bar of bars) {
    const row = barSets.get(bar)!;
    if (previous) {
      const retained = row.pcs.filter((pc) => previous.includes(pc));
      add({
        metricId: 'common-tone-retention',
        metricVersion: 'common-tone-retention-1',
        bars: [previousBar, bar],
        onsetInBar: row.events[0]?.onsetInBar ?? { n: 0, d: 1 },
        instrument: null,
        partId: null,
        voice: null,
        eventIds: row.events.flatMap((event) => event.sourceEventIds),
        observations: { retained: retained.join(','), count: retained.length },
        confidence: 'descriptive',
        limitation: 'retention is pitch-class overlap, not a claim that the tone is audible',
        bmefCriterion: 'J1',
      });
      const leftOnly = previous.filter((pc) => !row.pcs.includes(pc));
      const rightOnly = row.pcs.filter((pc) => !previous.includes(pc));
      const assignment = minimumAssignment(leftOnly, rightOnly);
      add({
        metricId: 'harmonic-displacement',
        metricVersion: 'pitch-class-assignment-1',
        bars: [previousBar, bar],
        onsetInBar: row.events[0]?.onsetInBar ?? null,
        instrument: null,
        partId: null,
        voice: null,
        eventIds: row.events.flatMap((event) => event.sourceEventIds),
        observations: {
          voiceLeading: 'PITCH_CLASS_PROXIMITY',
          assignmentSum: assignment.sum,
          distanceClass: null,
          mapMethod: null,
        },
        confidence: 'descriptive',
        limitation: 'pitch-class assignment is not registered voice-leading and not M-NEAR',
        bmefCriterion: 'J2',
      });
    }
    previous = row.pcs;
    previousBar = bar;
  }

  const voices = new Map<string, CanonicalEvent[]>();
  for (const event of score.soundingEvents) {
    if (event.rest || event.soundingMidi === null) continue;
    const key = `${event.partId}:${event.voice}`;
    const list = voices.get(key) ?? [];
    list.push(event);
    voices.set(key, list);
  }
  for (const [key, events] of voices) {
    const ordered = [...events].sort((a, b) => a.onset.n * b.onset.d - b.onset.n * a.onset.d);
    const contour: string[] = [];
    const histogram = new Map<number, number>();
    for (let index = 1; index < ordered.length; index += 1) {
      const delta = ordered[index]!.soundingMidi! - ordered[index - 1]!.soundingMidi!;
      contour.push(delta > 0 ? 'up' : delta < 0 ? 'down' : 'repeat');
      histogram.set(delta, (histogram.get(delta) ?? 0) + 1);
      add({
        metricId: 'registered-voice-leading',
        metricVersion: 'registered-voice-leading-1',
        bars: [ordered[index - 1]!.bar, ordered[index]!.bar],
        onsetInBar: ordered[index]!.onsetInBar,
        instrument: ordered[index]!.instrument,
        partId: ordered[index]!.partId,
        voice: ordered[index]!.voice,
        eventIds: [...ordered[index - 1]!.sourceEventIds, ...ordered[index]!.sourceEventIds],
        observations: {
          voiceLeading: 'REGISTER',
          semitones: delta,
          fromMidi: ordered[index - 1]!.soundingMidi,
          toMidi: ordered[index]!.soundingMidi,
          distanceClass: null,
          mapMethod: null,
        },
        confidence: 'descriptive',
        limitation: null,
        bmefCriterion: 'J2',
      });
    }
    const midis = ordered.map((event) => event.soundingMidi!);
    add({
      metricId: 'melodic-contour',
      metricVersion: 'melodic-contour-1',
      bars: [...new Set(ordered.map((event) => event.bar))],
      onsetInBar: ordered[0]?.onsetInBar ?? null,
      instrument: ordered[0]?.instrument ?? null,
      partId: ordered[0]?.partId ?? null,
      voice: ordered[0]?.voice ?? null,
      eventIds: ordered.flatMap((event) => event.sourceEventIds),
      observations: { contour: contour.join(' '), voice: key },
      confidence: 'descriptive',
      limitation: null,
      bmefCriterion: 'U1',
    });
    add({
      metricId: 'interval-distribution',
      metricVersion: 'interval-distribution-1',
      bars: [...new Set(ordered.map((event) => event.bar))],
      onsetInBar: ordered[0]?.onsetInBar ?? null,
      instrument: ordered[0]?.instrument ?? null,
      partId: ordered[0]?.partId ?? null,
      voice: ordered[0]?.voice ?? null,
      eventIds: ordered.flatMap((event) => event.sourceEventIds),
      observations: {
        intervals: [...histogram.entries()].sort((a, b) => a[0] - b[0]).map(([interval, count]) => `${interval}:${count}`).join(','),
      },
      confidence: 'descriptive',
      limitation: null,
      bmefCriterion: 'J2',
    });
    add({
      metricId: 'tessitura',
      metricVersion: 'tessitura-1',
      bars: [...new Set(ordered.map((event) => event.bar))],
      onsetInBar: ordered[0]?.onsetInBar ?? null,
      instrument: ordered[0]?.instrument ?? null,
      partId: ordered[0]?.partId ?? null,
      voice: ordered[0]?.voice ?? null,
      eventIds: ordered.flatMap((event) => event.sourceEventIds),
      observations: {
        low: Math.min(...midis),
        high: Math.max(...midis),
        mean: mean(midis),
      },
      confidence: 'descriptive',
      limitation: null,
      bmefCriterion: 'U6',
    });
  }

  const bhl = readBhlEvidence(request.xml);
  for (const motif of bhl.motifs) {
    for (const match of motif.matches) {
      const [partId, voice] = motif.voice.split(':');
      const linked = score.sourceEvents.filter(
        (event) => event.partId === partId && event.voice === voice && event.bar === match.bar && formatRational(event.onsetInBar) === formatRational(match.onsetInBar),
      );
      add({
        metricId: 'motif-recurrence',
        metricVersion: 'bhl-opening-cell-1',
        bars: [motif.openingBar, match.bar],
        onsetInBar: match.onsetInBar,
        instrument: linked[0]?.instrument ?? null,
        partId: partId ?? null,
        voice: voice ?? null,
        eventIds: linked.map((event) => event.id),
        observations: { kind: match.kind, detail: match.detail, recurrence: motif.recurrence },
        confidence: 'limited',
        limitation: 'opening-cell window from the BHL reader; not SIATEC and not a perceptual motif',
        bmefCriterion: 'U1',
      });
    }
    if (motif.matches.length === 0) {
      add({
        metricId: 'motif-recurrence',
        metricVersion: 'bhl-opening-cell-1',
        bars: [motif.openingBar],
        onsetInBar: motif.openingOnset,
        instrument: null,
        partId: motif.voice.split(':')[0] ?? null,
        voice: motif.voice.split(':')[1] ?? null,
        eventIds: [],
        observations: { kind: null, recurrence: motif.recurrence },
        confidence: 'limited',
        limitation: 'no later window matched the opening cell',
        bmefCriterion: 'U1',
      });
    }
  }

  if (request.motifMap) {
    try {
      const mapped = mapMotifPitches({
        motif: { id: 'declared-motif', notes: request.motifMap.notes, barCount: 1 },
        rhythm: request.motifMap.notes.map((note) => ({ kind: 'note' as const, startBeat: note.startBeat, duration: note.duration })),
        source: request.motifMap.source,
        target: request.motifMap.target,
        method: request.motifMap.method,
        meter: { beats: 4, beatType: 4 },
      });
      add({
        metricId: 'motif-map',
        metricVersion: 'motif-map-1',
        bars: [],
        onsetInBar: null,
        instrument: null,
        partId: null,
        voice: null,
        eventIds: [],
        observations: {
          mapMethod: request.motifMap.method,
          distanceClass: null,
          pitches: mapped.notes.map((note) => note.pitch).join(','),
        },
        confidence: 'descriptive',
        limitation: 'M-DEG and M-NEAR map a supplied motif; they are not the pentatonic NEAR distance class',
        bmefCriterion: 'U1',
      });
    } catch (error) {
      add({
        metricId: 'motif-map',
        metricVersion: 'motif-map-1',
        bars: [],
        onsetInBar: null,
        instrument: null,
        partId: null,
        voice: null,
        eventIds: [],
        observations: { mapMethod: request.motifMap.method, distanceClass: null, pitches: null },
        confidence: 'limited',
        limitation: error instanceof Error ? error.message : String(error),
        bmefCriterion: 'U1',
      });
    }
  }

  return { version: HARMONIC_EVIDENCE_VERSION, sha256: score.sha256, findings };
}
