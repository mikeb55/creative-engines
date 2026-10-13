/**
 * BHL iteration 1 — source lock and lossless MusicXML copy.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlSourceLock.test.ts
 * Album path is read-only. Copies go to a temp directory.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BhlExportRejected, BHL_ALBUM_ROOT } from '../../core/bhl/bhlCopy';
import { ingestBhlSource, lockSpecOf, sha256File } from '../../core/bhl/bhlIngest';
import { copyBhlSourceLossless } from '../../core/bhl/bhlCopy';
import { preserveBhlSource } from '../../core/bhl/bhlPreserve';
import { verifyBhlLocks } from '../../core/bhl/bhlVerify';
import { readProvenance } from '../../core/performance-composer/pcProvenance';
import { importPartwiseMusicXml } from '../../core/wwh/wwhDuoImport';
import { parseScoreDocument } from '../../core/performance-composer/pcScore';

const SOURCE = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml',
);
const SPAN = { from: 33, to: 40 };
const PROTECTED = [33, 34, 35, 36, 37, 38, 39, 40];

const TIED_BASS = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>100</per-minute></metronome></direction-type><sound tempo="100"/></direction>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><type>whole</type></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>2</duration><type>half</type><notations><tied type="start"/></notations></note>
      <note><pitch><step>C</step><octave>2</octave></pitch><duration>2</duration><type>half</type><notations><tied type="stop"/></notations></note>
    </measure>
  </part>
</score-partwise>
`;

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

function mapMeasure(xml: string, partId: string, measureNumber: string, mutate: (measure: string) => string): string {
  const open = `<part id="${partId}">`;
  const start = xml.indexOf(open);
  if (start < 0) throw new Error(`missing ${open}`);
  const end = xml.indexOf('</part>', start);
  const part = xml.slice(start, end);
  const token = `<measure number="${measureNumber}">`;
  const measureStart = part.indexOf(token);
  if (measureStart < 0) throw new Error(`missing ${partId} measure ${measureNumber}`);
  const measureEnd = part.indexOf('</measure>', measureStart);
  const measure = part.slice(measureStart, measureEnd + '</measure>'.length);
  const next = mutate(measure);
  if (next === measure) throw new Error(`mutation missed ${partId} bar ${measureNumber}`);
  return xml.slice(0, start) + part.slice(0, measureStart) + next + part.slice(measureEnd + '</measure>'.length) + xml.slice(end);
}

function expectLockFail(sourceXml: string, candidateXml: string, pattern: RegExp): void {
  const lock = ingestBhlSource({
    sourcePath: SOURCE,
    span: SPAN,
    protectedGuitarBars: PROTECTED,
  });
  const report = verifyBhlLocks(sourceXml, candidateXml, lockSpecOf(lock));
  assert.equal(report.ok, false, `expected fail, got ${report.errors.join(' | ') || 'no errors'}`);
  assert.ok(report.errors.some((error) => pattern.test(error)), `missing ${pattern} in ${report.errors.join(' | ')}`);
}

const before = sha256File(SOURCE);
const sourceXml = fs.readFileSync(SOURCE, 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bhl-iter1-'));

check('source file present', () => {
  assert.ok(fs.existsSync(SOURCE));
  assert.equal(sha256File(SOURCE), before);
});

const lock = ingestBhlSource({ sourcePath: SOURCE, span: SPAN, protectedGuitarBars: PROTECTED });

check('recorded source SHA-256 matches the file', () => {
  assert.equal(lock.sourceSha256, before);
  assert.equal(sha256File(SOURCE), lock.sourceSha256);
});

check('bar 40 metre is 3/4 on guitar and bass', () => {
  const metres = lock.metres.filter((metre) => metre.bar === 40);
  assert.equal(metres.length, 2);
  for (const metre of metres) {
    assert.equal(metre.beats, 3);
    assert.equal(metre.beatType, 4);
    assert.equal(metre.stated, true);
  }
});

check('bar 40 bass is a rest then F', () => {
  const events = lock.bass.filter((event) => event.bar === 40);
  assert.equal(events.length, 2);
  assert.equal(events[0]!.rest, true);
  assert.equal(events[0]!.onsetQuarters, 0);
  assert.equal(events[0]!.quarters, 1);
  assert.equal(events[1]!.rest, false);
  assert.deepEqual(events[1]!.midis, [41]);
  assert.equal(events[1]!.onsetQuarters, 1);
  assert.equal(events[1]!.quarters, 2);
  assert.equal(events[1]!.tieStart, false);
  assert.equal(events[1]!.tieStop, false);
});

check('span tempo stays quarter 120 from bar 1 and rehearsals B and C stay', () => {
  for (const tempo of lock.tempos) {
    assert.equal(tempo.beatUnit, 'quarter');
    assert.equal(tempo.perMinute, '120');
    assert.equal(tempo.soundTempo, '120');
    assert.equal(tempo.statedAtBar, 1);
    assert.equal(tempo.statedOnPartId, 'P1');
  }
  const marks = lock.rehearsal.map((mark) => `${mark.bar}:${mark.text}`).sort();
  assert.deepEqual(marks, ['33:B', '40:C']);
  assert.ok(lock.structural.some((mark) => mark.bar === 40 && mark.text === 'Metric Interruption'));
  assert.ok(lock.structural.some((mark) => mark.bar === 40 && mark.text === '3/4'));
});

check('protected guitar bars include the bar 40 tie', () => {
  const guitar = lock.guitar.filter((event) => event.bar === 40);
  assert.ok(guitar.length >= 2);
  assert.ok(guitar.some((event) => event.tieStart));
  assert.ok(guitar.some((event) => event.tieStop));
  assert.ok(lock.guitar.some((event) => event.bar === 33 && !event.rest));
});

check('two ingests match', () => {
  const again = ingestBhlSource({ sourcePath: SOURCE, span: SPAN, protectedGuitarBars: PROTECTED });
  assert.equal(JSON.stringify(again), JSON.stringify(lock));
});

let copyA = '';
let copyB = '';
check('lossless copy is byte-identical and parses', () => {
  copyA = path.join(tmp, 'a.musicxml');
  copyB = path.join(tmp, 'b.musicxml');
  const first = copyBhlSourceLossless({ sourcePath: SOURCE, outputPath: copyA, permittedOutputDir: tmp });
  const second = copyBhlSourceLossless({ sourcePath: SOURCE, outputPath: copyB, permittedOutputDir: tmp });
  assert.equal(first.sourceSha256, before);
  assert.equal(first.outputSha256, before);
  assert.equal(second.outputSha256, before);
  assert.ok(fs.readFileSync(copyA).equals(fs.readFileSync(SOURCE)));
  assert.ok(fs.readFileSync(copyA).equals(fs.readFileSync(copyB)));
  assert.equal(readProvenance(fs.readFileSync(copyA, 'utf8')), null);
  parseScoreDocument(fs.readFileSync(copyA, 'utf8'));
  const imported = importPartwiseMusicXml(fs.readFileSync(copyA, 'utf8'));
  assert.equal(imported.parts.length, 2);
  assert.equal(imported.parts[1]!.measures[39]!.beats, 3);
  assert.equal(imported.parts[1]!.measures[39]!.beatType, 4);
});

check('preserve run verifies locks and repeats byte-identical', () => {
  const out1 = path.join(tmp, 'preserve-1.musicxml');
  const out2 = path.join(tmp, 'preserve-2.musicxml');
  const run1 = preserveBhlSource({
    sourcePath: SOURCE,
    outputPath: out1,
    permittedOutputDir: tmp,
    span: SPAN,
    protectedGuitarBars: PROTECTED,
  });
  const run2 = preserveBhlSource({
    sourcePath: SOURCE,
    outputPath: out2,
    permittedOutputDir: tmp,
    span: SPAN,
    protectedGuitarBars: PROTECTED,
  });
  assert.equal(run1.verification.ok, true);
  assert.equal(run1.verification.reimports, true);
  assert.equal(run1.copy.outputSha256, before);
  assert.ok(fs.readFileSync(out1).equals(fs.readFileSync(out2)));
  assert.equal(run2.lock.sourceSha256, before);
  const bass40 = run1.lock.bass.filter((event) => event.bar === 40);
  assert.equal(bass40[0]!.rest, true);
  assert.deepEqual(bass40[1]!.midis, [41]);
});

check('export over the source path is rejected', () => {
  assert.throws(
    () => copyBhlSourceLossless({ sourcePath: SOURCE, outputPath: SOURCE, permittedOutputDir: path.dirname(SOURCE) }),
    (error: unknown) => error instanceof BhlExportRejected && error.reason === 'overwrites-source',
  );
  assert.equal(sha256File(SOURCE), before);
});

check('export outside the permitted directory is rejected', () => {
  const outside = path.join(os.tmpdir(), `bhl-outside-${process.pid}.musicxml`);
  assert.throws(
    () => copyBhlSourceLossless({ sourcePath: SOURCE, outputPath: outside, permittedOutputDir: tmp }),
    (error: unknown) => error instanceof BhlExportRejected && error.reason === 'outside-permitted-output',
  );
  assert.equal(fs.existsSync(outside), false);
});

check('export into the album tree is rejected', () => {
  const banned = path.join(path.dirname(SOURCE), 'bhl-must-not-write.musicxml');
  assert.throws(
    () =>
      copyBhlSourceLossless({
        sourcePath: SOURCE,
        outputPath: banned,
        permittedOutputDir: path.dirname(SOURCE),
      }),
    (error: unknown) => error instanceof BhlExportRejected && error.reason === 'read-only-root',
  );
  assert.equal(fs.existsSync(banned), false);
  assert.equal(sha256File(SOURCE), before);
});

check('altered bass pitch fails lock verification', () => {
  const mutated = mapMeasure(sourceXml, 'P2', '40', (measure) => measure.replace('<step>F</step>', '<step>G</step>'));
  expectLockFail(sourceXml, mutated, /bass bar 40 .*midis: 41 != 43|sounding bass/);
  const report = verifyBhlLocks(sourceXml, mutated, lockSpecOf(lock));
  assert.equal(report.reimports, true);
  assert.ok(report.errors.some((error) => /bass bar 40 .*midis/.test(error)));
});

check('altered bar 40 metre fails lock verification', () => {
  const mutated = mapMeasure(sourceXml, 'P2', '40', (measure) => measure.replace('<beats>3</beats>', '<beats>4</beats>'));
  expectLockFail(sourceXml, mutated, /metre part P2 bar 40: 3\/4/);
});

check('altered tempo fails lock verification', () => {
  const mutated = mapMeasure(sourceXml, 'P1', '1', (measure) =>
    measure.replace('tempo="120"', 'tempo="96"').replace('<per-minute>120</per-minute>', '<per-minute>96</per-minute>'),
  );
  expectLockFail(sourceXml, mutated, /tempo bar 33/);
});

check('altered rehearsal fails lock verification', () => {
  const mutated = mapMeasure(sourceXml, 'P1', '40', (measure) => measure.replace('>C</rehearsal>', '>Z</rehearsal>'));
  expectLockFail(sourceXml, mutated, /rehearsal part P1 bar 40/);
});

check('altered protected guitar pitch fails lock verification', () => {
  const mutated = mapMeasure(sourceXml, 'P1', '40', (measure) => measure.replace('<step>E</step>', '<step>F</step>'));
  expectLockFail(sourceXml, mutated, /guitar bar 40 .*midis/);
});

check('altered protected guitar tie fails lock verification', () => {
  const mutated = mapMeasure(sourceXml, 'P1', '40', (measure) =>
    measure.replace('<tie type="start" />', '').replace('<tied type="start" />', ''),
  );
  expectLockFail(sourceXml, mutated, /guitar bar 40 .*tieStart/);
});

check('fixture bass tied-only note fails when the tie is removed', () => {
  const spec = {
    span: { from: 1, to: 1 },
    bassPartId: 'P2',
    guitarPartId: 'P1',
    protectedGuitarBars: [] as number[],
  };
  const clean = verifyBhlLocks(TIED_BASS, TIED_BASS, spec);
  assert.equal(clean.ok, true, clean.errors.join(' | '));
  const mutated = TIED_BASS.replace('<tied type="start"/>', '');
  const report = verifyBhlLocks(TIED_BASS, mutated, spec);
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => /bass bar 1 .*tieStart/.test(error)), report.errors.join(' | '));
});

check('source file hash unchanged after the run', () => {
  assert.equal(sha256File(SOURCE), before);
});

console.log(`SOURCE_SHA256 ${before}`);
console.log(`OUTPUT_SHA256 ${copyA ? sha256File(copyA) : 'missing'}`);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log('\nALL BHL SOURCE LOCK CHECKS PASS');
