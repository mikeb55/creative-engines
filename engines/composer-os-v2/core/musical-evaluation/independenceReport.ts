/**
 * N-voice independence evidence.
 * Counts perceptual fusion correlates. No threshold and no pass or fail.
 */

import type { CanonicalEvaluationScore } from './canonicalScore';
import { relateVoices, type MotionKind, type RelationEvent } from './voiceRelations';

export interface PairIndependence {
  pair: [string, string];
  motion: { contrary: number; oblique: number; similar: number; parallel: number };
  coOnsetRate: number;
  parallelPerfectRuns: Array<{ startBar: number; length: number; interval: 'P1' | 'P5' | 'P8' }>;
  coModulationRuns: Array<{ startBar: number; length: number }>;
  crossings: number;
  overlaps: number;
  attackJaccard: number;
}

export interface IndependenceReport {
  version: 'independence-1';
  parts: string[];
  pairs: PairIndependence[];
  densityOver3Bars: number[];
  notes: string[];
  musicalQualityScore: null;
  musicallyApproved: false;
}

const BANNED = /\b(good|weak|better|worse|poor|excellent|bad|great|beautiful)\b/i;

export function assertNeutralNotes(notes: readonly string[]): void {
  for (const note of notes) {
    if (BANNED.test(note)) throw new Error(`value word in evidence note: ${note}`);
  }
}

function quarters(onset: { n: number; d: number }): number {
  return onset.n / onset.d;
}

function eventsOf(score: CanonicalEvaluationScore): RelationEvent[] {
  return score.soundingEvents.map((event) => ({
    partId: event.partId,
    partName: event.partName,
    voice: event.voice,
    bar: event.bar,
    onset: quarters(event.onset),
    duration: quarters(event.duration),
    midi: event.soundingMidi,
  }));
}

function nameOf(score: CanonicalEvaluationScore, partId: string): string {
  return score.parts.find((part) => part.id === partId)?.name ?? partId;
}

export function buildIndependenceReport(score: CanonicalEvaluationScore): IndependenceReport {
  const events = eventsOf(score);
  const relation = relateVoices(events);
  const partIds = score.parts.map((part) => part.id);
  const pairs: PairIndependence[] = [];
  const notes: string[] = [];

  for (let i = 0; i < partIds.length; i += 1) {
    for (let j = i + 1; j < partIds.length; j += 1) {
      const left = partIds[i]!;
      const right = partIds[j]!;
      const voiceA = events.find((event) => event.partId === left);
      const voiceB = events.find((event) => event.partId === right);
      if (!voiceA || !voiceB) continue;
      const keyA = `${left}|${voiceA.voice}`;
      const keyB = `${right}|${voiceB.voice}`;
      const motions = relation.motions.filter((motion) => motion.voiceA === keyA && motion.voiceB === keyB);
      const counts: Record<MotionKind, number> = { contrary: 0, oblique: 0, similar: 0, parallel: 0 };
      for (const motion of motions) counts[motion.kind] += 1;
      const total = motions.length || 1;
      const attacksA = new Set(events.filter((event) => event.partId === left && event.midi !== null).map((event) => event.onset));
      const attacksB = new Set(events.filter((event) => event.partId === right && event.midi !== null).map((event) => event.onset));
      let shared = 0;
      for (const onset of attacksA) if (attacksB.has(onset)) shared += 1;
      const union = new Set([...attacksA, ...attacksB]).size || 1;
      const intervals = relation.intervals.filter((interval) => interval.voiceA === keyA && interval.voiceB === keyB);
      const parallelPerfectRuns = perfectRuns(intervals, motions);
      const coModulationRuns = modulationRuns(intervals);
      const crossings = relation.crossings.filter((crossing) => crossing.voiceA === keyA && crossing.voiceB === keyB).length;
      const overlaps = intervals.length;
      const leftName = nameOf(score, left);
      const rightName = nameOf(score, right);
      for (const run of parallelPerfectRuns) {
        const intervalName = run.interval === 'P1' ? 'unisons' : run.interval === 'P5' ? 'fifths' : 'octaves';
        notes.push(
          `${leftName} and ${rightName} move in parallel ${intervalName} for ${run.length} attacks from bar ${run.startBar}. This often fuses the two lines.`,
        );
      }
      pairs.push({
        pair: [leftName, rightName],
        motion: {
          contrary: counts.contrary / total,
          oblique: counts.oblique / total,
          similar: counts.similar / total,
          parallel: counts.parallel / total,
        },
        coOnsetRate: shared / union,
        parallelPerfectRuns,
        coModulationRuns,
        crossings,
        overlaps,
        attackJaccard: shared / union,
      });
    }
  }

  const byBar = new Map<number, Set<string>>();
  for (const event of events) {
    if (event.midi === null) continue;
    const set = byBar.get(event.bar) ?? new Set<string>();
    set.add(event.partId);
    byBar.set(event.bar, set);
  }
  const densityOver3Bars = [...byBar.entries()].filter(([, parts]) => parts.size > 3).map(([bar]) => bar).sort((a, b) => a - b);
  if (partIds.length > 3) {
    notes.push('More than three sounding parts makes the lines harder to track.');
  }
  assertNeutralNotes(notes);
  return {
    version: 'independence-1',
    parts: score.parts.map((part) => part.name),
    pairs,
    densityOver3Bars,
    notes,
    musicalQualityScore: null,
    musicallyApproved: false,
  };
}

function perfectRuns(
  intervals: ReturnType<typeof relateVoices>['intervals'],
  motions: ReturnType<typeof relateVoices>['motions'],
): PairIndependence['parallelPerfectRuns'] {
  const runs: PairIndependence['parallelPerfectRuns'] = [];
  let current: { startBar: number; length: number; interval: 'P1' | 'P5' | 'P8' } | null = null;
  intervals.forEach((interval, index) => {
    const motion = motions[index - 1];
    const holds = interval.interval !== 'other' && (index === 0 || motion?.kind === 'parallel');
    if (holds && interval.interval !== 'other') {
      if (!current || current.interval !== interval.interval) {
        if (current && current.length >= 2) runs.push(current);
        current = { startBar: interval.bar, length: 1, interval: interval.interval };
      } else {
        current.length += 1;
      }
    } else if (current) {
      if (current.length >= 2) runs.push(current);
      current = null;
    }
  });
  if (current && current.length >= 2) runs.push(current);
  return runs;
}

function modulationRuns(intervals: ReturnType<typeof relateVoices>['intervals']): Array<{ startBar: number; length: number }> {
  const runs: Array<{ startBar: number; length: number }> = [];
  let length = 1;
  let start = intervals[0]?.bar ?? 1;
  for (let i = 1; i < intervals.length; i += 1) {
    if (intervals[i]!.interval === intervals[i - 1]!.interval && intervals[i]!.interval !== 'other') {
      length += 1;
    } else {
      if (length >= 3) runs.push({ startBar: start, length });
      length = 1;
      start = intervals[i]!.bar;
    }
  }
  if (length >= 3) runs.push({ startBar: start, length });
  return runs;
}
