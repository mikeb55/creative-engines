/**
 * Motif + melody → ScoreModel. Used only by generateSong (single pipeline).
 */

import { chordTonesFromSymbol } from '../harmony/chordSymbolAnalysis';
import type { KeySignatureLine, MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import { createNote, createRest, createPart, createScore, addEvent } from '../score-model/scoreEventBuilder';

const MELO_LOW = 60;
const MELO_HIGH = 76;

export type Rng = () => number;

/** Deterministic PRNG (mulberry32). */
export function mulberry32(seed: number): Rng {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampMelody(midi: number): number {
  return Math.max(MELO_LOW, Math.min(MELO_HIGH, midi));
}

function chordToneMidisForMelody(chord: string): number[] {
  const t = chordTonesFromSymbol(chord);
  const raw = [t.root, t.third, t.fifth, t.seventh];
  return raw.map((m) => {
    let p = m;
    while (p < MELO_LOW) p += 12;
    while (p > MELO_HIGH) p -= 12;
    return clampMelody(p);
  });
}

function nearestInSet(target: number, set: number[]): number {
  let best = set[0]!;
  let d = Math.abs(target - best);
  for (const x of set) {
    const dx = Math.abs(target - x);
    if (dx < d) {
      d = dx;
      best = x;
    }
  }
  return best;
}

/** 2–4 motif intervals (semitone steps from first pitch of motif). */
export function buildMotif(rng: Rng): number[] {
  const len = 2 + Math.floor(rng() * 3);
  const steps = [-2, -1, 0, 1, 2, 3, 4, 5, 7];
  const intervals: number[] = [0];
  for (let i = 1; i < len; i++) {
    const step = steps[Math.floor(rng() * steps.length)]!;
    const prev = intervals[i - 1]!;
    const next = prev + step;
    intervals.push(next);
  }
  return intervals;
}

/** Mostly stepwise motion with occasional small leap; snap to chord tones. */
export function generateMelodyFromMotif(
  chordBars: string[],
  motifIntervals: number[],
  rng: Rng
): PartModel {
  const n = chordBars.length;
  const part = createPart(
    'melody',
    'Melody',
    'melody_line',
    0,
    'treble',
    n,
    (bar) => chordBars[bar - 1],
    () => undefined
  );

  let prevPitch = 64;

  for (let barIdx = 0; barIdx < n; barIdx++) {
    const chord = chordBars[barIdx]!;
    const tones = chordToneMidisForMelody(chord);
    const anchor = nearestInSet(prevPitch + Math.floor((rng() - 0.5) * 4), tones);
    const m = part.measures[barIdx]!;

    /** One bar: 3 eighth-based notes + rest; durations sum to BEATS_PER_MEASURE. */
    const starts = [0, 0.5, 1.25];
    const durs = [0.5, 0.75, 0.75];
    let cursor = 0;
    for (let k = 0; k < motifIntervals.length && k < starts.length; k++) {
      const st = starts[k]!;
      if (st > cursor) {
        addEvent(m, createRest(cursor, st - cursor));
      }
      const rawPitch = anchor + motifIntervals[k]!;
      const stepped = clampMelody(nearestInSet(rawPitch, tones));
      prevPitch = stepped;
      addEvent(m, createNote(stepped, st, durs[k]!));
      cursor = st + durs[k]!;
    }
    if (cursor < BEATS_PER_MEASURE) {
      addEvent(m, createRest(cursor, BEATS_PER_MEASURE - cursor));
    }
  }
  return part;
}

function keyLineFromRequest(key?: string): KeySignatureLine | undefined {
  if (!key?.trim()) {
    return { fifths: 0, mode: 'major', hideKeySignature: false };
  }
  const k = key.trim();
  if (/^[A-G][#b]?\s*m/i.test(k) || /^[A-G][#b]?\s*min/i.test(k)) {
    return { fifths: 0, mode: 'minor', hideKeySignature: false };
  }
  return { fifths: 0, mode: 'major', hideKeySignature: false };
}

export function buildSongScoreModel(
  chordBars: string[],
  seed: number,
  tempo: number,
  key?: string
): ScoreModel {
  const rng = mulberry32(seed >>> 0);
  const motif = buildMotif(rng);
  const melodyPart = generateMelodyFromMotif(chordBars, motif, rng);
  const score = createScore('Song Sketch', [melodyPart], { tempo });
  score.keySignature = keyLineFromRequest(key);
  return score;
}
