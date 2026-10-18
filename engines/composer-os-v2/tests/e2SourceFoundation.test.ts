/**
 * E2 A — strict source foundations.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/e2SourceFoundation.test.ts
 * The independent walker below does not call the canonical reader.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DOMParser } from '@xmldom/xmldom';
import { elementChildren } from '../core/performance-composer/pcScore';
import { formatRational, q, qAdd, qEq } from '../core/bhl/bhlEvidence';
import { integralTicks } from '../core/piano/pianoExactTiming';
import { ingestCanonicalScore } from '../core/musical-evaluation/canonicalScore';
import {
  assertE2ExportPath,
  captureSource,
  E2ExportRejected,
  ppqExport,
  recoverProvenance,
  refuseProtectedMutation,
  selectSourceEvents,
} from '../core/orchestrate/sourceFoundation';
import { allLocks, verifySourceLocks } from '../core/orchestrate/sourceLocks';

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

function score(parts: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Piano</part-name></score-part>
    <score-part id="P2"><part-name>Piano</part-name></score-part>
  </part-list>
  ${parts}
</score-partwise>`;
}

function single(name: string, inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>${name}</part-name></score-part></part-list>
  <part id="P1">${inner}</part>
</score-partwise>`;
}

/** Test-only MusicXML note walk. Divisions, backup and chord. No canonical import. */
function independentRows(xml: string): Array<{ partId: string; staff: string; voice: string; onset: string; duration: string; rest: boolean; step: string; alter: number; tie: string }> {
  const doc = new DOMParser().parseFromString(xml, 'text/xml') as unknown as Document;
  const rows: Array<{ partId: string; staff: string; voice: string; onset: string; duration: string; rest: boolean; step: string; alter: number; tie: string }> = [];
  for (const part of elementChildren(doc.documentElement, 'part')) {
    const partId = part.getAttribute('id') ?? '';
    let barStart = q(0);
    for (const measure of elementChildren(part, 'measure')) {
      let divisions = 1;
      let beats = 4;
      let beatType = 4;
      let cursor = 0;
      let voice = '1';
      const placed: Array<{ onset: ReturnType<typeof q>; duration: ReturnType<typeof q> }> = [];
      for (const node of elementChildren(measure)) {
        if (node.nodeName === 'attributes') {
          const divisionText = elementChildren(node, 'divisions')[0]?.textContent?.trim();
          if (divisionText) divisions = Number(divisionText);
          const time = elementChildren(node, 'time')[0];
          if (time) {
            const beatText = elementChildren(time, 'beats').map((item) => item.textContent?.trim() ?? '').join('+');
            const typeText = elementChildren(time, 'beat-type')[0]?.textContent?.trim() ?? '';
            beats = beatText.split('+').map(Number).reduce((sum, value) => sum + value, 0);
            beatType = Number(typeText);
          }
        } else if (node.nodeName === 'backup') {
          cursor -= Number(elementChildren(node, 'duration')[0]?.textContent ?? 0);
        } else if (node.nodeName === 'forward') {
          cursor += Number(elementChildren(node, 'duration')[0]?.textContent ?? 0);
        } else if (node.nodeName === 'note' && !elementChildren(node, 'grace').length && !elementChildren(node, 'cue').length) {
          const chord = elementChildren(node, 'chord').length > 0;
          const dur = Number(elementChildren(node, 'duration')[0]?.textContent ?? 0);
          const voiceText = elementChildren(node, 'voice')[0]?.textContent?.trim();
          if (voiceText) voice = voiceText;
          const onset = chord ? placed.at(-1)?.onset ?? q(cursor, divisions) : q(cursor, divisions);
          const duration = q(dur, divisions);
          if (!chord) cursor += dur;
          const pitch = elementChildren(node, 'pitch')[0];
          const rest = elementChildren(node, 'rest').length > 0;
          const ties = [...node.getElementsByTagName('tie')] as Element[];
          rows.push({
            partId,
            staff: elementChildren(node, 'staff')[0]?.textContent?.trim() ?? '',
            voice,
            onset: formatRational(qAdd(barStart, onset)),
            duration: formatRational(duration),
            rest,
            step: pitch ? elementChildren(pitch, 'step')[0]?.textContent?.trim() ?? '' : '',
            alter: pitch ? Number(elementChildren(pitch, 'alter')[0]?.textContent ?? 0) : 0,
            tie: ties.map((tie) => tie.getAttribute('type') ?? '').join('+'),
          });
          placed.push({ onset, duration });
        }
      }
      const pickup = measure.getAttribute('implicit') === 'yes' || measure.getAttribute('number') === '0';
      let advance = q(beats * 4, beatType);
      if (pickup) {
        let end = q(0);
        for (const item of placed) {
          const itemEnd = qAdd(item.onset, item.duration);
          if (itemEnd.n * end.d > end.n * itemEnd.d) end = itemEnd;
        }
        advance = end;
      }
      barStart = qAdd(barStart, advance);
    }
  }
  return rows;
}

