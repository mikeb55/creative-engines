/**
 * Afrobeat rhythm engine — pattern bundle + polyrhythm pulses + triplet-grid quantise.
 */

import {
  applyPolyrhythm,
  createAfrobeatRhythmEngine,
  expandSixteenthsToTripletGrid,
  foldTripletGridToSixteenths,
  loadDefaultTonyAllenPatternsBundle,
  pulseIndices,
  quantise,
  validateDrumPattern,
} from '../core/percussion/afrobeatRhythmEngine';
import type { DrumPattern } from '../core/percussion/afrobeatRhythmEngine';

function emptyPattern(): DrumPattern {
  const z = (): number[] => new Array(16).fill(0);
  return { kick: z(), snare: z(), hiHat: z(), bell: z(), conga: z() };
}

function testLoadsCommittedJson(): boolean {
  const b = loadDefaultTonyAllenPatternsBundle();
  if (b.schemaVersion < 1) return false;
  for (const feel of ['straight', 'swing', 'afrobeat'] as const) {
    const p = b.feels[feel];
    validateDrumPattern(p, 16);
    if (p.kick.reduce((a, x) => a + x, 0) < 1) return false;
  }
  return true;
}

function testPulseIndicesThreeAgainstFour(): boolean {
  const ix = pulseIndices(3, 0, 16);
  const want = [0, 5, 11];
  if (ix.length !== want.length) return false;
  for (let i = 0; i < want.length; i++) {
    if (ix[i] !== want[i]) return false;
  }
  const shifted = pulseIndices(3, 1, 16);
  return shifted[0] === 1 && shifted[1] === 6 && shifted[2] === 12;
}

function testApplyPolyrhythmSnareTriple(): boolean {
  const base = emptyPattern();
  const out = applyPolyrhythm(base, [{ voice: 'snare', pulses: 3, phaseSteps: 0 }]);
  if (out.snare[0] !== 1 || out.snare[5] !== 1 || out.snare[11] !== 1) return false;
  let hits = 0;
  for (const x of out.snare) if (x) hits++;
  return hits === 3;
}

function testQuantise24ExpandsLength(): boolean {
  const eng = createAfrobeatRhythmEngine();
  const p = eng.selectPattern('afrobeat');
  const q = quantise(p, 24);
  validateDrumPattern(q, 24);
  return q.kick.length === 24 && quantise(p, 16).kick.length === 16;
}

function testTripletFoldRoundTrip(): boolean {
  const row = [
    1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1,
  ];
  const r24 = expandSixteenthsToTripletGrid(row);
  if (r24.length !== 24) return false;
  const back = foldTripletGridToSixteenths(r24);
  if (back.length !== 16) return false;
  for (let i = 0; i < 16; i++) {
    if (back[i] !== row[i]) return false;
  }
  return true;
}

export function runAfrobeatRhythmEngineTests(): { name: string; ok: boolean }[] {
  return [
    ['Loads tonyAllenPatterns.json (all feels, 16-step rows)', testLoadsCommittedJson],
    ['Polyrhythm pulseIndices 3-in-bar spacing', testPulseIndicesThreeAgainstFour],
    ['applyPolyrhythm merges 3 snare pulses', testApplyPolyrhythmSnareTriple],
    ['quantise expands to 24-step triplet grid', testQuantise24ExpandsLength],
    ['triplet expand/fold round-trip preserves hits', testTripletFoldRoundTrip],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
