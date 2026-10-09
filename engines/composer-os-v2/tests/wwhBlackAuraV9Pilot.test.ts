/**
 * Black Aura V9 four-candidate pilot.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhBlackAuraV9Pilot.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { WwhImportedMeasure, WwhImportedNote } from '../core/wwh/wwhDuoImport';
import { importWwhDuoMusicXml, pitchFingerprint } from '../core/wwh/wwhDuoImport';
import { loadBlackAuraIndex, V8A_DUO_FILE, V8A_WINDOW } from '../core/wwh/wwhBlackAuraV8a';
import { soundingFromStringFret, stoppedSpan, V8B_MAX_FRET, V8B_MAX_STOPPED_SPAN } from '../core/wwh/wwhBlackAuraV8bRecipe';
import {
  buildV9Pilot,
  writeV9Pilot,
  V9_EXPECTED_SOURCE_SHA256,
  V9_INSERT_BARS,
  V9_OUT_DIR,
  V9_SOURCE_MEASURES,
  V9_TOTAL_MEASURES,
  type V9Candidate,
  type V9Pilot,
} from '../core/wwh/wwhBlackAuraV9Pilot';

const V8_PILOT = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PERFORMANCE-MOCKUPS/V8-PILOT';

function sha256File(file: string): string {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function fileHashTree(root: string): string {
  const rows: string[] = [];
  const walk = (dir: string) => {
    for (const name of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else rows.push(`${path.relative(root, full)}\t${sha256File(full)}`);
    }
  };
  walk(root);
  return createHash('sha256').update(rows.join('\n')).digest('hex');
}

function tone(note: WwhImportedNote): string {
  if (note.rest) return `R:${note.duration}`;
  return `${note.step}${note.alter ?? 0}${note.octave}:${note.duration}:${note.chord ? 'c' : 'a'}:${note.voice}`;
}

function lane(notes: readonly WwhImportedNote[]): string {
  return notes.map(tone).join(',');
}

function assertTies(measures: readonly WwhImportedMeasure[], part: string): void {
  const open = new Map<string, number>();
  for (const measure of measures) {
    assert.equal(measure.gridAgrees, true, `${part} bar ${measure.number} timing`);
    assert.equal(measure.hasBackup, false, `${part} bar ${measure.number} backup`);
    for (const note of measure.notes) {
      assert.ok(note.voice, `${part} bar ${measure.number} missing voice`);
      if (note.rest) continue;
      const key = `${note.voice}|${note.step}|${note.alter ?? 0}|${note.octave}`;
      if (note.tieStop) {
        const count = open.get(key) ?? 0;
        assert.ok(count > 0, `${part} bar ${measure.number} tie stop without start`);
        open.set(key, count - 1);
      }
      if (note.tieStart) open.set(key, (open.get(key) ?? 0) + 1);
    }
  }
  for (const [key, count] of open) assert.equal(count, 0, `${part} unclosed tie ${key}`);
}

function attacksOf(notes: readonly WwhImportedNote[]): WwhImportedNote[][] {
  const groups: WwhImportedNote[][] = [];
  for (const note of notes) {
    if (note.rest) continue;
    if (note.chord) {
      groups[groups.length - 1]!.push(note);
      continue;
    }
    groups.push([note]);
  }
  return groups;
}

function assertCandidate(candidate: V9Candidate, index: ReturnType<typeof loadBlackAuraIndex>['index']): void {
  const duo = importWwhDuoMusicXml(candidate.xml);
  assert.equal(duo.guitar.measures.length, V9_TOTAL_MEASURES);
  assert.equal(duo.bass.measures.length, V9_TOTAL_MEASURES);
  assert.equal(index.measures.length, V9_SOURCE_MEASURES);
  const head = V8A_WINDOW.returnOrder;
  const tailStart = head + V9_INSERT_BARS;
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
  const template = lane(index.measures[V8A_WINDOW.cutAfterOrder]!.bass.notes);
  const guitarWindow = duo.guitar.measures.slice(head, tailStart);
  const bassWindow = duo.bass.measures.slice(head, tailStart);
  for (const measure of [...guitarWindow, ...bassWindow]) {
    assert.equal(measure.beats, 4);
    assert.equal(measure.beatType, 4);
    assert.equal(measure.divisions, 256);
    assert.equal(measure.statedDivisions, 256);
    assert.equal(measure.specTicks, 1024);
    assert.equal(measure.gridAgrees, true);
    assert.equal(measure.implicit, false);
    assert.equal(measure.hasBackup, false);
    const ticks = measure.notes.filter((note) => !note.chord).reduce((sum, note) => sum + note.duration, 0);
    assert.equal(ticks, 1024);
    assert.ok(measure.notes.every((note) => note.voice === '1'));
    assert.equal(measure.notes.some((note) => note.tieStart || note.tieStop), false);
  }
  for (const measure of bassWindow) assert.equal(lane(measure.notes), template);
  for (const measure of guitarWindow) {
    assert.equal(measure.transposeOctave, -1);
    assert.deepEqual(measure.harmony, []);
  }
  for (const measure of duo.guitar.measures) assert.equal(measure.transposeOctave, -1);
  assertTies(duo.guitar.measures, `${candidate.id} guitar`);
  assertTies(duo.bass.measures, `${candidate.id} bass`);
  assert.equal(pitchFingerprint(guitarWindow), candidate.guitarFingerprint);
  const cut = index.measures[V8A_WINDOW.cutAfterOrder]!.guitar.harmony.join(' ');
  const back = index.measures[V8A_WINDOW.returnOrder]!.guitar.harmony.join(' ');
  assert.equal(duo.guitar.measures[V8A_WINDOW.cutAfterOrder]!.harmony.join(' '), cut);
  assert.equal(duo.guitar.measures[tailStart]!.harmony.join(' '), back);
}

function assertPlayability(candidate: V9Candidate): void {
  const duo = importWwhDuoMusicXml(candidate.xml);
  const window = duo.guitar.measures.slice(V8A_WINDOW.returnOrder, V8A_WINDOW.returnOrder + V9_INSERT_BARS);
  const attacks = window.flatMap((measure) => attacksOf(measure.notes));
  if (candidate.id === 'v8a-lyrical-duo') {
    assert.equal(candidate.playability.status, 'FEASIBLE');
    if (candidate.playability.status !== 'FEASIBLE') return;
    assert.equal(candidate.playability.tuning, 'standard');
    assert.equal(candidate.playability.assignments.length, attacks.flat().length);
    let previous: Array<{ fret: number }> | null = null;
    let seen = 0;
    const byAttack = new Map<string, typeof candidate.playability.assignments>();
    for (const row of candidate.playability.assignments) {
      const key = `${row.bar}:${row.attackIndex}`;
      byAttack.set(key, [...(byAttack.get(key) ?? []), row]);
    }
    window.forEach((measure, barIndex) => {
      attacksOf(measure.notes).forEach((attack, attackIndex) => {
        const rows = byAttack.get(`${barIndex + 1}:${attackIndex}`) ?? [];
        assert.equal(rows.length, attack.length);
        rows.forEach((row, noteIndex) => {
          const note = attack[noteIndex]!;
          assert.equal(row.writtenStep, note.step);
          assert.equal(row.writtenOctave, note.octave);
          const sounded = soundingFromStringFret(row.stringNumber, row.fret);
          assert.equal(sounded.midi, row.soundingMidi);
          assert.ok(row.fret >= 0 && row.fret <= V8B_MAX_FRET);
        });
        seen += rows.length;
        assert.ok(stoppedSpan(rows.map((row) => row.fret)) <= V8B_MAX_STOPPED_SPAN);
        if (previous) {
          const left = previous.map((point) => point.fret).filter((fret) => fret > 0);
          const right = rows.map((row) => row.fret).filter((fret) => fret > 0);
          if (left.length && right.length) {
            for (const from of left) for (const to of right) assert.ok(Math.abs(from - to) <= V8B_MAX_STOPPED_SPAN);
          }
        }
        previous = rows;
      });
    });
    assert.equal(seen, attacks.flat().length);
    return;
  }
  assert.equal(candidate.playability.status, 'V8C_FINGERING_RETAINED');
  if (candidate.playability.status !== 'V8C_FINGERING_RETAINED') return;
  assert.equal(candidate.playability.events.length, attacks.length);
  candidate.playability.events.forEach((event) => {
    assert.equal(event.fingers.length, event.soundingMidi.length);
    event.fingers.forEach((finger, index) => {
      assert.equal(soundingFromStringFret(finger.stringNumber, finger.fret).midi, event.soundingMidi[index]);
      assert.ok(finger.fret >= 0 && finger.fret <= V8B_MAX_FRET);
    });
    assert.ok(stoppedSpan(event.fingers.map((finger) => finger.fret)) <= V8B_MAX_STOPPED_SPAN);
  });
}

function placeCanonical(pilot: V9Pilot): string[] {
  const targets = pilot.candidates.map((row) => path.join(V9_OUT_DIR, row.fileName));
  const existing = targets.filter((file) => fs.existsSync(file));
  if (!existing.length) return writeV9Pilot(V9_OUT_DIR, pilot);
  assert.equal(existing.length, targets.length, `partial V9 pilot: ${existing.join(', ')}`);
  for (const row of pilot.candidates) {
    assert.equal(fs.readFileSync(path.join(V9_OUT_DIR, row.fileName), 'utf8'), row.xml);
  }
  assert.throws(() => writeV9Pilot(V9_OUT_DIR, pilot), /REFUSE overwrite/);
  return targets;
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
  const v8Before = fileHashTree(V8_PILOT);
  const pilot = buildV9Pilot();
  const again = buildV9Pilot();
  const { index } = loadBlackAuraIndex();

  check('source hash matches the authoritative leadsheet', () => {
    assert.equal(sourceBefore, V9_EXPECTED_SOURCE_SHA256);
    assert.equal(pilot.sourceSha256, V9_EXPECTED_SOURCE_SHA256);
    assert.equal(pilot.sourceFile, V8A_DUO_FILE);
  });

  check('four generator strings stay distinct and stable', () => {
    assert.deepEqual(
      pilot.candidates.map((row) => row.generator),
      [
        'buildV8cBundle(80083).scores.lyrical',
        'buildV8cBundle(80083).scores.liquid',
        'buildV8cBundle(80083).scores.adventurous',
        'buildV8aBundle(80081).scores.lyricalDuo',
      ]
    );
    assert.deepEqual(
      pilot.candidates.map((row) => row.xml),
      again.candidates.map((row) => row.xml)
    );
    assert.equal(new Set(pilot.candidates.map((row) => row.guitarFingerprint)).size, 4);
  });

  for (const row of pilot.candidates) {
    check(`${row.id} keeps source outside the insert and validates the four bars`, () => assertCandidate(row, index));
    check(`${row.id} playability evidence`, () => assertPlayability(row));
  }

  check('writer refuses overwrites and leaves the source untouched', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'wwh-v9-pilot-'));
    try {
      const written = writeV9Pilot(temp, pilot);
      assert.deepEqual(
        written.map((file) => path.basename(file)).sort(),
        pilot.candidates.map((row) => row.fileName).sort()
      );
      for (const row of pilot.candidates) {
        assert.equal(fs.readFileSync(path.join(temp, row.fileName), 'utf8'), row.xml);
      }
      const hashes = written.map(sha256File);
      assert.throws(() => writeV9Pilot(temp, pilot), /REFUSE overwrite/);
      assert.deepEqual(written.map(sha256File), hashes);
      assert.equal(sha256File(V8A_DUO_FILE), sourceBefore);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });

  check('canonical V9 files match the generator strings', () => {
    const written = placeCanonical(pilot);
    assert.deepEqual(written.map((file) => path.basename(file)).sort(), pilot.candidates.map((row) => row.fileName).sort());
    for (const file of written) {
      const xml = fs.readFileSync(file, 'utf8');
      const row = pilot.candidates.find((candidate) => candidate.fileName === path.basename(file));
      assert.ok(row);
      assert.equal(xml, row.xml);
      assertCandidate(row, index);
    }
  });

  check('source and V8 pilot folders stay byte-identical', () => {
    assert.equal(sha256File(V8A_DUO_FILE), sourceBefore);
    assert.equal(sha256File(V8A_DUO_FILE), V9_EXPECTED_SOURCE_SHA256);
    assert.equal(fileHashTree(V8_PILOT), v8Before);
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
