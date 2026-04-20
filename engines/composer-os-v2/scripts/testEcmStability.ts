import assert from 'node:assert/strict';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { normalizeChordSymbolsForEra } from '../core/harmony/eraChordNormalizer';

function testEcmBarCount(): number {
  const result = runGoldenPath(50021, {
    presetId: 'ecm_chamber',
    totalBars: 32,
    bpm: 100,
    longFormEnabled: true,
  });

  const barCount = result.score?.parts?.[0]?.measures?.length ?? 0;
  console.log('ECM bar count:', barCount);
  assert.equal(barCount, 32, `ECM bar count should be 32, got ${barCount}`);
  assert.notEqual(result.success, undefined, 'ECM should return a result');
  console.log('Test 1 PASS: ECM bar count correct');
  return barCount;
}

function testEcmBassLoopSafety(): void {
  const runA = runGoldenPath(50021, {
    presetId: 'ecm_chamber',
    totalBars: 32,
    bpm: 100,
    longFormEnabled: true,
  });
  const runB = runGoldenPath(50021, {
    presetId: 'ecm_chamber',
    totalBars: 32,
    bpm: 100,
    longFormEnabled: true,
  });

  const barsA = runA.score?.parts?.[0]?.measures?.length ?? 0;
  const barsB = runB.score?.parts?.[0]?.measures?.length ?? 0;
  assert.equal(barsA, barsB, `Expected identical bar counts for repeated runs, got ${barsA} vs ${barsB}`);
  console.log('Test 2 PASS: ECM bass loop stable');
}

function testEraNormalizationRegression(): void {
  const swingTest = normalizeChordSymbolsForEra(['Cmaj9', 'G13', 'A7alt', 'Dmin9'], 'swing');
  assert.equal(swingTest[0], 'C6/9', `Cmaj9 should -> C6/9, got ${swingTest[0]}`);
  assert.equal(swingTest[1], 'G7', `G13 should -> G7, got ${swingTest[1]}`);
  assert.equal(swingTest[2], 'A7b9', `A7alt should -> A7b9, got ${swingTest[2]}`);
  console.log('Test 3 PASS: swing normalization correct');
}

function testNonEcmRegression(): void {
  const duoResult = runGoldenPath(50021, {
    presetId: 'guitar_bass_duo',
    totalBars: 32,
    bpm: 100,
    longFormEnabled: true,
  });
  assert.notEqual(duoResult.score, undefined, 'guitar_bass_duo should still complete');
  console.log('Test 4 PASS: non-ECM unaffected');
}

function main(): void {
  testEcmBarCount();
  testEcmBassLoopSafety();
  testEraNormalizationRegression();
  testNonEcmRegression();
}

main();
