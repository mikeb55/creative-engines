/**
 * Black Aura V8B.1 triad-pair generalisation.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhBlackAuraV8b1.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { WwhImportedMeasure, WwhImportedNote } from '../core/wwh/wwhDuoImport';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from '../core/wwh/wwhBlackAuraV8a';
import { inspectV8bParentTriad } from '../core/wwh/wwhBlackAuraV8aVault';
import { buildV8bBundle, reimportV8b, sha256File, V8B_OUT_DIR } from '../core/wwh/wwhBlackAuraV8b';
import { midiOf, soundingFromStringFret, V8B_OPEN_STRING_MIDI } from '../core/wwh/wwhBlackAuraV8bRecipe';
import { buildV8b1Bundle, reimportV8b1, V8B1_OUT_DIR, V8B1_SLOTS, writeV8b1Pilot } from '../core/wwh/wwhBlackAuraV8b1';
import {
  analyzeTriadPair,
  placeTriad,
  realizeTriadPair,
  TRIAD_PAIR_SEARCH,
  validateParentTriad,
  type ParentTriadInput,
} from '../core/wwh/wwhTriadPair';

const V8A_DIR = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V8-PILOT/A';

function tone(note: WwhImportedNote): string {
  if (note.rest) return `R:${note.duration}`;
  return `${note.step}${note.alter ?? 0}${note.octave}:${note.duration}:${note.chord ? 'c' : 'a'}`;
}

function lane(notes: readonly WwhImportedNote[]): string {
  return notes.map(tone).join(',');
}

function rhythm(notes: readonly WwhImportedNote[]): string {
  return notes
    .filter((note) => !note.chord)
    .map((note) => `${note.rest ? 'R' : 'N'}:${note.duration}`)
    .join(',');
}

function fileHashTree(root: string): string {
  if (!fs.existsSync(root)) return 'missing';
  const rows: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) walk(full);
      else rows.push(`${path.relative(root, full)}\t${createHash('sha256').update(fs.readFileSync(full)).digest('hex')}`);
    }
  };
  walk(root);
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

function soundingMidi(note: WwhImportedNote): number {
  return midiOf(note.step!, note.alter ?? 0, note.octave!) - 12;
}

function clusters(measure: WwhImportedMeasure): number[][] {
  const groups: number[][] = [];
  for (const note of measure.notes) {
    if (note.rest) continue;
    if (note.chord) {
      const last = groups[groups.length - 1];
      if (!last) throw new Error('chord tone without attack');
      last.push(soundingMidi(note));
    } else groups.push([soundingMidi(note)]);
  }
  return groups;
}

function triad(partial: ParentTriadInput): ParentTriadInput {
  return partial;
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

  const major = triad({
    rootSpelling: 'C',
    quality: 'major',
    notes: ['C', 'E', 'G'],
    pitchClasses: [0, 4, 7],
    provenance: 'user',
  });
  const minor = triad({
    rootSpelling: 'A',
    quality: 'minor',
    notes: ['A', 'C', 'E'],
    pitchClasses: [9, 0, 4],
    provenance: 'user',
  });
  const augmented = triad({
    rootSpelling: 'C',
    quality: 'augmented',
    notes: ['C', 'E', 'G#'],
    pitchClasses: [0, 4, 8],
    provenance: 'suggested',
  });
  const diminished = triad({
    rootSpelling: 'C',
    quality: 'diminished',
    notes: ['C', 'Eb', 'Gb'],
    pitchClasses: [0, 3, 6],
    provenance: 'Vault',
  });
  const gSharp = triad({
    rootSpelling: 'G#',
    quality: 'major',
    notes: ['G#', 'B#', 'D#'],
    pitchClasses: [8, 0, 3],
    provenance: 'suggested',
  });
  const aFlat = triad({
    id: 'Ab_major',
    rootSpelling: 'Ab',
    quality: 'major',
    notes: ['Ab', 'C', 'Eb'],
    pitchClasses: [8, 0, 3],
    provenance: 'user',
  });
  const gFlatMinor = triad({
    rootSpelling: 'Gb',
    quality: 'minor',
    notes: ['Gb', 'Bbb', 'Db'],
    pitchClasses: [6, 9, 1],
    provenance: 'user',
  });

  check('all four qualities spell root, third and fifth', () => {
    for (const input of [major, minor, augmented, diminished]) {
      const parsed = validateParentTriad(input);
      assert.equal(parsed.quality, input.quality);
      assert.deepEqual(
        parsed.notes.map((note) => note.degree),
        ['root', 'third', 'fifth']
      );
      assert.deepEqual(
        parsed.notes.map((note) => note.spelling),
        [...input.notes]
      );
      assert.deepEqual(parsed.pitchClasses, [...input.pitchClasses]);
    }
    assert.throws(() => validateParentTriad({ ...major, notes: ['C', 'E', 'Ab'], pitchClasses: [0, 4, 8], quality: 'augmented' }), /third plus a fifth/);
    assert.throws(() => validateParentTriad({ ...diminished, notes: ['C', 'D#', 'F#'], pitchClasses: [0, 3, 6] }), /third plus a fifth/);
    assert.throws(() => validateParentTriad({ ...major, pitchClasses: [0, 4, 8] }), /not 8/);
    assert.throws(() => validateParentTriad({ ...major, provenance: 'vault' as 'user' }), /provenance/);
  });

  check('enharmonic spellings and double accidentals stay distinct', () => {
    const sharp = validateParentTriad(gSharp);
    const flat = validateParentTriad(aFlat);
    assert.equal(sharp.notes[1]!.spelling, 'B#');
    assert.equal(flat.notes[0]!.spelling, 'Ab');
    assert.deepEqual(sharp.pitchClasses, flat.pitchClasses);
    const compared = analyzeTriadPair(gSharp, aFlat);
    assert.deepEqual(compared.identicalCommonTones, []);
    assert.equal(compared.enharmonicEquivalents.length, 3);
    assert.ok(compared.advice[0]!.includes('enharmonic'));
    const flatMinor = validateParentTriad(gFlatMinor);
    assert.equal(flatMinor.notes[1]!.spelling, 'Bbb');
    assert.equal(flatMinor.notes[1]!.alter, -2);
    const placed = placeTriad(gSharp);
    const bSharp = placed.find((point) => point.step === 'B' && point.alter === 1);
    assert.ok(bSharp);
    assert.equal(bSharp!.name, 'B#3');
    assert.equal(bSharp!.midi, midiOf('B', 1, 3));
    assert.equal(V8B_OPEN_STRING_MIDI[bSharp!.stringNumber - 1]! + bSharp!.fret, bSharp!.midi);
    const doubleFlat = placeTriad(gFlatMinor).filter((point) => point.alter === -2);
    assert.ok(doubleFlat.length > 0);
    for (const point of doubleFlat) {
      assert.equal(point.name.includes('Bbb'), true);
      assert.equal(midiOf(point.step, point.alter, point.octave), point.midi);
    }
  });

  check('relationship advice is fact, use, caution', () => {
    const disjoint = analyzeTriadPair(
      {
        id: 'D_minor',
        rootSpelling: 'D',
        quality: 'minor',
        notes: ['D', 'F', 'A'],
        pitchClasses: [2, 5, 9],
        provenance: 'user',
      },
      aFlat
    );
    assert.deepEqual(disjoint.sharedPitchClasses, []);
    assert.ok(disjoint.movingCandidates.some((link) => link.from === 'A' && link.to === 'Ab' && link.semitones === -1));
    for (const line of disjoint.advice) assert.equal(line.split(' → ').length, 3);
    const shared = analyzeTriadPair(major, minor);
    assert.deepEqual(shared.identicalCommonTones, ['C', 'E']);
    assert.ok(shared.advice[0]!.includes('C, E'));
    for (const line of shared.advice) assert.equal(line.split(' → ').length, 3);
  });

  const augDimA = realizeTriadPair(augmented, diminished, 80082, V8B1_SLOTS);
  const augDimB = realizeTriadPair(augmented, diminished, 80082, V8B1_SLOTS);
  check('search is deterministic and stays inside the voicing cap', () => {
    assert.equal(JSON.stringify(augDimA.finalists), JSON.stringify(augDimB.finalists));
    assert.equal(augDimA.events.map((event) => event.voicing?.id ?? 'rest').join('|'), augDimB.events.map((event) => event.voicing?.id ?? 'rest').join('|'));
    assert.ok(augDimA.finalists.length === 3);
    assert.ok(augDimA.consideredPerEvent.every((count) => count <= TRIAD_PAIR_SEARCH.maxVoicingsPerEvent));
    assert.ok(augDimA.pathsKeptPerStep.every((count) => count <= TRIAD_PAIR_SEARCH.beamWidth));
    assert.ok(augDimA.pathsKeptPerStep.some((count) => count === TRIAD_PAIR_SEARCH.beamWidth));
    for (const event of augDimA.events) {
      if (!event.voicing) continue;
      assert.ok(event.voicing.stoppedSpan <= 3);
      for (const point of event.voicing.points) {
        assert.ok(point.fret >= 0 && point.fret <= 7);
        assert.equal(V8B_OPEN_STRING_MIDI[point.stringNumber - 1]! + point.fret, point.midi);
        assert.equal(midiOf(point.step, point.alter, point.octave), point.midi);
      }
    }
    const heldC = augDimA.movements.some((move) => move.held.some((point) => point.name.startsWith('C')));
    assert.equal(heldC, true);
  });

  const sourceBefore = sha256File(V8A_DUO_FILE);
  const v8aBefore = fileHashTree(V8A_DIR);
  const v8bBefore = fileHashTree(V8B_OUT_DIR);
  const bundle = buildV8b1Bundle();
  const again = buildV8b1Bundle();
  const written = writeV8b1Pilot(V8B1_OUT_DIR, bundle);
  const { index } = loadBlackAuraIndex();
  const baselineExtract = reimportV8b(buildV8bBundle().scores.extract);
  const dmExtract = reimportV8b1(fs.readFileSync(path.join(V8B1_OUT_DIR, 'V8B1-EXTRACT-D-minor-Ab-major.musicxml'), 'utf8'));
  const dmDuo = reimportV8b1(fs.readFileSync(path.join(V8B1_OUT_DIR, 'V8B1-DUO-D-minor-Ab-major.musicxml'), 'utf8'));
  const amExtract = reimportV8b1(fs.readFileSync(path.join(V8B1_OUT_DIR, 'V8B1-EXTRACT-C-major-A-minor.musicxml'), 'utf8'));
  const amDuo = reimportV8b1(fs.readFileSync(path.join(V8B1_OUT_DIR, 'V8B1-DUO-C-major-A-minor.musicxml'), 'utf8'));

  check('D minor / Ab major extract matches the approved V8B notes', () => {
    assert.equal(bundle.contrasting.writtenFrom, 'approved-v8b-baseline');
    assert.equal(dmExtract.guitar.measures.length, 4);
    for (let bar = 0; bar < 4; bar += 1) {
      assert.equal(lane(dmExtract.guitar.measures[bar]!.notes), lane(baselineExtract.guitar.measures[bar]!.notes));
      assert.equal(lane(dmExtract.bass.measures[bar]!.notes), lane(baselineExtract.bass.measures[bar]!.notes));
    }
    assert.notEqual(
      bundle.contrasting.realization.finalists[0]!.attacks.join('|'),
      bundle.baseline.sounding.map((bar) => bar.join(' · ')).join('|')
    );
  });

  check('C major / A minor keeps a registered C or E and is different music', () => {
    const attacks = bundle.sharedTone.realization.finalists[0]!.attacks;
    assert.notEqual(attacks[0], attacks[1]);
    assert.match(attacks[0] ?? '', /C4/);
    assert.match(attacks[0] ?? '', /G4/);
    assert.match(attacks[1] ?? '', /C4/);
    assert.match(attacks[1] ?? '', /A4/);
    const moves = bundle.sharedTone.realization.movements.filter((move) => move.held.length > 0 && move.moved.length === 1);
    assert.ok(moves.length > 0);
    assert.ok(moves.some((move) => move.held.some((point) => point.name === 'C4' || point.name === 'E4')));
    assert.ok(moves.some((move) => Math.abs(move.moved[0]!.semitones) === 1 || Math.abs(move.moved[0]!.semitones) === 2));
    const dmPitches = dmExtract.guitar.measures.flatMap(clusters).map((group) => group.join('+')).join('|');
    const amPitches = amExtract.guitar.measures.flatMap(clusters).map((group) => group.join('+')).join('|');
    assert.notEqual(dmPitches, amPitches);
    const amGroups = amExtract.guitar.measures.flatMap(clusters);
    assert.ok(amGroups.some((group) => group.includes(60) && group.includes(64)));
    assert.equal(bundle.sharedTone.realization.finalists.length, 3);
    assert.equal(JSON.stringify(bundle.sharedTone.realization.finalists), JSON.stringify(again.sharedTone.realization.finalists));
  });

  check('string, fret and grip limits match sounding pitch', () => {
    assert.equal(soundingFromStringFret(1, 0).midi, 64);
    for (const event of bundle.sharedTone.realization.events) {
      if (!event.voicing) continue;
      assert.ok(event.voicing.stoppedSpan <= 3);
      const strings = new Set<number>();
      for (const point of event.voicing.points) {
        strings.add(point.stringNumber);
        const sounded = V8B_OPEN_STRING_MIDI[point.stringNumber - 1]! + point.fret;
        assert.equal(sounded, point.midi);
        assert.equal(midiOf(point.step, point.alter, point.octave), point.midi);
        const written = amExtract.guitar.measures.flatMap((measure) => measure.notes).find((note) => !note.rest && note.step === point.step && (note.alter ?? 0) === point.alter && note.octave === point.octave + 1);
        assert.ok(written, point.name);
      }
      assert.equal(strings.size, event.voicing.points.length);
    }
    assert.equal(bundle.sharedTone.scores.extract.includes('<technical>'), false);
    assert.equal(bundle.sharedTone.scores.extract.toLowerCase().includes('tab'), false);
  });

  check('both extracts reimport with the source rhythm and legal bars', () => {
    for (const extract of [dmExtract, amExtract]) {
      assert.equal(extract.guitar.measures.length, 4);
      assert.equal(extract.bass.measures.length, 4);
      for (let bar = 0; bar < 4; bar += 1) {
        assert.equal(rhythm(extract.guitar.measures[bar]!.notes), rhythm(dmExtract.guitar.measures[bar]!.notes));
        const ticks = extract.guitar.measures[bar]!.notes.filter((note) => !note.chord).reduce((sum, note) => sum + note.duration, 0);
        assert.equal(ticks, 1024);
        assert.equal(extract.guitar.measures[bar]!.beats, 4);
        assert.equal(extract.guitar.measures[bar]!.transposeOctave, -1);
        const attacks = extract.guitar.measures[bar]!.notes.filter((note) => !note.rest && !note.chord).length;
        assert.ok(attacks <= 4 && attacks >= 1);
      }
    }
  });

  check('source events outside the insert stay in both duos', () => {
    for (const duo of [dmDuo, amDuo]) {
      assert.equal(duo.guitar.measures.length, index.measures.length + V8A_WINDOW.bars);
      const head = V8A_WINDOW.returnOrder;
      const tailStart = head + V8A_WINDOW.bars;
      for (let order = 0; order < head; order += 1) {
        assert.equal(lane(duo.guitar.measures[order]!.notes), lane(index.measures[order]!.guitar.notes));
        assert.equal(lane(duo.bass.measures[order]!.notes), lane(index.measures[order]!.bass.notes));
        assert.deepEqual(duo.guitar.measures[order]!.harmony, index.measures[order]!.guitar.harmony);
      }
      for (let order = V8A_WINDOW.returnOrder; order < index.measures.length; order += 1) {
        const out = tailStart + (order - V8A_WINDOW.returnOrder);
        assert.equal(lane(duo.guitar.measures[out]!.notes), lane(index.measures[order]!.guitar.notes));
        assert.equal(lane(duo.bass.measures[out]!.notes), lane(index.measures[order]!.bass.notes));
        assert.deepEqual(duo.guitar.measures[out]!.harmony, index.measures[order]!.guitar.harmony);
      }
      for (const measure of duo.guitar.measures.slice(head, tailStart)) assert.deepEqual(measure.harmony, []);
    }
  });

  check('V8A, V8B and the source file stay untouched', () => {
    assert.equal(sha256File(V8A_DUO_FILE), sourceBefore);
    assert.equal(fileHashTree(V8A_DIR), v8aBefore);
    assert.equal(fileHashTree(V8B_OUT_DIR), v8bBefore);
    assert.equal(inspectV8bParentTriad().status, 'BLOCKED');
    assert.equal(bundle.vaultStillBlocked, true);
    assert.equal(written.length, 7);
    assert.equal(bundle.sharedTone.realization.humanPlayability, 'NOT VERIFIED');
  });

  return rows;
}

const rows = run();
const failed = rows.filter((row) => !row.ok);
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
if (failed.length) {
  console.error(`${failed.length} failed`);
  process.exit(1);
}
console.log(`${rows.length} passed`);
