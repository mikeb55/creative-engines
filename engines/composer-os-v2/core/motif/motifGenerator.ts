/**
 * Composer OS V2 — Motif generator
 */

import type { BaseMotif, MotifNote } from './motifTypes';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export interface MotifStyleHints {
  triadPairs?: boolean;
  metheny?: boolean;
  bacharach?: boolean;
  /** Guitar–Bass Duo LOCK: motif-first intervals, swing-friendly rhythms, not uniform 8ths. */
  duoLock?: boolean;
}

function qBeat(x: number): number {
  return Math.round(x * 4) / 4;
}

/**
 * V3.0 LOCK: ONE primary motif, 2–3 beats, leap (3rd–6th) → peak → stepwise resolution,
 * span ≤ 9th, asymmetric rhythm (not evenly spaced).
 */
function generateDuoLockMotifs(seed: number, registerLow: number, registerHigh: number): BaseMotif[] {
  const rnd = seededRandom(seed + 3317);
  const totalBeats = 2 + Math.floor(rnd() * 2);
  /** Diatonic-ish leap: 3rd–6th as semitone span 3–9 (minor 3rd through major 6th). */
  const leapSizes = [3, 4, 5, 6, 7, 8, 9];

  let d0 = qBeat(0.35 + rnd() * 0.45);
  let d1 = qBeat(0.28 + rnd() * 0.52);
  let d2 = qBeat(totalBeats - d0 - d1);
  if (d2 < 0.25) {
    d2 = 0.25;
    const rem = totalBeats - d2;
    d0 = qBeat(rem * (0.3 + rnd() * 0.2));
    d1 = qBeat(totalBeats - d0 - d2);
  }
  const sum = d0 + d1 + d2;
  const scale = totalBeats / Math.max(sum, 0.01);
  d0 = qBeat(d0 * scale);
  d1 = qBeat(d1 * scale);
  d2 = qBeat(totalBeats - d0 - d1);
  if (d2 < 0.25) d2 = 0.25;
  /** Rhythmic identity: avoid three equal slices. */
  if (Math.abs(d0 - d1) < 0.12 && Math.abs(d1 - d2) < 0.12) {
    d1 = qBeat(Math.min(d1 + 0.25, totalBeats - d0 - 0.25));
    d2 = qBeat(totalBeats - d0 - d1);
    if (d2 < 0.25) {
      d2 = 0.25;
      d1 = qBeat(totalBeats - d0 - d2);
    }
  }

  const p0 = registerLow + Math.floor(rnd() * 5);
  const up = leapSizes[Math.floor(rnd() * leapSizes.length)];
  const peak = Math.min(registerHigh, p0 + up);
  const stepDown = 1 + Math.floor(rnd() * 2);
  let p2 = peak - stepDown;
  p2 = Math.max(registerLow, Math.min(registerHigh, p2));

  const [a, b, c] = compressMotifToNinthSpan(p0, peak, p2, registerLow, registerHigh);
  return buildDuoMotifNotes(a, b, c, d0, d1, d2);
}

/** Keep rise → peak → fall; total span ≤ 9th (14 semitones). */
function compressMotifToNinthSpan(
  p0: number,
  peak: number,
  p2: number,
  low: number,
  high: number
): [number, number, number] {
  const span = Math.max(p0, peak, p2) - Math.min(p0, peak, p2);
  if (span <= 14) {
    return [
      Math.max(low, Math.min(high, p0)),
      Math.max(low, Math.min(high, peak)),
      Math.max(low, Math.min(high, p2)),
    ];
  }
  const lo = Math.min(p0, peak, p2);
  const hi = Math.max(p0, peak, p2);
  const mid = (lo + hi) / 2;
  const s = 14 / Math.max(hi - lo, 0.01);
  const map = (p: number) => Math.round(mid + (p - mid) * s);
  return [
    Math.max(low, Math.min(high, map(p0))),
    Math.max(low, Math.min(high, map(peak))),
    Math.max(low, Math.min(high, map(p2))),
  ];
}

function buildDuoMotifNotes(
  p0: number,
  peak: number,
  p2: number,
  d0: number,
  d1: number,
  d2: number
): BaseMotif[] {
  const notes: MotifNote[] = [
    { pitch: p0, startBeat: 0, duration: d0 },
    { pitch: peak, startBeat: qBeat(d0), duration: d1 },
    { pitch: p2, startBeat: qBeat(d0 + d1), duration: d2 },
  ];
  return [{ id: 'm1', notes, barCount: 1 }];
}

/** Generate 1–2 base motifs. Triad pairs → 3rd/4th intervals. Metheny → longer durations, fewer attacks. */
export function generateMotif(
  seed: number,
  registerLow: number,
  registerHigh: number,
  hints?: MotifStyleHints
): BaseMotif[] {
  if (hints?.duoLock) {
    return generateDuoLockMotifs(seed, registerLow, registerHigh);
  }
  const rnd = seededRandom(seed);
  const motifs: BaseMotif[] = [];
  const useTriad = hints?.triadPairs ?? false;
  const useMetheny = hints?.metheny ?? false;

  const intervalsTriad = [0, 4, 7, 5, 3];
  const intervalsDefault = [0, 2, -1, 3, 2];
  const steps1 = useTriad ? intervalsTriad : intervalsDefault;

  const m1: MotifNote[] = [];
  const count1 = useMetheny ? 3 : Math.min(4, 2 + Math.floor(rnd() * 3));
  let pitch = registerLow + Math.floor(rnd() * 8);
  const dur1 = 4 / count1;
  for (let i = 0; i < count1; i++) {
    const step = steps1[i % steps1.length];
    pitch = Math.max(registerLow, Math.min(registerHigh, pitch + step));
    const beatOffset = useTriad && i > 0 ? 0.5 : 0;
    m1.push({ pitch, startBeat: i * dur1 + beatOffset, duration: dur1 });
  }
  motifs.push({ id: 'm1', notes: m1, barCount: 1 });

  const steps2 = useTriad ? [0, -3, 5, -4] : [0, -2, 1, -3];
  const m2: MotifNote[] = [];
  const count2 = useMetheny ? 3 : Math.min(4, 2 + Math.floor(rnd() * 3));
  pitch = registerLow + 5 + Math.floor(rnd() * 4);
  const dur2 = 4 / count2;
  for (let i = 0; i < count2; i++) {
    const step = steps2[i % steps2.length];
    pitch = Math.max(registerLow, Math.min(registerHigh, pitch + step));
    const off2 = useTriad && i > 0 ? 0.5 : 0;
    m2.push({ pitch, startBeat: i * dur2 + off2, duration: dur2 });
  }
  motifs.push({ id: 'm2', notes: m2, barCount: 1 });

  return motifs;
}
