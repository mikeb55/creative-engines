/**
 * Black Aura V8B liquid harmony.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhBlackAuraV8b.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { WwhImportedMeasure, WwhImportedNote } from '../core/wwh/wwhDuoImport';
import { pitchFingerprint } from '../core/wwh/wwhDuoImport';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from '../core/wwh/wwhBlackAuraV8a';
import { inspectV8bParentTriad } from '../core/wwh/wwhBlackAuraV8aVault';
import { buildV8bBundle, reimportV8b, sha256File, V8B_OUT_DIR, writeV8bPilot } from '../core/wwh/wwhBlackAuraV8b';
import {
  midiOf,
  soundingFromStringFret,
  stoppedSpan,
  V8B_GRIPS,
  V8B_OPEN_STRING_MIDI,
  V8B_PARENTS,
  V8B_VOICE_MOVEMENTS,
} from '../core/wwh/wwhBlackAuraV8bRecipe';

const V8A_DIR = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V8-PILOT/A';
const MOCKUPS = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS';

function tone(note: WwhImportedNote): string {
  if (note.rest) return `R:${note.duration}`;
  return `${note.step}${note.alter ?? 0}${note.octave}:${note.duration}:${note.chord ? 'c' : 'a'}`;
}

function lane(notes: readonly WwhImportedNote[]): string {
  return notes.map(tone).join(',');
}

function fileHashTree(root: string): string {
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
    } else {
      groups.push([soundingMidi(note)]);
    }
  }
  return groups;
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

  const sourceBefore = sha256File(V8A_DUO_FILE);
  const v8aBefore = fileHashTree(V8A_DIR);
  const protectedBefore = ['V7', 'V7.2', 'V7.3A', 'V7.3B', 'V7.3C', 'V7.3-CHORD-MELODY']
    .filter((name) => fs.existsSync(path.join(MOCKUPS, name)))
    .map((name) => [name, fileHashTree(path.join(MOCKUPS, name))] as const);
  const proposalBefore = sha256File(path.join(V8B_OUT_DIR, 'V8B-THREE-TRIAD-PAIR-OPTIONS.md'));
  const prerequisiteBefore = sha256File(path.join(V8B_OUT_DIR, 'V8B-TRIAD-PAIR-PREREQUISITE.md'));

  const bundle = buildV8bBundle();
  const again = buildV8bBundle();
  const written = writeV8bPilot();
  const { index } = loadBlackAuraIndex();
  const extract = reimportV8b(fs.readFileSync(path.join(V8B_OUT_DIR, 'V8B-LIQUID-HARMONY.musicxml'), 'utf8'));
  const duo = reimportV8b(fs.readFileSync(path.join(V8B_OUT_DIR, 'V8B-DUO-LIQUID-HARMONY.musicxml'), 'utf8'));

  check('proposed frets sound the claimed pitches', () => {
    assert.deepEqual(soundingFromStringFret(2, 3).name, 'D4');
    assert.deepEqual(soundingFromStringFret(1, 5).name, 'A4');
    assert.deepEqual(soundingFromStringFret(2, 3).name, 'D4');
    assert.deepEqual(soundingFromStringFret(1, 4).name, 'Ab4');
    assert.deepEqual(soundingFromStringFret(2, 4).name, 'Eb4');
    assert.deepEqual(soundingFromStringFret(1, 4).name, 'Ab4');
    assert.equal(V8B_OPEN_STRING_MIDI.join(','), '64,59,55,50,45,40');
    assert.deepEqual(
      bundle.corrections.map((grip) => grip.id),
      []
    );
    for (const id of ['D4-A4', 'D4-Ab4', 'Eb4-Ab4']) {
      const grip = V8B_GRIPS.find((item) => item.id === id);
      assert.equal(grip?.corrected, false);
      assert.equal(grip?.proposed, true);
    }
  });

  check('every grip fret matches its sounding pitch and span', () => {
    for (const grip of V8B_GRIPS) {
      assert.ok(grip.stoppedSpan <= 3);
      const strings = new Set<number>();
      for (const point of grip.points) {
        assert.ok(point.fret >= 0 && point.fret <= 7);
        const sounded = soundingFromStringFret(point.stringNumber, point.fret);
        assert.equal(sounded.midi, point.pitch.midi);
        assert.equal(sounded.name, point.pitch.name);
        assert.ok(point.pitch.midi >= 40 && point.pitch.midi <= 71);
        strings.add(point.stringNumber);
      }
      assert.equal(strings.size, grip.points.length);
      assert.equal(stoppedSpan(grip.points.map((point) => point.fret)), grip.stoppedSpan);
    }
  });

  check('parents are disjoint and provenance matches the dyads', () => {
    const shared = V8B_PARENTS.resolution.pitchClasses.filter((pc) =>
      (V8B_PARENTS.tension.pitchClasses as readonly number[]).includes(pc)
    );
    assert.deepEqual([...shared], []);
    const role = (id: string) => V8B_GRIPS.find((grip) => grip.id === id)?.role;
    assert.equal(role('D4-A4'), 'D_minor_fragment');
    assert.equal(role('Eb4-Ab4'), 'Ab_major_fragment');
    assert.equal(role('D4-Ab4'), 'mixed_fragment');
    assert.equal(role('F4-Ab4'), 'mixed_fragment');
    const mixed = V8B_GRIPS.find((grip) => grip.id === 'D4-Ab4')!;
    assert.deepEqual(mixed.points[0]!.pitch.parents, ['D_minor']);
    assert.deepEqual(mixed.points[1]!.pitch.parents, ['Ab_major']);
    const hinge = V8B_GRIPS.find((grip) => grip.id === 'F4-Ab4')!;
    assert.deepEqual(hinge.points[0]!.pitch.parents, ['D_minor']);
    assert.deepEqual(hinge.points[1]!.pitch.parents, ['Ab_major']);
  });

  check('two voice-leading holds are the semitone moves', () => {
    assert.equal(V8B_VOICE_MOVEMENTS.length, 2);
    assert.equal(V8B_VOICE_MOVEMENTS[0]!.held, 'D4');
    assert.equal(V8B_VOICE_MOVEMENTS[0]!.semitones, -1);
    assert.equal(V8B_VOICE_MOVEMENTS[1]!.held, 'Ab4');
    assert.equal(V8B_VOICE_MOVEMENTS[1]!.semitones, 1);
    const flat = extract.guitar.measures.flatMap(clusters);
    const asText = flat.map((group) => group.join('+'));
    assert.ok(asText.includes('62+69'));
    assert.ok(asText.includes('62+68'));
    assert.ok(asText.includes('63+68'));
    const first = asText.indexOf('62+69');
    assert.equal(asText[first + 1], '62+68');
    const second = asText.lastIndexOf('62+68');
    assert.equal(asText[second + 1], '63+68');
    assert.notEqual(first, second);
  });

  check('extract reimports with real pitches and legal bars', () => {
    assert.equal(bundle.scores.extract.includes('<technical>'), false);
    assert.equal(bundle.scores.extract.includes('tab'), false);
    assert.equal(bundle.scores.extract.includes('<harmony>'), false);
    assert.equal(extract.guitar.measures.length, 4);
    assert.equal(extract.bass.measures.length, 4);
    const pitched = extract.guitar.measures.flatMap((measure) => measure.notes.filter((note) => !note.rest));
    assert.ok(pitched.length >= 8);
    for (const measure of extract.guitar.measures) {
      assert.equal(measure.beats, 4);
      assert.equal(measure.beatType, 4);
      assert.equal(measure.transposeOctave, -1);
      const ticks = measure.notes.filter((note) => !note.chord).reduce((sum, note) => sum + note.duration, 0);
      assert.equal(ticks, 1024);
      const attacks = measure.notes.filter((note) => !note.rest && !note.chord).length;
      assert.ok(attacks <= 4 && attacks >= 1);
      assert.deepEqual(measure.harmony, []);
    }
    assert.deepEqual(bundle.sounding, [
      ['D4/A4', 'D4/Ab4'],
      ['F4', 'Ab4', 'Eb4', 'D4'],
      ['D4/Ab4', 'Eb4/Ab4'],
      ['F4/Ab4', 'Eb4', 'Ab4'],
    ]);
  });

  check('bass clone stays D3 A3 D3 and matches bar 16', () => {
    const template = pitchFingerprint([index.measures[V8A_WINDOW.cutAfterOrder]!.bass]);
    const extractBass = pitchFingerprint(extract.bass.measures);
    assert.equal(extractBass.split('|').every((bar) => bar === template), true);
    const names = extract.bass.measures[0]!.notes.filter((note) => !note.rest).map((note) => `${note.step}${note.octave}`);
    assert.deepEqual(names, ['D3', 'A3', 'D3']);
    for (const measure of extract.bass.measures) {
      assert.equal(lane(measure.notes), lane(index.measures[V8A_WINDOW.cutAfterOrder]!.bass.notes));
    }
    const duoBassWindow = duo.bass.measures.slice(V8A_WINDOW.returnOrder, V8A_WINDOW.returnOrder + V8A_WINDOW.bars);
    for (const measure of duoBassWindow) {
      assert.equal(lane(measure.notes), lane(index.measures[V8A_WINDOW.cutAfterOrder]!.bass.notes));
    }
  });

  check('source outside the insert and printed symbols stay', () => {
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
    const cut = index.measures[V8A_WINDOW.cutAfterOrder]!.guitar.harmony.join(' ');
    const back = index.measures[V8A_WINDOW.returnOrder]!.guitar.harmony.join(' ');
    assert.match(cut, /sus/i);
    assert.match(back, /m/);
    assert.equal(duo.guitar.measures[V8A_WINDOW.cutAfterOrder]!.harmony.join(' '), cut);
    assert.equal(duo.guitar.measures[tailStart]!.harmony.join(' '), back);
    for (const measure of duo.guitar.measures.slice(head, tailStart)) {
      assert.deepEqual(measure.harmony, []);
    }
  });

  check('protected files stay byte-identical', () => {
    assert.equal(sha256File(V8A_DUO_FILE), sourceBefore);
    assert.equal(bundle.sourceSha256, sourceBefore);
    assert.equal(fileHashTree(V8A_DIR), v8aBefore);
    for (const [name, hash] of protectedBefore) {
      assert.equal(fileHashTree(path.join(MOCKUPS, name)), hash, name);
    }
    assert.equal(sha256File(path.join(V8B_OUT_DIR, 'V8B-THREE-TRIAD-PAIR-OPTIONS.md')), proposalBefore);
    assert.equal(sha256File(path.join(V8B_OUT_DIR, 'V8B-TRIAD-PAIR-PREREQUISITE.md')), prerequisiteBefore);
    assert.equal(inspectV8bParentTriad().status, 'BLOCKED');
    assert.equal(bundle.scores.extract, again.scores.extract);
    assert.equal(written.length, 4);
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
