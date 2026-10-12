/**
 * WPS V1.4 Bryant gates. Does not edit Wrong Turning V3.0.
 *
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wpsV14.test.ts
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importWwhDuoMusicXml, type WwhImportedMeasure, type WwhImportedNote, type WwhImportedPart } from '../core/wwh/wwhDuoImport';
import {
  assessBryantEdition,
  BRYANT_PREFERENCES_PATH,
  BRYANT_SIGNATURE_PATH,
  formatBryantReport,
  loadBryantSignature,
  rankBryantCandidates,
  readBryantPreferencesLog,
  type BryantCandidateInput,
  type BryantDevice,
} from '../core/wwh/wps/wpsBryantGates';
import { WPS_VERSION } from '../core/wwh/wps/wpsTypes';

const v3 =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/WWH-PRACTICE/WWH-PLAY/V2.0-WWH-PLAY/WWH-Liquid-Harmony-E-V3.0/06-Wrong-Turning-E-Liquid-Harmony-V3.0.musicxml';
const leadsheet =
  '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml';

function note(step: string, octave: number, duration = 4, chord = false, alter = 0): WwhImportedNote {
  return {
    rest: false,
    chord,
    duration,
    storedDuration: duration,
    step,
    alter,
    octave,
    voice: '1',
    dots: 0,
    tieStart: false,
    tieStop: false,
  };
}

function rest(duration = 16): WwhImportedNote {
  return {
    rest: true,
    chord: false,
    duration,
    storedDuration: duration,
    voice: '1',
    dots: 0,
    tieStart: false,
    tieStop: false,
  };
}

function part(bars: WwhImportedNote[][], words: string[][] = []): WwhImportedPart {
  return {
    id: 'P',
    name: 'Guitar',
    measures: bars.map(
      (notes, index) =>
        ({
          number: String(index + 1),
          notes,
          words: words[index] ?? [],
          divisions: 4,
          beats: 4,
          beatType: 4,
          transposeOctave: 0,
          rehearsal: [],
        }) as WwhImportedMeasure
    ),
  };
}

function candidate(id: string, seed: number, leadDevice: BryantDevice, signature: BryantDevice[], pass: boolean, contrast: number): BryantCandidateInput {
  return {
    id,
    role: 'SOLO_1',
    chorus: 1,
    seed,
    leadDevice,
    signatureDevices: signature,
    antiClichePass: pass,
    soloContrast: contrast,
  };
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

  check('signature file is shared and 65/20/40 stays a guide', () => {
    const spec = loadBryantSignature();
    assert.equal(WPS_VERSION, '1.4');
    assert.equal(spec.signatureDevices.minimumPerEdition, 4);
    assert.equal(spec.signatureDevices.poolSize, 6);
    assert.equal(spec.antiClicheBans.anyHitFailsWps, true);
    assert.equal(spec.chordalVariety.minimumGripTypes, 4);
    assert.equal(spec.soloContrast.SOLO_2.minWideIntervalShare, 0.4);
    assert.equal(spec.soloContrast.SOLO_2.minRangeSemitones, 24);
    assert.equal(spec.soloContrast.SOLO_2.minFieldCollisions, 2);
    assert.equal(spec.soloContrast.SOLO_2.minSilentBars, 4);
    assert.equal(spec.candidateRule.autoSelect, false);
    assert.equal(spec.candidateRule.candidatesPerChorus, 4);
    assert.equal(spec.candidateRule.presentToMike, 2);
    assert.equal(spec.listeningGuide.melodyPercent, 65);
    assert.equal(spec.listeningGuide.harmonyPercent, 20);
    assert.equal(spec.listeningGuide.rhythmPercent, 40);
    const raw = fs.readFileSync(BRYANT_SIGNATURE_PATH, 'utf8');
    for (const id of ['LIQUID', 'TRITONE_FIELDS', 'FOREIGN_BASS_GRIP', 'HOOK_EROSION', 'ACTIVE_SILENCE', 'OPEN_STRING_CLUSTER']) {
      assert.match(raw, new RegExp(id));
    }
  });

  check('preferences log names all nine tunes and has no Wrong Turning choice', () => {
    const log = readBryantPreferencesLog();
    assert.equal(path.basename(BRYANT_PREFERENCES_PATH), 'wps-bryant-preferences.md');
    assert.match(log, /before creating candidates for the next tune/);
    for (const title of [
      'Black Aura',
      'Palace Gates',
      "Meet Me at Hobo's",
      'The Mirror',
      'Orbit',
      'Wrong Turning',
      'Impossible Metaphysics',
      'Small Testimony',
      'After Everything',
    ]) {
      assert.match(log, new RegExp(title));
    }
    const wrong = log.split('## 06 Wrong Turning')[1]!.split('## 07')[0]!;
    assert.match(wrong, /Mike chose: none/);
    assert.match(wrong, /Candidates offered: none/);
  });

  check('four candidates present the top 2 and do not auto-select', () => {
    const ranked = rankBryantCandidates([
      candidate('a', 1, 'LIQUID', ['LIQUID'], true, 1),
      candidate('b', 2, 'TRITONE_FIELDS', ['TRITONE_FIELDS', 'LIQUID', 'HOOK_EROSION', 'ACTIVE_SILENCE'], true, 9),
      candidate('c', 3, 'FOREIGN_BASS_GRIP', ['FOREIGN_BASS_GRIP'], false, 8),
      candidate('d', 4, 'HOOK_EROSION', ['HOOK_EROSION', 'LIQUID', 'OPEN_STRING_CLUSTER'], true, 4),
    ]);
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0]!.selected, null);
    assert.deepEqual(ranked[0]!.presentToMike.map((item) => item.id), ['b', 'd']);
    assert.equal(ranked[0]!.errors.length, 0);
    const repeated = rankBryantCandidates([
      candidate('a', 1, 'LIQUID', ['LIQUID'], true, 1),
      candidate('b', 1, 'TRITONE_FIELDS', ['TRITONE_FIELDS'], true, 1),
      candidate('c', 3, 'FOREIGN_BASS_GRIP', ['FOREIGN_BASS_GRIP'], true, 1),
      candidate('d', 4, 'HOOK_EROSION', ['HOOK_EROSION'], true, 1),
    ]);
    assert.equal(repeated[0]!.presentToMike.length, 0);
    assert.match(repeated[0]!.errors.join(' '), /seed/);
  });

  check('liquid, scale run, and parallel grips report bars', () => {
    const guitar = part([
      [note('C', 4, 4), note('E', 4, 4, true), note('G', 4, 4, true), note('C', 4, 4), note('E', 4, 4, true), note('A', 4, 4, true)],
      [note('C', 4, 2), note('D', 4, 2), note('E', 4, 2), note('F', 4, 2), note('G', 4, 2), note('A', 4, 2), note('B', 4, 2)],
      [note('D', 4, 4), note('G', 4, 4, true), note('E', 4, 4), note('A', 4, 4, true), note('F', 4, 2, false, 1), note('B', 4, 2, true), note('G', 4, 2), note('C', 5, 2, true)],
      [rest()],
    ]);
    const bass = part([
      [note('F', 2, 8), note('C', 2, 8)],
      [note('C', 2, 16)],
      [note('D', 2, 4), note('E', 2, 4), note('F', 2, 1, false, 1)],
      [note('C', 2, 16)],
    ]);
    const report = assessBryantEdition({
      guitar,
      bass,
      protectedGuitarSilences: [],
      hookPitches: ['E', 'G', 'A', 'Bb'],
      chorusLength: 4,
    });
    const liquid = report.devices.find((gate) => gate.id === 'LIQUID')!;
    const scale = report.bans.find((ban) => ban.id === 'SCALE_RUN')!;
    const parallel = report.bans.find((ban) => ban.id === 'PARALLEL_GRIP')!;
    const silence = report.devices.find((gate) => gate.id === 'ACTIVE_SILENCE')!;
    assert.equal(liquid.ok, true);
    assert.deepEqual(liquid.bars, [1]);
    assert.equal(scale.ok, false);
    assert.deepEqual(scale.bars, [2]);
    assert.equal(parallel.ok, false);
    assert.deepEqual(parallel.bars, [3]);
    assert.equal(silence.ok, true);
    assert.deepEqual(silence.bars, [4]);
    const lines = formatBryantReport(report).join('\n');
    assert.match(lines, /Bryant gate LIQUID: PASS bars 1/);
    assert.match(lines, /Bryant ban SCALE_RUN: FAIL bars 2/);
    assert.match(lines, /Bryant ban PARALLEL_GRIP: FAIL bars 3/);
  });

  check('Wrong Turning V3.0 is read only and the named choruses fail', () => {
    const before = fs.readFileSync(v3);
    const hash = crypto.createHash('sha256').update(before).digest('hex');
    const score = importWwhDuoMusicXml(before.toString('utf8'));
    const source = importWwhDuoMusicXml(fs.readFileSync(leadsheet, 'utf8'));
    const report = assessBryantEdition({
      guitar: score.guitar,
      bass: score.bass,
      leadsheetGuitar: source.guitar,
      protectedGuitarSilences: [30],
      hookPitches: ['E', 'G', 'A', 'Bb'],
      chorusLength: 32,
    });
    assert.equal(score.guitar.measures.length, 32);
    for (const id of ['HEAD_IN', 'SOLO_1', 'SOLO_2', 'BASS_SOLO', 'HEAD_OUT']) {
      const chorus = report.choruses.find((item) => item.id === id)!;
      assert.equal(chorus.present, false, id);
      assert.equal(chorus.ok, false, id);
    }
    assert.equal(report.contrast.ok, false);
    assert.equal(fs.readFileSync(v3).equals(before), true);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(v3)).digest('hex'), hash);
    const text = formatBryantReport(report).join('\n');
    assert.match(text, /65\/20\/40 listening guide/);
    assert.match(text, /Bryant device-by-bar/);
    console.log('\n' + text + '\n');
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
