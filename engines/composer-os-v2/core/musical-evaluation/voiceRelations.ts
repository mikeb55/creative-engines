/**
 * Pairwise voice relations for any number of parts.
 * Evidence only. Nothing here rewrites a note.
 */

export type MotionKind = 'contrary' | 'oblique' | 'parallel' | 'similar';

export interface RelationEvent {
  partId: string;
  partName: string;
  voice: string;
  bar: number;
  onset: number;
  duration: number;
  midi: number | null;
}

export interface MotionObservation {
  bar: number;
  onset: number;
  voiceA: string;
  voiceB: string;
  kind: MotionKind;
  pitchA: number;
  pitchB: number;
  previousA: number;
  previousB: number;
}

export interface IntervalObservation {
  bar: number;
  onset: number;
  voiceA: string;
  voiceB: string;
  midiA: number;
  midiB: number;
  semitones: number;
  interval: 'P1' | 'P5' | 'P8' | 'other';
  chordal: boolean;
}

export interface CrossingObservation {
  bar: number;
  onset: number;
  voiceA: string;
  voiceB: string;
  pitchA: number;
  pitchB: number;
}

export interface VoiceRelationReport {
  motions: MotionObservation[];
  intervals: IntervalObservation[];
  crossings: CrossingObservation[];
  overlaps: number;
}

export function motionKind(deltaA: number, deltaB: number): MotionKind | null {
  if (deltaA === 0 && deltaB !== 0) return 'oblique';
  if (deltaB === 0 && deltaA !== 0) return 'oblique';
  if (deltaA !== 0 && deltaB !== 0 && Math.sign(deltaA) !== Math.sign(deltaB)) return 'contrary';
  if (deltaA !== 0 && deltaA === deltaB) return 'parallel';
  if (deltaA !== 0 && Math.sign(deltaA) === Math.sign(deltaB)) return 'similar';
  return null;
}

function voiceId(event: RelationEvent): string {
  return `${event.partId}|${event.voice}`;
}

function perfect(semitones: number): IntervalObservation['interval'] {
  const span = Math.abs(semitones);
  const pc = span % 12;
  if (pc === 0 && span >= 12) return 'P8';
  if (pc === 0) return 'P1';
  if (pc === 7) return 'P5';
  return 'other';
}

export function relateVoices(events: readonly RelationEvent[]): VoiceRelationReport {
  const sounding = events.filter((event) => event.midi !== null);
  const keys = [...new Set(sounding.map(voiceId))];
  const motions: MotionObservation[] = [];
  const intervals: IntervalObservation[] = [];
  const crossings: CrossingObservation[] = [];
  let overlaps = 0;
  const onsets = [...new Set(sounding.map((event) => event.onset))].sort((a, b) => a - b);

  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      const a = keys[i]!;
      const b = keys[j]!;
      let prevA: number | null = null;
      let prevB: number | null = null;
      for (const onset of onsets) {
        const pitchA = topAt(sounding, a, onset);
        const pitchB = topAt(sounding, b, onset);
        if (pitchA === null || pitchB === null) continue;
        overlaps += 1;
        const sample = sounding.find((event) => voiceId(event) === a && event.onset === onset) ?? sounding.find((event) => voiceId(event) === a);
        intervals.push({
          bar: sample?.bar ?? 1,
          onset,
          voiceA: a,
          voiceB: b,
          midiA: pitchA,
          midiB: pitchB,
          semitones: Math.abs(pitchA - pitchB),
          interval: perfect(pitchA - pitchB),
          chordal: false,
        });
        if (prevA !== null && prevB !== null) {
          const kind = motionKind(pitchA - prevA, pitchB - prevB);
          if (kind && sample) {
            motions.push({
              bar: sample.bar,
              onset,
              voiceA: a,
              voiceB: b,
              kind,
              pitchA,
              pitchB,
              previousA: prevA,
              previousB: prevB,
            });
          }
          if ((prevA - prevB) * (pitchA - pitchB) < 0 && sample) {
            crossings.push({ bar: sample.bar, onset, voiceA: a, voiceB: b, pitchA, pitchB });
          }
        }
        prevA = pitchA;
        prevB = pitchB;
      }
    }
  }

  return { motions, intervals, crossings, overlaps };
}

function topAt(events: readonly RelationEvent[], key: string, onset: number): number | null {
  const here = events.filter((event) => voiceId(event) === key && event.onset <= onset && onset < event.onset + event.duration);
  if (!here.length) return null;
  return Math.max(...here.map((event) => event.midi!));
}