const A1 = score(`<part id="P1">
  <measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <direction><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>72</per-minute></metronome></direction-type></direction>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><staff>1</staff></note>
    <note><rest/><duration>1</duration><voice>1</voice><staff>1</staff></note>
    <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff><tie type="start"/></note>
  </measure>
  <measure number="2">
    <note><pitch><step>E</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff><tie type="stop"/></note>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice><staff>1</staff></note>
  </measure>
</part>
<part id="P2">
  <measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice><staff>2</staff></note>
  </measure>
  <measure number="2">
    <note><pitch><step>G</step><octave>2</octave></pitch><duration>4</duration><voice>1</voice><staff>2</staff></note>
  </measure>
</part>`);

const A1_MANIFEST = [
  { partId: 'P1', onset: '0', duration: '1', step: 'C', alter: 0, rest: false },
  { partId: 'P1', onset: '1', duration: '1', rest: true },
  { partId: 'P1', onset: '2', duration: '2', step: 'E', alter: 0, rest: false },
  { partId: 'P1', onset: '4', duration: '2', step: 'E', alter: 0, rest: false },
  { partId: 'P1', onset: '6', duration: '2', step: 'G', alter: 0, rest: false },
  { partId: 'P2', onset: '0', duration: '4', step: 'C', alter: 0, rest: false },
  { partId: 'P2', onset: '4', duration: '4', step: 'G', alter: 0, rest: false },
];

check('A1 locked melody and bass match the hand manifest', () => {
  const bundle = captureSource(A1, 'a1.musicxml');
  assert.equal(bundle.bytesPreserved, true);
  assert.equal(bundle.semanticsUnderstood, true);
  assert.equal(bundle.score.strictSource, true);
  const rows = bundle.records.map((record) => ({
    partId: record.canonical.partId,
    onset: formatRational(record.canonical.onset),
    duration: formatRational(record.canonical.duration),
    ...(record.canonical.rest ? {} : { step: record.canonical.written?.step, alter: record.canonical.written?.alter ?? 0 }),
    rest: record.canonical.rest,
  }));
  assert.deepEqual(rows, A1_MANIFEST);
  const walked = independentRows(A1).filter((row) => !row.rest || row.partId === 'P1');
  assert.deepEqual(walked.map((row) => row.onset), ['0', '1', '2', '4', '6', '0', '4']);
  const melody = selectSourceEvents(bundle, [{ partId: 'P1', staff: '1' }]);
  const bass = selectSourceEvents(bundle, [{ partId: 'P2', staff: '2' }]);
  assert.equal(melody.length, 5);
  assert.equal(bass.length, 2);
  assert.equal(selectSourceEvents(bundle, []).length, 0);
  assert.equal(bundle.score.directions.some((item) => item.kind === 'tempo' && item.text === 'quarter = 72'), true);
  const again = verifySourceLocks(bundle, captureSource(A1), allLocks());
  assert.equal(again.ok, true);
});

