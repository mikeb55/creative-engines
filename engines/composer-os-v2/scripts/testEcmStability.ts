import assert from 'node:assert/strict';
import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { normalizeChordSymbolsForEra } from '../core/harmony/eraChordNormalizer';
import { buildEcmChamberTextureEvalRun } from '../core/ecm/ecmChamberTextureMetrics';
import { meanEcmTextureScore, parseEcmTextureEvalJsonLines } from '../core/gce/ecmTextureEvalJson';

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

/** Golden-path ECM must finish in bounded time across seeds (guards against runaway bass rewind loops). */
function testEcmChamberMultiSeedBarCount(): void {
  const seeds = [42, 50021, 7777];
  for (const s of seeds) {
    const r = runGoldenPath(s, {
      presetId: 'ecm_chamber',
      totalBars: 32,
      bpm: 100,
      longFormEnabled: true,
    });
    const barCount = r.score?.parts?.[0]?.measures?.length ?? 0;
    assert.equal(barCount, 32, `ECM seed ${s}: expected 32 guitar bars, got ${barCount}`);
  }
  console.log('Test 2b PASS: ECM chamber multi-seed 32-bar golden path completes');
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

function testEcmChamberTextureMetricsAndGceJson(): void {
  const r = runGoldenPath(50021, {
    presetId: 'ecm_chamber',
    totalBars: 32,
    bpm: 100,
    longFormEnabled: true,
  });
  assert.ok(r.score, 'score for texture metrics');
  const row = buildEcmChamberTextureEvalRun(50021, 32, r.score!);
  assert.equal(row.preset, 'ecm_chamber');
  assert.equal(row.totalBars, 32);
  assert.equal(row.metrics.totalBars, 32);
  assert.ok(row.metrics.perBar.length === 32);
  assert.ok(row.ecmTextureScore >= 0 && row.ecmTextureScore <= 10);
  if (row.metrics.gapGlobal !== null) {
    assert.ok(Number.isFinite(row.metrics.gapGlobal));
  }
  const line = `${JSON.stringify(row)}\n${JSON.stringify({ note: 'not-a-texture-run' })}`;
  const parsed = parseEcmTextureEvalJsonLines(line);
  assert.equal(parsed.length, 1);
  assert.equal(meanEcmTextureScore(parsed), row.ecmTextureScore);
  console.log('Test 5 PASS: ECM chamber texture metrics + GCE JSON ingest');
}

function main(): void {
  testEcmBarCount();
  testEcmBassLoopSafety();
  testEcmChamberMultiSeedBarCount();
  testEraNormalizationRegression();
  testNonEcmRegression();
  testEcmChamberTextureMetricsAndGceJson();
}

main();
