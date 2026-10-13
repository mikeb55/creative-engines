/**
 * BHL evidence reader — original scores first.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/bhl/bhlEvidence.test.ts
 * Album files are read-only. Reports are new files under ~/Downloads/BHL-Composer/Evidence.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BHL_ALBUM_ROOT } from '../../core/bhl/bhlCopy';
import {
  compareBhlEvidence,
  formatBhlEvidenceReport,
  pitchName,
  q,
  qCmp,
  qEq,
  readBhlEvidence,
  voiceKey,
  type BhlTimelineEvent,
} from '../../core/bhl/bhlEvidence';

const WRONG = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml',
);
const PALACE = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/02-Palace-Gates/02-Palace-Gates-Integrated-Guitar-Study-V1.0.musicxml',
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

function at(events: readonly BhlTimelineEvent[], part: string, voice: string, bar: number, onset: string): BhlTimelineEvent[] {
  return events.filter(
    (event) => event.partId === part && event.voice === voice && event.bar === bar && formatOnset(event) === onset,
  );
}

function formatOnset(event: BhlTimelineEvent): string {
  return event.onsetInBar.d === 1 ? String(event.onsetInBar.n) : `${event.onsetInBar.n}/${event.onsetInBar.d}`;
}

function score(parts: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  ${parts}
</score-partwise>`;
}

const wrong = readBhlEvidence(fs.readFileSync(WRONG, 'utf8'), { from: 33, to: 40 });
const palace = readBhlEvidence(fs.readFileSync(PALACE, 'utf8'), { from: 43, to: 46 });

check('Wrong Turning reconstruction agrees with measureViews', () => {
  assert.deepEqual(wrong.reconstructionWarnings, []);
  assert.equal(wrong.musicalQualityScore, null);
  assert.equal(wrong.awaitingComposerVerification, true);
});

check('Wrong Turning bar 40 stays 3/4 and the guitar and bass share one timeline', () => {
  const bar40 = wrong.barMetres.find((metre) => metre.bar === 40)!;
  assert.equal(bar40.beats, 3);
  assert.equal(bar40.beatType, 4);
  assert.ok(qEq(bar40.quarters, q(3)));
  assert.ok(qEq(bar40.maxCursor, q(3)));
  const guitarStart = wrong.events.find((event) => event.partId === 'P1' && event.bar === 33)!;
  const bassStart = wrong.events.find((event) => event.partId === 'P2' && event.bar === 33)!;
  assert.ok(qEq(guitarStart.onset, bassStart.onset));
  assert.equal(wrong.barMetres.every((metre) => metre.bar < 40 || metre.beats === 3), true);
  assert.equal(wrong.barMetres.filter((metre) => metre.bar < 40).every((metre) => metre.beats === 4 && metre.beatType === 4), true);
});

check('Wrong Turning bass is a melody and guitar rests stay inside the bar', () => {
  const bass33 = wrong.events.filter((event) => event.partId === 'P2' && event.bar === 33 && event.attack).map((event) => event.midi);
  assert.deepEqual(bass33, [40, 43, 45, 46, 40]);
  const guitarRest = wrong.silences.find((item) => item.voice === 'P1:1' && item.bar === 33 && item.kind === 'inner-bar');
  assert.ok(guitarRest);
  assert.ok(qEq(guitarRest!.onsetInBar, q(0)));
  const andOfTwo = at(wrong.events, 'P1', '1', 33, '1');
  assert.deepEqual(andOfTwo.map((event) => event.midi).sort(), [62, 67]);
  const guitar33 = wrong.density.find((row) => row.partId === 'P1' && row.bar === 33)!;
  assert.equal(guitar33.attacks, 3);
  assert.ok(qCmp(guitar33.sounding, guitar33.metre) < 0);
  const guitar36 = wrong.density.find((row) => row.partId === 'P1' && row.bar === 36)!;
  assert.ok(qCmp(guitar36.sounding, guitar36.metre) <= 0);
  const tie = wrong.events.find((event) => event.partId === 'P1' && event.bar === 40 && event.midi === 69);
  assert.ok(tie?.tieSustained);
  assert.ok(qEq(tie!.duration, q(2)));
  assert.equal(wrong.events.filter((event) => event.partId === 'P1' && event.bar === 40 && event.midi === 69 && event.attack).length, 1);
  const bb = at(wrong.events, 'P1', '1', 40, '2').find((event) => event.midi === 70);
  assert.ok(bb?.attack);
});

check('Wrong Turning motion is classified from continuous sounding lines', () => {
  const parallel = wrong.motions.filter((item) => item.kind === 'parallel' && item.bar === 35);
  assert.ok(parallel.length >= 1, JSON.stringify(wrong.motions));
  const contrary = wrong.motions.find((item) => item.kind === 'contrary' && item.bar === 39);
  assert.ok(contrary, JSON.stringify(wrong.motions.filter((item) => item.bar === 39)));
  assert.equal(contrary!.pitchA - contrary!.previousA, -3);
  assert.equal(contrary!.pitchB - contrary!.previousB, 3);
  const oblique = wrong.motions.find((item) => item.kind === 'oblique' && item.bar === 40);
  assert.ok(oblique, JSON.stringify(wrong.motions.filter((item) => item.bar === 40)));
  const sustain = wrong.entries.find((item) => item.kind === 'against-sustain' && item.bar === 37);
  assert.ok(sustain);
  assert.equal(pitchName(sustain!.enteringMidi), 'Bb4');
});

check('Palace Gates keeps 6/8, sounding octave, two guitar voices, and bar 46 rest', () => {
  assert.deepEqual(palace.reconstructionWarnings, []);
  assert.ok(palace.barMetres.every((metre) => metre.beats === 6 && metre.beatType === 8));
  assert.ok(palace.barMetres.every((metre) => qEq(metre.quarters, q(3)) && qEq(metre.maxCursor, q(3))));
  const g1 = at(palace.events, 'P1', '1', 43, '0');
  const g2 = at(palace.events, 'P1', '2', 43, '0');
  assert.deepEqual(g1.map((event) => event.midi), [55]);
  assert.deepEqual(g2.map((event) => event.midi), [52]);
  assert.ok(qEq(g1[0]!.onset, g2[0]!.onset));
  assert.equal(pitchName(55), 'G3');
  assert.equal(pitchName(52), 'E3');
  const bass = at(palace.events, 'P2', '1', 43, '0');
  assert.deepEqual(bass.map((event) => event.midi), [47]);
  const interval = palace.intervals.find(
    (item) => item.bar === 43 && item.midiA === 55 && item.midiB === 52 && !item.chordal,
  );
  assert.equal(interval?.semitones, 3);
  const guitar46 = palace.events.filter((event) => event.partId === 'P1' && event.bar === 46);
  assert.ok(guitar46.length >= 2);
  assert.ok(guitar46.every((event) => event.rest));
  assert.equal(palace.events.filter((event) => event.partId === 'P1' && event.bar === 46 && event.attack).length, 0);
  const bass46 = palace.events.filter((event) => event.partId === 'P2' && event.bar === 46 && event.attack).map((event) => event.midi);
  assert.deepEqual(bass46, [47, 45, 43, 40]);
  const voices = new Set(palace.events.filter((event) => event.partId === 'P1').map(voiceKey));
  assert.deepEqual([...voices].sort(), ['P1:1', 'P1:2']);
});

check('a tied note is one attack', () => {
  const xml = score(`
    <part id="P1"><measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><tie type="start"/></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type><tie type="stop"/></note>
    </measure></part>
    <part id="P2"><measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>4</duration><voice>1</voice><type>whole</type></note>
    </measure></part>`);
  const report = readBhlEvidence(xml);
  const attacks = report.events.filter((event) => event.partId === 'P1' && event.attack);
  assert.equal(attacks.length, 1);
  assert.equal(attacks[0]!.midi, 60);
  assert.ok(qEq(attacks[0]!.duration, q(2)));
});

check('backup keeps guitar voices simultaneous', () => {
  const xml = score(`
    <part id="P1"><measure number="1">
      <attributes><divisions>2</divisions><time><beats>6</beats><beat-type>8</beat-type></time>
        <transpose><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type><dot/></note>
      <backup><duration>3</duration></backup>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>3</duration><voice>2</voice><type>quarter</type><dot/></note>
    </measure></part>
    <part id="P2"><measure number="1">
      <attributes><divisions>2</divisions><time><beats>6</beats><beat-type>8</beat-type></time>
        <transpose><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes>
      <note><rest/><duration>6</duration><voice>1</voice><type>half</type><dot/></note>
    </measure></part>`);
  const report = readBhlEvidence(xml);
  assert.deepEqual(report.reconstructionWarnings, []);
  const v1 = report.events.find((event) => event.voice === '1' && event.partId === 'P1')!;
  const v2 = report.events.find((event) => event.voice === '2' && event.partId === 'P1')!;
  assert.ok(qEq(v1.onset, v2.onset));
  assert.equal(v1.midi, 55);
  assert.equal(v2.midi, 52);
  assert.ok(qEq(report.barMetres[0]!.quarters, q(3)));
  assert.ok(qEq(report.barMetres[0]!.maxCursor, q(3, 2)));
});

check('forward moves the next onset and an inner rest stays visible', () => {
  const xml = score(`
    <part id="P1"><measure number="1">
      <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <note><rest/><duration>1</duration><voice>1</voice><type>eighth</type></note>
      <forward><duration>2</duration></forward>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>eighth</type></note>
    </measure></part>
    <part id="P2"><measure number="1">
      <attributes><divisions>2</divisions></attributes>
      <note><rest/><duration>8</duration><voice>1</voice></note>
    </measure></part>`);
  const report = readBhlEvidence(xml);
  const guitar = report.events.filter((event) => event.partId === 'P1');
  assert.equal(guitar.filter((event) => event.rest).length, 1);
  assert.ok(qEq(guitar.find((event) => event.midi === 67)!.onsetInBar, q(2)));
});

check('shared pitch class without the interval is not motif recurrence', () => {
  const xml = score(`
    <part id="P1"><measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure></part>
    <part id="P2"><measure number="1"><note><rest/><duration>4</duration><voice>1</voice></note></measure>
      <measure number="2"><note><rest/><duration>4</duration><voice>1</voice></note></measure></part>`);
  const report = readBhlEvidence(xml);
  const motif = report.motifs.find((item) => item.voice === 'P1:1')!;
  assert.equal(motif.recurrence, 'indeterminate');
  assert.equal(motif.matches.length, 0);
});

check('similar motion is named and a dissonance does not demand resolution', () => {
  const xml = score(`
    <part id="P1"><measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure></part>
    <part id="P2"><measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
    </measure></part>`);
  const report = readBhlEvidence(xml);
  assert.ok(report.motions.some((item) => item.kind === 'similar'));
  assert.ok(report.tensions.some((item) => item.interval === 'm2'));
  assert.equal(JSON.stringify(report).includes('requiresResolution'), false);
  assert.equal(report.musicalQualityScore, null);
  const compared = compareBhlEvidence(report, report);
  assert.equal(compared.provisional, true);
  assert.equal(compared.originalAttacks, compared.candidateAttacks);
});

check('voices are not merged and the wrong octave is not used', () => {
  const xml = score(`
    <part id="P1"><measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
        <transpose><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice><type>quarter</type></note>
      <backup><duration>1</duration></backup>
      <note><pitch><step>G</step><octave>3</octave></pitch><duration>1</duration><voice>2</voice><type>quarter</type></note>
    </measure></part>
    <part id="P2"><measure number="1">
      <attributes><divisions>1</divisions></attributes>
      <note><rest/><duration>4</duration><voice>1</voice></note>
    </measure></part>`);
  const report = readBhlEvidence(xml);
  assert.equal(report.events.find((event) => event.voice === '1' && event.midi !== null)!.midi, 48);
  assert.equal(report.events.find((event) => event.voice === '2')!.midi, 43);
  assert.notEqual(voiceKey(report.events.find((event) => event.voice === '1')!), voiceKey(report.events.find((event) => event.voice === '2')!));
});

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}

const dir = path.join(os.homedir(), 'Downloads', 'BHL-Composer', 'Evidence');
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
function writeReport(stem: string, title: string, source: string, report: ReturnType<typeof readBhlEvidence>): string {
  let name = `${stem}-${stamp}.md`;
  let n = 2;
  while (fs.existsSync(path.join(dir, name))) {
    name = `${stem}-${stamp}-${n}.md`;
    n += 1;
  }
  const file = path.join(dir, name);
  fs.writeFileSync(file, formatBhlEvidenceReport(title, source, report), { flag: 'wx' });
  return file;
}
const wrongFile = writeReport('Wrong-Turning-33-40', 'Wrong Turning Integrated Guitar Study V2.4, bars 33–40', WRONG, wrong);
const palaceFile = writeReport('Palace-Gates-43-46', 'Palace Gates Integrated Guitar Study V1.0, bars 43–46', PALACE, palace);
console.log(`REPORT ${wrongFile}`);
console.log(`REPORT ${palaceFile}`);
console.log('PASS evidence reader');
