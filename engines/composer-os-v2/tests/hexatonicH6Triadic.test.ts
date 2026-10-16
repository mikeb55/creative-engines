/**
 * H6-C1 — consonant triadic transformations.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/hexatonicH6Triadic.test.ts
 */
import assert from 'node:assert/strict';
import { BHL_WORLD_IDS } from '../core/bhl/bhlWorlds';
import {
  CORE_CANDIDATES,
  HEXATONIC_REGISTRY_VERSION,
  applyTriadicTransformation,
  applyTriadicWord,
  commonToneNeighbours,
  consonantTriad,
  listHexatonicScalars,
  listHexatonicWpsPairs,
  matchCataloguePair,
  minimumMotionPath,
  namedNeighbours,
  shortPlrPath,
  triadMotionAuditionMusicXml,
  validateHexatonicProject,
  type SpelledConsonantTriad,
  type TriadicOperation,
} from '../core/hexatonic';
import { listPentatonicColourResources } from '../core/pentatonic';

const C: SpelledConsonantTriad = consonantTriad({ quality: 'major', notes: ['C', 'E', 'G'] }) as SpelledConsonantTriad;
assert.equal('ok' in C, false);

function applied(operation: TriadicOperation) {
  const step = applyTriadicTransformation(C, operation);
  assert.equal(step.ok, true);
  if (!step.ok) throw new Error('step');
  return step;
}

const expectNotes: Record<TriadicOperation, string> = {
  P: 'C Eb G',
  L: 'E G B',
  R: 'A C E',
  H: 'Ab Cb Eb',
  N: 'F Ab C',
  S: 'C# E G#',
};
const expectShared: Record<TriadicOperation, number> = { P: 2, L: 2, R: 2, H: 0, N: 1, S: 1 };
const expectMotion: Record<TriadicOperation, number> = { P: 1, L: 1, R: 2, H: 3, N: 2, S: 2 };

for (const operation of ['P', 'L', 'R', 'H', 'N', 'S'] as const) {
  const step = applied(operation);
  assert.equal(step.target.notes.join(' '), expectNotes[operation], operation);
  assert.equal(step.sharedPitchClasses.length, expectShared[operation], operation);
  assert.equal(step.voiceLeading, expectMotion[operation], operation);
  assert.equal(step.group, operation === 'P' || operation === 'L' || operation === 'R' ? 'PLR' : 'named');
  assert.deepEqual(step.inversions.map((row) => row.figure), ['5/3', '6/3', '6/4']);
  const back = applyTriadicTransformation(step.target, operation);
  assert.equal(back.ok, true, `${operation} ${back.ok ? '' : back.reason} from ${step.target.notes.join(' ')}`);
  if (!back.ok) throw new Error('inverse');
  assert.equal(back.target.quality, 'major');
  assert.equal(back.target.rootPc, 0);
  assert.equal(back.target.notes.join(' '), 'C E G');
}

const sharp = applyTriadicTransformation({ quality: 'major', notes: ['C#', 'E#', 'G#'] }, 'P');
assert.equal(sharp.ok && sharp.target.notes.join(' '), 'C# E G#');
const flat = applyTriadicTransformation({ quality: 'major', notes: ['Db', 'F', 'Ab'] }, 'P');
assert.equal(flat.ok && flat.target.notes.join(' '), 'Db Fb Ab');

const all: SpelledConsonantTriad[] = [];
for (const quality of ['major', 'minor'] as const) {
  for (let rootPc = 0; rootPc < 12; rootPc += 1) {
    const triad = consonantTriad({ quality, rootPc });
    assert.equal('ok' in triad, false);
    all.push(triad as SpelledConsonantTriad);
  }
}
assert.equal(all.length, 24);

