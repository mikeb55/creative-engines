/**
 * V3.1-C2 — analytical views read the evaluation receipt.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/musical-evaluation/c2EvidenceViews.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { apiEvaluateMusicalScore } from '../../app-api/evaluationApp';

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
const xml = fs.readFileSync(fixture, 'utf8');
const before = createHash('sha256').update(fs.readFileSync(fixture)).digest('hex');

const loaded = apiEvaluateMusicalScore({
  label: 'c2-duo',
  xml,
  declared: { label: 'C pentatonic', family: 'pentatonic', pitchClasses: [0, 2, 4, 7, 9] },
});

check('fixture evaluates and the MusicXML file is unchanged', () => {
  assert.equal(loaded.ok, true);
  assert.equal(createHash('sha256').update(fs.readFileSync(fixture)).digest('hex'), before);
  if (!loaded.ok) return;
  assert.equal('musicalQualityScore' in loaded.receipt, false);
  assert.equal(loaded.receipt.humanJudgement, null);
});

check('harmonic findings describe collections and an outside note without calling it an error', () => {
  if (!loaded.ok) return;
  const findings = loaded.receipt.structural[0]!.findings;
  const collections = findings.filter((finding) => finding.metricId === 'pitch-class-collection');
  assert.equal(collections[0]?.observations.pitchClasses, '0,2');
  const outside = findings.find((finding) => finding.metricId === 'field-membership' && finding.observations.pitchClass === 6);
  assert.equal(outside?.observations.membership, 'outside');
  assert.equal(outside?.observations.error, false);
  assert.equal(outside?.treatsOutsideAsError, false);
  assert.equal(outside?.bars[0], 2);
  assert.ok(outside?.eventIds.length);
  const pathFinding = findings.find((finding) => finding.metricId === 'inside-outside-return');
  assert.match(String(pathFinding?.observations.path), /outside/);
  assert.ok(findings.some((finding) => finding.metricId === 'melodic-contour'));
  assert.ok(findings.some((finding) => finding.metricId === 'interval-distribution'));
  assert.ok(findings.some((finding) => finding.metricId === 'tessitura'));
});

check('rhythm findings match density, silence, attacks and name unsupported metrics', () => {
  if (!loaded.ok) return;
  const findings = loaded.receipt.structural[0]!.findings;
  const guitarBar1 = findings.find((finding) => finding.metricId === 'note-density' && finding.instrument === 'Electric Guitar' && finding.bars[0] === 1);
  assert.equal(guitarBar1?.observations.attacks, 2);
  const bassBar2 = findings.find((finding) => finding.metricId === 'note-density' && finding.instrument === 'Upright Bass' && finding.bars[0] === 2);
  assert.equal(bassBar2?.observations.attacks, 0);
  const duo = findings.find((finding) => finding.metricId === 'duo-activity' && finding.bars[0] === 2);
  assert.equal(duo?.observations.jointSilence, true);
  assert.equal(duo?.observations.guitarDuringBassRest, true);
  const attacks = findings.find((finding) => finding.metricId === 'attack-relationship' && finding.bars[0] === 1);
  assert.equal(attacks?.observations.sharedAttacks, 1);
  const role = findings.find((finding) => finding.metricId === 'role-indicator' && finding.bars[0] === 1);
  assert.equal(role?.confidence, 'limited');
  assert.match(role?.limitation ?? '', /experimental/);
  const boundary = findings.find((finding) => finding.metricId === 'phrase-boundary' && finding.instrument === 'Upright Bass');
  assert.equal(boundary?.observations.indicator, 'whole-bar-rest');
  assert.equal(boundary?.confidence, 'limited');
  assert.ok(loaded.receipt.unsupportedMetrics.includes('syncopation-longuet-higgins-lee'));
  assert.ok(loaded.receipt.unsupportedMetrics.includes('lbdm-phrase-boundaries'));
  assert.equal(loaded.receipt.technical[0]!.summary.parse, 'pass');
});

if (failed) {
  console.error(`C2 failures: ${failed}`);
  process.exit(1);
}
console.log('C2 all passed');
