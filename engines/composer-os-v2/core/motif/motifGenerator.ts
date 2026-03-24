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

/** Generate 1–2 base motifs (3–5 notes each). */
export function generateMotif(seed: number, registerLow: number, registerHigh: number): BaseMotif[] {
  const rnd = seededRandom(seed);
  const motifs: BaseMotif[] = [];

  const m1: MotifNote[] = [];
  const count1 = Math.min(4, 3 + Math.floor(rnd() * 2));
  let pitch = registerLow + Math.floor(rnd() * 8);
  const dur1 = 4 / count1;
  for (let i = 0; i < count1; i++) {
    const step = [0, 2, -1, 3][i % 4];
    pitch = Math.max(registerLow, Math.min(registerHigh, pitch + step));
    m1.push({ pitch, startBeat: i * dur1, duration: dur1 });
  }
  motifs.push({ id: 'm1', notes: m1, barCount: 1 });

  const m2: MotifNote[] = [];
  const count2 = Math.min(4, 3 + Math.floor(rnd() * 2));
  pitch = registerLow + 5 + Math.floor(rnd() * 4);
  const dur2 = 4 / count2;
  for (let i = 0; i < count2; i++) {
    const step = [0, -2, 1, -3][i % 4];
    pitch = Math.max(registerLow, Math.min(registerHigh, pitch + step));
    m2.push({ pitch, startBeat: i * dur2, duration: dur2 });
  }
  motifs.push({ id: 'm2', notes: m2, barCount: 1 });

  return motifs;
}