let commuting = 0;
let distinctWords = 0;
for (const triad of all) {
  for (const operation of ['P', 'L', 'R', 'H', 'N', 'S'] as const) {
    const once = applyTriadicTransformation(triad, operation);
    assert.equal(once.ok, true);
    if (!once.ok) continue;
    const twice = applyTriadicTransformation(once.target, operation);
    assert.equal(twice.ok && twice.target.rootPc, triad.rootPc);
    assert.equal(twice.ok && twice.target.quality, triad.quality);
  }
  const pl = applyTriadicWord(triad, ['P', 'L']);
  const lp = applyTriadicWord(triad, ['L', 'P']);
  assert.equal(pl.ok && lp.ok, true);
  if (pl.ok && lp.ok && 'target' in pl && 'target' in lp) {
    if (pl.target.rootPc === lp.target.rootPc && pl.target.quality === lp.target.quality) commuting += 1;
    else distinctWords += 1;
  }
  const h = applyTriadicTransformation(triad, 'H');
  const plp = applyTriadicWord(triad, ['P', 'L', 'P']);
  const lpl = applyTriadicWord(triad, ['L', 'P', 'L']);
  const n = applyTriadicTransformation(triad, 'N');
  const rlp = applyTriadicWord(triad, ['R', 'L', 'P']);
  const lrp = applyTriadicWord(triad, ['L', 'R', 'P']);
  const s = applyTriadicTransformation(triad, 'S');
  const lpr = applyTriadicWord(triad, ['L', 'P', 'R']);
  assert.equal(h.ok && plp.ok && lpl.ok && n.ok && rlp.ok && lrp.ok && s.ok && lpr.ok, true);
  if (h.ok && plp.ok && 'target' in plp && lpl.ok && 'target' in lpl) {
    assert.equal(plp.target.rootPc, h.target.rootPc);
    assert.equal(plp.target.quality, h.target.quality);
    assert.equal(lpl.target.rootPc, h.target.rootPc);
    assert.equal(lpl.target.quality, h.target.quality);
  }
  if (n.ok && rlp.ok && 'target' in rlp && lrp.ok && 'target' in lrp) {
    assert.equal(rlp.target.rootPc, n.target.rootPc);
    assert.equal(rlp.target.quality, n.target.quality);
    assert.notEqual(`${lrp.target.quality}:${lrp.target.rootPc}`, `${n.target.quality}:${n.target.rootPc}`);
  }
  if (s.ok && lpr.ok && 'target' in lpr) {
    assert.equal(lpr.target.rootPc, s.target.rootPc);
    assert.equal(lpr.target.quality, s.target.quality);
  }
}
assert.ok(distinctWords > 0);
assert.ok(commuting < all.length);

const plr = shortPlrPath(C, { quality: 'minor', notes: ['Ab', 'Cb', 'Eb'] });
assert.equal('ok' in plr, false);
if (!('ok' in plr)) {
  assert.deepEqual(plr.operations, ['P', 'L', 'P']);
  assert.ok(plr.operations.every((operation) => operation === 'P' || operation === 'L' || operation === 'R'));
  assert.notEqual(plr.operations.join(''), 'H');
}
const direct = minimumMotionPath(C, { quality: 'minor', notes: ['Ab', 'Cb', 'Eb'] });
assert.equal('ok' in direct, false);
if (!('ok' in direct)) assert.deepEqual(direct.operations, ['H']);

const neighbours = namedNeighbours(C);
assert.ok(Array.isArray(neighbours));
if (Array.isArray(neighbours)) {
  assert.equal(neighbours.length, 6);
  assert.equal(new Set(neighbours.map((row) => `${row.target.quality}:${row.target.rootPc}`)).size, 6);
}
const tones = commonToneNeighbours(C);
assert.ok(Array.isArray(tones));
if (Array.isArray(tones)) {
  assert.ok(tones.length > 0);
  assert.ok(tones.every((row) => row.sharedPitchClasses.length >= 1));
  assert.ok(tones.every((row) => row.operation === null));
}

assert.equal(applyTriadicTransformation({ quality: 'diminished', rootPc: 0 }, 'P').ok, false);
assert.equal(applyTriadicTransformation({ quality: 'augmented', rootPc: 0 }, 'L').ok, false);
assert.equal(applyTriadicTransformation({ quality: 'major', notes: ['C', 'Eb', 'G'] }, 'P').ok, false);
assert.match(applyTriadicTransformation({ quality: 'diminished', notes: ['C', 'Eb', 'Gb'] }, 'R').ok ? '' : 'refused', /refused/);

const xml = triadMotionAuditionMusicXml(['C', 'E', 'G'], ['C', 'Eb', 'G'], 'P');
assert.match(xml, /<note>/);
assert.doesNotMatch(xml, /<staff-type>\s*tab\s*<\/staff-type>/i);
assert.match(xml, /Electric Guitar/);

assert.deepEqual([...BHL_WORLD_IDS], ['A', 'B', 'C', 'D', 'E', 'F']);
assert.equal(listHexatonicScalars().length, 11);
assert.equal(listHexatonicWpsPairs().length, 16);
assert.equal(CORE_CANDIDATES.length, 12);
assert.equal(HEXATONIC_REGISTRY_VERSION, 'hexatonic-registry-h2.0');
assert.equal(listPentatonicColourResources().length, 20);
assert.equal(validateHexatonicProject({ format: 'hexatonic-laboratory-review', version: 1 }).ok, false);

const self = matchCataloguePair([0, 3, 7], [1, 4, 8]);
assert.equal(self?.family, 'provisional');
assert.equal(self?.id, 'cm-dbm');
assert.equal(self?.referencePc, 0);

console.log('hexatonicH6Triadic: PASS');
