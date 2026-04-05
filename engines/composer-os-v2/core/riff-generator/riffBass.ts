/**
 * Co-compositional bass: guide tones + roots, not root-only walking.
 */

import type { ChordToneSet } from '../goldenPath/guitarBassDuoHarmony';
import { chordTonesFromSymbol } from '../harmony/chordSymbolAnalysis';
import type { RiffRhythmSegment } from './riffTypes';
import { randInt } from './riffRandom';

const BASS_LOW = 40;
const BASS_HIGH = 88;

function clampBass(m: number): number {
  return Math.max(BASS_LOW, Math.min(BASS_HIGH, m));
}

export interface BassNote {
  startBeat: number;
  duration: number;
  pitch: number;
}

export function assignBassToBar(
  bar: RiffRhythmSegment[],
  chord: string,
  rng: () => number
): BassNote[] {
  const tones = chordTonesFromSymbol(chord);
  const roots = [tones.root, tones.third, tones.fifth, tones.seventh];
  const out: BassNote[] = [];
  let rootCount = 0;

  for (const s of bar) {
    if (s.rest) continue;
    const onDownbeat = [0, 1, 2, 3].some((b) => Math.abs(s.startBeat - b) < 0.12);
    const guide = rng() > 0.35 ? tones.third : rng() > 0.4 ? tones.seventh : tones.fifth;
    let p: number;
    if (onDownbeat && rootCount < 2) {
      p = rng() > 0.45 ? clampBass(tones.root) : clampBass(guide);
      if (p % 12 === tones.root % 12) rootCount++;
    } else {
      p = clampBass(guide);
    }
    out.push({ startBeat: s.startBeat, duration: s.duration, pitch: p });
  }
  return out;
}
