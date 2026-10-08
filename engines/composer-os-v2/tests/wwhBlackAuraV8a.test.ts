/**
 * Black Aura V8A pitched guitar improvisation.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wwhBlackAuraV8a.test.ts
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { buildV8aBundle, loadBlackAuraIndex, reimportGuitarBass, V8A_DUO_FILE, V8A_SEED, V8A_WINDOW } from '../core/wwh/wwhBlackAuraV8a';
import { pitchFingerprint } from '../core/wwh/wwhDuoImport';
import type { WwhImportedNote } from '../core/wwh/wwhDuoImport';

function tone(note: WwhImportedNote): string {
  if (note.rest) return `R:${note.duration}`;
  return `${note.step}${note.alter ?? 0}${note.octave}:${note.duration}`;
}

function lane(notes: readonly WwhImportedNote[]): string {
  return notes.filter((note) => !note.chord).map(tone).join(',');
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

  const before = createHash('sha256').update(fs.readFileSync(V8A_DUO_FILE)).digest('hex');
  const first = buildV8aBundle();
  const second = buildV8aBundle(V8A_SEED);
  const { index } = loadBlackAuraIndex();

  check('seed regenerates the same MusicXML', () => {
    assert.equal(first.scores.lyricalExtract, second.scores.lyricalExtract);
    assert.equal(first.scores.adventurousExtract, second.scores.adventurousExtract);
    assert.equal(first.scores.lyricalDuo, second.scores.lyricalDuo);
  });

  check('source file stays byte-identical', () => {
    assert.equal(createHash('sha256').update(fs.readFileSync(V8A_DUO_FILE)).digest('hex'), before);
    assert.equal(first.sourceSha256, before);
  });

  check('motif is the five-note M2 cell with its rests', () => {
    assert.deepEqual(
      first.motif.notes.map((note) => `${note.step}${note.alter}${note.octave}`),
      ['F05', 'A-15', 'F05', 'E-15', 'D05']
    );
    assert.deepEqual(
      first.motif.notes.map((note) => note.startBeat),
      [1, 1.5, 3, 5, 5.5]
    );
    assert.equal(first.motif.eventIds.length, 5);
  });

  check('lyrical keeps the cell and one silent bar', () => {
    assert.deepEqual(first.lyrical.guitarAttackGroups, [3, 3, 0, 2]);
    assert.deepEqual(first.lyrical.silenceBars, [3]);
    const quote = first.lyrical.bars[0]!.filter((event) => !event.rest).map((event) => event.midi);
    assert.deepEqual(quote, [77, 80, 77]);
  });

  check('adventurous M-NEAR changes pitches and keeps the F anchor', () => {
    assert.equal(first.map.method, 'M-NEAR');
    assert.deepEqual(first.field.sourcePitchClasses, [0, 3, 5, 8, 10]);
    assert.deepEqual(first.field.targetPitchClasses, [0, 2, 5, 7, 9]);
    assert.notDeepEqual(first.map.mappedPitches, first.map.sourcePitches);
    assert.deepEqual(first.adventurous.guitarAttackGroups, [3, 2, 0, 1]);
    assert.deepEqual(first.adventurous.silenceBars, [3]);
    const anchor = first.adventurous.bars[3]!.find((event) => !event.rest);
    assert.equal(anchor?.midi, 77);
    const lyricPitches = first.lyrical.bars.flatMap((bar) => bar.filter((event) => event.midi !== undefined).map((event) => event.midi));
    const adventurePitches = first.adventurous.bars.flatMap((bar) => bar.filter((event) => event.midi !== undefined).map((event) => event.midi));
    assert.notDeepEqual(lyricPitches, adventurePitches);
  });

  check('extracts re-import with exact duration and no slash notation', () => {
    for (const xml of [first.scores.lyricalExtract, first.scores.adventurousExtract]) {
      assert.equal(xml.includes('slash'), false);
      assert.equal(xml.includes('<harmony>'), false);
      const score = reimportGuitarBass(xml);
      assert.equal(score.guitar.measures.length, V8A_WINDOW.bars);
      assert.equal(score.bass.measures.length, V8A_WINDOW.bars);
      for (const measure of score.guitar.measures) {
        assert.equal(measure.beats, 4);
        assert.equal(measure.beatType, 4);
        const ticks = measure.notes.filter((note) => !note.chord).reduce((sum, note) => sum + note.duration, 0);
        assert.equal(ticks, 1024);
        const attacks = measure.notes.filter((note) => !note.rest && !note.chord).length;
        assert.ok(attacks <= 4);
      }
      const bassPrint = pitchFingerprint(score.bass.measures);
      const template = pitchFingerprint([index.measures[V8A_WINDOW.cutAfterOrder]!.bass]);
      assert.equal(bassPrint.split('|').every((bar) => bar === template), true);
    }
  });

  check('duo keeps source guitar and bass outside the window', () => {
    const duo = reimportGuitarBass(first.scores.lyricalDuo);
    assert.equal(duo.guitar.measures.length, index.measures.length + V8A_WINDOW.bars);
    const head = V8A_WINDOW.returnOrder;
    const tailStart = head + V8A_WINDOW.bars;
    for (let order = 0; order < head; order += 1) {
      assert.equal(lane(duo.guitar.measures[order]!.notes), lane(index.measures[order]!.guitar.notes));
      assert.equal(lane(duo.bass.measures[order]!.notes), lane(index.measures[order]!.bass.notes));
    }
    for (let order = V8A_WINDOW.returnOrder; order < index.measures.length; order += 1) {
      const out = tailStart + (order - V8A_WINDOW.returnOrder);
      assert.equal(lane(duo.guitar.measures[out]!.notes), lane(index.measures[order]!.guitar.notes));
      assert.equal(lane(duo.bass.measures[out]!.notes), lane(index.measures[order]!.bass.notes));
    }
    const windowGuitar = duo.guitar.measures.slice(head, tailStart);
    assert.equal(windowGuitar[2]!.notes.every((note) => note.rest), true);
    assert.ok(windowGuitar[0]!.notes.some((note) => !note.rest));
  });

  check('V8B parent triad stays blocked', () => {
    assert.equal(first.v8b.status, 'BLOCKED');
    assert.equal(first.v8b.tensionTriadResolvedCount, 0);
    assert.equal(first.v8b.shellIsTriadCount, 0);
    assert.ok(first.v8b.rhTriadResolvedCount > 0);
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
const bundle = buildV8aBundle();
console.log('MAP', bundle.map.sourcePitches.join(','), '->', bundle.map.mappedPitches.join(','));
console.log('ALIGN', bundle.map.degreeAlignment);
console.log('LYRIC', JSON.stringify(bundle.lyrical.bars));
console.log('ADV', JSON.stringify(bundle.adventurous.bars));
