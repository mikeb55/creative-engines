/**
 * Pentatonic Engine Dev 3.4 — definitional corrections.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev34.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { analyzePentatonicScore } from '../core/pentatonic/analyzeScore';
import { homeStatusFromEvidence, inferCentreAndHome } from '../core/pentatonic/centreIdentity';
import { PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { importPentatonicScoreFromMusicXml, type PentatonicScoreEvent, type PentatonicScoreImport, type PentatonicSoundingAttack } from '../core/pentatonic/musicXmlScore';
import { DEFAULT_PENTATONIC_PATH_CONFIG } from '../core/pentatonic/pathConfig';

const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const SOURCES = [
  ['01-Black-Aura-Duo-Leadsheet-V1.1.musicxml', 'b46ad5eddf329f4975a1be1e868099c3c7cefa005226e936e313e7583b2eedcb'],
  ['02-Palace-Gates-Duo-Leadsheet-V1.1.musicxml', 'a76ed8944329da32ac699c6cda30018315ad4bb5a8579e271f488c5039178e56'],
  ['03-The-Mirror-Duo-Leadsheet-V1.0.musicxml', '0b8f9cf0b2c0b97102878355d3b47db8a6fff60c4118dda5eb7447f6fe5d5940'],
  ['04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml', '9c8129a720fed40bc5d3744019ef162b899925cf6e6b64c8b9e75556025feab1'],
  ['05-Orbit-Duo-Leadsheet-V2.1.musicxml', '911f07a6aa9deab3ddd5b7a97eff9bd9dc987a8f8cce5038201553a8b978b3db'],
  ['06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml', 'c382e3bd024260dfc7fce6ea7200058baf98358eb2831f6e9e4cc3f99278d777'],
  ['07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml', '315a5f91a74145d2a3e9f5c61cc5a34a089febef82e84a6439453a15cbecf3b4'],
  ['08-Small-Testimony-Duo-Leadsheet-V1.0.musicxml', '23ecdf60cb2acad748a6548d9dabec176dab9acde79609364038234b2ccb700d'],
  ['09-After-Everything-Duo-Leadsheet-V1.0.musicxml', '6eb57378767e55a2537e1a4cff2c8999c643d27d929172d4e8a7a2bdc201afe0'],
] as const;

function event(partial: Partial<PentatonicScoreEvent> & { attacks?: PentatonicSoundingAttack[] }): PentatonicScoreEvent {
  return {
    id: partial.id ?? 'e1',
    orderIndex: partial.orderIndex ?? 0,
    sourceLabel: partial.sourceLabel ?? '1',
    chordCarried: partial.chordCarried ?? false,
    harmonyEvidence: partial.harmonyEvidence ?? [],
    soundingAttacks: partial.attacks ?? partial.soundingAttacks ?? [],
    sourceBoundary: partial.sourceBoundary ?? false,
    sourceBoundaryReasons: [],
    sectionMarks: partial.sectionMarks ?? [],
    timeBeats: 4,
    timeBeatType: 4,
    ...(partial.chordSymbol ? { chordSymbol: partial.chordSymbol } : {}),
    ...(partial.melodyNotes ? { melodyNotes: partial.melodyNotes } : {}),
    ...(partial.bassNotes ? { bassNotes: partial.bassNotes } : {}),
  };
}

function score(events: PentatonicScoreEvent[]): PentatonicScoreImport {
  return {
    title: 'Fixture',
    movementTitle: 'Fixture',
    orderPolicy: 'written-score-order',
    parts: [],
    melodyPartId: 'g',
    bassPartId: 'b',
    events,
    motifs: [],
    keySignatures: [],
    diagnostics: [],
    warnings: [],
    repeatDetected: false,
    endingDetected: false,
    navigationLabels: [],
    pickupLabels: [],
    pitchPolicy: 'written-equals-concert',
    timingsMs: { parse: 0, extract: 0 },
  };
}

function attack(role: 'melody' | 'bass', spelling: string, durationBeats: number): PentatonicSoundingAttack {
  return { role, spelling, durationBeats };
}

function cBars(notes: string[], bass = 'C'): PentatonicScoreEvent[] {
  return Array.from({ length: 8 }, (_, index) => {
    const label = String(index + 1);
    const boundary = index === 0 || index === 4;
    return event({
      id: `b${label}`,
      orderIndex: index,
      sourceLabel: label,
      chordSymbol: 'C',
      harmonyEvidence: [{ symbol: 'C', offsetDivisions: 0, displayText: null, richerThanEncoded: false }],
      melodyNotes: notes,
      bassNotes: [bass],
      attacks: [...notes.map((note) => attack('melody', note, 1)), attack('bass', bass, 4)],
      sourceBoundary: boundary,
      sectionMarks: boundary ? [index === 0 ? 'A' : 'B'] : [],
    });
  });
}

export function runPentatonicDev34Tests(): { ok: boolean; name: string }[] {
  const rows: { ok: boolean; name: string }[] = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ ok: true, name });
      console.log(`PASS ${name}`);
    } catch (error) {
      rows.push({ ok: false, name });
      console.error(`FAIL ${name}`);
      console.error(error);
    }
  };

  check('HOME floor uses membership, not fit', () => {
    assert.equal(
      homeStatusFromEvidence({ membership: 0.8, fitGap: 0.2, topThird: 'major-third', secondThird: 'major-third', windowModeConflict: false }),
      'HOME'
    );
    assert.equal(
      homeStatusFromEvidence({ membership: 0.55, fitGap: 0.2, topThird: 'major-third', secondThird: null, windowModeConflict: false }),
      'HOME_INSUFFICIENT'
    );
    const highFriction = inferCentreAndHome(score(cBars(['E', 'E', 'E', 'E', 'E', 'E', 'C', 'D', 'G', 'A', 'F', 'F', 'F', 'F'], 'E')));
    const top = highFriction.fits[0];
    assert.ok(top);
    assert.ok(top.membership >= 0.62);
    assert.ok(top.fit < 0.62);
    assert.ok(top.friction > 0);
    assert.notEqual(highFriction.homeStatus, 'HOME_INSUFFICIENT');
    assert.ok(highFriction.evidence.some((line) => line.includes('Fit') && line.includes('ranks only')));
  });

  check('no-third is not a mode conflict', () => {
    assert.equal(
      homeStatusFromEvidence({ membership: 0.8, fitGap: 0.04, topThird: 'major-third', secondThird: 'no-third', windowModeConflict: false }),
      'HOME'
    );
    assert.equal(
      homeStatusFromEvidence({ membership: 0.8, fitGap: 0.04, topThird: 'minor-third', secondThird: 'no-third', windowModeConflict: false }),
      'HOME'
    );
    assert.equal(
      homeStatusFromEvidence({ membership: 0.8, fitGap: 0.04, topThird: 'no-third', secondThird: 'no-third', windowModeConflict: false }),
      'HOME'
    );
    assert.equal(
      homeStatusFromEvidence({ membership: 0.8, fitGap: 0.04, topThird: 'major-third', secondThird: 'minor-third', windowModeConflict: false }),
      'HOME_AMBIGUOUS'
    );
    const split = cBars(['C', 'D', 'E', 'G', 'A']);
    for (let index = 4; index < 8; index += 1) {
      const item = split[index]!;
      item.melodyNotes = ['C', 'Eb', 'F', 'G', 'Bb'];
      item.soundingAttacks = [
        ...['C', 'Eb', 'F', 'G', 'Bb'].map((note) => attack('melody', note, 1)),
        attack('bass', 'C', 4),
      ];
    }
    const opposed = inferCentreAndHome(score(split));
    assert.equal(opposed.centreStatus, 'CENTRE');
    assert.equal(opposed.windowModeConflict, true);
    assert.equal(opposed.homeStatus, 'HOME_AMBIGUOUS');

    const noThird = cBars(['F', 'G', 'A', 'C', 'D']);
    for (let index = 4; index < 8; index += 1) {
      const item = noThird[index]!;
      item.melodyNotes = ['C', 'D', 'E', 'G', 'A'];
      item.soundingAttacks = [
        ...['C', 'D', 'E', 'G', 'A'].map((note) => attack('melody', note, 1)),
        attack('bass', 'C', 4),
      ];
    }
    const mixed = inferCentreAndHome(score(noThird));
    assert.equal(mixed.windowModeConflict, false);
    assert.notEqual(mixed.homeStatus, 'HOME_AMBIGUOUS');
  });

  check('kind none is rootless N.C. and final harmony stays in the last section', () => {
    const xml = `<?xml version="1.0"?><score-partwise>
      <part-list>
        <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
        <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
      </part-list>
      <part id="P1">
        <measure number="1"><direction><direction-type><rehearsal>A</rehearsal></direction-type></direction><harmony><root><root-step>G</root-step></root><kind>major</kind></harmony><note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
        <measure number="2"><harmony><root><root-step>G</root-step></root><kind>major</kind></harmony><note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
        <measure number="3"><direction><direction-type><rehearsal>B</rehearsal></direction-type></direction><harmony><root><root-step>C</root-step></root><kind>none</kind></harmony><note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
        <measure number="4"><note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
      </part>
      <part id="P2">
        <measure number="1"><note><pitch><step>G</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
        <measure number="2"><note><pitch><step>G</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
        <measure number="3"><note><pitch><step>D</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
        <measure number="4"><note><pitch><step>E</step><octave>2</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
      </part>
    </score-partwise>`;
    const imported = importPentatonicScoreFromMusicXml(xml);
    assert.equal(imported.events[2]?.harmonyEvidence[0]?.symbol, 'N.C.');
    assert.equal(imported.events[2]?.chordSymbol, undefined);
    assert.equal(imported.events[3]?.chordSymbol, undefined);
    assert.equal(imported.events[3]?.chordCarried, false);
    const identity = inferCentreAndHome(imported);
    assert.ok(!identity.evidence.some((line) => /final harmony/.test(line) && /\bC\b/.test(line)));
    assert.ok(!identity.evidence.some((line) => line.includes('section 3') && line.includes('root C')));
    assert.ok(identity.evidence.some((line) => line.includes('Final harmony root missing')));
    assert.ok(!identity.scores.some((row) => row.spelling === 'C'));
  });

  check('path runs without a centre and does not invent HOME', () => {
    const xml = `<?xml version="1.0"?><score-partwise>
      <part-list>
        <score-part id="P1"><part-name>Electric Guitar</part-name></score-part>
        <score-part id="P2"><part-name>Upright Bass</part-name></score-part>
      </part-list>
      <part id="P1">
        <measure number="1"><note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note><note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note><note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
        <measure number="2"><note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note><note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note><note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration><voice>1</voice></note></measure>
      </part>
      <part id="P2">
        <measure number="1"><note><pitch><step>C</step><octave>2</octave></pitch><duration>4</duration><voice>1</voice></note></measure>
        <measure number="2"><note><pitch><step>C</step><octave>2</octave></pitch><duration>4</duration><voice>1</voice></note></measure>
      </part>
    </score-partwise>`;
    const before = DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost;
    const analysis = analyzePentatonicScore(xml, { profile: 'wwh-duo-1.1', sourceFile: 'chordless.musicxml' });
    assert.equal(analysis.identity.centreStatus, 'CENTRE_INSUFFICIENT');
    assert.equal(analysis.identity.home, null);
    assert.equal(analysis.identity.colourScoring, 'omitted');
    assert.equal(analysis.path.kind, 'analysis');
    assert.ok(analysis.regions.length > 0);
    assert.ok(analysis.regions.every((region) => region.homeRelationshipLabel === null));
    assert.ok(analysis.regions.every((region) => region.geometricRelation === null));
    assert.ok(analysis.regions.some((region) => /Pentatonic/.test(region.collectionName)));
    assert.equal(analysis.path.events.every((item) => item.homeRelationshipLabel === null), true);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost, before);
    assert.equal(DEFAULT_PENTATONIC_PATH_CONFIG.noneBaselineCost, 0.4);
    assert.ok(analysis.diagnostics.some((line) => line.includes('Harmony component omitted')));
  });

  check('fingerprint and nine source hashes stay put', () => {
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_4, '27bf91d1cb5995f4246d06609dbe1d54dc1f5b27cc99676f5512cf5b423c398c');
    assert.equal(PENTATONIC_FROZEN_CONFIG_FINGERPRINT_DEV_3_5, 'acd91358d754dbabf6132ebdb6b0f1b28cead13c28daeb35f9ff0e1bc231dc8f');
    assert.equal(pentatonicFrozenConfigFingerprint(), 'ef43cf14487dfdc85c93075ae4eda977e4bd984396a8052646a4d1593b849b97');
    for (const [file, sha] of SOURCES) {
      const full = `${ALBUM}/${file}`;
      assert.equal(createHash('sha256').update(fs.readFileSync(full)).digest('hex'), sha);
    }
  });

  return rows;
}

const rows = runPentatonicDev34Tests();
if (rows.some((row) => !row.ok)) process.exit(1);