check('A2 same pitch on two staves does not merge', () => {
  const xml = single('Piano', `
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time><staves>2</staves></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff><tie type="start"/></note>
      <backup><duration>4</duration></backup>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>2</staff></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>1</staff><tie type="stop"/></note>
      <backup><duration>4</duration></backup>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><staff>2</staff></note>
    </measure>`);
  const bundle = captureSource(xml);
  const sounding = bundle.score.soundingEvents.filter((event) => !event.rest);
  const staff1 = sounding.filter((event) => event.staff === '1' && event.written?.step === 'C');
  const staff2 = sounding.filter((event) => event.staff === '2');
  assert.equal(staff1.length, 1);
  assert.equal(formatRational(staff1[0]!.duration), '8');
  assert.equal(staff2.length, 2);
  assert.ok(staff2.every((event) => formatRational(event.duration) === '4'));
  const walked = independentRows(xml);
  assert.equal(walked.filter((row) => row.staff === '2').length, 2);
});

check('A3 one tied chord member keeps its own identity', () => {
  const xml = single('Piano', `
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><tie type="start"/></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice><tie type="stop"/></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>`);
  const bundle = captureSource(xml);
  assert.equal(bundle.score.sourceEvents.length, 6);
  const sounding = bundle.score.soundingEvents.filter((event) => !event.rest);
  const e = sounding.find((event) => event.written?.step === 'E')!;
  const c = sounding.filter((event) => event.written?.step === 'C');
  const g = sounding.filter((event) => event.written?.step === 'G');
  assert.equal(formatRational(e.duration), '8');
  assert.equal(e.sourceEventIds.length, 2);
  assert.equal(c.length, 2);
  assert.equal(g.length, 2);
  assert.deepEqual(independentRows(xml).map((row) => row.step), ['C', 'E', 'G', 'C', 'E', 'G']);
});

const PICKUP = score(`<part id="P1">
  <measure number="0" implicit="yes">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>
  </measure>
  <measure number="1">
    <note><pitch><step>E</step><octave>5</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
</part>
<part id="P2">
  <measure number="0" implicit="yes">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><rest/><duration>1</duration><voice>1</voice></note>
  </measure>
  <measure number="1">
    <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
</part>`);

check('A4 one-quarter pickup places the next measure at quarter 1', () => {
  const expected = { n: 1, d: 1 };
  const bundle = captureSource(PICKUP);
  const next = bundle.score.sourceEvents.find((event) => event.partId === 'P1' && event.bar === 2)!;
  assert.equal(next.onset.n, expected.n);
  assert.equal(next.onset.d, expected.d);
  const bass = bundle.score.sourceEvents.find((event) => event.partId === 'P2' && event.written?.octave === 3)!;
  assert.ok(qEq(bass.onset, q(1)));
  const walked = independentRows(PICKUP).find((row) => row.step === 'E')!;
  assert.equal(walked.onset, '1');
  const legacy = ingestCanonicalScore(PICKUP).score!;
  const legacyNext = legacy.sourceEvents.find((event) => event.partId === 'P1' && event.bar === 2)!;
  assert.equal(formatRational(legacyNext.onset), '4');
  assert.equal(legacy.strictSource, undefined);
});

check('A5 7/8 then 9/16 keeps exact placement and grouping', () => {
  const xml = single('Piano', `
    <measure number="1">
      <attributes><divisions>16</divisions><time><beats>2+2+3</beats><beat-type>8</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>56</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <attributes><time><beats>4+2+3</beats><beat-type>16</beat-type></time></attributes>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>36</duration><voice>1</voice></note>
    </measure>`);
  const bundle = captureSource(xml);
  const [first, second] = bundle.score.sourceEvents;
  assert.equal(formatRational(first!.onset), '0');
  assert.equal(formatRational(second!.onset), '7/2');
  assert.equal(formatRational(qAdd(second!.onset, second!.duration)), '23/4');
  assert.deepEqual(bundle.score.measures.find((measure) => measure.bar === 1)?.beatGroups, [2, 2, 3]);
  assert.deepEqual(bundle.score.measures.find((measure) => measure.bar === 2)?.beatGroups, [4, 2, 3]);
  const walked = independentRows(xml);
  assert.equal(walked[0]?.onset, '0');
  assert.equal(walked[1]?.onset, '7/2');
});

