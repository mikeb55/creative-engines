/**
 * BHL GUI workflow — the same API the #/bhl page calls.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlGuiWorkflow.test.ts
 * Reads Wrong Turning. Writes one export under ~/Downloads/BHL-Composer. Does not modify the album.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadScore } from '../../core/performance-composer/pcScore';
import {
  apiBhlCompose,
  apiBhlDefaults,
  apiBhlExport,
  apiBhlInspect,
  apiBhlOpen,
  bhlWrongTurningPath,
} from '../../app-api/bhlApp';
import { sha256File } from '../../core/bhl/bhlIngest';
import { presentBhlScore } from '../../core/bhl/bhlPresent';

const SOURCE = bhlWrongTurningPath();
const SPAN = { from: 33, to: 40 };
const SEED = 3340;

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

const before = sha256File(SOURCE);
const defaults = apiBhlDefaults();
const inspected = apiBhlInspect({ sourcePath: SOURCE, span: SPAN, seed: SEED, protectedGuitarBars: '' });
if (!inspected.ok) {
  console.error(inspected.error);
  process.exit(1);
}
const composed = apiBhlCompose({ sourcePath: SOURCE, span: SPAN, seed: SEED, protectedGuitarBars: '' });
if (!composed.ok) {
  console.error(composed.error);
  process.exit(1);
}
const again = apiBhlCompose({ sourcePath: SOURCE, span: SPAN, seed: SEED, protectedGuitarBars: '' });
if (!again.ok) {
  console.error(again.error);
  process.exit(1);
}

check('defaults point at Wrong Turning', () => {
  assert.equal(defaults.ok, true);
  assert.equal(defaults.sourcePath, SOURCE);
  assert.equal(defaults.sourceExists, true);
  assert.deepEqual(defaults.span, SPAN);
});

check('import names the guitar and upright bass and shows metre, tempo, rehearsal', () => {
  assert.match(inspected.guitarName, /guitar/i);
  assert.match(inspected.bassName, /bass/i);
  assert.equal(inspected.tempo?.perMinute, '120');
  assert.equal(inspected.tempo?.beatUnit, 'quarter');
  const guitarMetres = inspected.metres.filter((metre) => metre.partId === inspected.guitarPartId);
  assert.equal(guitarMetres.find((metre) => metre.bar === 39)?.beats, 4);
  assert.equal(guitarMetres.find((metre) => metre.bar === 40)?.beats, 3);
  assert.equal(guitarMetres.find((metre) => metre.bar === 40)?.beatType, 4);
  assert.deepEqual(
    inspected.rehearsal.map((mark) => `${mark.bar}:${mark.text}`).sort(),
    ['33:B', '40:C'],
  );
  assert.ok(inspected.bassEventCount > 0);
  assert.ok(inspected.plan.regions.length > 0);
  assert.ok(inspected.fieldChoices[inspected.plan.regions[0]!.id]?.some((choice) => choice.id === 'bass-field'));
});

check('generate uses the BHL composer, keeps the source, and changes the guitar', () => {
  assert.equal(sha256File(SOURCE), before);
  assert.equal(composed.sourceSha256, before);
  assert.equal(composed.sourceUnchanged, true);
  assert.equal(composed.verification.ok, true, composed.verification.errors.join('; '));
  assert.equal(composed.verification.reimports, true);
  assert.equal(composed.outsideIdentical, true);
  assert.equal(composed.guitarChanged, true);
  assert.ok(composed.events.length > 0);
  assert.ok(composed.predicates.every((item) => item.ok), composed.predicates.filter((item) => !item.ok).map((item) => item.detail).join('; '));
  assert.ok(composed.feasibility.every((note) => note.feasible));
  assert.equal(composed.musicalEvidence.provisional, true);
  assert.equal(composed.musicalEvidence.candidate.musicalQualityScore, null);
  assert.equal(composed.musicalEvidence.original.awaitingComposerVerification, true);
  assert.equal(composed.musicalEvidence.original.barMetres.find((metre) => metre.bar === 40)?.beats, 3);
  assert.ok(composed.musicalEvidence.intentions.length > 0);
  assert.equal(inspected.evidence.barMetres.find((metre) => metre.bar === 40)?.beats, 3);
  assert.equal(composed.gce.musicallyApproved, false);
  assert.equal(composed.gce.candidateForAudition, false);
  assert.equal(composed.gce.technicalLabel, 'technical checks passed');
  loadScore(composed.xml);
  assert.equal(JSON.stringify(composed.events), JSON.stringify(again.events));
});

check('protected guitar bar 33 stays in the export bytes', () => {
  const protectedRun = apiBhlCompose({
    sourcePath: SOURCE,
    span: SPAN,
    seed: SEED,
    protectedGuitarBars: [33],
  });
  assert.equal(protectedRun.ok, true);
  if (!protectedRun.ok) return;
  assert.equal(protectedRun.verification.ok, true, protectedRun.verification.errors.join('; '));
  assert.ok(protectedRun.events.every((event) => event.bar !== 33));
  const grab = (xml: string) => {
    const partStart = xml.indexOf(`<part id="${inspected.guitarPartId}">`);
    const partEnd = xml.indexOf('</part>', partStart);
    const part = xml.slice(partStart, partEnd);
    const at = part.indexOf('<measure number="33">');
    const close = part.indexOf('</measure>', at);
    return part.slice(at, close + '</measure>'.length);
  };
  const sourceXml = fs.readFileSync(SOURCE, 'utf8');
  assert.equal(grab(protectedRun.xml), grab(sourceXml));
  assert.equal(sha256File(SOURCE), before);
});

const exported = apiBhlExport({
  sourcePath: SOURCE,
  span: SPAN,
  seed: SEED,
  protectedGuitarBars: [],
  sourceSha256: before,
  xml: composed.xml,
});

check('export writes a new MusicXML and leaves the source hash', () => {
  assert.equal(exported.ok, true);
  if (!exported.ok) return;
  assert.equal(sha256File(SOURCE), before);
  assert.equal(exported.sourceUnchanged, true);
  assert.equal(exported.verification.ok, true, exported.verification.errors.join('; '));
  const disk = fs.readFileSync(exported.outputPath, 'utf8');
  assert.equal(disk, presentBhlScore(composed.xml));
  loadScore(disk);
  assert.ok(exported.outputPath.includes('BHL-Composer'));
  assert.notEqual(pathResolve(exported.outputPath), pathResolve(SOURCE));
  console.log(`WROTE ${exported.outputPath}`);
});

check('open refuses the album source', () => {
  const refused = apiBhlOpen({ outputPath: SOURCE });
  assert.equal(refused.ok, false);
});

function pathResolve(filePath: string): string {
  return fs.realpathSync(filePath);
}

if (failed) {
  console.error(`\n${failed} BHL GUI CHECKS FAILED`);
  process.exit(1);
}
console.log('\nALL BHL GUI CHECKS PASS');
