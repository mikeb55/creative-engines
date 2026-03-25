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
 * LOCK-level duo motifs: 2–4 beats, strong intervals (3rd/4th/5th/6th or chromatic enclosure),
 * varied rhythmic shape (avoids even subdivision-only patterns).
 */
function generateDuoLockMotifs(seed: number, registerLow: number, registerHigh: number): BaseMotif[] {
  const strong = [3, 4, 5, 6, -3, -4, -5, -6];
  const mk = (id: string, salt: number): BaseMotif => {
    const rnd = seededRandom(seed + salt * 997);
    const nNotes = 2 + Math.floor(rnd() * 2);
    const totalBeats = Math.min(4, 2 + Math.floor(rnd() * 3));
    const durations: number[] = [];
    let acc = 0;
    for (let i = 0; i < nNotes; i++) {
      const rem = totalBeats - acc;
      if (rem <= 0.01) break;
      const d =
        i === nNotes - 1 ? rem : qBeat(0.25 + rnd() * Math.min(1.25, rem * 0.65));
      durations.push(Math.max(0.25, Math.min(d, rem)));
      acc += durations[durations.length - 1];
    }
    const s = durations.reduce((a, b) => a + b, 0);
    const norm = durations.map((d) => qBeat((d / Math.max(s, 0.01)) * totalBeats));
    let t = rnd() < 0.38 ? qBeat(0.25 + rnd() * 0.75) : 0;
    let pitch = registerLow + Math.floor(rnd() * 7);
    const notes: MotifNote[] = [];
    for (let i = 0; i < norm.length; i++) {
      if (i > 0) {
        const enc = rnd() < 0.24;
        pitch = enc
          ? Math.max(registerLow, Math.min(registerHigh, pitch + (rnd() < 0.5 ? -1 : 1)))
          : Math.max(
              registerLow,
              Math.min(registerHigh, pitch + strong[Math.floor(rnd() * strong.length)])
            );
      }
      notes.push({ pitch, startBeat: qBeat(t), duration: qBeat(norm[i]) });
      t += norm[i];
    }
    return { id, notes, barCount: 1 };
  };
  return [mk('m1', 1), mk('m2', 2)];
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
