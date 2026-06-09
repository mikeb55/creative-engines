/**
 * V82d - 6th / dim7 pitch-class sets for selector + borrowed.
 */

import type { SixthDimPair } from './types';

const MAJ6_INTERVALS = [0, 4, 7, 9] as const;
const MIN6_INTERVALS = [0, 3, 7, 9] as const;
const DIM7_INTERVALS = [0, 3, 6, 9] as const;

export function sixthChordTones(rootPc: number, quality: '6' | 'm6'): number[] {
  const intervals = quality === 'm6' ? MIN6_INTERVALS : MAJ6_INTERVALS;
  return intervals.map((iv) => ((rootPc + iv) % 12 + 12) % 12);
}

export function dim7ChordTones(dimRootPc: number): number[] {
  return DIM7_INTERVALS.map((iv) => ((dimRootPc + iv) % 12 + 12) % 12);
}

export function sixthDegreePc(sixthRootPc: number): number {
  return ((sixthRootPc + 9) % 12 + 12) % 12;
}

export function dim7DegreePc(dimRootPc: number): number {
  return ((dimRootPc + 9) % 12 + 12) % 12;
}

export function pairFromAnchor(scalePairs: readonly SixthDimPair[], anchor: SixthDimPair): {
  pair: SixthDimPair;
  scalePairIndex: number;
} {
  const idx = scalePairs.findIndex(
    (p) => p.sixthRootPc === anchor.sixthRootPc && p.sixthQuality === anchor.sixthQuality
  );
  if (idx >= 0) return { pair: scalePairs[idx]!, scalePairIndex: idx };
  return { pair: anchor, scalePairIndex: -1 };
}