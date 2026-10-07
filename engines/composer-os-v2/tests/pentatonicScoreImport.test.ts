/**
 * Pentatonic Dev 3 — MusicXML extraction and frozen Dev 2 fixture gate.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicScoreImport.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { recommendPentatonicPath } from '../core/pentatonic/recommendPath';
import { WWH_DUO_EVIDENCE_WEIGHTS } from '../core/pentatonic/evidenceProfiles';
import { importPentatonicScoreFromMusicXml, type PentatonicScoreEvent } from '../core/pentatonic/musicXmlScore';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';
import type { PentatonicPassage, PentatonicPassageEvent } from '../core/pentatonic/pathTypes';
import {
  impossibleMetaphysicsObjectPassage,
  impossibleMetaphysicsThemePassage,
  mirrorDiminishedPassage,
  mirrorFramePassage,
  orbitAPassage,
  orbitBPassage,
} from '../core/pentatonic';

const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const ORBIT = `${ALBUM}/05-Orbit-Duo-Leadsheet-V2.1.musicxml`;
const ORBIT_SHA = '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db';

function run(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
    } catch (error) {
      rows.push({ ok: false, name: `${name} — ${error instanceof Error ? error.message : String(error)}` });
    }
  };

  check('Dev 2 path constants and WWH weights stay frozen', () => {
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.changeCost, 0.35);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost, 0.4);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.phraseBoundaryChangeDiscount, 0.15);
    assert.equal(WWH_DUO_EVIDENCE_WEIGHTS.melody, 2.6);
    assert.equal(WWH_DUO_EVIDENCE_WEIGHTS.bass, 2);
    assert.equal(WWH_DUO_EVIDENCE_WEIGHTS.harmony, 0.9);
  });

  check('measure labels, parts, rests, ties, voices, pickup, repeat policy', () => {
    const xml = `<?xml version="1.0"?>
      <score-partwise version="3.1">
        <work><work-title>Synthetic</work-title></work>
        <part-list>
          <score-part id="P2"><part-name>Upright Bass</part-name><score-instrument id="P2-I1"><instrument-name>Upright Bass</instrument-name></score-instrument></score-part>
          <score-part id="P1"><part-name>Electric Guitar</part-name><score-instrument id="P1-I1"><instrument-name>Electric Guitar</instrument-name></score-instrument></score-part>
        </part-list>
        <part id="P2">
          <measure number="0" implicit="yes"><note><rest/><duration>1</duration><voice>1</voice></note></measure>
          <measure number="X"><note><rest/><duration>1</duration><voice>1</voice></note></measure>
          <measure number="2"><note><rest/><duration>1</duration><voice>1</voice></note></measure>
          <measure number="3">
            <note><pitch><step>C</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice><tie type="start"/></note>
          </measure>
          <measure number="4">
            <note><pitch><step>C</step><octave>3</octave></pitch><duration>1</duration><voice>1</voice><tie type="stop"/></note>
            <barline><repeat direction="backward"/></barline>
          </measure>
        </part>
        <part id="P1">
          <measure number="0" implicit="yes">
            <attributes><divisions>1</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>
            <harmony><root><root-step>A</root-step></root><kind text="(add9)">major</kind></harmony>
            <note><rest/><duration>1</duration><voice>1</voice></note>
            <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><tie type="start"/></note>
            <note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice><tie type="stop"/></note>
          </measure>
          <measure number="X">
            <note><rest/><duration>1</duration><voice>1</voice></note>
            <note><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration><voice>2</voice></note>
          </measure>
          <measure number="2">
            <note><rest/><duration>1</duration><voice>1</voice></note>
          </measure>
          <measure number="3">
            <harmony><root><root-step>C</root-step></root><kind>nonsense</kind></harmony>
            <note><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>
            <note><chord/><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>
          </measure>
          <measure number="4">
            <direction><direction-type><rehearsal>B</rehearsal></direction-type></direction>
            <note><pitch><step>G</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note>
          </measure>
        </part>
      </score-partwise>`;
    const first = importPentatonicScoreFromMusicXml(xml);
    const second = importPentatonicScoreFromMusicXml(xml);
    assert.equal(JSON.stringify(first.events), JSON.stringify(second.events));
    assert.equal(first.parts[0]?.role, 'bass');
    assert.equal(first.parts[1]?.role, 'melody');
    assert.equal(first.melodyPartId, 'P1');
    assert.equal(first.bassPartId, 'P2');
    assert.deepEqual(first.events.map((event) => event.sourceLabel), ['0', 'X', '2', '3', '4']);
    assert.deepEqual(first.pickupLabels, ['0']);
    assert.equal(first.repeatDetected, true);
    assert.ok(first.diagnostics.some((line) => line.includes('written score order')));
    const [pickup, multi, silence, unknown, letter] = first.events;
    assert.deepEqual(pickup?.melodyNotes, ['C']);
    assert.equal(pickup?.bassRest, true);
    assert.equal(pickup?.chordSymbol, 'A(add9)');
    assert.equal(multi?.melodyRest, true);
    assert.deepEqual(multi?.heldNotes, ['E']);
    assert.equal(multi?.chordSymbol, 'A(add9)');
    assert.equal(multi?.chordCarried, true);
    assert.equal(silence?.melodyRest, true);
    assert.equal(silence?.bassRest, true);
    assert.equal(unknown?.chordSymbol, 'A(add9)');
    assert.ok(first.diagnostics.some((line) => line.includes('unsupported harmony kind')));
    assert.deepEqual(unknown?.melodyNotes, ['D', 'F']);
    assert.equal(letter?.sourceBoundary, true);
    assert.deepEqual(letter?.melodyNotes, ['G']);
    const tiedBass = first.events[4];
    assert.deepEqual(tiedBass?.bassNotes, ['C']);
  });

  check('Orbit V2.1 file is unchanged and matches the published hash', () => {
    const before = createHash('sha256').update(fs.readFileSync(ORBIT)).digest('hex');
    importPentatonicScoreFromMusicXml(fs.readFileSync(ORBIT, 'utf8'));
    const after = createHash('sha256').update(fs.readFileSync(ORBIT)).digest('hex');
    assert.equal(before, ORBIT_SHA);
    assert.equal(after, ORBIT_SHA);
  });

  check('Orbit extraction matches frozen Dev 2 fixtures and path', () => {
    const score = importPentatonicScoreFromMusicXml(fs.readFileSync(ORBIT, 'utf8'));
    assert.equal(score.parts.find((part) => part.role === 'melody')?.name, 'Electric Guitar');
    assert.equal(score.parts.find((part) => part.role === 'bass')?.name, 'Upright Bass');
    assert.equal(score.pitchPolicy, 'written-equals-concert');
    compareSlice(score.events, orbitAPassage());
    compareSlice(score.events, orbitBPassage());
    // Dev 3.6 held C Minor on 1–7 at cost 2.571633.
    // Dev 3.7 forbids C Minor on mm.4–5 (mean 0.5578) because C# Major mean 0.66855.
    // The re-solve chooses F Minor across 1–7. Cost 2.614833. One switch, two resources.
    assertPath(score.events, orbitAPassage(), '1–7  F Minor Pentatonic HOME\n8–9  E Major Pentatonic', 2.614833, 1, 2, 0);
    // Orbit B path unchanged. Cost 1.0808 → 1.0866. FRICTION. No collection change, so the floor does not apply.
    assertPath(score.events, orbitBPassage(), '18–25  G Minor Pentatonic 6/9 SUSPENDED', 1.0866, 0, 1, 0);
  });

  check('Impossible Metaphysics extraction matches frozen Dev 2 fixtures', () => {
    const score = importPentatonicScoreFromMusicXml(
      fs.readFileSync(`${ALBUM}/07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml`, 'utf8')
    );
    compareSlice(score.events, impossibleMetaphysicsObjectPassage());
    assert.equal(score.events.find((event) => event.sourceLabel === '3')?.sourceBoundary, false);
    assert.ok(score.motifs.some((motif) => motif.label === 'M2' && motif.sourceLabel === '3'));
    compareSlice(score.events, impossibleMetaphysicsThemePassage());
    assertPath(
      score.events,
      impossibleMetaphysicsObjectPassage(),
      '1–12  A Major Pentatonic HOME\n13–16  Bb Major Pentatonic',
      2.347433,
      1,
      2,
      0
    );
    // OLD 46–47 E Major Pentatonic SUSPENDED / 48–51 A Major HOME / 52–54 C Major, cost 2.072766.
    // Floor alone becomes 46–51 D Major / 52–54 C Major. Friction then chooses NONE on 46–47 and A Major on 48–51. BOTH.
    // Dev 3.4 cost 2.055633. The passage opens on NONE, so the only NONE boundary is NONE→A.
    // Dev 3.4 charged that boundary 0.20 (changeCost 0.35 minus the phrase discount 0.15).
    // Dev 3.5 charges 0.175. Same states. Delta 0.025.
    assertPath(
      score.events,
      impossibleMetaphysicsThemePassage(),
      '46–47  NONE\n48–51  A Major Pentatonic HOME\n52–54  C Major Pentatonic',
      2.030633,
      2,
      2,
      2
    );
  });

  check('The Mirror extraction matches frozen Dev 2 fixtures', () => {
    const score = importPentatonicScoreFromMusicXml(
      fs.readFileSync(`${ALBUM}/03-The-Mirror-Duo-Leadsheet-V1.0.musicxml`, 'utf8')
    );
    compareSlice(score.events, mirrorFramePassage());
    compareSlice(score.events, mirrorDiminishedPassage());
    assert.ok(score.motifs.some((motif) => motif.label === 'M1 colour'));
    assert.ok(!score.events.some((event) => event.sourceBoundaryReasons.some((reason) => reason.includes('M1'))));
    assertPath(
      score.events,
      mirrorFramePassage(),
      '1–4  D Minor Pentatonic 6/9 SUSPENDED\n5–16  C Minor Pentatonic HOME',
      2.883933,
      1,
      2,
      0
    );
    // OLD 46–50 G Minor SUSPENDED / 51–54 D Minor 6/9, cost 3.046933.
    // Floor alone keeps that path at cost 3.2086. Friction changes the fields. BOTH.
    assertPath(
      score.events,
      mirrorDiminishedPassage(),
      '46  A Minor Pentatonic MAJOR\n47–50  C# Major Pentatonic\n51–54  A Minor Pentatonic MAJOR',
      3.311233,
      2,
      2,
      0
    );
  });

  check('whole-song analysis of a short score is deterministic', () => {
    const xml = `<?xml version="1.0"?>
      <score-partwise>
        <work><work-title>Orbit</work-title></work>
        <part-list>
          <score-part id="P1"><part-name>Electric Guitar</part-name><score-instrument id="a"><instrument-name>Electric Guitar</instrument-name></score-instrument></score-part>
          <score-part id="P2"><part-name>Upright Bass</part-name><score-instrument id="b"><instrument-name>Upright Bass</instrument-name></score-instrument></score-part>
        </part-list>
        <part id="P1">
          <measure number="1"><attributes><divisions>1</divisions><key><fifths>-4</fifths><mode>minor</mode></key></attributes><note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
          <measure number="2"><note><pitch><step>F</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
        </part>
        <part id="P2">
          <measure number="1"><note><rest/><duration>1</duration><voice>1</voice></note></measure>
          <measure number="2"><note><pitch><step>F</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
        </part>
      </score-partwise>`;
    const a = analyzePentatonicScore(xml, { sourceFile: 'tiny.musicxml', sourceSha256: 'abc', profile: 'wwh-duo-1.1' });
    const b = analyzePentatonicScore(xml, { sourceFile: 'tiny.musicxml', sourceSha256: 'abc', profile: 'wwh-duo-1.1' });
    assert.equal(a.orderPolicy, 'written-score-order');
    assert.equal(a.profile, 'wwh-duo-1.1');
    assert.ok(a.homeReading.includes('CENTRE_INSUFFICIENT'));
    assert.deepEqual(
      a.regions.map((region) => [region.measureRangeLabel, region.collectionName]),
      b.regions.map((region) => [region.measureRangeLabel, region.collectionName])
    );
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost, 0.4);
  });

  check('N.C., grace, transpose, ambiguous role, and duplicate staff', () => {
    const xml = `<?xml version="1.0"?><score-partwise>
      <part-list>
        <score-part id="G1"><part-name>Electric Guitar</part-name><score-instrument id="g"><instrument-name>Electric Guitar</instrument-name></score-instrument></score-part>
        <score-part id="G2"><part-name>Electric Guitar</part-name><score-instrument id="g2"><instrument-name>Electric Guitar</instrument-name></score-instrument></score-part>
        <score-part id="B"><part-name>Upright Bass</part-name><score-instrument id="b"><instrument-name>Upright Bass</instrument-name></score-instrument></score-part>
      </part-list>
      <part id="G1"><measure number="1"><attributes><divisions>1</divisions><transpose><chromatic>0</chromatic><octave-change>-1</octave-change></transpose></attributes><harmony><root><root-step>D</root-step></root><kind text="maj7#11">other</kind></harmony><note><grace/><pitch><step>E</step><octave>5</octave></pitch><duration>0</duration></note><note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note></measure><measure number="2"><direction><direction-type><words>N.C.</words></direction-type></direction><note><rest/><duration>1</duration><voice>1</voice></note></measure></part>
      <part id="G2"><measure number="1"><note><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration><voice>1</voice></note></measure><measure number="2"><note><rest/><duration>1</duration><voice>1</voice></note></measure></part>
      <part id="B"><measure number="1"><note><rest/><duration>1</duration><voice>1</voice></note></measure><measure number="2"><note><rest/><duration>1</duration><voice>1</voice></note></measure></part>
      </score-partwise>`;
    const same = importPentatonicScoreFromMusicXml(xml);
    assert.ok(same.diagnostics.some((line) => line.includes('Duplicate guitar staff')));
    assert.equal(same.events[0]?.melodyNotes?.[0], 'C');
    assert.equal(same.events[0]?.grace === undefined, true);
    assert.ok(same.diagnostics.some((line) => line.includes('grace')));
    assert.ok(same.diagnostics.some((line) => line.includes('chord_text_richer_than_encoded_harmony')));
    assert.equal(same.events[1]?.chordSymbol, undefined);
    assert.equal(same.events[1]?.chordCarried, false);

    const shifted = importPentatonicScoreFromMusicXml(xml.replace('<chromatic>0</chromatic>', '<chromatic>2</chromatic>'));
    assert.equal(shifted.pitchPolicy, 'concert-from-written-transpose');
    assert.equal(shifted.events[0]?.melodyNotes?.[0], 'D');

    const ambiguous = importPentatonicScoreFromMusicXml(`<?xml version="1.0"?><score-partwise><part-list><score-part id="P9"><part-name>Viola</part-name><score-instrument id="v"><instrument-name>Viola</instrument-name></score-instrument></score-part></part-list><part id="P9"><measure number="1"><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note></measure></part></score-partwise>`);
    assert.equal(ambiguous.melodyPartId, null);
    assert.equal(ambiguous.bassPartId, null);
    assert.equal(ambiguous.events.length, 0);
    assert.ok(ambiguous.warnings.some((line) => line.includes('Melody evidence left empty')));
  });

  check('frozen Dev 1/2 config fingerprint is stable', () => {
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, '27bf91d1cb5995f4246d06609dbe1d54dc1f5b27cc99676f5512cf5b423c398c');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, 'acd91358d754dbabf6132ebdb6b0f1b28cead13c28daeb35f9ff0e1bc231dc8f');
    assert.equal(pentatonicFrozenConfigFingerprint(), 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6');
  });

  return rows;
}

function passageFromExtraction(events: readonly PentatonicScoreEvent[], fixture: PentatonicPassage): PentatonicPassage {
  const byLabel = new Map(events.map((event) => [event.sourceLabel, event]));
  const rows: PentatonicPassageEvent[] = fixture.events.map((expected) => {
    const actual = byLabel.get(expected.sourceLabel);
    if (!actual) throw new Error(`missing ${expected.sourceLabel}`);
    return {
      id: expected.id,
      sourceLabel: actual.sourceLabel,
      ...(actual.chordSymbol ? { chordSymbol: actual.chordSymbol } : {}),
      ...(actual.melodyNotes ? { melodyNotes: [...actual.melodyNotes] } : {}),
      ...(actual.bassNotes ? { bassNotes: [...actual.bassNotes] } : {}),
      ...(actual.heldNotes ? { heldNotes: [...actual.heldNotes] } : {}),
      ...(actual.melodyRest ? { melodyRest: true } : {}),
      ...(actual.bassRest ? { bassRest: true } : {}),
      ...(expected.phraseBoundaryAfter ? { phraseBoundaryAfter: true } : {}),
    };
  });
  return { ...fixture, events: rows };
}

function assertPath(
  events: readonly PentatonicScoreEvent[],
  fixture: PentatonicPassage,
  explanation: string,
  cost: number,
  changes: number,
  resources: number,
  noneEvents: number
): void {
  const result = recommendPentatonicPath(passageFromExtraction(events, fixture));
  assert.equal(result.explanation, explanation);
  assert.equal(result.totalPathCost, cost);
  assert.equal(result.switchCount, changes);
  assert.equal(result.distinctResources, resources);
  assert.equal(result.noneEventCount, noneEvents);
}

function sameNotes(actual: readonly string[] | undefined, expected: readonly string[] | undefined): boolean {
  return JSON.stringify(actual ?? []) === JSON.stringify(expected ?? []);
}

function compareSlice(events: readonly PentatonicScoreEvent[], passage: PentatonicPassage): void {
  const byLabel = new Map(events.map((event) => [event.sourceLabel, event]));
  for (let index = 0; index < passage.events.length; index++) {
    const expected = passage.events[index]!;
    const actual = byLabel.get(expected.sourceLabel);
    assert.ok(actual, `missing measure ${expected.sourceLabel}`);
    assert.equal(actual?.sourceLabel, expected.sourceLabel);
    assert.equal(actual?.chordSymbol, expected.chordSymbol);
    assert.ok(sameNotes(actual?.melodyNotes, expected.melodyNotes), `${expected.sourceLabel} melody ${actual?.melodyNotes} vs ${expected.melodyNotes}`);
    assert.ok(sameNotes(actual?.bassNotes, expected.bassNotes), `${expected.sourceLabel} bass ${actual?.bassNotes} vs ${expected.bassNotes}`);
    assert.ok(sameNotes(actual?.heldNotes, expected.heldNotes), `${expected.sourceLabel} held ${actual?.heldNotes} vs ${expected.heldNotes}`);
    assert.equal(Boolean(actual?.melodyRest), Boolean(expected.melodyRest), `${expected.sourceLabel} melody rest`);
    assert.equal(Boolean(actual?.bassRest), Boolean(expected.bassRest), `${expected.sourceLabel} bass rest`);
    assert.ok(!actual?.sourceBoundaryReasons.some((reason) => /M\d+/.test(reason)), `${expected.sourceLabel} motif used as boundary`);
  }
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
