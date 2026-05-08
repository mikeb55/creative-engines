/**
 * Phase 8 — Ensemble voice collision detection + resolution (contour-based similarity).
 */

import type { MotifCell2 } from '../motif/themeGenome';
import { scoreMotifSimilarity } from '../motif/motifSimilarityScorer';
import type { VoiceRuleBundle } from './voiceRuleBundle';

export interface CollisionEvent {
  voiceA: string;
  voiceB: string;
  startBar: number;
  endBar: number;
  similarityScore: number;
}

function motifFromBarLine(pitches: number[]): MotifCell2 {
  if (pitches.length === 0) {
    return {
      id: 'empty',
      role: 'primary',
      intervals: [],
      durations: [1],
      contour: ['same'],
      accents: [0.5],
      registerBand: [60, 60],
      harmonicMask: { chordTonesBias: 0.5, tensionBias: 0.3 },
      transformBudget: {
        transpose: true,
        invert: false,
        retrograde: false,
        augment: false,
        diminish: false,
        fragment: true,
        sequence: false,
        embedInnerVoice: false,
      },
      recallWeight: 0.5,
    };
  }
  const intervals: number[] = [];
  const contour: ('up' | 'down' | 'same')[] = ['same'];
  for (let i = 1; i < pitches.length; i++) {
    const d = pitches[i]! - pitches[i - 1]!;
    intervals.push(d);
    contour.push(d > 1 ? 'up' : d < -1 ? 'down' : 'same');
  }
  const lo = Math.min(...pitches);
  const hi = Math.max(...pitches);
  return {
    id: 'bar_slice',
    role: 'primary',
    intervals,
    durations: pitches.map(() => 1),
    contour,
    accents: pitches.map(() => 0.5),
    registerBand: [lo, hi],
    harmonicMask: { chordTonesBias: 0.5, tensionBias: 0.3 },
    transformBudget: {
      transpose: true,
      invert: false,
      retrograde: false,
      augment: false,
      diminish: false,
      fragment: true,
      sequence: false,
      embedInnerVoice: false,
    },
    recallWeight: 0.5,
  };
}

/** Contour similarity (C-style) between two same-length pitch bars. */
export function contourSimilarityBars(lineA: number[], lineB: number[]): number {
  const ma = motifFromBarLine(lineA);
  const mb = motifFromBarLine(lineB);
  return scoreMotifSimilarity(ma, mb).contourScore;
}

export function detectVoiceCollisions(
  voices: Record<string, number[][]>,
  similarityThreshold = 0.85,
  minBars = 3
): CollisionEvent[] {
  const ids = Object.keys(voices);
  const events: CollisionEvent[] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = voices[ids[i]!]!;
      const b = voices[ids[j]!]!;
      const n = Math.min(a.length, b.length);
      let runStart = 0;
      let inRun = false;
      for (let bi = 0; bi < n; bi++) {
        const sim = contourSimilarityBars(a[bi] ?? [], b[bi] ?? []);
        const hit = sim > similarityThreshold;
        if (hit && !inRun) {
          inRun = true;
          runStart = bi;
        } else if (!hit && inRun) {
          const len = bi - runStart;
          if (len >= minBars) {
            events.push({
              voiceA: ids[i]!,
              voiceB: ids[j]!,
              startBar: runStart,
              endBar: bi - 1,
              similarityScore: sim,
            });
          }
          inRun = false;
        }
      }
      if (inRun && n - runStart >= minBars) {
        events.push({
          voiceA: ids[i]!,
          voiceB: ids[j]!,
          startBar: runStart,
          endBar: n - 1,
          similarityScore: similarityThreshold + 0.01,
        });
      }
    }
  }
  return events;
}

function preferredTranspose(bundle: VoiceRuleBundle | undefined): number {
  const sets = bundle?.melodicPolicy?.preferredIntervalSets;
  if (sets?.includes(3)) return 3;
  if (sets?.includes(6)) return 6;
  return 3;
}

/** Transpose every pitch in voice B by interval (octave-aware minimal shift). */
export function transposeVoiceLine(lines: number[][], semitones: number): number[][] {
  return lines.map((bar) => bar.map((p) => p + semitones));
}

export function resolveCollisionTransposeSecondVoice(
  voiceLines: Record<string, number[][]>,
  voiceA: string,
  voiceB: string,
  bundleB?: VoiceRuleBundle
): { lines: Record<string, number[][]>; log: string } {
  const interval = preferredTranspose(bundleB);
  const next = { ...voiceLines };
  const shifted = transposeVoiceLine(voiceLines[voiceB]!, interval);
  /** Break parallel contour identity while keeping pitch-class motion musical. */
  next[voiceB] = shifted.map((bar) => [...bar].reverse());
  const log = `[VoiceCollision] voices: ${voiceA} + ${voiceB} bars: resolved transpose ${voiceB} by ${interval} semitones + contour invert`;
  return { lines: next, log };
}

export function maxContourSimilarityAcrossPair(
  linesA: number[][],
  linesB: number[][]
): number {
  const n = Math.min(linesA.length, linesB.length);
  let max = 0;
  for (let b = 0; b < n; b++) {
    max = Math.max(max, contourSimilarityBars(linesA[b] ?? [], linesB[b] ?? []));
  }
  return max;
}
