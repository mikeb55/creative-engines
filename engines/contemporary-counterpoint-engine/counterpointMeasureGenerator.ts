/**
 * Contemporary Counterpoint — uses engines/core.
 * Builds measures with createMeasure/pushNote. No forward/backup inference.
 */

import type { Score } from '../core/timing';
import { createMeasure, pushNote } from '../core/measureBuilder';
import { validateScore } from '../../scripts/validateScore';
import type { HarmonicSegment } from './counterpointTypes';

const ROOT_MIDI: Record<string, number> = {
  C: 60, 'C#': 61, Db: 61, D: 62, 'D#': 63, Eb: 63, E: 64, F: 65,
  'F#': 66, Gb: 66, G: 67, 'G#': 68, Ab: 68, A: 69, 'A#': 70, Bb: 70, B: 71,
};
const SCALE_STEPS = [0, 2, 4, 5, 7, 9, 11];

function parseChord(chord: string): number {
  const m = chord.match(/^([A-G][#b]?)/);
  return ROOT_MIDI[m?.[1] ?? 'C'] ?? 60;
}

function getScaleTones(root: number): number[] {
  return SCALE_STEPS.map((s) => root + s);
}

/** Generate counterpoint as Score using core measure builder. */
export function generateCounterpointScore(
  segments: HarmonicSegment[],
  options?: { lineCount?: number; seed?: number }
): Score {
  const lineCount = options?.lineCount ?? 2;
  const totalBars = segments.reduce((s, seg) => s + seg.bars, 0);
  const measures: Score['measures'] = [];
  let lastPitches = [60, 48];

  for (let i = 0; i < totalBars; i++) {
    let segIdx = 0;
    let acc = 0;
    for (let s = 0; s < segments.length; s++) {
      if (i < acc + segments[s].bars) {
        segIdx = s;
        break;
      }
      acc += segments[s].bars;
    }
    const chord = segments[segIdx]?.chord ?? 'C';
    const root = parseChord(chord);
    const scaleTones = getScaleTones(root);

    const m = createMeasure(i, [1, 2]);
    const v1 = { pos: 0 };
    const v2 = { pos: 0 };

    const soprano = Math.max(60, Math.min(72, lastPitches[0] + (scaleTones[Math.floor(i % 7)] - root)));
    const bass = Math.max(48, Math.min(60, lastPitches[1] + (scaleTones[Math.floor((i + 2) % 7)] - root)));
    lastPitches = [soprano, bass];

    pushNote(m, 1, soprano, 16, v1);
    pushNote(m, 2, bass, 16, v2);

    measures.push(m);
  }

  const score: Score = { measures };
  validateScore(score);
  return score;
}
