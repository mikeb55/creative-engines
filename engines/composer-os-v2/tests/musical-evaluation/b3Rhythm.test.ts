/**
 * V3.1-B3 — rhythm, silence, and duo interaction.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/musical-evaluation/b3Rhythm.test.ts
 */
import assert from 'node:assert/strict';
import { listHexatonicScalars } from '../../core/hexatonic/collections';
import { listHexatonicWpsPairs } from '../../core/hexatonic/triadPairs';
import { listPentatonicColourResources } from '../../core/pentatonic/colourRegistry';
import { BHL_WORLD_IDS } from '../../core/bhl/bhlWorlds';
import { WPS_VAULT_TONALITIES } from '../../core/wwh/wps/wpsTonalityVaultRecord';
import { analyseRhythm } from '../../core/musical-evaluation/rhythmEvidence';

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

function duo(guitar: string, bass: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1">${guitar}</part>
  <part id="P2">${bass}</part>
</score-partwise>`;
}

const xml = duo(
  `<measure number="1">
    <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <direction><direction-type><rehearsal>A</rehearsal></direction-type></direction>
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    <note><rest/><duration>6</duration><voice>1</voice></note>
  </measure>
  <measure number="2">
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>
  </measure>
  <measure number="3">
    <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
    <note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
  <measure number="4">
    <note><rest/><duration>8</duration><voice>1</voice></note>
  </measure>
  <measure number="5">
    <note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    <note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    <note><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    <note><pitch><step>F</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
  </measure>
  <measure number="6">
    <note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    <note><pitch><step>A</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    <note><pitch><step>B</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note>
    <note><pitch><step>C</step><octave>5</octave></pitch><duration>2</duration><voice>1</voice></note>
  </measure>`,
  `<measure number="1">
    <attributes><divisions>2</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
    <note><rest/><duration>8</duration><voice>1</voice></note>
  </measure>
  <measure number="2">
    <note><pitch><step>C</step><octave>3</octave></pitch><duration>8</duration><voice>1</voice></note>
  </measure>
  <measure number="3">
    <note><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
    <note><pitch><step>E</step><octave>3</octave></pitch><duration>4</duration><voice>1</voice></note>
  </measure>
  <measure number="4">
    <note><rest/><duration>8</duration><voice>1</voice></note>
  </measure>
  <measure number="5">
    <note><rest/><duration>8</duration><voice>1</voice></note>
  </measure>
  <measure number="6">
    <note><rest/><duration>8</duration><voice>1</voice></note>
  </measure>`,
);

check('registries stay intact', () => {
  assert.equal(listPentatonicColourResources().length, 20);
  assert.equal(listHexatonicScalars().length, 11);
  assert.equal(listHexatonicWpsPairs().length, 16);
  assert.equal(WPS_VAULT_TONALITIES.length, 16);
  assert.equal(BHL_WORLD_IDS.length, 6);
});

check('sparse, dense, silent, and contrary bars stay descriptive', () => {
  const evidence = analyseRhythm({ xml });
  assert.equal('musicalQualityScore' in evidence, false);
  const sparseGuitar = evidence.findings.find(
    (finding) => finding.metricId === 'note-density' && finding.partId === 'P1' && finding.bars[0] === 1,
  );
  const sparseBass = evidence.findings.find(
    (finding) => finding.metricId === 'note-density' && finding.partId === 'P2' && finding.bars[0] === 1,
  );
  assert.equal(sparseGuitar?.observations.attacks, 1);
  assert.equal(sparseBass?.observations.attacks, 0);
  assert.equal(sparseGuitar?.observations.instrumentFirst, true);
  const dense = evidence.findings.find(
    (finding) => finding.metricId === 'note-density' && finding.partId === 'P1' && finding.bars[0] === 2,
  );
  assert.equal(dense?.observations.attacks, 8);
  const activity = evidence.findings.find((finding) => finding.metricId === 'duo-activity' && finding.bars[0] === 1);
  assert.equal(activity?.observations.guitarDuringBassRest, true);
  assert.equal(activity?.observations.bassDuringGuitarRest, false);
  const silent = evidence.findings.find((finding) => finding.metricId === 'duo-activity' && finding.bars[0] === 4);
  assert.equal(silent?.observations.jointSilence, true);
  const boundary = evidence.findings.find(
    (finding) => finding.metricId === 'phrase-boundary' && finding.observations.indicator === 'whole-bar-rest' && finding.bars[0] === 4,
  );
  assert.equal(boundary?.confidence, 'limited');
  const rehearsal = evidence.findings.find((finding) => finding.observations.indicator === 'rehearsal');
  assert.equal(rehearsal?.bars[0], 1);
  assert.equal(rehearsal?.observations.text, 'A');
  const motion = evidence.findings.find((finding) => finding.metricId === 'relative-motion' && finding.bars[0] === 3);
  assert.equal(motion?.observations.kind, 'contrary');
  assert.ok((motion?.eventIds.length ?? 0) >= 2);
  const crossing = evidence.findings.find((finding) => finding.metricId === 'register-crossing' && finding.bars[0] === 3);
  assert.ok(crossing);
  const shared = evidence.findings.find((finding) => finding.metricId === 'attack-relationship' && finding.bars[0] === 3);
  assert.equal(shared?.observations.sharedAttacks, 2);
  const role = evidence.findings.find((finding) => finding.metricId === 'role-indicator' && finding.bars[0] === 2);
  assert.equal(role?.observations.experimental, true);
  assert.match(role?.limitation ?? '', /not a musical role/);
  const unsupported = evidence.findings.find((finding) => finding.metricId === 'unsupported-rhythm-metrics');
  assert.match(String(unsupported?.observations.metrics), /syncopation/);
  assert.equal(evidence.unsupportedMetrics.includes('lbdm-phrase-boundaries'), true);
});

check('a transposed cell at a later onset is rhythmic displacement', () => {
  const cell = duo(
    `<measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>
    </measure>`,
    `<measure number="1">
      <attributes><divisions>1</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
      <note><rest/><duration>4</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><rest/><duration>4</duration><voice>1</voice></note>
    </measure>`,
  );
  const evidence = analyseRhythm({ xml: cell });
  const displaced = evidence.findings.find((finding) => finding.metricId === 'rhythmic-displacement');
  assert.equal(displaced?.bars[0], 2);
  assert.equal(displaced?.confidence, 'limited');
});

check('a shifted candidate is a difference with no rank', () => {
  const shifted = xml.replace('<step>C</step><octave>4</octave></pitch><duration>2</duration>', '<step>D</step><octave>4</octave></pitch><duration>2</duration>');
  const evidence = analyseRhythm({ xml, compareXml: shifted });
  const diffs = evidence.findings.filter((finding) => finding.metricId === 'candidate-difference');
  assert.ok(diffs.length >= 2);
  assert.equal(diffs.every((finding) => finding.observations.rank === null), true);
  assert.equal(diffs.some((finding) => finding.observations.change === 'only-in-first'), true);
  assert.equal(diffs.some((finding) => finding.observations.change === 'only-in-second'), true);
});

if (failed > 0) {
  console.error(`B3 ${failed} failed`);
  process.exit(1);
}
console.log('B3 all passed');