check('A6 3:2 and 5:4 keep 160 and 96 ticks and tied fragments stay one attack', () => {
  const xml = single('Piano', `
    <measure number="1">
      <attributes><divisions>480</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>160</duration><voice>1</voice>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification><tie type="start"/></note>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>160</duration><voice>1</voice>
        <time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification><tie type="stop"/></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>96</duration><voice>1</voice>
        <time-modification><actual-notes>5</actual-notes><normal-notes>4</normal-notes></time-modification></note>
    </measure>`);
  const bundle = captureSource(xml);
  const ticks = bundle.score.sourceEvents.map((event) => integralTicks(event.duration, 480));
  assert.deepEqual(ticks, [160, 160, 96]);
  const sounding = bundle.score.soundingEvents.filter((event) => !event.rest);
  assert.equal(sounding.length, 2);
  assert.equal(integralTicks(sounding[0]!.duration, 480), 320);
  assert.equal(sounding[0]!.sourceEventIds.length, 2);
  const midi = decodeMidi(encodeMidi([
    { midi: 60, tick: 0, duration: 320 },
    { midi: 64, tick: 320, duration: 96 },
  ]));
  assert.deepEqual(midi, [
    { midi: 60, tick: 0, duration: 320 },
    { midi: 64, tick: 320, duration: 96 },
  ]);
});

check('A7 2/9 quarter is kept and PPQ 480 export is refused at 1440', () => {
  const xml = single('Piano', `
    <measure number="1">
      <attributes><divisions>9</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    </measure>`);
  const bundle = captureSource(xml);
  const duration = bundle.score.sourceEvents[0]!.duration;
  assert.equal(duration.n, 2);
  assert.equal(duration.d, 9);
  const resolution = ppqExport([duration]);
  assert.ok('required' in resolution);
  if ('required' in resolution) assert.equal(resolution.required, 1440);
  assert.equal(integralTicks(duration, 480), null);
});

