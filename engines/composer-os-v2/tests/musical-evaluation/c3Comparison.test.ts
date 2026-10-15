/**
 * V3.1-C3 — candidate comparison does not rank and does not write scores.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/musical-evaluation/c3Comparison.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiCompareMusicalScores } from '../../app-api/evaluationApp';

let failed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}\n  ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  }
}

const fixture = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/c2-duo.musicxml');
const original = fs.readFileSync(fixture, 'utf8');
const revised = original.replace('<step>F</step><alter>1</alter>', '<step>G</step>');

check('identical scores have no event differences and no rank', () => {
  const result = apiCompareMusicalScores({
    scores: [
      { label: 'original', xml: original, intention: 'keep the sparse answer' },
      { label: 'copy', xml: original, intention: 'same material' },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.receipt.comparison?.differences.length, 0);
  assert.equal(result.receipt.comparison?.rank, null);
  assert.equal(result.receipt.comparison?.musicalQualityScore, null);
  assert.equal(result.intentions[0]?.note, 'keep the sparse answer');
  assert.equal(result.sourceWritten, false);
});

check('a revised pitch is a bar-level add and remove', () => {
  const result = apiCompareMusicalScores({
    scores: [
      { label: 'original', xml: original },
      { label: 'revised', xml: revised },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const differences = result.receipt.comparison?.differences ?? [];
  const removed = differences.filter((row) => row.change === 'only-in-left');
  const added = differences.filter((row) => row.change === 'only-in-right');
  assert.equal(removed.length, 1);
  assert.equal(added.length, 1);
  assert.equal(removed[0]?.bar, 2);
  assert.equal(removed[0]?.instrument, 'Electric Guitar');
  assert.ok(removed[0]?.eventId);
  assert.equal(result.receipt.comparison?.rank, null);
});

check('three candidates stay unranked', () => {
  const third = original.replace('<step>D</step>', '<step>E</step>');
  const result = apiCompareMusicalScores({
    scores: [
      { label: 'bhl-a', xml: original },
      { label: 'bhl-b', xml: revised },
      { label: 'bhl-c', xml: third },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.receipt.scores.length, 3);
  assert.equal(result.receipt.comparison?.rank, null);
  assert.ok((result.receipt.comparison?.differences.length ?? 0) > 0);
});

check('incompatible scores are reported and source files stay unchanged', () => {
  const file = path.join(os.tmpdir(), `eval-c3-${process.pid}.musicxml`);
  fs.writeFileSync(file, original);
  const before = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const broken = '<score-timewise version="4.0"></score-timewise>';
  const result = apiCompareMusicalScores({
    scores: [
      { label: 'original', xml: original },
      { label: 'timewise', xml: broken },
    ],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.receipt.technical[1]?.summary.parse, 'fail');
  assert.equal(result.receipt.comparison?.rank, null);
  assert.ok((result.receipt.comparison?.differences.length ?? 0) > 0);
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), before);
  fs.unlinkSync(file);
});

check('one score is refused', () => {
  const result = apiCompareMusicalScores({ scores: [{ label: 'only', xml: original }] });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /two or three/);
});

if (failed) {
  console.error(`C3 failures: ${failed}`);
  process.exit(1);
}
console.log('C3 all passed');
