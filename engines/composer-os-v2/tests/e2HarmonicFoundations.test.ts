/**
 * E2 B — polychords, triad pairs, dyad pairs.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/e2HarmonicFoundations.test.ts
 */
import assert from 'node:assert/strict';
import { formatRational } from '../core/bhl/bhlEvidence';
import {
  contraryDyad,
  describeTriadPair,
  dyadPair,
  dyadParent,
  harmonicReceipt,
  invertDyad,
  polychord,
  realiseAlternateBar,
  realiseSimultaneous,
  realiseSuperpose,
  receiptDigest,
  sameInterval,
  transformPolychordParent,
  transformTriadParent,
  transposeDyad,
  triadPair,
  triadParent,
} from '../core/orchestrate/harmonicColour';

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

const cMajor = () => triadParent('Cmaj', 'major', ['C', 'E', 'G'], ['C4', 'E4', 'G4']);
const dMajor = () => triadParent('Dmaj', 'major', ['D', 'F#', 'A'], ['D4', 'F#4', 'A4']);
const aMinor = () => triadParent('Amin', 'minor', ['A', 'C', 'E'], ['A4', 'C5', 'E5']);
const lowerC = () => triadParent('lower-C', 'major', ['C', 'E', 'G'], ['C3', 'E3', 'G3'], [48, 59]);
const upperD = () => triadParent('upper-D', 'major', ['D', 'F#', 'A'], ['D4', 'F#4', 'A4'], [60, 72]);

check('B1 C major / D major is a six-note union with empty intersection', () => {
  const facts = describeTriadPair(cMajor(), dMajor());
  assert.deepEqual(facts.union, [0, 2, 4, 6, 7, 9]);
  assert.deepEqual(facts.intersection, []);
  assert.equal(facts.sixNoteUnion, true);
  assert.equal(facts.disjoint, true);
  assert.deepEqual(facts.parentIds, ['Cmaj', 'Dmaj']);
});

check('B2 C major / A minor overlaps and is not a six-note union', () => {
  const facts = describeTriadPair(cMajor(), aMinor());
  assert.deepEqual(facts.union, [0, 4, 7, 9]);
  assert.deepEqual(facts.intersection, [0, 4]);
  assert.equal(facts.sixNoteUnion, false);
  assert.equal(facts.disjoint, false);
});

check('B3 polychord sounds six notes and a slash collection does not satisfy it', () => {
  const attacks = realiseSimultaneous(polychord('CD', upperD(), lowerC()));
  assert.equal(attacks.length, 6);
  assert.deepEqual(attacks.map((attack) => attack.pitch.midi), [48, 52, 55, 62, 66, 69]);
  assert.ok(attacks.every((attack) => attack.members.length === 1));
  const slash = attacks.filter((attack) => attack.members[0]?.parentId === 'upper-D' || attack.pitch.midi === 48);
  assert.notEqual(slash.length, 6);
  const shared = realiseSuperpose(
    triadParent('Cshare', 'major', ['C', 'E', 'G'], ['C4', 'E4', 'G4']),
    triadParent('Ashare', 'minor', ['A', 'C', 'E'], ['A3', 'C4', 'E4']),
  );
  assert.equal(shared.length, 4);
  assert.equal(shared.find((attack) => attack.pitch.midi === 60)?.members.length, 2);
});

check('B4 P on the upper parent leaves locked C major alone', () => {
  const intent = polychord('CD', upperD(), lowerC());
  const transformed = transformPolychordParent(intent, 'upper', 'P');
  assert.equal(transformed.ok, true);
  if (!transformed.ok) return;
  const upper = transformed.intent.upper.voices.map((voice) => [voice.pitch.step, voice.pitch.alter, voice.pitch.octave]);
  assert.deepEqual(upper, [['D', 0, 4], ['F', 0, 4], ['A', 0, 4]]);
  assert.deepEqual(transformed.intent.lower.voices.map((voice) => voice.pitch.midi), [48, 52, 55]);
  assert.equal(transformed.attacks.length, 6);
  assert.equal(transformed.attacks.find((attack) => attack.members[0]?.parentId === 'upper-D' && attack.members[0]?.memberId === 'third')?.pitch.midi, 65);
});

