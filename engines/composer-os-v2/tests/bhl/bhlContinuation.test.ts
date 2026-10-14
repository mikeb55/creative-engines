/**
 * BHL phrase continuation — strategies checked by reimporting MusicXML.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlContinuation.test.ts
 * Album scores are read-only. Audition files go under ~/Downloads/BHL-Composer/Batch-A-Complete.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { apiBhlCompose } from '../../app-api/bhlApp';
import { BHL_ALBUM_ROOT } from '../../core/bhl/bhlCopy';
import { composeBhlGuitar } from '../../core/bhl/bhlCompose';
import { auditBhlIntentions } from '../../core/bhl/bhlIntentAudit';
import { sha256File } from '../../core/bhl/bhlIngest';
import type { BhlContinuationStrategy, BhlPhrasePlan, BhlPhraseRegion } from '../../core/bhl/bhlPhrase';
import { loadScore } from '../../core/performance-composer/pcScore';

const WT = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml',
);
const PG = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/02-Palace-Gates/02-Palace-Gates-Integrated-Guitar-Study-V1.0.musicxml',
);
const OUT = path.join(os.homedir(), 'Downloads', 'BHL-Composer', 'Batch-A-Complete');
const STAMP = new Date().toISOString().replace(/[:.]/g, '-');

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

function status(xml: string, plan: BhlPhrasePlan, regionId: string): string {
  return auditBhlIntentions(xml, plan).find((item) => item.regionId === regionId && item.intention.includes('Continue'))?.status ?? 'missing';
}

function region(id: string, bars: number[], role: BhlPhraseRegion['role'], dialogue: BhlPhraseRegion['dialogue'], strategy?: BhlContinuationStrategy, outsideColour = false): BhlPhraseRegion {
  return {
    id,
    from: bars[0]!,
    to: bars[bars.length - 1]!,
    bars,
    role,
    pitchClasses: [0, 2, 4, 6, 7, 9],
    vaultChordType: 'sus',
    vaultRootPc: 0,
    tensionState: role === 'statement' ? 'primary' : 'recover',
    motifSourceId: 'cell',
    pitchTransform: role === 'statement' ? 'neighbor-statement' : 'retain-and-admit-bass',
    transposeSemitones: 0,
    rhythmTransform: 'state-onsets',
    displacementQuarters: 0,
    ostinatoOnsets: null,
    dialogue,
    registerLow: 60,
    registerHigh: 76,
    density: 'single',
    ostinatoJustified: false,
    retainPitchClass: 0,
    predicates: [],
    ...(strategy ? { continuation: strategy, outsideColour } : {}),
  };
}

function planFor(strategy: BhlContinuationStrategy, dialogue: BhlPhraseRegion['dialogue'] = 'answer-after-bass', outsideColour = false): BhlPhrasePlan {
  return {
    seed: 3340,
    span: { from: 1, to: 8 },
    motif: { id: 'cell', pitchClasses: [0, 2, 4], intervals: [2, 2] },
    regions: [
      region('statement-1', [1, 2], 'statement', 'answer-after-bass'),
      region('continuation-3', [3, 4, 5, 6, 7, 8], strategy ? 'continuation' : 'continuation', dialogue, strategy, outsideColour),
    ],
  };
}

function bassBar(): string {
  const hit = '<note><pitch><step>C</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>';
  const rest = '<note><rest/><duration>3</duration><voice>1</voice><type>quarter</type><dot/></note>';
  return `${hit}${rest}${hit}${rest}`;
}

function guitarRest(): string {
  return '<note><rest/><duration>8</duration><voice>1</voice></note>';
}

function bar(number: number, body: string, head = ''): string {
  return `<measure number="${number}">${head}${body}</measure>`;
}

const head = `<attributes><divisions>2</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>120</per-minute></metronome></direction-type><sound tempo="120"/></direction><direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>`;
const bassHead = head.replace('<clef><sign>G</sign><line>2</line></clef>', '<clef><sign>F</sign><line>4</line></clef>');
const measures = (body: string, first: string) =>
  Array.from({ length: 8 }, (_, index) => bar(index + 1, body, index === 0 ? first : '')).join('');
const syntheticXml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1">${measures(guitarRest(), head)}</part>
  <part id="P2">${measures(bassBar(), bassHead)}</part>
</score-partwise>`;

const syntheticPath = path.join(os.tmpdir(), `bhl-continuation-source-${STAMP}.musicxml`);
fs.writeFileSync(syntheticPath, syntheticXml);
const syntheticBefore = sha256File(syntheticPath);
fs.mkdirSync(OUT, { recursive: true });

function writeUnique(name: string, xml: string): string {
  const file = path.join(OUT, `${name}-${STAMP}.musicxml`);
  fs.writeFileSync(file, xml, { flag: 'wx' });
  return file;
}

function runStrategy(strategy: BhlContinuationStrategy, outsideColour = false) {
  return composeBhlGuitar({
    sourcePath: syntheticPath,
    span: { from: 1, to: 8 },
    seed: 3340,
    world: 'A',
    plan: planFor(strategy, 'answer-after-bass', outsideColour),
  });
}

const extended = runStrategy('extend');
const fragmented = runStrategy('fragment');
const sequenced = runStrategy('sequence');
const rhythmic = runStrategy('rhythm');
const conversational = runStrategy('converse');
const coloured = runStrategy('extend', true);

check('synthetic source stays read-only and the long line reimports', () => {
  assert.equal(sha256File(syntheticPath), syntheticBefore);
  for (const run of [extended, fragmented, sequenced, rhythmic, conversational]) {
    assert.equal(run.verification.ok, true, run.verification.errors.join('; '));
    assert.equal(run.verification.reimports, true);
    loadScore(run.xml);
    assert.equal(run.feasibility.every((note) => note.feasible), true);
    assert.ok(run.liquid.every((trace) => !/maj7#11/i.test(trace.chordType)));
  }
});

check('extension, fragment, sequence, rhythm, and bass reply are in the MusicXML', () => {
  assert.equal(status(extended.xml, extended.plan, 'continuation-3'), 'VERIFIED');
  assert.equal(status(fragmented.xml, fragmented.plan, 'continuation-3'), 'VERIFIED');
  assert.equal(status(sequenced.xml, sequenced.plan, 'continuation-3'), 'VERIFIED');
  assert.equal(status(rhythmic.xml, rhythmic.plan, 'continuation-3'), 'VERIFIED');
  assert.equal(status(conversational.xml, conversational.plan, 'continuation-3'), 'VERIFIED');
  for (const run of [extended, fragmented, sequenced]) {
    const outside = run.fieldNotes.filter((note) => note.status === 'outside-permitted');
    assert.equal(outside.length, 0);
    assert.ok(run.fieldNotes.some((note) => note.status === 'in-field'));
  }
  assert.equal(coloured.fieldNotes.filter((note) => note.status === 'outside-permitted').length, 1);
});

check('silence, handoff, and a missing motif stay indeterminate', () => {
  const blocked = composeBhlGuitar({
    sourcePath: syntheticPath,
    span: { from: 1, to: 8 },
    seed: 3340,
    world: 'A',
    plan: planFor('extend', 'leave-space'),
  });
  assert.equal(status(blocked.xml, blocked.plan, 'continuation-3'), 'INDETERMINATE');
  assert.ok(blocked.limitations.some((item) => item.reason.includes('leaves space')));
  const thin = planFor('extend');
  thin.motif = { id: 'cell', pitchClasses: [], intervals: [] };
  const empty = composeBhlGuitar({ sourcePath: syntheticPath, span: { from: 1, to: 8 }, seed: 3340, world: 'A', plan: thin });
  assert.equal(status(empty.xml, empty.plan, 'continuation-3'), 'INDETERMINATE');
  assert.ok(empty.limitations.some((item) => item.reason.includes('was not invented')));
});

check('an unrelated line and a fifth cycle are not continuation', () => {
  const note = (step: string, octave: number) =>
    `<note><pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>`;
  const rest = '<note><rest/><duration>1</duration><voice>1</voice><type>eighth</type></note>';
  const xml = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${note('C', 4)}${note('D', 4)}${note('E', 4)}${rest}</measure>
  <measure number="2">${note('F', 4)}${note('A', 4)}${note('C', 5)}${note('E', 5)}</measure></part>
  <part id="P2"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${note('C', 3)}${rest}${rest}${rest}</measure>
  <measure number="2">${note('C', 3)}${note('G', 3)}${note('D', 4)}${note('A', 3)}</measure></part></score-partwise>`;
  const alien = planFor('extend');
  alien.span = { from: 1, to: 2 };
  alien.regions[0] = { ...alien.regions[0]!, bars: [1], from: 1, to: 1 };
  alien.regions[1] = { ...alien.regions[1]!, bars: [2], from: 2, to: 2 };
  assert.equal(status(xml, alien, 'continuation-3'), 'NOT OBSERVED');
  const fifths = `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${note('C', 4)}${note('D', 4)}${note('E', 4)}${rest}</measure>
  <measure number="2">${note('C', 4)}${note('G', 4)}${note('D', 5)}${note('A', 4)}</measure></part>
  <part id="P2"><measure number="1"><attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${note('C', 3)}${rest}${rest}${rest}</measure>
  <measure number="2">${note('C', 3)}${rest}${rest}${rest}</measure></part></score-partwise>`;
  assert.equal(status(fifths, alien, 'continuation-3'), 'NOT OBSERVED');
});

check('worlds A and F stay distinct and Wrong Turning rests are not filled', () => {
  const wtBefore = sha256File(WT);
  const pgBefore = sha256File(PG);
  const a = composeBhlGuitar({ sourcePath: WT, span: { from: 33, to: 40 }, seed: 3340, world: 'A' });
  const f = composeBhlGuitar({ sourcePath: WT, span: { from: 33, to: 40 }, seed: 3340, world: 'F' });
  const a2 = composeBhlGuitar({ sourcePath: WT, span: { from: 33, to: 40 }, seed: 4401, world: 'A' });
  const palaceC = composeBhlGuitar({ sourcePath: PG, span: { from: 43, to: 46 }, seed: 3340, world: 'C' });
  const palaceE = composeBhlGuitar({ sourcePath: PG, span: { from: 43, to: 46 }, seed: 4401, world: 'E' });
  assert.notEqual(a.events.map((event) => event.pitchClasses.join('.')).join('|'), f.events.map((event) => event.pitchClasses.join('.')).join('|'));
  assert.equal(a.world?.fifthSteps, 0);
  assert.equal(f.world?.fifthSteps, 0);
  assert.equal(sha256File(WT), wtBefore);
  assert.equal(sha256File(PG), pgBefore);
  assert.equal(palaceC.verification.ok, true, palaceC.verification.errors.join('; '));
  assert.equal(palaceE.verification.ok, true, palaceE.verification.errors.join('; '));
  assert.equal(palaceC.xml.includes('<beats>6</beats>'), true);
  const held = apiBhlCompose({ sourcePath: WT, span: { from: 33, to: 40 }, seed: 3340, world: 'A', continuation: 'hold' });
  const asked = apiBhlCompose({ sourcePath: WT, span: { from: 33, to: 40 }, seed: 3340, world: 'A', continuation: 'extend' });
  assert.equal(held.ok, true);
  assert.equal(asked.ok, true);
  if (!held.ok || !asked.ok) return;
  assert.equal(JSON.stringify(held.events), JSON.stringify(a.events));
  assert.ok(asked.musicalEvidence.limitations.some((item) => item.reason.includes('leaves space') || item.reason.includes('handoff')));
  const files = [
    writeUnique('Wrong-Turning-world-A-seed3340', a.xml),
    writeUnique('Wrong-Turning-world-F-seed3340', f.xml),
    writeUnique('Wrong-Turning-world-A-seed4401', a2.xml),
    writeUnique('Palace-Gates-world-C-seed3340', palaceC.xml),
    writeUnique('Palace-Gates-world-E-seed4401', palaceE.xml),
    writeUnique('Synthetic-extend-world-A-seed3340', extended.xml),
    writeUnique('Synthetic-fragment-world-A-seed3340', fragmented.xml),
    writeUnique('Synthetic-sequence-world-A-seed3340', sequenced.xml),
    writeUnique('Synthetic-rhythm-world-A-seed3340', rhythmic.xml),
    writeUnique('Synthetic-converse-world-A-seed3340', conversational.xml),
    writeUnique('Synthetic-extend-outside-world-A-seed3340', coloured.xml),
  ];
  const lines = [
    '# BHL Batch A continuation',
    '',
    '**CANDIDATE FOR AUDITION — NOT MUSICALLY APPROVED**',
    '',
    'Evidence was read back from the exported MusicXML. A verified intention is not artistic approval.',
    '',
    `Wrong Turning world A seed 3340 development: ${auditBhlIntentions(a.xml, a.plan).find((item) => item.regionId === 'development-36.37' && item.intention.includes('recognisable'))?.status}`,
    `Synthetic extend: ${status(extended.xml, extended.plan, 'continuation-3')}`,
    `Synthetic fragment: ${status(fragmented.xml, fragmented.plan, 'continuation-3')}`,
    `Synthetic sequence: ${status(sequenced.xml, sequenced.plan, 'continuation-3')}`,
    `Synthetic rhythm: ${status(rhythmic.xml, rhythmic.plan, 'continuation-3')}`,
    `Synthetic bass reply: ${status(conversational.xml, conversational.plan, 'continuation-3')}`,
    `Outside colours on the explicit example: ${coloured.fieldNotes.filter((note) => note.status === 'outside-permitted').length}`,
    '',
    'World A is two major triads a major second apart. World F is major triads a minor third and a tritone apart. Their guitar pitch sequences differ.',
    'Wrong Turning bars 39–40 stay leave-space and handoff. Continuation was not written into those rests.',
    'Palace Gates keeps 6/8.',
    '',
    '## Files',
    ...files.map((file) => `- ${file}`),
  ];
  const report = path.join(OUT, `audition-${STAMP}.md`);
  fs.writeFileSync(report, lines.join('\n'), { flag: 'wx' });
  console.log(`WROTE ${report}`);
});

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('PASS phrase continuation');
