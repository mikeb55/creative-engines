/**
 * Wyble Measure-First Generator — uses engines/core.
 * Builds measures with createMeasure/pushNote. No timeline packing.
 */

import type { Score } from '../core/timing';
import { createMeasure, pushNote } from '../core/measureBuilder';
import { validateScore } from '../../scripts/validateScore';
import type { ChordProgression } from './wybleEtudeGenerator';

const UPPER_MIN = 64;
const UPPER_MAX = 76;
const LOWER_MIN = 48;
const LOWER_MAX = 60;
const ROOT_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};
const SCALE_DEGREES: Record<string, number[]> = {
  maj: [0, 2, 4, 5, 7, 9, 11],
  min: [0, 2, 3, 5, 7, 8, 10],
  dom: [0, 2, 4, 5, 7, 9, 10],
};

function parseChord(symbol: string): { root: string; quality: string } {
  const m = symbol.match(/^([A-G][#b]?)(maj7|min7|m7|7|m|dom7)?/i);
  if (!m) return { root: 'C', quality: 'maj' };
  let q = (m[2] ?? 'maj').toLowerCase();
  if (q === 'm7' || q === 'min7') q = 'min';
  if (q === '7' || q === 'dom7') q = 'dom';
  if (q === 'maj7') q = 'maj';
  return { root: m[1], quality: q };
}

function getChordTones(root: string, quality: string, octave: number): number[] {
  const base = (ROOT_MIDI[root] ?? 60) + (octave - 4) * 12;
  const degrees = SCALE_DEGREES[quality] ?? SCALE_DEGREES.maj;
  return degrees.map((d) => base + d);
}

function getChordForBar(progression: ChordProgression, barIndex: number): { root: string; quality: string } {
  let acc = 0;
  for (const seg of progression) {
    if (barIndex < acc + seg.bars) return parseChord(seg.chord);
    acc += seg.bars;
  }
  return parseChord(progression[progression.length - 1]?.chord ?? 'C');
}

function getChordDisplayForBar(progression: ChordProgression, barIndex: number): string {
  let acc = 0;
  for (const seg of progression) {
    if (barIndex < acc + seg.bars) return seg.chord;
    acc += seg.bars;
  }
  return progression[progression.length - 1]?.chord ?? 'C';
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function pickPitch(candidates: number[], last: number, min: number, max: number): number {
  const inRange = candidates.filter((c) => c >= min && c <= max);
  const pool = inRange.length > 0 ? inRange : [clamp(last, min, max)];
  const stepwise = pool.filter((c) => Math.abs(c - last) <= 2);
  const choice = (stepwise.length > 0 ? stepwise : pool).reduce(
    (a, c) => (Math.abs(c - last) < Math.abs(a - last) ? c : a)
  );
  return clamp(choice, min, max);
}

/** Generate Wyble etude as Score using core measure builder. */
export function generateWybleScore(
  progression: ChordProgression,
  options?: { seed?: number; title?: string }
): Score {
  const seed = options?.seed ?? Date.now();
  const bars = progression.reduce((sum, s) => sum + s.bars, 0);
  const measures: Score['measures'] = [];
  let lastUpper = 67;
  let lastLower = 55;

  const r = () => {
    seed;
    return (seed * 9301 + 49297) % 233280 / 233280;
  };

  for (let i = 0; i < bars; i++) {
    const measure = createMeasure(i, [1, 2]);
    const v1 = { pos: 0 };
    const v2 = { pos: 0 };

    const { root, quality } = getChordForBar(progression, i);
    const upperTones = getChordTones(root, quality, 5).filter((t) => t >= UPPER_MIN && t <= UPPER_MAX);
    const lowerTones = getChordTones(root, quality, 3).filter((t) => t >= LOWER_MIN && t <= LOWER_MAX);

    const melodyPitch = pickPitch(upperTones, lastUpper, UPPER_MIN, UPPER_MAX);
    const bassPitch = pickPitch(lowerTones, lastLower, LOWER_MIN, LOWER_MAX);
    lastUpper = melodyPitch;
    lastLower = bassPitch;

    pushNote(measure, 1, melodyPitch, 16, v1);
    pushNote(measure, 2, bassPitch, 16, v2);

    measure.chordSymbol = getChordDisplayForBar(progression, i);

    measures.push(measure);
  }

  const score: Score = { measures };
  validateScore(score);
  return score;
}
