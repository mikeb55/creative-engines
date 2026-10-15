/**
 * Phase 2B.1 — readable spelling for all 20 colours × 12 centres.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicSpellingRepair.test.ts
 */
import assert from 'node:assert/strict';
import { listPentatonicColourResources } from '../core/pentatonic/colourRegistry';
import { getPentatonicArchetype } from '../core/pentatonic/registry';
import { explicitSpelling, exportGuitarMusicXml } from '../core/pentatonic/practiceFacade';
import {
  PENTATONIC_NOTE_CHOICES,
  accidentalDelta,
  mod12,
  parseNoteToken,
  spellFromReference,
} from '../core/pentatonic/pitch';

const LOCKED_INTERVALS: Record<string, readonly number[]> = {
  major_pentatonic: [0, 2, 4, 7, 9],
  minor_pentatonic: [0, 3, 5, 7, 10],
  suspended_pentatonic: [0, 2, 5, 7, 10],
  open_pentatonic: [0, 2, 5, 7, 9],
  minor_sixth_pentatonic: [0, 3, 5, 8, 10],
  mixolydian_pentatonic: [0, 2, 4, 7, 10],
  dorian_pentatonic: [0, 2, 3, 7, 10],
  aeolian_pentatonic: [0, 3, 5, 7, 8],
  kumoi: [0, 2, 3, 7, 9],
  hirajoshi: [0, 2, 3, 7, 8],
  insen: [0, 1, 5, 7, 10],
  iwato: [0, 1, 5, 6, 10],
  phrygian_pentatonic: [0, 1, 3, 7, 8],
  lydian_pentatonic: [0, 2, 4, 6, 9],
  whole_tone_pentachord: [0, 2, 4, 6, 8],
  blue_pentatonic: [0, 3, 5, 6, 10],
  ambiguous_third: [0, 3, 4, 7, 10],
  leading_major: [0, 2, 4, 7, 11],
  leading_minor: [0, 3, 5, 7, 11],
  remote_altered: [0, 1, 4, 6, 10],
};

function accidentalCount(token: string): number {
  return (token.match(/[#b]/g) ?? []).length;
}

const resources = listPentatonicColourResources();
assert.equal(resources.length, 20);
assert.deepEqual(
  resources.map((item) => item.id),
  Object.keys(LOCKED_INTERVALS)
);

assert.equal(accidentalDelta(0, 11), 1);

let cases = 0;
for (const resource of resources) {
  assert.deepEqual(resource.intervals, LOCKED_INTERVALS[resource.id], resource.id);
  for (const centre of PENTATONIC_NOTE_CHOICES) {
    cases += 1;
    const reference = parseNoteToken(centre);
    assert.ok(reference, centre);
    const spelled = spellFromReference(centre, resource.intervals, resource.letterSteps);
    assert.equal(spelled.length, resource.intervals.length, `${resource.id} ${centre}`);
    spelled.forEach((token, index) => {
      assert.ok(accidentalCount(token) <= 2, `${resource.id} ${centre} ${token}`);
      assert.equal(/[#b]{3,}/.test(token), false, token);
      const parsed = parseNoteToken(token);
      assert.ok(parsed, `${resource.id} ${centre} unparsed ${token}`);
      assert.equal(parsed.pc, mod12(reference.pc + resource.intervals[index]!), `${resource.id} ${centre} ${token}`);
      const xml = explicitSpelling(token);
      assert.ok(xml, token);
      assert.equal(xml.step, parsed.letter);
      assert.equal(xml.alter, accidentalCount(token) === 0 ? 0 : token.includes('b') ? -accidentalCount(token) : accidentalCount(token));
      assert.ok(xml.alter >= -2 && xml.alter <= 2);
    });
  }
}
assert.equal(cases, 240);

const minor = getPentatonicArchetype('minor_pentatonic')!;
const major = getPentatonicArchetype('major_pentatonic')!;
assert.deepEqual(spellFromReference('A', minor.intervals, minor.letterSteps), ['A', 'C', 'D', 'E', 'G']);
assert.deepEqual(spellFromReference('F#', minor.intervals, minor.letterSteps), ['F#', 'A', 'B', 'C#', 'E']);
assert.deepEqual(spellFromReference('Bb', minor.intervals, minor.letterSteps), ['Bb', 'Db', 'Eb', 'F', 'Ab']);
assert.deepEqual(spellFromReference('F', minor.intervals, minor.letterSteps), ['F', 'Ab', 'Bb', 'C', 'Eb']);
assert.deepEqual(spellFromReference('E', major.intervals, major.letterSteps), ['E', 'F#', 'G#', 'B', 'C#']);

const lydian = resources.find((item) => item.id === 'lydian_pentatonic')!;
const whole = resources.find((item) => item.id === 'whole_tone_pentachord')!;
const leadMajor = resources.find((item) => item.id === 'leading_major')!;
const leadMinor = resources.find((item) => item.id === 'leading_minor')!;
const insen = resources.find((item) => item.id === 'insen')!;
assert.deepEqual(spellFromReference('F#', lydian.intervals, lydian.letterSteps), ['F#', 'G#', 'A#', 'B#', 'D#']);
assert.deepEqual(spellFromReference('E', whole.intervals, whole.letterSteps), ['E', 'F#', 'G#', 'A#', 'B#']);
assert.deepEqual(spellFromReference('F#', whole.intervals, whole.letterSteps), ['F#', 'G#', 'A#', 'B#', 'C##']);
assert.deepEqual(spellFromReference('C#', leadMajor.intervals, leadMajor.letterSteps), ['C#', 'D#', 'E#', 'G#', 'B#']);
assert.deepEqual(spellFromReference('C#', leadMinor.intervals, leadMinor.letterSteps), ['C#', 'E', 'F#', 'G#', 'B#']);
assert.ok(spellFromReference('Ab', insen.intervals, insen.letterSteps).includes('Bbb'));
assert.ok(spellFromReference('C#', lydian.intervals, lydian.letterSteps).includes('F##'));

const repaired = exportGuitarMusicXml({
  title: 'F# lydian pentatonic',
  chord: 'N.C.',
  bars: [[66, 68, 70, 72, 75]],
  pitchClassSpelling: { 6: 'F#', 8: 'G#', 10: 'A#', 0: 'B#', 3: 'D#' },
});
assert.match(repaired, /<step>B<\/step><alter>1<\/alter>/);
assert.equal(repaired.includes('bbbb'), false);

console.log('pentatonicSpellingRepair: 240 collections passed');
