/**
 * V3.1-B2 — harmonic and motivic evidence.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/musical-evaluation/b2Harmonic.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BHL_WORLD_IDS, buildBhlWorldField } from '../../core/bhl/bhlWorlds';
import { getHexatonicScalar, listHexatonicScalars } from '../../core/hexatonic/collections';
import { listHexatonicWpsPairs } from '../../core/hexatonic/triadPairs';
import { listPentatonicColourResources } from '../../core/pentatonic/colourRegistry';
import { WPS_VAULT_TONALITIES } from '../../core/wwh/wps/wpsTonalityVaultRecord';
import { analyseHarmony } from '../../core/musical-evaluation/harmonicEvidence';
import { ingestCanonicalScore } from '../../core/musical-evaluation/canonicalScore';

const HEX = path.join(process.cwd(), 'engines/composer-os-v2/core/hexatonic/examples/h3-scalar-major-omit-seventh.musicxml');
const CANDIDATE = path.join(
  process.cwd(),
  'engines/composer-os-v2/core/wwh/wps/fixtures/03-the-mirror-bars-30-33-v13-candidate.musicxml',
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

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function line(pitchClasses: readonly number[]): string {
  const beats = Math.max(pitchClasses.length, 1);
  const notes = pitchClasses
    .map((pc) => {
      const name = NAMES[pc]!;
      const step = name[0];
      const alter = name.includes('#') ? 1 : name.includes('b') ? -1 : 0;
      const alterXml = alter === 0 ? '' : `<alter>${alter}</alter>`;
      return `<note><pitch><step>${step}</step>${alterXml}<octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
    <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>${beats}</beats><beat-type>4</beat-type></time></attributes>
    ${notes}
  </measure></part>
  <part id="P2"><measure number="1">
    <attributes><divisions>1</divisions><time><beats>${beats}</beats><beat-type>4</beat-type></time></attributes>
    <note><rest/><duration>${beats}</duration><voice>1</voice></note>
  </measure></part>
</score-partwise>`;
}

check('registries stay intact', () => {
  assert.equal(listPentatonicColourResources().length, 20);
  assert.equal(listHexatonicScalars().length, 11);
  assert.equal(listHexatonicWpsPairs().length, 16);
  assert.equal(WPS_VAULT_TONALITIES.length, 16);
  assert.equal(BHL_WORLD_IDS.length, 6);
});

check('BHL worlds A–F report their own pitch classes and do not treat membership as an error', () => {
  for (const world of BHL_WORLD_IDS) {
    const field = buildBhlWorldField(world, {
      bar: 1,
      quarters: 4,
      attacks: [],
      rests: [],
      notes: [],
      pitchClasses: [0],
      rootPc: 0,
    }, 'primary');
    const evidence = analyseHarmony({
      xml: line(field.pitchClasses),
      declared: { label: `BHL ${world}`, pitchClasses: field.pitchClasses, family: 'bhl' },
      intentionId: `world-${world}`,
    });
    assert.equal('musicalQualityScore' in evidence, false);
    const collection = evidence.findings.find((finding) => finding.metricId === 'pitch-class-collection');
    assert.equal(collection?.observations.pitchClasses, field.pitchClasses.join(','));
    assert.equal(collection?.eventIds.length, field.pitchClasses.length);
    const membership = evidence.findings.find((finding) => finding.metricId === 'field-membership' && finding.voice === null);
    assert.equal(membership?.observations.membership, 'inside');
    assert.equal(membership?.observations.error, false);
    assert.equal(membership?.treatsOutsideAsError, false);
    const distance = evidence.findings.find((finding) => finding.metricId === 'collection-distance' && finding.observations.distanceClass);
    if (field.pitchClasses.length === 5 || field.pitchClasses.length === 6) {
      assert.equal(distance?.observations.distanceClass, 'IDENTICAL');
      assert.equal(distance?.observations.mapMethod, null);
    }
  }
});

check('hexatonic bar 3 outside tones stay observations', () => {
  const home = getHexatonicScalar('hex_major_omit_seventh')!;
  const xml = fs.readFileSync(HEX, 'utf8');
  const evidence = analyseHarmony({
    xml,
    declared: { label: home.id, pitchClasses: home.pitchClasses, family: 'hexatonic' },
  });
  const outside = evidence.findings.filter(
    (finding) => finding.metricId === 'field-membership' && finding.observations.membership === 'outside' && finding.bars[0] === 3 && finding.eventIds.length > 0,
  );
  assert.ok(outside.length >= 1);
  assert.equal(outside.every((finding) => finding.observations.error === false), true);
  const path = evidence.findings.find((finding) => finding.metricId === 'inside-outside-return');
  assert.match(String(path?.observations.path), /outside/);
  assert.match(String(path?.observations.path), /return/);
  const score = ingestCanonicalScore(xml).score!;
  for (const finding of outside) {
    assert.ok(score.sourceEvents.some((event) => finding.eventIds.includes(event.id)));
  }
});

check('a pentatonic colour and a WPS pair keep their classifiers apart', () => {
    const colour = listPentatonicColourResources().find((item) => item.id === 'major_pentatonic')!;
  const pcs = colour.intervals.map((interval) => interval);
  const pent = analyseHarmony({
    xml: line(pcs),
    declared: { label: colour.id, pitchClasses: pcs, family: 'pentatonic' },
  });
  const pentDistance = pent.findings.find((finding) => finding.metricId === 'collection-distance');
  assert.equal(pentDistance?.metricVersion, 'pentatonic-field-distance-7a');
  assert.equal(pentDistance?.observations.classifier, 'pentatonic');
  const pair = listHexatonicWpsPairs()[0]!;
  const union = [...pair.resolution.pitchClasses, ...pair.tension.pitchClasses];
  const unique = [...new Set(union)].sort((a, b) => a - b);
  const wps = analyseHarmony({
    xml: line(unique),
    declared: { label: pair.id, pitchClasses: unique, family: 'wps' },
  });
  const wpsDistance = wps.findings.find((finding) => finding.observations.classifier === 'hexatonic');
  if (unique.length === 6) {
    assert.equal(wpsDistance?.metricVersion, 'hexatonic-distance-h2');
    assert.notEqual(wpsDistance?.metricVersion, pentDistance?.metricVersion);
  }
});

check('registered motion, contour, retention and displacement cite events', () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="4.0">
  <part-list><score-part id="P1"><part-name>Electric Guitar</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes><divisions>1</divisions><time><beats>2</beats><beat-type>4</beat-type></time></attributes>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    </measure>
    <measure number="2">
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note>
    </measure>
  </part>
</score-partwise>`;
  const evidence = analyseHarmony({ xml });
  const motion = evidence.findings.find((finding) => finding.metricId === 'registered-voice-leading');
  assert.equal(motion?.observations.voiceLeading, 'REGISTER');
  assert.equal(motion?.observations.semitones, 4);
  assert.equal(motion?.observations.distanceClass, null);
  assert.equal(motion?.eventIds.length, 2);
  const contour = evidence.findings.find((finding) => finding.metricId === 'melodic-contour');
  assert.equal(contour?.observations.contour, 'up repeat down');
  const retained = evidence.findings.find((finding) => finding.metricId === 'common-tone-retention');
  assert.equal(retained?.observations.retained, '4');
  const displacement = evidence.findings.find((finding) => finding.metricId === 'harmonic-displacement');
  assert.equal(displacement?.observations.voiceLeading, 'PITCH_CLASS_PROXIMITY');
  assert.equal(displacement?.observations.mapMethod, null);
  const tessitura = evidence.findings.find((finding) => finding.metricId === 'tessitura');
  assert.equal(tessitura?.observations.low, 60);
  assert.equal(tessitura?.observations.high, 64);
});

check('M-DEG and M-NEAR stay map methods', () => {
  const notes = [
    { pitch: 60, startBeat: 0, duration: 1 },
    { pitch: 64, startBeat: 1, duration: 1 },
    { pitch: 67, startBeat: 2, duration: 1 },
  ];
  const source = { name: 'C major pentatonic', archetypeId: 'major_pentatonic', referenceNote: 'C', homeRelationshipLabel: null };
  const target = { name: 'C minor pentatonic', archetypeId: 'minor_pentatonic', referenceNote: 'C', homeRelationshipLabel: null };
  for (const method of ['M-DEG', 'M-NEAR'] as const) {
    const evidence = analyseHarmony({
      xml: line([0, 4, 7]),
      motifMap: { method, source, target, notes },
    });
    const mapped = evidence.findings.find((finding) => finding.metricId === 'motif-map' && finding.observations.mapMethod === method);
    assert.ok(mapped);
    assert.equal(mapped?.observations.distanceClass, null);
    assert.notEqual(mapped?.metricVersion, 'pentatonic-field-distance-7a');
    assert.match(mapped?.limitation ?? '', /not the pentatonic NEAR/);
  }
});

check('candidate fixture findings point at real events', () => {
  const xml = fs.readFileSync(CANDIDATE, 'utf8');
  const evidence = analyseHarmony({ xml });
  const score = ingestCanonicalScore(xml).score!;
  const ids = new Set(score.sourceEvents.map((event) => event.id));
  const cited = evidence.findings.filter((finding) => finding.eventIds.length > 0);
  assert.ok(cited.length > 0);
  for (const finding of cited) {
    for (const id of finding.eventIds) assert.equal(ids.has(id), true, id);
  }
  assert.equal(evidence.findings.some((finding) => finding.metricId === 'motif-recurrence'), true);
});

if (failed > 0) {
  console.error(`B2 ${failed} failed`);
  process.exit(1);
}
console.log('B2 all passed');
