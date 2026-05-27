/**
 * RhythmToolbox gate — imported by composer-os smoke (`runSmokeTests.ts`).
 */

import {
  analysePattern,
  comparePatterns,
  suggestVariation,
  patternToEuclidean,
} from '../rhythmToolbox.js';

const FOUR_ON_FLOOR = {
  kicks: [0, 4, 8, 12],
  snares: [4, 12],
  hats: [2, 6, 10, 14],
  ride: [],
};

const ALL_STEPS = Array.from({ length: 16 }, (_, i) => i);
const EMPTY_PATTERN = { kicks: [], snares: [], hats: [], ride: [] };
const FULL_PATTERN = {
  kicks: [...ALL_STEPS],
  snares: [...ALL_STEPS],
  hats: [...ALL_STEPS],
  ride: [...ALL_STEPS],
};

export function runRhythmToolboxGateTests() {
  const out = [];

  const metrics = analysePattern(FOUR_ON_FLOOR);
  const expectedHits =
    FOUR_ON_FLOOR.kicks.length +
    FOUR_ON_FLOOR.snares.length +
    FOUR_ON_FLOOR.hats.length +
    FOUR_ON_FLOOR.ride.length;

  out.push({
    name: 'RhythmToolbox analysePattern: scores in 0–1 and hitCount correct',
    ok:
      metrics.hitCount === expectedHits &&
      metrics.syncopationScore >= 0 &&
      metrics.syncopationScore <= 1 &&
      metrics.densityScore >= 0 &&
      metrics.densityScore <= 1 &&
      metrics.balanceScore >= 0 &&
      metrics.balanceScore <= 1,
  });

  const same = comparePatterns(FOUR_ON_FLOOR, { ...FOUR_ON_FLOOR });
  out.push({
    name: 'RhythmToolbox comparePatterns: identical → similarity 1.0',
    ok: same.similarityScore === 1,
  });

  const inverse = comparePatterns(FULL_PATTERN, EMPTY_PATTERN);
  out.push({
    name: 'RhythmToolbox comparePatterns: inverse lanes → similarity near 0',
    ok: inverse.similarityScore === 0,
  });

  let neverEmpty = true;
  for (let i = 0; i < 12; i += 1) {
    const varied = suggestVariation(FOUR_ON_FLOOR, i / 11);
    const hits =
      varied.kicks.length + varied.snares.length + varied.hats.length + varied.ride.length;
    if (hits === 0) neverEmpty = false;
  }
  out.push({
    name: 'RhythmToolbox suggestVariation: never all-empty',
    ok: neverEmpty,
  });

  const eucl = patternToEuclidean(16, 4, 'kick');
  const euclHits = eucl.filter((x) => x).length;
  out.push({
    name: 'RhythmToolbox patternToEuclidean: 16 steps, 4 hits → 4 onsets',
    ok: eucl.length === 16 && euclHits === 4,
  });

  return out;
}
