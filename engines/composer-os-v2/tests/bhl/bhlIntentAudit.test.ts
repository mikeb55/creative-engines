/**
 * BHL intention audit — evidence, not a quality score.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlIntentAudit.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BHL_ALBUM_ROOT } from '../../core/bhl/bhlCopy';
import { composeBhlGuitar } from '../../core/bhl/bhlCompose';
import { auditBhlIntentions, type BhlIntentCheck } from '../../core/bhl/bhlIntentAudit';
import type { BhlPhrasePlan, BhlPhraseRegion } from '../../core/bhl/bhlPhrase';

const SOURCE = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml',
);

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

function region(patch: Partial<BhlPhraseRegion> & Pick<BhlPhraseRegion, 'id' | 'role' | 'bars' | 'dialogue'>): BhlPhraseRegion {
  return {
    from: patch.bars[0]!,
    to: patch.bars.at(-1)!,
    pitchClasses: [0, 2, 4],
    vaultChordType: 'sus',
    vaultRootPc: 0,
    tensionState: 'primary',
    motifSourceId: 'motif',
    pitchTransform: 'neighbor-statement',
    transposeSemitones: 0,
    rhythmTransform: 'state-onsets',
    displacementQuarters: 0,
    ostinatoOnsets: null,
    registerLow: 48,
    registerHigh: 76,
    density: 'single',
    ostinatoJustified: false,
    retainPitchClass: null,
    predicates: [],
    ...patch,
  };
}

function plan(intervals: number[], regions: BhlPhraseRegion[]): BhlPhrasePlan {
  return {
    seed: 1,
    span: { from: 1, to: 1 },
    motif: { id: 'motif', pitchClasses: [0, 2, 4], intervals },
    regions,
  };
}

function score(guitar: string, bass: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    ${guitar}
  </measure></part>
  <part id="P2"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    ${bass}
  </measure></part>
</score-partwise>`;
}

function note(step: string, octave: number, alter = 0): string {
  const acc = alter ? `<alter>${alter}</alter>` : '';
  return `<note><pitch><step>${step}</step>${acc}<octave>${octave}</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>`;
}

function status(checks: BhlIntentCheck[], role: string): string {
  return checks.find((item) => item.role === role || item.intention.toLowerCase().includes(role))?.status ?? 'missing';
}

check('counter-motion is verified from the score, not from a generator label', () => {
  const xml = score(
    `${note('E', 4)}${note('D', 4)}${note('C', 4)}${note('B', 3)}`,
    `${note('C', 3)}${note('D', 3)}${note('E', 3)}${note('F', 3)}`,
  );
  const checks = auditBhlIntentions(xml, plan([2, 2], [region({ id: 'a', role: 'statement', bars: [1], dialogue: 'counter-motion' })]));
  assert.equal(checks.find((item) => item.intention.includes('opposite directions'))?.status, 'VERIFIED');
  assert.equal(JSON.stringify(checks).includes('musicalQuality'), false);
});

check('a full bar with no rest does not satisfy leave-space', () => {
  const xml = score(
    `${note('C', 4)}${note('D', 4)}${note('E', 4)}${note('F', 4)}`,
    `${note('C', 3)}<note><rest/><duration>3</duration><voice>1</voice><type>half</type><dot/></note>`,
  );
  const checks = auditBhlIntentions(xml, plan([2, 2, 1], [region({ id: 'a', role: 'statement', bars: [1], dialogue: 'leave-space' })]));
  assert.equal(checks.find((item) => item.intention.includes('Leave rests'))?.status, 'NOT OBSERVED');
});

check('a different interval is not called a return, and a short line stays indeterminate', () => {
  const xml = score(`${note('C', 4)}${note('F', 4)}${note('A', 4)}<note><rest/><duration>1</duration><voice>1</voice></note>`, `${note('C', 3)}<note><rest/><duration>3</duration><voice>1</voice></note>`);
  const checks = auditBhlIntentions(
    xml,
    plan([2, 2], [
      region({ id: 's', role: 'statement', bars: [1], dialogue: 'leave-space' }),
      region({ id: 'r', role: 'return', bars: [2], dialogue: 'leave-space' }),
    ]),
  );
  assert.equal(checks.find((item) => item.regionId === 's' && item.role === 'statement')?.status, 'NOT OBSERVED');
  assert.equal(status(checks.filter((item) => item.regionId === 'r'), 'return'), 'INDETERMINATE');
});

check('a dissonance audit has no compulsory resolution and no quality score', () => {
  const xml = score(`${note('F', 4)}${note('F', 4)}<note><rest/><duration>2</duration><voice>1</voice></note>`, `${note('E', 4)}${note('E', 4)}<note><rest/><duration>2</duration><voice>1</voice></note>`);
  const checks = auditBhlIntentions(xml, plan([0], [region({ id: 'a', role: 'continuation', bars: [1], dialogue: 'counter-motion' })]));
  assert.ok(checks.every((item) => item.status === 'VERIFIED' || item.status === 'NOT OBSERVED' || item.status === 'INDETERMINATE'));
  assert.equal(JSON.stringify(checks).includes('requiresResolution'), false);
});

check('generated Wrong Turning XML can be audited without changing the guitar notes', () => {
  const run = composeBhlGuitar({ sourcePath: SOURCE, span: { from: 33, to: 40 }, seed: 3340 });
  const checks = auditBhlIntentions(run.xml, run.plan);
  assert.ok(checks.length > 0);
  assert.ok(checks.every((item) => ['VERIFIED', 'NOT OBSERVED', 'INDETERMINATE'].includes(item.status)));
  assert.equal(run.predicates.some((item) => item.id === 'phase9-beat-2-and-4-cleared'), false);
  const again = composeBhlGuitar({ sourcePath: SOURCE, span: { from: 33, to: 40 }, seed: 3340 });
  assert.equal(JSON.stringify(run.events), JSON.stringify(again.events));
  assert.equal(fs.readFileSync(SOURCE).includes('<score-partwise'), true);
});

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('PASS intention audit');
