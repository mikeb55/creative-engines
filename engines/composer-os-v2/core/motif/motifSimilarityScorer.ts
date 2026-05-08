/**
 * Motif similarity — GCE-aligned weighted blend for MotifCell2 pairs.
 */

import type { MotifCell2 } from './themeGenome';

export interface MotifSimilarityScore {
  total: number;
  intervalScore: number;
  rhythmScore: number;
  contourScore: number;
  registerScore: number;
}

const DEFAULT_THRESHOLDS = {
  A: 0.65,
  B: 0.45,
  coda: 0.55,
} as const;

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Aligned interval similarity with semitone tolerance; optional inversion read. */
function intervalSpineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const n = Math.max(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const d = Math.abs(a[i]! - b[i]!);
    sum += 1 - Math.min(12, d) / 12;
  }
  const invSum =
    a.length === b.length
      ? a.reduce((s, v, i) => s + (1 - Math.min(12, Math.abs(v + (b[i] ?? 0))) / 12), 0) / Math.max(1, a.length)
      : 0;
  const aligned = sum / n;
  return clamp01(Math.max(aligned, invSum * 0.95));
}

/** Duration pattern similarity via normalized L1 → similarity. */
function rhythmicSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const norm = (d: number[]) => {
    const s = d.reduce((x, y) => x + y, 0);
    return s <= 0 ? d.map(() => 1 / d.length) : d.map((x) => x / s);
  };
  const na = norm(a);
  const nb = norm(b);
  const n = Math.min(na.length, nb.length);
  let l1 = 0;
  for (let i = 0; i < n; i++) {
    l1 += Math.abs(na[i]! - nb[i]!);
  }
  l1 += Math.abs(na.length - nb.length) * 0.25;
  return clamp01(1 / (1 + l1 * 3));
}

function levenshteinNormalized(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0 && n === 0) return 1;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    dp[i]![0] = i;
  }
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost
      );
    }
  }
  const dist = dp[m]![n]!;
  const maxLen = Math.max(m, n);
  return clamp01(1 - dist / maxLen);
}

function contourSimilarityScore(u: ('up' | 'down' | 'same')[], v: ('up' | 'down' | 'same')[]): number {
  const sa = u.join('');
  const sb = v.join('');
  return levenshteinNormalized(sa, sb);
}

/** Overlap of MIDI register bands [lo,hi]. */
function registerBandSimilarity(a: [number, number], b: [number, number]): number {
  const lo = Math.max(a[0], b[0]);
  const hi = Math.min(a[1], b[1]);
  if (hi < lo) return 0;
  const overlap = hi - lo;
  const span = Math.max(a[1] - a[0], 1) + Math.max(b[1] - b[0], 1);
  return clamp01((2 * overlap) / span);
}

export function scoreMotifSimilarity(candidate: MotifCell2, reference: MotifCell2): MotifSimilarityScore {
  const intervalScore = intervalSpineSimilarity(candidate.intervals, reference.intervals);
  const rhythmScore = rhythmicSimilarity(candidate.durations, reference.durations);
  const contourScore = contourSimilarityScore(candidate.contour, reference.contour);
  const registerScore = registerBandSimilarity(candidate.registerBand, reference.registerBand);
  const total = clamp01(
    0.35 * intervalScore + 0.3 * rhythmScore + 0.2 * contourScore + 0.15 * registerScore
  );
  return { total, intervalScore, rhythmScore, contourScore, registerScore };
}

export function meetsRecallThreshold(
  score: MotifSimilarityScore,
  role: 'A' | 'B' | 'coda',
  threshold?: number
): boolean {
  const t = threshold ?? DEFAULT_THRESHOLDS[role];
  return score.total >= t;
}
