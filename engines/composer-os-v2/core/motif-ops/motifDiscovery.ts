/**
 * Bounded translatable-pattern discovery.
 * Contiguous patterns of 3–12 notes. Full subset search is not run past the window cap.
 */

import type { CanonicalEvaluationScore } from '../musical-evaluation/canonicalScore';

export interface DiscoveredOccurrence {
  bar: number;
  beat: number;
  transposition: number;
}

export interface DiscoveredPattern {
  id: string;
  points: Array<{ onset: number; midi: number }>;
  occurrences: DiscoveredOccurrence[];
}

export interface MotifDiscovery {
  patterns: DiscoveredPattern[];
  limits: { windowCap: 64; truncated: boolean };
  musicalQualityScore: null;
  musicallyApproved: false;
}

interface Point {
  onset: number;
  midi: number;
  bar: number;
  beat: number;
}

const WINDOW_CAP = 64;
const MAX_PATTERNS = 20;

function quarters(value: { n: number; d: number }): number {
  return value.n / value.d;
}

export function discoverMotifs(score: CanonicalEvaluationScore, partFilter?: readonly string[]): MotifDiscovery {
  const wanted = partFilter ? new Set(partFilter) : null;
  const patterns: DiscoveredPattern[] = [];
  let truncated = false;
  const partIds = [...new Set(score.soundingEvents.map((event) => event.partId))];
  for (const partId of partIds) {
    if (wanted && !wanted.has(partId)) continue;
    const points: Point[] = score.soundingEvents
      .filter((event) => event.partId === partId && event.soundingMidi !== null)
      .map((event) => ({
        onset: quarters(event.onset),
        midi: event.soundingMidi!,
        bar: event.bar,
        beat: quarters(event.onsetInBar),
      }))
      .sort((a, b) => a.onset - b.onset || a.midi - b.midi);
    if (points.length > WINDOW_CAP) truncated = true;
    const grouped = new Map<string, Point[][]>();
    const limit = points.length;
    for (let start = 0; start < limit; start += 1) {
      const longest = Math.min(12, limit - start);
      for (let length = 3; length <= longest; length += 1) {
        const slice = points.slice(start, start + length);
        const key = signature(slice);
        const list = grouped.get(key) ?? [];
        list.push(slice);
        grouped.set(key, list);
      }
    }
    const ranked: DiscoveredPattern[] = [];
    for (const slices of grouped.values()) {
      if (slices.length < 2) continue;
      const proto = slices[0]!;
      ranked.push({
        id: '',
        points: proto.map((point) => ({ onset: point.onset - proto[0]!.onset, midi: point.midi - proto[0]!.midi })),
        occurrences: slices.map((slice) => ({
          bar: slice[0]!.bar,
          beat: slice[0]!.beat,
          transposition: slice[0]!.midi - proto[0]!.midi,
        })),
      });
    }
    ranked.sort((a, b) => {
      const coverage = b.occurrences.length * b.points.length - a.occurrences.length * a.points.length;
      if (coverage !== 0) return coverage;
      const onset = (a.occurrences[0]?.bar ?? 0) - (b.occurrences[0]?.bar ?? 0) || (a.occurrences[0]?.beat ?? 0) - (b.occurrences[0]?.beat ?? 0);
      if (onset !== 0) return onset;
      const left = a.points.map((point) => point.midi).join(',');
      const right = b.points.map((point) => point.midi).join(',');
      return left < right ? -1 : left > right ? 1 : 0;
    });
    for (const pattern of ranked.slice(0, MAX_PATTERNS)) patterns.push(pattern);
  }
  patterns.forEach((pattern, index) => {
    pattern.id = `p${index + 1}`;
  });
  return {
    patterns: patterns.slice(0, MAX_PATTERNS),
    limits: { windowCap: WINDOW_CAP, truncated },
    musicalQualityScore: null,
    musicallyApproved: false,
  };
}

function signature(slice: readonly Point[]): string {
  const origin = slice[0]!;
  const body = slice.slice(1).map((point) => `${point.onset - origin.onset}:${point.midi - origin.midi}`);
  return `${slice.length}|${body.join(',')}`;
}
