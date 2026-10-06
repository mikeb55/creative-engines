/**
 * While We're Here, track 5 Orbit — path QA.
 * Orbit names the track. The album is While We're Here.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicPathMusicalQa.test.ts
 */
import assert from 'node:assert/strict';
import { ORBIT_FIXTURE_NOTE, orbitAPassage, orbitBPassage } from '../core/pentatonic/orbitPassages';
import { formatPathComparison, recommendPentatonicPath } from '../core/pentatonic/recommendPath';
import type { PentatonicPathResult } from '../core/pentatonic/pathTypes';

function changesAtConsecutiveBoundaries(result: PentatonicPathResult): number {
  let streak = 0;
  let worst = 0;
  for (let index = 1; index < result.events.length; index++) {
    if (result.events[index]!.chosenId !== result.events[index - 1]!.chosenId) {
      streak += 1;
      worst = Math.max(worst, streak);
    } else streak = 0;
  }
  return worst;
}

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

  console.log(ORBIT_FIXTURE_NOTE);
  const orbitA = recommendPentatonicPath(orbitAPassage());
  const orbitB = recommendPentatonicPath(orbitBPassage());
  console.log('\n### ORBIT A — track 5\n');
  console.log(formatPathComparison(orbitA));
  console.log('\n### ORBIT B — track 5\n');
  console.log(formatPathComparison(orbitB));

  check('Orbit A changes at most twice and uses at most three resources', () => {
    assert.equal(orbitA.disposition, 'PATH');
    assert.ok(orbitA.switchCount <= 2, `switches ${orbitA.switchCount}`);
    assert.ok(orbitA.distinctResources <= 3, `resources ${orbitA.distinctResources}`);
    assert.ok(changesAtConsecutiveBoundaries(orbitA) <= 2);
  });

  check('Orbit B does not track every Gmaj7/F Ebmaj7/F flip', () => {
    assert.equal(orbitB.disposition, 'PATH');
    assert.ok(orbitB.switchCount <= 1, `switches ${orbitB.switchCount}`);
    const chords = orbitBPassage().events.map((event) => event.chordSymbol);
    const flips = orbitB.events.filter((event, index) => index > 0 && chords[index] !== chords[index - 1] && event.chosenId !== orbitB.events[index - 1]!.chosenId);
    assert.ok(flips.length < chords.filter((chord, index) => index > 0 && chord !== chords[index - 1]).length);
  });

  check('static passage is one segment', () => {
    const result = recommendPentatonicPath({
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      depth: 'near',
      events: Array.from({ length: 8 }, (_, index) => ({
        id: `s${index + 1}`,
        sourceLabel: String(index + 1),
        melodyNotes: ['A', 'C', 'D', 'E', 'G'],
        bassNotes: ['A'],
        chordSymbol: 'Am',
      })),
    });
    assert.equal(result.segments.length, 1);
    assert.equal(result.switchCount, 0);
  });

  check('colour departure can leave HOME and return', () => {
    const result = recommendPentatonicPath({
      tonalCentre: { root: 'A', mode: 'minor' },
      home: { archetypeId: 'minor_pentatonic', referenceNote: 'A' },
      purpose: 'lyrical_answer',
      depth: 'chromatic',
      events: [
        { id: '1', sourceLabel: '1', melodyNotes: ['C'] },
        { id: '2', sourceLabel: '2', melodyNotes: ['C'] },
        { id: '3', sourceLabel: '3', melodyNotes: ['B', 'F#'] },
        { id: '4', sourceLabel: '4', melodyNotes: ['B', 'F#'] },
        { id: '5', sourceLabel: '5', melodyNotes: ['C'] },
        { id: '6', sourceLabel: '6', melodyNotes: ['C'] },
      ],
    });
    assert.equal(result.events[0]?.homeRelationshipId, 'home');
    assert.notEqual(result.events[3]?.chosenId, result.events[0]?.chosenId);
    assert.equal(result.events[5]?.chosenId, result.events[0]?.chosenId);
    assert.ok(result.switchCount <= 2);
  });

  check('NONE can sit inside a path', () => {
    const result = recommendPentatonicPath({
      tonalCentre: { root: 'C', mode: 'major' },
      depth: 'near',
      events: [
        { id: '1', sourceLabel: '1', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
        { id: '2', sourceLabel: '2', melodyNotes: ['F#'] },
        { id: '2b', sourceLabel: '2b', melodyNotes: ['F#'] },
        { id: '2c', sourceLabel: '2c', melodyNotes: ['F#'] },
        { id: '2d', sourceLabel: '2d', melodyNotes: ['F#'] },
        { id: '3', sourceLabel: '3', melodyNotes: ['C', 'D', 'E', 'G', 'A'] },
      ],
    });
    assert.equal(result.disposition, 'PATH');
    assert.ok(result.noneEventCount >= 1);
  });

  check('profile text names While We\'re Here and not the album as Orbit', () => {
    assert.match(ORBIT_FIXTURE_NOTE, /While We're Here/);
    assert.match(ORBIT_FIXTURE_NOTE, /track 5 Orbit/);
    assert.equal(orbitA.events.length, 9);
    assert.equal(orbitA.events[0]?.sourceLabel, '1');
    assert.equal(orbitB.events[0]?.sourceLabel, '18');
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
console.log(`${rows.length - failed.length}/${rows.length}`);
if (failed.length > 0) process.exit(1);
