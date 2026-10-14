/**
 * BHL generation refinement — intentions checked by reimporting MusicXML.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlGenerationRefine.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BHL_ALBUM_ROOT } from '../../core/bhl/bhlCopy';
import { composeBhlGuitar } from '../../core/bhl/bhlCompose';
import { auditBhlIntentions, type BhlIntentCheck } from '../../core/bhl/bhlIntentAudit';
import { sha256File } from '../../core/bhl/bhlIngest';
import { deriveBhlPhrasePlan, type BhlPhrasePlan } from '../../core/bhl/bhlPhrase';
import { ingestBhlSource } from '../../core/bhl/bhlIngest';
import type { BhlWorldId } from '../../core/bhl/bhlWorlds';

const WT = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml',
);
const PG = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/02-Palace-Gates/02-Palace-Gates-Integrated-Guitar-Study-V1.0.musicxml',
);
const WT_SPAN = { from: 33, to: 40 };
const PG_SPAN = { from: 43, to: 46 };
const OUT = path.join(os.homedir(), 'Downloads', 'BHL-Composer', 'Generation-Refinement');

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

function status(checks: readonly BhlIntentCheck[], regionId: string, intention: string): string {
  return checks.find((item) => item.regionId === regionId && item.intention.includes(intention))?.status ?? 'missing';
}

function withDialogue(source: string, span: { from: number; to: number }, seed: number, dialogue: 'counter-motion'): BhlPhrasePlan {
  const lock = ingestBhlSource({ sourcePath: source, span });
  const plan = deriveBhlPhrasePlan(lock.bass, lock.metres, lock.bassPartId, span, seed);
  for (const region of plan.regions) {
    if (region.role === 'development' && region.rhythmTransform !== 'silence-window') region.dialogue = dialogue;
  }
  return plan;
}

const wtBefore = sha256File(WT);
const pgBefore = sha256File(PG);
fs.mkdirSync(OUT, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');

function writeUnique(name: string, xml: string): string {
  const file = path.join(OUT, `${name}-${stamp}.musicxml`);
  fs.writeFileSync(file, xml, { flag: 'wx' });
  return file;
}

const wtA = composeBhlGuitar({ sourcePath: WT, span: WT_SPAN, seed: 3340, world: 'A' });
const wtA2 = composeBhlGuitar({ sourcePath: WT, span: WT_SPAN, seed: 4401, world: 'A' });
const wtF = composeBhlGuitar({ sourcePath: WT, span: WT_SPAN, seed: 3340, world: 'F' });
const pgA = composeBhlGuitar({ sourcePath: PG, span: PG_SPAN, seed: 3340, world: 'A' });
const pgPlan = withDialogue(PG, PG_SPAN, 3340, 'counter-motion');
const pgC = composeBhlGuitar({ sourcePath: PG, span: PG_SPAN, seed: 3340, world: 'C', plan: pgPlan });
const pgC2 = composeBhlGuitar({
  sourcePath: PG,
  span: PG_SPAN,
  seed: 4401,
  world: 'E',
  plan: withDialogue(PG, PG_SPAN, 4401, 'counter-motion'),
});

check('source scores and bass stay untouched', () => {
  assert.equal(sha256File(WT), wtBefore);
  assert.equal(sha256File(PG), pgBefore);
  for (const run of [wtA, wtF, pgA, pgC]) {
    assert.equal(run.verification.ok, true, run.verification.errors.join('; '));
    assert.equal(run.verification.reimports, true);
    assert.equal(run.outsideIdentical, true);
    assert.ok(run.feasibility.every((note) => note.feasible));
  }
  const source = ingestBhlSource({ sourcePath: WT, span: WT_SPAN });
  const again = ingestBhlSource({ sourcePath: WT, span: WT_SPAN });
  assert.equal(JSON.stringify(source.bass), JSON.stringify(again.bass));
});

check('Wrong Turning development fragment and contrary motion are in the MusicXML', () => {
  for (const [label, run] of [['A/3340', wtA], ['A/4401', wtA2], ['F/3340', wtF]] as const) {
    const checks = auditBhlIntentions(run.xml, run.plan);
    assert.equal(status(checks, 'development-36.37', 'recognisable interval'), 'VERIFIED', label);
    assert.equal(status(checks, 'development-36.37', 'opposite directions'), 'VERIFIED', label);
    assert.equal(status(checks, 'statement-33', 'declared motif'), 'VERIFIED', label);
    assert.equal(status(checks, 'return-38', 'motif material'), 'VERIFIED', label);
    assert.equal(status(checks, 'continuation-39', 'Leave rests'), 'VERIFIED', label);
    assert.equal(status(checks, 'continuation-40', 'hands activity'), 'VERIFIED', label);
    assert.equal(JSON.stringify(checks).includes('musicalQuality'), false);
  }
});

check('a silence window is not filled just to pass development', () => {
  const checks = auditBhlIntentions(wtA.xml, wtA.plan);
  assert.equal(status(checks, 'development-35', 'recognisable interval'), 'INDETERMINATE');
  assert.ok(wtA.limitations.some((item) => item.regionId === 'development-35' && item.reason.includes('silence window')));
});

check('Palace Gates keeps 6/8, octave part, handoff, and reports the one-note motif', () => {
  assert.equal(pgA.verification.ok, true, pgA.verification.errors.join('; '));
  const checks = auditBhlIntentions(pgA.xml, pgA.plan);
  assert.equal(status(checks, 'statement-43', 'hands activity'), 'VERIFIED');
  assert.equal(status(checks, 'development-44.46', 'recognisable interval'), 'INDETERMINATE');
  assert.ok(pgA.limitations.some((item) => item.reason.includes('three guitar attacks') || item.reason.includes('fewer than two intervals')));
  assert.equal(pgA.xml.includes('<beats>6</beats>'), true);
  assert.equal(pgA.xml.includes('<beat-type>8</beat-type>'), true);
});

check('Palace Gates counter-motion is audible when requested and refused on a held bass', () => {
  for (const run of [pgC, pgC2]) {
    assert.equal(run.verification.ok, true, run.verification.errors.join('; '));
    const checks = auditBhlIntentions(run.xml, run.plan);
    assert.equal(status(checks, 'development-44.46', 'opposite directions'), 'VERIFIED');
    assert.equal(status(checks, 'development-45', 'opposite directions'), 'INDETERMINATE');
    assert.ok(run.limitations.some((item) => item.regionId === 'development-45' && item.reason.includes('No bass note sustains')));
  }
});

check('parallel motion and an unrelated line do not satisfy the intentions', () => {
  const note = (step: string, octave: number, alter = 0) =>
    `<note><pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>${octave}</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>`;
  const development = wtA.plan.regions.find((region) => region.id === 'development-36.37')!;
  const statement = wtA.plan.regions.find((region) => region.id === 'statement-33')!;
  const twoBars = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list>
  <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
  <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
</part-list>
<part id="P1">
<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${note('A', 4)}${note('B', 4, -1)}${note('G', 4)}<note><rest/><duration>1</duration><voice>1</voice><type>quarter</type></note></measure>
<measure number="2">${note('C', 4)}${note('D', 4)}${note('E', 4)}${note('F', 4)}</measure>
</part>
<part id="P2">
<measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${note('C', 3)}${note('D', 3)}${note('E', 3)}${note('F', 3)}</measure>
<measure number="2">${note('C', 3)}${note('D', 3)}${note('E', 3)}${note('F', 3)}</measure>
</part></score-partwise>`;
  const checks = auditBhlIntentions(twoBars, {
    ...wtA.plan,
    span: { from: 1, to: 2 },
    regions: [
      { ...statement, bars: [1], from: 1, to: 1 },
      { ...development, bars: [2], from: 2, to: 2 },
    ],
  });
  assert.equal(checks.find((item) => item.regionId === 'development-36.37' && item.intention.includes('opposite directions'))?.status, 'NOT OBSERVED');
  assert.equal(checks.find((item) => item.regionId === 'development-36.37' && item.intention.includes('recognisable interval'))?.status, 'NOT OBSERVED');
});

check('protected guitar bar and world identity still hold', () => {
  const run = composeBhlGuitar({
    sourcePath: WT,
    span: WT_SPAN,
    seed: 3340,
    world: 'A',
    protectedGuitarBars: [33],
  });
  assert.equal(run.verification.ok, true, run.verification.errors.join('; '));
  assert.ok(run.events.every((event) => event.bar !== 33));
  const worlds: BhlWorldId[] = ['A', 'B', 'C', 'D', 'E', 'F'];
  const signatures = new Set(worlds.map((world) => composeBhlGuitar({ sourcePath: WT, span: WT_SPAN, seed: 3340, world }).events.map((event) => event.pitchClasses.join('.')).join('|')));
  assert.equal(signatures.size, 6);
});

const written = [
  ['Wrong-Turning-refined-development-world-A-seed3340', wtA.xml],
  ['Wrong-Turning-refined-development-world-F-seed3340', wtF.xml],
  ['Wrong-Turning-refined-development-world-A-seed4401', wtA2.xml],
  ['Palace-Gates-refined-dialogue-world-A-seed3340', pgA.xml],
  ['Palace-Gates-refined-counterpoint-world-C-seed3340', pgC.xml],
  ['Palace-Gates-refined-counterpoint-world-E-seed4401', pgC2.xml],
] as const;
const paths = written.map(([name, xml]) => writeUnique(name, xml));

const prior = path.join(os.homedir(), 'Downloads', 'BHL-Composer', '06-Wrong-Turning-Integrated-Guitar-Study-V2.4-BHL-GUI-seed3340-2026-10-13T17-41-31-315Z.musicxml');
let baseline = 'No earlier GUI export was copied.';
if (fs.existsSync(prior)) {
  const dest = path.join(OUT, `Wrong-Turning-original-generation-baseline-seed3340-${stamp}.musicxml`);
  fs.copyFileSync(prior, dest);
  baseline = dest;
}

const lines = [
  '# BHL generation refinement',
  '',
  '**CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED**',
  '',
  'The evidence reader judged the exported MusicXML. A verified intention is not a judgement that the music is good.',
  '',
  `Baseline copy: ${baseline}`,
  '',
  'Earlier Wrong Turning seed 3340 audit: development bars 36–37 NOT OBSERVED, counter-motion NOT OBSERVED.',
  '',
  '## Wrong Turning world A seed 3340',
  ...auditBhlIntentions(wtA.xml, wtA.plan).map((item) => `- ${item.status} · ${item.regionId} · ${item.intention}`),
  ...wtA.limitations.map((item) => `- LIMIT · ${item.regionId} · ${item.reason}`),
  '',
  '## Wrong Turning world F seed 3340',
  ...auditBhlIntentions(wtF.xml, wtF.plan).map((item) => `- ${item.status} · ${item.regionId} · ${item.intention}`),
  '',
  '## Palace Gates world A seed 3340',
  ...auditBhlIntentions(pgA.xml, pgA.plan).map((item) => `- ${item.status} · ${item.regionId} · ${item.intention}`),
  ...pgA.limitations.map((item) => `- LIMIT · ${item.regionId} · ${item.reason}`),
  '',
  '## Palace Gates world C seed 3340 with counter-motion on the spoken development',
  ...auditBhlIntentions(pgC.xml, pgC.plan).map((item) => `- ${item.status} · ${item.regionId} · ${item.intention}`),
  ...pgC.limitations.map((item) => `- LIMIT · ${item.regionId} · ${item.reason}`),
  '',
  '## Files',
  ...paths.map((file) => `- ${file}`),
];
const report = path.join(OUT, `comparison-${stamp}.md`);
fs.writeFileSync(report, lines.join('\n'), { flag: 'wx' });
console.log(`WROTE ${report}`);

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('PASS generation refinement');
