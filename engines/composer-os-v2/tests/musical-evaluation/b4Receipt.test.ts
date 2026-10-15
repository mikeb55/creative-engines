/**
 * V3.1-B4 — evidence receipts and comparison.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/musical-evaluation/b4Receipt.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BMEF_CORE, BMEF_GATES, BMEF_MODULE_J } from '../../core/musical-evaluation/bmefCatalog';
import { ingestCanonicalScore } from '../../core/musical-evaluation/canonicalScore';
import { compareScores, evaluateScore, receiptBytes, verifyReceipt } from '../../core/musical-evaluation/service';

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

function score(labelNote: string, step = 'C'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><grace/><pitch><step>B</step><octave>3</octave></pitch></note>
    <note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
  <part id="P2"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>${labelNote}</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`;
}

check('BMEF gates and weights match V2.0 and are not totalled', () => {
  assert.deepEqual(BMEF_GATES.map((gate) => gate.id), ['G1', 'G2', 'G3', 'G4']);
  assert.equal(BMEF_GATES.every((gate) => gate.points === 0), true);
  assert.equal(BMEF_CORE.reduce((sum, criterion) => sum + criterion.weight, 0), 70);
  assert.equal(BMEF_MODULE_J.reduce((sum, criterion) => sum + criterion.weight, 0), 30);
});

check('identical inputs produce identical receipt bytes', () => {
  const xml = score('C');
  const first = evaluateScore({ score: { label: 'original', xml }, intentionId: 'stillness' });
  const second = evaluateScore({ score: { label: 'original', xml }, intentionId: 'stillness' });
  assert.equal(receiptBytes(first), receiptBytes(second));
  assert.equal(verifyReceipt(first), true);
  assert.equal(first.humanJudgement, null);
  assert.equal(first.bmef.machineRatings, null);
  assert.equal(first.bmef.machineDecision, null);
  assert.equal(first.bmef.humanScorecard.ratings.every((rating) => rating.K === null && rating.R === null), true);
  assert.equal(first.bmef.humanScorecard.combinedTotal, null);
  assert.equal('musicalQualityScore' in first, false);
  assert.equal(first.comparison, null);
});

check('findings cite real events and unsupported grace is explicit', () => {
  const xml = score('C');
  const receipt = evaluateScore({ score: { label: 'original', xml } });
  const parsed = ingestCanonicalScore(xml).score!;
  const ids = new Set(parsed.sourceEvents.map((event) => event.id));
  const cited = receipt.structural[0]!.findings.filter((finding) => finding.eventIds.length > 0);
  assert.ok(cited.length > 0);
  for (const finding of cited) {
    assert.equal(finding.scoreSha256, receipt.scores[0]!.sha256);
    assert.ok(finding.metricId);
    assert.ok(finding.metricVersion);
    for (const id of finding.eventIds) assert.equal(ids.has(id), true);
  }
  const grace = receipt.technical[0]!.findings.find((finding) => finding.observation.startsWith('grace:'));
  assert.equal(grace?.bar, 1);
  assert.equal(grace?.instrument, 'Electric Guitar');
  assert.equal(receipt.technical[0]!.summary.parse, 'pass');
  assert.ok(receipt.unsupportedMetrics.includes('syncopation-longuet-higgins-lee'));
});

check('three candidates and a pentatonic/hexatonic pair differ without a rank', () => {
  const a = score('C', 'E');
  const b = score('D', 'E');
  const c = score('G', 'G');
  const receipt = compareScores({
    scores: [
      { label: 'bhl-a', xml: a },
      { label: 'bhl-b', xml: b },
      { label: 'bhl-c', xml: c },
    ],
  });
  assert.equal(receipt.comparison?.rank, null);
  assert.equal(receipt.comparison?.musicalQualityScore, null);
  assert.ok((receipt.comparison?.differences.length ?? 0) > 0);
  assert.match(receipt.comparison?.notice ?? '', /do not rank/);
  const pent = score('C', 'C');
  const hex = score('F', 'F');
  const pair = compareScores({
    scores: [
      { label: 'pentatonic-alternative', xml: pent },
      { label: 'hexatonic-alternative', xml: hex },
    ],
  });
  assert.equal(pair.scores.length, 2);
  assert.equal(pair.comparison?.rank, null);
  assert.ok(pair.comparison?.differences.some((difference) => difference.change === 'only-in-left'));
  assert.ok(pair.comparison?.differences.some((difference) => difference.change === 'only-in-right'));
});

check('evaluation reads a file and does not write it or notes', () => {
  const file = path.join(os.tmpdir(), `musical-eval-${process.pid}.musicxml`);
  const xml = score('C');
  fs.writeFileSync(file, xml);
  const before = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const stamp = fs.statSync(file).mtimeMs;
  const receipt = evaluateScore({ score: { label: 'file', xml: fs.readFileSync(file, 'utf8') } });
  const after = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  assert.equal(after, before);
  assert.equal(fs.statSync(file).mtimeMs, stamp);
  assert.equal(receipt.preserved.pentatonicColours, 20);
  assert.equal(receipt.preserved.hexatonicScalars, 11);
  assert.equal(receipt.preserved.wpsPairs, 16);
  assert.equal(receipt.preserved.bhlWorlds, 6);
  assert.equal(receipt.preserved.pentatonicProject, 'pentatonic-project-1');
  assert.equal(receipt.preserved.hexatonicProject, 1);
  const saved = path.join(os.tmpdir(), `musical-eval-receipt-${process.pid}.json`);
  fs.writeFileSync(saved, receiptBytes(receipt));
  const loaded = JSON.parse(fs.readFileSync(saved, 'utf8'));
  assert.equal(verifyReceipt(loaded), true);
  assert.equal(loaded.musicXml, undefined);
  assert.equal(JSON.stringify(loaded).includes('<note>'), false);
  fs.unlinkSync(file);
  fs.unlinkSync(saved);
});

check('a malformed score fails technical parse and still makes no artistic score', () => {
  const receipt = evaluateScore({ score: { label: 'broken', xml: '<nope>' } });
  assert.equal(receipt.technical[0]!.summary.parse, 'fail');
  assert.equal(receipt.bmef.machineDecision, null);
  assert.equal(receipt.humanJudgement, null);
});

if (failed > 0) {
  console.error(`B4 ${failed} failed`);
  process.exit(1);
}
console.log('B4 all passed');
