/**
 * V3.1-C4 — human BMEF review stays separate from machine evidence.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/musical-evaluation/c4HumanReview.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiCreateHumanReview, apiEvaluateMusicalScore, apiOpenHumanReview, apiSaveHumanReview } from '../../app-api/evaluationApp';
import { applyHumanReview } from '../../core/musical-evaluation/humanReviewRecord';

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

const xml = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/c2-duo.musicxml'), 'utf8');
const loaded = apiEvaluateMusicalScore({ label: 'c2-duo', xml });
if (!loaded.ok) {
  console.error(loaded.error);
  process.exit(1);
}
const receipt = loaded.receipt;

check('a new review is blank, proposed, and not an artistic approval', () => {
  const created = apiCreateHumanReview({ label: 'c2-duo', receipt });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  const record = created.record;
  assert.equal(record.gates.G1, null);
  assert.equal(record.gates.G3, null);
  assert.equal(record.decision, null);
  assert.equal(record.machineArtisticScore, null);
  assert.equal(record.machineDecision, null);
  assert.equal(record.coreTotal, null);
  assert.equal(record.moduleTotal, null);
  assert.equal(record.combinedTotal, null);
  assert.equal(record.e2Available, false);
  assert.equal(record.e3Available, false);
  assert.match(record.e2Notice, /E2 is missing/);
  assert.match(record.e3Notice, /E3 is missing/);
  assert.equal(record.weightStatus, 'proposed');
  assert.equal(record.thresholdStatus, 'proposed');
  assert.equal(record.ratings.filter((rating) => rating.layer === 'core').reduce((sum, rating) => sum + rating.weight, 0), 70);
  assert.equal(record.ratings.filter((rating) => rating.layer === 'module').reduce((sum, rating) => sum + rating.weight, 0), 30);
  assert.equal(record.ratings.every((rating) => rating.rating === null && rating.weightStatus === 'proposed'), true);
  assert.equal(record.source.sha256, receipt.scores[0]!.sha256);
  assert.equal(record.receiptSha256, receipt.receiptSha256);
  assert.ok(record.metricVersions.length > 0);
  assert.equal(receipt.technical[0]!.summary.parse, 'pass');
  assert.equal(record.decision, null);
});

check('human notes save and reopen, and a machine total is refused', () => {
  const created = apiCreateHumanReview({ label: 'c2-duo', receipt });
  if (!created.ok) return;
  const edited = applyHumanReview(created.record, {
    ratings: [{ criterion: 'U2', rating: 8, evidence: 'E1', bars: '1-2', notes: 'heard as sparse', evidenceRefs: ['H1'] }],
    gates: { G1: 'pass' },
    decision: 'REFINE',
    outstandingChecks: ['Listening check not done.', 'Play the duo before accepting.'],
  });
  assert.equal('error' in edited, false);
  if ('error' in edited) return;
  assert.equal(edited.decisionSource, 'human');
  assert.equal(edited.coreTotal, null);
  const refused = applyHumanReview(edited, { combinedTotal: 80 });
  assert.equal('error' in refused, true);
  const libraryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-review-'));
  const saved = apiSaveHumanReview({ record: edited, fileName: 'c2-review', libraryRoot, overwrite: true });
  assert.equal(saved.ok, true);
  if (!saved.ok) return;
  const again = apiSaveHumanReview({ record: edited, fileName: 'c2-review', libraryRoot, overwrite: true });
  assert.equal(again.ok, true);
  const opened = apiOpenHumanReview({ path: saved.path, libraryRoot });
  assert.equal(opened.ok, true);
  if (!opened.ok) return;
  const rating = opened.record.ratings.find((item) => item.criterion === 'U2');
  assert.equal(rating?.rating, 8);
  assert.equal(rating?.evidence, 'E1');
  assert.deepEqual(rating?.evidenceRefs, ['H1']);
  assert.equal(opened.record.decision, 'REFINE');
  assert.equal(opened.record.gates.G3, null);
  assert.equal(opened.record.receipt.receiptSha256, receipt.receiptSha256);
  assert.equal(opened.record.e2Available, false);
  assert.equal(opened.record.e3Available, false);
  const bad = apiSaveHumanReview({ record: { ...edited, combinedTotal: 70 }, fileName: 'bad', libraryRoot, overwrite: true });
  assert.equal(bad.ok, false);
});

check('the source MusicXML is not rewritten by a review', () => {
  const file = path.join(os.tmpdir(), `eval-c4-src-${process.pid}.musicxml`);
  fs.writeFileSync(file, xml);
  const before = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  apiCreateHumanReview({ receipt });
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), before);
  fs.unlinkSync(file);
});

if (failed) {
  console.error(`C4 failures: ${failed}`);
  process.exit(1);
}
console.log('C4 all passed');
