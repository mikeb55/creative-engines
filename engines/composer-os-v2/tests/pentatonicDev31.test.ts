/**
 * Pentatonic Engine Dev 3.1 — HOME inference and motif semantics.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev31.test.ts
 */
import assert from 'node:assert/strict';
import { inferPentatonicHome } from '../core/pentatonic/inferHome';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import type { PentatonicScoreEvent, PentatonicScoreImport, PentatonicSoundingAttack } from '../core/pentatonic/musicXmlScore';

const FROZEN_FINGERPRINT = '2bbe6c712401a30d41a00554b17f9d4840941003b4feb95f469b20f56de06f9f';

function event(attacks: PentatonicSoundingAttack[]): PentatonicScoreEvent {
  return {
    id: 'e1',
    orderIndex: 0,
    sourceLabel: '1',
    chordCarried: false,
    harmonyEvidence: [],
    soundingAttacks: attacks,
    sourceBoundary: false,
    sourceBoundaryReasons: [],
    sectionMarks: [],
    timeBeats: 4,
    timeBeatType: 4,
  };
}

function score(title: string, attacks: PentatonicSoundingAttack[], fifths?: number, mode?: string): PentatonicScoreImport {
  return {
    title,
    movementTitle: title,
    orderPolicy: 'written-score-order',
    parts: [],
    melodyPartId: 'g',
    bassPartId: 'b',
    events: [event(attacks)],
    motifs: [],
    keySignatures: fifths === undefined ? [] : [{ sourceLabel: '1', fifths, mode: mode ?? null }],
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

function notes(role: 'melody' | 'bass', spellings: string[], beats = 4): PentatonicSoundingAttack[] {
  return spellings.map((spelling) => ({ role, spelling, durationBeats: beats }));
}

export function runPentatonicDev31Tests(): { ok: boolean; name: string }[] {
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

  check('Dev 2 fingerprint stays frozen', () => {
    assert.equal(pentatonicFrozenConfigFingerprint(), FROZEN_FINGERPRINT);
  });

  check('short score with no key returns INSUFFICIENT_CONTEXT', () => {
    const home = inferPentatonicHome(score('Untitled', notes('melody', ['C'], 1)), 'wwh-duo-1.0');
    assert.equal(home.status, 'INSUFFICIENT_CONTEXT');
    assert.equal(home.home, null);
  });

  check('title does not change the inferred field', () => {
    const attacks = [...notes('melody', ['A', 'B', 'C#', 'E', 'F#']), ...notes('bass', ['A'])];
    const left = inferPentatonicHome(score('Impossible Metaphysics', attacks), 'wwh-duo-1.0');
    const right = inferPentatonicHome(score('Something Else', attacks), 'wwh-duo-1.0');
    assert.deepEqual(left.home, right.home);
    assert.equal(left.home?.referenceNote, 'A');
    assert.equal(left.home?.archetypeId, 'major_pentatonic');
  });

  check('a bass pedal does not replace a clearer pitch field', () => {
    const attacks = [...notes('melody', ['A', 'B', 'C#', 'E', 'F#'], 4), ...notes('bass', ['A'], 6), ...notes('bass', ['E'], 2)];
    const home = inferPentatonicHome(score('Pedal', attacks), 'wwh-duo-1.0');
    assert.equal(home.home?.referenceNote, 'A');
    assert.equal(home.home?.archetypeId, 'major_pentatonic');
    assert.ok(home.evidence.some((line) => line.includes('tie-break only')));
  });

  return rows;
}

const rows = runPentatonicDev31Tests();
const failed = rows.filter((row) => !row.ok);
if (failed.length > 0) process.exit(1);
