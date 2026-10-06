/**
 * Pentatonic Engine Dev 3.2 — HOME from source evidence only.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev32.test.ts
 */
import assert from 'node:assert/strict';
import { inferPentatonicHome } from '../core/pentatonic/inferHome';
import type { PentatonicScoreEvent, PentatonicScoreImport, PentatonicSoundingAttack } from '../core/pentatonic/musicXmlScore';

function event(partial: Partial<PentatonicScoreEvent> & { attacks?: PentatonicSoundingAttack[] }): PentatonicScoreEvent {
  return {
    id: partial.id ?? 'e1',
    orderIndex: partial.orderIndex ?? 0,
    sourceLabel: partial.sourceLabel ?? '1',
    chordCarried: partial.chordCarried ?? false,
    harmonyEvidence: partial.harmonyEvidence ?? [],
    soundingAttacks: partial.attacks ?? partial.soundingAttacks ?? [],
    sourceBoundary: false,
    sourceBoundaryReasons: [],
    sectionMarks: [],
    timeBeats: 4,
    timeBeatType: 4,
    ...(partial.chordSymbol ? { chordSymbol: partial.chordSymbol } : {}),
  };
}

function score(partial: Partial<PentatonicScoreImport> & { events: PentatonicScoreEvent[] }): PentatonicScoreImport {
  return {
    title: partial.title ?? 'Untitled',
    movementTitle: partial.title ?? 'Untitled',
    orderPolicy: 'written-score-order',
    parts: [],
    melodyPartId: 'g',
    bassPartId: 'b',
    events: partial.events,
    motifs: [],
    keySignatures: partial.keySignatures ?? [],
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

export function runPentatonicDev32Tests(): { ok: boolean; name: string }[] {
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

  check('melody alone is not a centre', () => {
    const home = inferPentatonicHome(
      score({
        events: [event({ attacks: [attack('melody', 'C', 8), attack('melody', 'D', 8), attack('melody', 'E', 8)] })],
      }),
      'wwh-duo-1.1'
    );
    assert.equal(home.status, 'INSUFFICIENT_CONTEXT');
    assert.equal(home.home, null);
    assert.ok(home.evidence.some((line) => line.includes('unrestricted')));
  });

  check('modeless and conflicting keys create no key candidate', () => {
    const modeless = inferPentatonicHome(
      score({
        keySignatures: [{ sourceLabel: '1', fifths: 0, mode: null }],
        events: [event({ attacks: [attack('bass', 'C', 4)] })],
      }),
      'wwh-duo-1.1'
    );
    assert.ok(modeless.candidates.every((item) => item.source !== 'KEY'));
    const conflict = inferPentatonicHome(
      score({
        keySignatures: [
          { sourceLabel: '1', fifths: 0, mode: 'major' },
          { sourceLabel: '9', fifths: 0, mode: 'minor' },
        ],
        events: [event({ attacks: [attack('bass', 'C', 4)] })],
      }),
      'wwh-duo-1.1'
    );
    assert.ok(conflict.candidates.every((item) => item.source !== 'KEY'));
  });

  check('opening requires the first bass pitch class to agree with the root', () => {
    const home = inferPentatonicHome(
      score({
        events: [
          event({
            chordSymbol: 'D',
            harmonyEvidence: [{ symbol: 'D', offsetDivisions: 0, displayText: null, richerThanEncoded: false }],
            attacks: [attack('bass', 'A', 4), attack('melody', 'D', 4)],
          }),
        ],
      }),
      'wwh-duo-1.1'
    );
    assert.ok(home.candidates.every((item) => item.source !== 'OPENING'));
    assert.equal(home.winnerSource, 'CLOSING');
  });

  check('equal membership lets opening outrank the printed key', () => {
    const home = inferPentatonicHome(
      score({
        keySignatures: [{ sourceLabel: '1', fifths: 0, mode: 'minor' }],
        events: [
          event({
            chordSymbol: 'C',
            harmonyEvidence: [{ symbol: 'C', offsetDivisions: 0, displayText: null, richerThanEncoded: false }],
            attacks: [attack('bass', 'C', 4), attack('melody', 'C', 4), attack('melody', 'D', 4), attack('melody', 'E', 4), attack('melody', 'G', 4), attack('melody', 'A', 4)],
          }),
        ],
      }),
      'wwh-duo-1.1'
    );
    assert.equal(home.winnerSource, 'OPENING');
    assert.equal(home.home?.referenceNote, 'C');
    assert.equal(home.home?.archetypeId, 'major_pentatonic');
  });

  check('a clearly higher membership wins outside the 0.02 band', () => {
    const attacks = [
      attack('bass', 'C', 4),
      attack('bass', 'D', 1),
      ...['C', 'D', 'E', 'G', 'A'].map((spelling) => attack('melody', spelling, 10)),
      attack('melody', 'F#', 1),
      attack('melody', 'B', 1),
    ];
    const home = inferPentatonicHome(
      score({
        title: 'Not Used',
        keySignatures: [{ sourceLabel: '1', fifths: 0, mode: 'major' }],
        events: [
          event({
            id: 'open',
            chordSymbol: 'D',
            harmonyEvidence: [{ symbol: 'D', offsetDivisions: 0, displayText: null, richerThanEncoded: false }],
            attacks: [attack('bass', 'D', 1)],
          }),
          event({
            id: 'rest',
            orderIndex: 1,
            sourceLabel: '2',
            attacks: attacks.filter((item) => item.spelling !== 'D' || item.role !== 'bass'),
          }),
        ],
      }),
      'wwh-duo-1.1'
    );
    assert.equal(home.home?.referenceNote, 'C');
    assert.equal(home.home?.archetypeId, 'major_pentatonic');
    assert.equal(home.winnerSource, 'KEY');
    const renamed = inferPentatonicHome(
      score({
        title: 'Different Title',
        keySignatures: [{ sourceLabel: '1', fifths: 0, mode: 'major' }],
        events: [
          event({
            chordSymbol: 'D',
            harmonyEvidence: [{ symbol: 'D', offsetDivisions: 0, displayText: null, richerThanEncoded: false }],
            attacks: [attack('bass', 'D', 1), ...attacks.filter((item) => !(item.role === 'bass' && item.spelling === 'D'))],
          }),
        ],
      }),
      'wwh-duo-1.1'
    );
    assert.deepEqual(renamed.home, home.home);
  });

  return rows;
}

const rows = runPentatonicDev32Tests();
if (rows.some((row) => !row.ok)) process.exit(1);