check('B5 alternating members keep A/A/A/B/B/B ownership', () => {
  const intent = triadPair('alt', cMajor(), dMajor(), 'alternate');
  const attacks = realiseAlternateBar(intent);
  const notes = attacks.filter((attack) => !attack.rest);
  const rests = attacks.filter((attack) => attack.rest);
  assert.deepEqual(notes.map((attack) => attack.members[0]?.parentId), ['Cmaj', 'Cmaj', 'Cmaj', 'Dmaj', 'Dmaj', 'Dmaj']);
  assert.deepEqual(notes.map((attack) => formatRational(attack.onset)), ['0', '1/2', '1', '2', '5/2', '3']);
  assert.deepEqual(rests.map((attack) => formatRational(attack.onset)), ['3/2', '7/2']);
  assert.ok(notes.every((attack) => formatRational(attack.duration) === '1/2'));
});

check('B6 dyads keep a directed +5 under transposition and distinct ids', () => {
  const a = dyadParent('dyad-A', 'C4', 'F4');
  const b = dyadParent('dyad-B', 'D4', 'G4');
  const pair = dyadPair('fourths', a, b, 'alternate');
  assert.equal(pair.kind, 'dyad-pair');
  assert.equal(a.interval.directedSemitones, 5);
  assert.equal(b.interval.directedSemitones, 5);
  const moved = transposeDyad(a, 2);
  assert.ok(!('ok' in moved));
  if ('ok' in moved) return;
  assert.equal(moved.id, 'dyad-A');
  assert.equal(moved.members[0].pitch.step, 'D');
  assert.equal(moved.members[1].pitch.step, 'G');
  assert.equal(sameInterval(a, moved, 'directed-semitone'), true);
});

check('B7 inverted F4–C5 is not the original ordered interval', () => {
  const a = dyadParent('dyad-A', 'C4', 'F4');
  const inverted = invertDyad(a);
  assert.equal(inverted.members[0].pitch.midi, 65);
  assert.equal(inverted.members[1].pitch.midi, 72);
  assert.equal(inverted.interval.directedSemitones, 7);
  assert.equal(inverted.interval.intervalClass, 5);
  assert.equal(a.interval.intervalClass, 5);
  assert.equal(sameInterval(a, inverted, 'interval-class'), true);
  assert.equal(sameInterval(a, inverted, 'directed-semitone'), false);
});

check('B8 C–F# and C–Gb are the same semitone span and different spellings', () => {
  const sharp = dyadParent('sharp', 'C4', 'F#4');
  const flat = dyadParent('flat', 'C4', 'Gb4');
  assert.equal(sharp.interval.directedSemitones, 6);
  assert.equal(flat.interval.directedSemitones, 6);
  assert.equal(sameInterval(sharp, flat, 'directed-semitone'), true);
  assert.equal(sameInterval(sharp, flat, 'spelling'), false);
  assert.equal(sharp.interval.directedDiatonicSteps, 3);
  assert.equal(flat.interval.directedDiatonicSteps, 4);
});

check('B9 replay is deterministic and infeasible cases are refused', () => {
  const intent = polychord('CD', upperD(), lowerC());
  const once = transformPolychordParent(intent, 'upper', 'P');
  const twice = transformPolychordParent(intent, 'upper', 'P');
  assert.equal(once.ok && twice.ok, true);
  if (!once.ok || !twice.ok) return;
  const left = receiptDigest(harmonicReceipt(once.intent, once.attacks, 7, 'triad-P'));
  const right = receiptDigest(harmonicReceipt(twice.intent, twice.attacks, 7, 'triad-P'));
  assert.equal(left, right);
  const augmented = triadParent('Caug', 'augmented', ['C', 'E', 'G#'], ['C4', 'E4', 'G#4']);
  const refused = transformTriadParent(augmented, 'P');
  assert.equal(refused.ok, false);
  const contrary = contraryDyad(dyadParent('dyad-A', 'C4', 'F4'), 1, true);
  assert.equal('ok' in contrary && contrary.ok === false, true);
  assert.throws(() => triadParent('low-D', 'major', ['D', 'F#', 'A'], ['D3', 'F#3', 'A3'], [60, 72]));
});

if (failed) {
  console.error(`FAIL ${failed}`);
  process.exit(1);
}
console.log('E2 harmonic foundations PASS');
