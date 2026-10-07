/**
 * Pentatonic Engine Dev 4B — sparse generation pilot.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicDev4b.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { pentatonicFrozenConfigFingerprint } from '../core/pentatonic/frozenConfigFingerprint';
import { listPentatonicArchetypes } from '../core/pentatonic/registry';
import { mapMotifPitches, type PentatonicCollectionView } from '../core/pentatonic/motifTransform';
import {
  DEV4B_DEFAULT_MOTIF_METHOD,
  DEV4B_PHRASE_INTENT,
  antiScaleRun,
  runDev4b,
} from '../core/pentatonic/dev4bSparseGeneration';

const ALBUM = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS';
const SOURCES = [
  '07-Impossible-Metaphysics-Duo-Leadsheet-V1.1.musicxml',
  '03-The-Mirror-Duo-Leadsheet-V1.0.musicxml',
  '09-After-Everything-Duo-Leadsheet-V1.0.musicxml',
] as const;

const C_MAJOR: PentatonicCollectionView = {
  name: 'C Major Pentatonic',
  archetypeId: 'major_pentatonic',
  referenceNote: 'C',
  homeRelationshipLabel: null,
};

function sha(file: string): string {
  return createHash('sha256').update(fs.readFileSync(`${ALBUM}/${file}`)).digest('hex');
}

const before = Object.fromEntries(SOURCES.map((file) => [file, sha(file)]));
const run = runDev4b();

assert.equal(pentatonicFrozenConfigFingerprint(), 'cca0456e61a2a14e06f4aa14af0ae4bff902a46baa18ced000aec9ab146c91e6');
assert.equal(run.fingerprint, pentatonicFrozenConfigFingerprint());
assert.equal(DEV4B_DEFAULT_MOTIF_METHOD, 'M-DEG');
assert.equal(listPentatonicArchetypes().length, 2);
assert.deepEqual(DEV4B_PHRASE_INTENT, {
  MOTIF: 'guitar_lead',
  LYRICAL_ANSWER: 'answer_guitar',
  COUNTERLINE: 'development',
  COMPING_FRAGMENT: 'bass_lead',
});

assert.equal(antiScaleRun([60, 64, 67], C_MAJOR).status, 'clear');
assert.equal(antiScaleRun([60, 62], C_MAJOR).status, 'clear');
assert.equal(antiScaleRun([60, 62, 64, 67, 69], C_MAJOR).status, 'reject');

const near = mapMotifPitches({
  motif: { id: 't', barCount: 1, notes: [{ pitch: 64, startBeat: 0, duration: 1 }] },
  rhythm: [{ kind: 'note', startBeat: 0, duration: 1 }],
  source: C_MAJOR,
  target: { ...C_MAJOR, name: 'D Major Pentatonic', referenceNote: 'D' },
  method: 'M-NEAR',
  meter: { beats: 4, beatType: 4 },
});
assert.equal(near.method, 'M-NEAR');

assert.equal(run.pieces.length, 3);
for (const piece of run.pieces) {
  assert.equal(piece.sourceSha256, before[piece.piece.file]);
  assert.equal(run.sourceHashesAfter[piece.piece.file], before[piece.piece.file]);
  assert.ok(piece.pool.some((candidate) => candidate.purpose === 'NO_PHRASE'));
  assert.ok(piece.selected.length >= 1 && piece.selected.length <= 3);
  assert.ok(piece.context.receiptKind === 'dev4b-colour-field');
  assert.notEqual(piece.region.collectionName, 'NONE');
  for (const candidate of piece.selected) {
    if (candidate.purpose !== 'NO_PHRASE') assert.equal(candidate.method, 'M-DEG');
    assert.notEqual(candidate.diagnostics.antiScaleRun.status, 'reject');
  }
  assert.equal(piece.auditions.length, piece.selected.length);
  for (const audition of piece.auditions) {
    assert.equal(audition.valid, true, audition.errors.join('; '));
    const xml = fs.readFileSync(audition.filePath, 'utf8');
    assert.match(xml, /PENTATONIC DEV4B/);
    assert.match(xml, /PURPOSE:/);
  }
}

const impossible = run.pieces[0]!;
const mirror = run.pieces[1]!;
const after = run.pieces[2]!;
assert.equal(impossible.region.firstBar, 5);
assert.equal(impossible.region.lastBar, 6);
assert.equal(mirror.region.firstBar, 54);
assert.equal(mirror.region.lastBar, 55);
assert.equal(after.region.firstBar, 13);
assert.equal(after.region.lastBar, 15);
assert.ok(after.selected.some((candidate) => candidate.purpose === 'NO_PHRASE'));
assert.ok(fs.existsSync(run.reportPath));

console.log('pentatonicDev4b ok');
for (const piece of run.pieces) {
  console.log(
    piece.piece.title,
    `mm. ${piece.region.firstBar}-${piece.region.lastBar}`,
    piece.region.collectionName,
    piece.selected.map((candidate) => `${candidate.selectedLetter}:${candidate.purpose}:${candidate.activity}:${candidate.gce.finalScore ?? 'n/a'}`).join(' ')
  );
}
