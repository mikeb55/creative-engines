/**
 * V3.1-B1 — canonical score and technical checks.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/musical-evaluation/b1Canonical.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { formatRational, readBhlEvidence } from '../../core/bhl/bhlEvidence';
import { BHL_ALBUM_ROOT } from '../../core/bhl/bhlCopy';
import { listHexatonicScalars } from '../../core/hexatonic/collections';
import { listHexatonicWpsPairs } from '../../core/hexatonic/triadPairs';
import { WPS_VAULT_TONALITIES } from '../../core/wwh/wps/wpsTonalityVaultRecord';
import { listPentatonicColourResources } from '../../core/pentatonic/colourRegistry';
import { eventSignature, ingestCanonicalScore } from '../../core/musical-evaluation/canonicalScore';
import { runTechnicalChecks } from '../../core/musical-evaluation/technicalChecks';

const HEX = path.join(
  process.cwd(),
  'engines/composer-os-v2/core/hexatonic/examples/h3-scalar-major-omit-seventh.musicxml',
);
const WPS = path.join(process.cwd(), 'engines/composer-os-v2/core/hexatonic/examples/h3-wps-maj9.musicxml');
const WRONG = path.join(
  BHL_ALBUM_ROOT,
  'WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml',
);
const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const WWH_SOURCES: ReadonlyArray<readonly [string, string]> = [
  ['01-Black-Aura-Duo-Leadsheet-V1.1.musicxml', 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb'],
  ['02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml', 'a76ed8944329da32ac699c6cda30018315ad4bb5a8579e271f488c5039178e56'],
  ['03-The-Mirror-Duo-Leadsheet-V1.0.musicxml', '0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940'],
  ['04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml', '9c8129a720fed40bc5d3744019ef162b899925cf6e6b64c8b9e75556025feab1'],
  ['05-Orbit-Duo-Leadsheet-V2.1.musicxml', '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db'],
  ['06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml', 'c382e3bd024260dfc7fce6ea7200058baf98358eb2831f6e9e4cc3f99278d777'],
  ['07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', '315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4'],
  ['08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml', '23ecdf60cb2acad748a6548d9dabec176dab9acde79609364038234b2ccb700d'],
  ['09-After-Everything-Duo-Leadsheet-V1.0.musicxml', '6eb57378767e55a2537e1a4cff2c8999c643d27d929172d4e8a7a2bdc201afe0'],
];

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

function duo(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  ${inner}
</score-partwise>`;
}

function bar(partInner: string): string {
  return duo(`<part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    ${partInner}
  </measure></part>
  <part id="P2"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
      <transpose><chromatic>0</chromatic><octave-change>-1</octave-change></transpose>
    </attributes>
    <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>`);
}

check('registries stay at 20 colours, 11 scalars, 16 WPS pairs', () => {
  assert.equal(listPentatonicColourResources().length, 20);
  assert.equal(listHexatonicScalars().length, 11);
  assert.equal(listHexatonicWpsPairs().length, 16);
  assert.equal(WPS_VAULT_TONALITIES.length, 16);
});

check('nine WWH leadsheets stay byte-identical', () => {
  for (const [name, hash] of WWH_SOURCES) {
    const file = path.join(ALBUM, name);
    const live = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert.equal(live, hash, name);
  }
});

check('hexatonic scalar example matches the BHL sounding walk', () => {
  const xml = fs.readFileSync(HEX, 'utf8');
  const ingest = ingestCanonicalScore(xml);
  assert.equal(ingest.parseError, null);
  const score = ingest.score!;
  assert.equal(score.version, 'canonical-evaluation-score-1');
  assert.equal(score.parts.length, 2);
  assert.equal(score.directions.some((item) => item.kind === 'tempo' && item.text.includes('92')), true);
  assert.ok(score.directions.some((item) => item.kind === 'expression' && item.text === 'INSIDE'));
  const bhl = readBhlEvidence(xml);
  const left = score.soundingEvents.map(eventSignature).sort();
  const right = bhl.events
    .map((event) =>
      [event.partId, event.voice, event.bar, formatRational(event.onsetInBar), formatRational(event.duration), event.rest ? 'rest' : String(event.midi)].join('|'),
    )
    .sort();
  assert.deepEqual(left, right);
  const chord = score.sourceEvents.find((event) => event.chord && event.bar === 4);
  assert.ok(chord);
  assert.equal(chord?.written?.step, 'C');
  assert.equal(chord?.soundingMidi, chord?.written?.midi);
});

check('WPS hexatonic example parses with rehearsal-free expression text', () => {
  const ingest = ingestCanonicalScore(fs.readFileSync(WPS, 'utf8'));
  assert.equal(ingest.parseError, null);
  assert.ok(ingest.score!.sourceEvents.length > 0);
  assert.equal(ingest.score!.repeats.length, 0);
});

check('Wrong Turning sounding events match readBhlEvidence', () => {
  const xml = fs.readFileSync(WRONG, 'utf8');
  const score = ingestCanonicalScore(xml).score!;
  const bhl = readBhlEvidence(xml);
  assert.equal(score.soundingEvents.length, bhl.events.length);
  assert.deepEqual(score.soundingEvents.map(eventSignature).sort(), bhl.events.map((event) =>
    [event.partId, event.voice, event.bar, formatRational(event.onsetInBar), formatRational(event.duration), event.rest ? 'rest' : String(event.midi)].join('|'),
  ).sort());
});

check('pentatonic C major collection survives import with written pitch', () => {
  const xml = bar(`
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
  `);
  const score = ingestCanonicalScore(xml).score!;
  const guitar = score.sourceEvents.filter((event) => event.partId === 'P1' && !event.rest);
  assert.deepEqual(guitar.map((event) => event.written?.step), ['C', 'D', 'E', 'G']);
  const bass = score.sourceEvents.find((event) => event.partId === 'P2' && !event.rest)!;
  assert.equal(bass.written?.octave, 3);
  assert.equal(bass.soundingMidi, bass.written!.midi - 12);
  assert.equal(bass.transposition.octaveChange, -1);
});

check('pickup, second voice, tuplet and metre change stay distinct', () => {
  const xml = duo(`<part id="P1">
    <measure number="0" implicit="yes">
      <attributes><divisions>3</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice><type>quarter</type></note>
    </measure>
    <measure number="1">
      <note>
        <pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
      </note>
      <note>
        <pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>
      </note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>6</duration><voice>1</voice></note>
      <backup><duration>12</duration></backup>
      <note><pitch><step>C</step><octave>3</octave></pitch><duration>12</duration><voice>2</voice></note>
    </measure>
    <measure number="2">
      <attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>9</duration><voice>1</voice></note>
    </measure>
  </part>
  <part id="P2">
    <measure number="0" implicit="yes">
      <attributes><divisions>3</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>3</duration><voice>1</voice></note>
    </measure>
    <measure number="1">
      <note><rest/><duration>12</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <attributes><time><beats>3</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>9</duration><voice>1</voice></note>
    </measure>
  </part>`);
  const report = runTechnicalChecks({ xml });
  assert.equal(report.summary.parse, 'pass');
  assert.equal(report.summary['measure-duration'], 'pass');
  const score = ingestCanonicalScore(xml).score!;
  assert.equal(score.measures.find((measure) => measure.partId === 'P1' && measure.bar === 1)?.pickup, true);
  assert.equal(score.measures.find((measure) => measure.partId === 'P1' && measure.bar === 3)?.beats, 3);
  const tuplet = score.sourceEvents.find((event) => event.tuplet);
  assert.equal(tuplet?.tuplet?.actualNotes, 3);
  assert.equal(score.sourceEvents.some((event) => event.voice === '2' && event.soundingMidi !== null), true);
});

check('grace notes are reported and left off the timeline', () => {
  const xml = bar(`<note><grace/><pitch><step>B</step><octave>3</octave></pitch><voice>1</voice></note>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>`);
  const score = ingestCanonicalScore(xml).score!;
  assert.equal(score.unsupported.some((item) => item.kind === 'grace'), true);
  assert.equal(score.sourceEvents.filter((event) => event.partId === 'P1').length, 1);
  const report = runTechnicalChecks({ xml });
  const grace = report.findings.find((finding) => finding.observation.startsWith('grace:'));
  assert.equal(grace?.bar, 1);
  assert.equal(grace?.instrument, 'Electric Guitar');
});

check('a short bar fails duration with bar, instrument and event id', () => {
  const xml = bar(`<note><pitch><step>C</step><octave>4</octave></pitch><duration>3</duration><voice>1</voice></note>`);
  const report = runTechnicalChecks({ xml });
  assert.equal(report.summary['measure-duration'], 'fail');
  const finding = report.findings.find((item) => item.check === 'measure-duration' && item.status === 'fail' && item.partId === 'P1');
  assert.equal(finding?.bar, 1);
  assert.equal(finding?.instrument, 'Electric Guitar');
  assert.ok(finding?.eventIds.length);
});

check('broken MusicXML fails parse and does not invent events', () => {
  const report = runTechnicalChecks({ xml: '<score-partwise><note></score-partwise>' });
  assert.equal(report.summary.parse, 'fail');
  assert.equal(report.findings.every((finding) => finding.check === 'parse'), true);
});

check('timewise MusicXML is an explicit unsupported root', () => {
  const report = runTechnicalChecks({ xml: '<score-timewise version="4.0"></score-timewise>' });
  assert.equal(report.summary.parse, 'fail');
  assert.match(report.findings[0]!.observation, /score-timewise/);
});

check('locked bass change is a bar-specific lock finding', () => {
  const source = bar(`<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>`);
  const changed = source.replace('<step>C</step><octave>3</octave>', '<step>D</step><octave>3</octave>');
  const same = runTechnicalChecks({
    xml: source,
    lock: { sourceXml: source, spec: { span: { from: 1, to: 1 }, bassPartId: 'P2', guitarPartId: 'P1', protectedGuitarBars: [] } },
  });
  assert.equal(same.summary['source-lock'], 'pass');
  const moved = runTechnicalChecks({
    xml: changed,
    lock: { sourceXml: source, spec: { span: { from: 1, to: 1 }, bassPartId: 'P2', guitarPartId: 'P1', protectedGuitarBars: [] } },
  });
  assert.equal(moved.summary['source-lock'], 'fail');
  const finding = moved.findings.find((item) => item.check === 'source-lock');
  assert.equal(finding?.bar, 1);
  assert.match(finding?.observation ?? '', /bass/);
});

check('reimport of the same events passes and a changed pitch fails', () => {
  const xml = bar(`<note><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>`);
  const ok = runTechnicalChecks({ xml, reimportXml: xml });
  assert.equal(ok.summary.reimport, 'pass');
  const shifted = xml.replace('<step>E</step><octave>4</octave>', '<step>F</step><octave>4</octave>');
  const bad = runTechnicalChecks({ xml, reimportXml: shifted });
  assert.equal(bad.summary.reimport, 'fail');
  const finding = bad.findings.find((item) => item.check === 'reimport' && item.partId === 'P1');
  assert.equal(finding?.bar, 1);
  assert.ok(finding?.eventIds.length);
});

check('five-note guitar stack fails the existing feasibility check', () => {
  const xml = duo(`<part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    <note><chord/><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
  <part id="P2"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><rest/><duration>4</duration><voice>1</voice></note>
  </measure></part>`);
  const report = runTechnicalChecks({ xml });
  assert.equal(report.summary['guitar-feasibility'], 'fail');
  const finding = report.findings.find((item) => item.check === 'guitar-feasibility');
  assert.equal(finding?.bar, 1);
  assert.equal(finding?.instrument, 'Electric Guitar');
  assert.equal(finding?.eventIds.length, 5);
});

check('repeat marks are stored and not expanded', () => {
  const xml = bar(`<barline location="left"><repeat direction="forward"/></barline>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    <barline location="right"><repeat direction="backward" times="2"/></barline>`);
  const score = ingestCanonicalScore(xml).score!;
  assert.equal(score.repeats.length, 2);
  assert.equal(score.repeats.every((repeat) => repeat.expanded === false), true);
  assert.equal(score.sourceEvents.filter((event) => event.partId === 'P1').length, 1);
  assert.equal(score.unsupported.some((item) => item.kind === 'repeat-expansion'), true);
});

if (failed > 0) {
  console.error(`B1 ${failed} failed`);
  process.exit(1);
}
console.log('B1 all passed');