check('A8 written D4 on a B-flat clarinet sounds C4 and bass octave stays written', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list>
    <score-part id="P1"><part-name>Clarinet</part-name></score-part>
    <score-part id="P2"><part-name>Contrabass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
      <transpose><chromatic>-2</chromatic><octave-change>0</octave-change></transpose>
    </attributes>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
  <part id="P2"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time>
      <transpose><diatonic>0</diatonic><chromatic>0</chromatic><octave-change>-1</octave-change></transpose>
    </attributes>
    <note><pitch><step>C</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`;
  const bundle = captureSource(xml);
  const clarinet = bundle.score.sourceEvents.find((event) => event.partId === 'P1')!;
  const bass = bundle.score.sourceEvents.find((event) => event.partId === 'P2')!;
  assert.equal(clarinet.written?.midi, 62);
  assert.equal(clarinet.soundingMidi, 60);
  assert.equal(clarinet.written?.step, 'D');
  assert.equal(clarinet.written?.octave, 4);
  assert.equal(bass.written?.midi, 48);
  assert.equal(bass.soundingMidi, 36);
  assert.equal(bass.transposition.diatonic, 0);
  assert.equal(bass.transposition.octaveChange, -1);
});

check('A9 direction offset is added to the cursor', () => {
  const xml = single('Piano', `
    <measure number="1">
      <attributes><divisions>480</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>960</duration><voice>1</voice></note>
      <direction><direction-type><words>mark</words></direction-type><offset>120</offset></direction>
    </measure>`);
  const bundle = captureSource(xml);
  const mark = bundle.score.directions.find((item) => item.text === 'mark')!;
  assert.equal(formatRational(mark.onsetInBar), '9/4');
  const legacy = ingestCanonicalScore(xml).score!.directions.find((item) => item.text === 'mark')!;
  assert.equal(formatRational(legacy.onsetInBar), '1/4');
});

check('A10 harmony, nested dynamic and playback tempo keep their meaning', () => {
  const xml = single('Piano', `
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <harmony>
        <root><root-step>E</root-step><root-alter>-1</root-alter></root>
        <kind>major</kind>
        <bass><bass-step>C</bass-step><bass-alter>0</bass-alter></bass>
      </harmony>
      <direction><direction-type><dynamics><mp/></dynamics></direction-type></direction>
      <direction><sound tempo="96"/></direction>
      <note><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
    </measure>`);
  const bundle = captureSource(xml);
  const harmony = bundle.score.harmony[0]!;
  assert.equal(harmony.rootStep, 'E');
  assert.equal(harmony.rootAlter, -1);
  assert.equal(harmony.bassStep, 'C');
  assert.equal(harmony.bassAlter, 0);
  assert.equal(harmony.kindValue, 'major');
  assert.equal(bundle.score.directions.some((item) => item.kind === 'dynamic' && item.text === 'mp'), true);
  assert.equal(bundle.score.directions.some((item) => item.playbackBpm === 96), true);
  const legacy = ingestCanonicalScore(xml).score!;
  assert.equal(legacy.harmony[0]?.text.includes('b'), false);
  assert.equal(legacy.directions.some((item) => item.text === 'mp'), false);
});

check('A11 each lock mutation fails on its own', () => {
  const xml = single('Piano', `
    <measure number="1">
      <attributes><divisions>480</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <direction><sound tempo="80"/></direction>
      <harmony><root><root-step>C</root-step></root><kind>major</kind></harmony>
      <note id="n1"><pitch><step>C</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice><tie type="start"/></note>
      <note id="n2"><rest/><duration>480</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note id="n3"><pitch><step>C</step><octave>4</octave></pitch><duration>960</duration><voice>1</voice><tie type="stop"/></note>
    </measure>`);
  const source = captureSource(xml);
  const cases: Array<{ name: string; xml: string; lock: string }> = [
    { name: 'pitch', lock: 'pitch', xml: xml.replace('<step>C</step><octave>4</octave></pitch><duration>480</duration>', '<step>D</step><octave>4</octave></pitch><duration>480</duration>') },
    { name: 'tick', lock: 'rhythm', xml: xml.replace('<duration>480</duration><voice>1</voice><tie type="start"/>', '<duration>481</duration><voice>1</voice><tie type="start"/>') },
    { name: 'rest', lock: 'silence', xml: xml.replace('<note id="n2"><rest/><duration>480</duration><voice>1</voice></note>', '<note id="n2"><pitch><step>E</step><octave>4</octave></pitch><duration>480</duration><voice>1</voice></note>') },
    { name: 'tie', lock: 'tie', xml: xml.replace('<tie type="stop"/>', '') },
    { name: 'meter', lock: 'form', xml: xml.replace('<beats>4</beats>', '<beats>3</beats>') },
  ];
  for (const item of cases) {
    const report = verifySourceLocks(source, captureSource(item.xml), allLocks(), xml);
    assert.equal(report.ok, false, item.name);
    assert.ok(report.failures.some((failure) => failure.lock === item.lock), `${item.name} ${report.failures.map((failure) => failure.lock).join(',')}`);
  }
  const bytes = verifySourceLocks(source, source, allLocks(), `${xml}\n`);
  assert.equal(bytes.ok, false);
  assert.ok(bytes.failures.some((failure) => failure.lock === 'source-bytes'));
  assert.equal(bytes.failures.some((failure) => failure.lock === 'pitch'), false);
});

check('A12 retained ids recover and stripped repeated notes stay unverified', () => {
  const xml = single('Piano', `
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note id="a"><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note id="b"><chord/><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    </measure>`);
  const bundle = captureSource(xml);
  const kept = recoverProvenance(bundle, xml);
  assert.equal(kept.status, 'exact');
  if (kept.status === 'exact') assert.equal(kept.pairs.length, 2);
  const stripped = recoverProvenance(bundle, xml.replace(/ id="[ab]"/g, ''));
  assert.equal(stripped.status, 'provenance-unverified');
  assert.throws(() => { (bundle.records[0]!.canonical as { soundingMidi: number | null }).soundingMidi = 1; });
  assert.deepEqual(refuseProtectedMutation(), { ok: false, reason: 'protected-source-mutation' });
});

check('mixed denominator, diatonic-only transpose and overwrite are refused', () => {
  const mixed = single('Piano', `
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>3</beats><beat-type>8</beat-type><beats>2</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    </measure>`);
  const bundle = captureSource(mixed);
  assert.equal(bundle.semanticsUnderstood, false);
  assert.ok(bundle.score.unsupported.some((item) => item.kind === 'mixed-denominator'));
  const dia = single('Clarinet', `
    <measure number="1">
      <attributes><divisions>1</divisions><transpose><diatonic>-1</diatonic></transpose></attributes>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    </measure>`);
  const refused = captureSource(dia);
  assert.equal(refused.score.sourceEvents[0]?.soundingMidi, null);
  assert.ok(refused.score.unsupported.some((item) => item.kind === 'diatonic-transpose'));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'e2-source-'));
  const source = path.join(dir, 'source.musicxml');
  fs.writeFileSync(source, '<score/>');
  assert.throws(() => assertE2ExportPath(source, source, dir), (error: unknown) => error instanceof E2ExportRejected && error.reason === 'overwrites-source');
  assert.throws(() => assertE2ExportPath(source, path.join(os.tmpdir(), 'outside.musicxml'), dir), (error: unknown) => error instanceof E2ExportRejected);
});

check('R1 strict off keeps the legacy pickup and harmony text', () => {
  const legacy = ingestCanonicalScore(PICKUP);
  assert.equal(legacy.score?.strictSource, undefined);
  assert.equal(formatRational(legacy.score!.sourceEvents.find((event) => event.bar === 2 && event.partId === 'P1')!.onset), '4');
});

console.log('UNVERIFIED R2 no approved repaired Piano MusicXML fixture is in the repository');

function vlq(value: number): number[] {
  const bytes = [value & 0x7f];
  let rest = value >> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>= 7;
  }
  return bytes;
}

function encodeMidi(notes: Array<{ midi: number; tick: number; duration: number }>): Uint8Array {
  const events: number[] = [];
  let cursor = 0;
  for (const note of notes) {
    events.push(...vlq(note.tick - cursor), 0x90, note.midi, 64, ...vlq(note.duration), 0x80, note.midi, 0);
    cursor = note.tick + note.duration;
  }
  events.push(...vlq(0), 0xff, 0x2f, 0x00);
  const header = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 1, 224];
  const trackHead = [0x4d, 0x54, 0x72, 0x6b, (events.length >> 24) & 0xff, (events.length >> 16) & 0xff, (events.length >> 8) & 0xff, events.length & 0xff];
  return Uint8Array.from([...header, ...trackHead, ...events]);
}

function decodeMidi(bytes: Uint8Array): Array<{ midi: number; tick: number; duration: number }> {
  let offset = 14;
  const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
  offset += 4;
  const end = offset + length;
  const readVlq = () => {
    let value = 0;
    let byte = 0;
    do {
      byte = bytes[offset++] ?? 0;
      value = (value << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return value;
  };
  let tick = 0;
  const open = new Map<number, number>();
  const notes: Array<{ midi: number; tick: number; duration: number }> = [];
  while (offset < end) {
    tick += readVlq();
    const status = bytes[offset++] ?? 0;
    if (status === 0xff) {
      offset += 1;
      offset += readVlq();
      continue;
    }
    const midi = bytes[offset++] ?? 0;
    const velocity = bytes[offset++] ?? 0;
    if ((status & 0xf0) === 0x90 && velocity > 0) open.set(midi, tick);
    if ((status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && velocity === 0)) {
      const start = open.get(midi);
      if (start !== undefined) notes.push({ midi, tick: start, duration: tick - start });
    }
  }
  return notes;
}

if (failed) {
  console.error(`FAIL ${failed}`);
  process.exit(1);
}
console.log('E2 source foundation PASS');
