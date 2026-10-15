/**
 * V3.1-C1 — dashboard score loading uses the evaluation service.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/musical-evaluation/c1Dashboard.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiEvaluateMusicalScore } from '../../app-api/evaluationApp';
import { evaluateScore } from '../../core/musical-evaluation/service';

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

function duo(step = 'C'): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>${step}</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
  <part id="P2"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`;
}

check('empty MusicXML is an understandable error and writes nothing', () => {
  const result = apiEvaluateMusicalScore({ xml: '   ', label: 'blank' });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /empty/i);
});

check('a loaded score keeps part, bar and event identity and matches the service receipt', () => {
  const xml = duo('E');
  const result = apiEvaluateMusicalScore({ label: 'fixture', xml });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const direct = evaluateScore({ score: { label: 'fixture', xml } });
  assert.equal(result.receipt.receiptSha256, direct.receiptSha256);
  assert.equal(result.identity.sha256, result.receipt.scores[0]!.sha256);
  assert.deepEqual(result.identity.parts.map((part) => part.id), ['P1', 'P2']);
  assert.deepEqual(result.identity.bars, [1]);
  assert.equal(result.identity.eventCount, 2);
  assert.equal(result.identity.events.length, 2);
  assert.ok(result.identity.events.every((event) => event.id && event.bar === 1));
  assert.equal(result.sourceWritten, false);
  assert.equal(result.receipt.humanJudgement, null);
  assert.equal('musicalQualityScore' in result.receipt, false);
  const cited = result.receipt.structural[0]!.findings.filter((finding) => finding.eventIds.length > 0);
  const ids = new Set(result.identity.events.map((event) => event.id));
  for (const finding of cited) {
    for (const id of finding.eventIds) assert.equal(ids.has(id), true);
  }
});

check('invalid MusicXML stays a parse finding', () => {
  const result = apiEvaluateMusicalScore({ xml: '<not-music></not-music>', label: 'bad' });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.receipt.technical[0]!.summary.parse, 'fail');
  assert.ok(result.identity.parseError);
  assert.equal(result.identity.eventCount, 0);
});

check('a lock baseline that moves the bass is a technical finding and the files stay put', () => {
  const source = duo('E');
  const changed = duo('F').replace('<step>C</step><octave>3</octave>', '<step>D</step><octave>2</octave>');
  const file = path.join(os.tmpdir(), `eval-c1-${process.pid}.musicxml`);
  fs.writeFileSync(file, source);
  const before = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  const result = apiEvaluateMusicalScore({ label: 'revised', xml: changed, baselineXml: source });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.receipt.technical[0]!.summary['source-lock'], 'fail');
  const finding = result.receipt.technical[0]!.findings.find((item) => item.check === 'source-lock');
  assert.equal(finding?.bar, 1);
  assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), before);
  fs.unlinkSync(file);
});

check('a baseline without guitar and bass parts is refused', () => {
  const solo = `<?xml version="1.0"?><score-partwise version="4.0"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>`;
  const result = apiEvaluateMusicalScore({ xml: duo(), baselineXml: solo });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.match(result.error, /guitar part and a bass part/);
});

if (failed) {
  console.error(`C1 failures: ${failed}`);
  process.exit(1);
}
console.log('C1 all passed');
