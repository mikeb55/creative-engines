/**
 * WPS V1.5 harmonic notation. Does not edit Wrong Turning V2.4 or Meet Me at Hobo's V1.3.
 *
 *   npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/wpsV15.test.ts
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importWwhDuoMusicXml, type WwhImportedMeasure, type WwhImportedNote, type WwhImportedPart } from '../core/wwh/wwhDuoImport';
import { runWps } from '../core/wwh/wps/wpsAssess';
import {
  assessHarmonicNotation,
  formatHarmonicNotationReport,
  isFieldLabel,
  isVoicingAnnotation,
} from '../core/wwh/wps/wpsHarmonicNotation';
import { WPS_ACCEPTED_SPEC_VERSIONS, WPS_VERSION, type WpsSongSpec } from '../core/wwh/wps/wpsTypes';

const album = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027';
const wrongTurning =
  album +
  '/WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/06-Wrong-Turning/06-Wrong-Turning-Integrated-Guitar-Study-V2.4.musicxml';
const wrongLead = album + '/00 - WWH DUO LEADSHEETS/06-Wrong-Turning-Duo-Leadsheet-V1.2.musicxml';
const hobos =
  album +
  '/WWH-PRACTICE/WWH-PLAY/PERFORMANCE-EDITIONS/04-Meet-Me-at-Hobos/04-Meet-Me-at-Hobos-Integrated-Guitar-Study-V1.3.musicxml';
const hobosLead = album + '/00 - WWH DUO LEADSHEETS/04-Meet-Me-at-Hobos-Duo-Leadsheet-V1.0.musicxml';

const specDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../core/wwh/wps/specs');

function note(step: string, octave = 4, alter = 0): WwhImportedNote {
  return {
    rest: false,
    chord: false,
    duration: 4,
    storedDuration: 4,
    step,
    alter,
    octave,
    voice: '1',
    dots: 0,
    tieStart: false,
    tieStop: false,
  };
}

function rest(): WwhImportedNote {
  return {
    rest: true,
    chord: false,
    duration: 16,
    storedDuration: 16,
    voice: '1',
    dots: 0,
    tieStart: false,
    tieStop: false,
  };
}

function measure(partial: Partial<WwhImportedMeasure> & Pick<WwhImportedMeasure, 'notes'>): WwhImportedMeasure {
  return {
    number: '1',
    words: [],
    harmony: [],
    rehearsal: [],
    divisions: 4,
    beats: 4,
    beatType: 4,
    gridAgrees: true,
    ...partial,
  } as WwhImportedMeasure;
}

function duo(guitarBars: WwhImportedMeasure[], bassBars: WwhImportedMeasure[] = guitarBars.map((bar) => measure({ notes: [note('C', 2)], harmony: [] }))): {
  guitar: WwhImportedPart;
  bass: WwhImportedPart;
} {
  return {
    guitar: { id: 'P1', name: 'Electric Guitar', measures: guitarBars },
    bass: { id: 'P2', name: 'Upright Bass', measures: bassBars },
  };
}

function sha(file: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
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

  check('checker is V1.5 and V1.4 specs stay accepted', () => {
    assert.equal(WPS_VERSION, '1.5');
    assert.deepEqual([...WPS_ACCEPTED_SPEC_VERSIONS], ['1.2', '1.3', '1.4', '1.5']);
  });

  check('Wrong Turning V2.4 keeps 160 bars, 8 chords, 34 fields', () => {
    const before = sha(wrongTurning);
    const leadBefore = sha(wrongLead);
    const score = importWwhDuoMusicXml(fs.readFileSync(wrongTurning, 'utf8'));
    const lead = importWwhDuoMusicXml(fs.readFileSync(wrongLead, 'utf8'));
    const report = assessHarmonicNotation({
      guitar: score.guitar,
      bass: score.bass,
      leadsheetGuitar: lead.guitar,
    });
    assert.equal(report.bars, 160);
    assert.equal(report.guitarBars, 160);
    assert.equal(report.bassBars, 160);
    assert.equal(report.chordSymbols, 8);
    assert.equal(report.fieldLabels, 34);
    assert.equal(report.bassChordSymbols, 0);
    assert.equal(report.voicingAnnotations, 0);
    assert.deepEqual(report.uncoveredBars, []);
    assert.deepEqual(report.soloSpansWithoutMark, []);
    assert.deepEqual(report.droppedLeadsheetHarmony, []);
    assert.deepEqual(report.overcrowdedBars, []);
    assert.deepEqual(report.integrityBars, []);
    assert.equal(report.ok, true, report.failures.join('; '));
    assert.equal(report.sibeliusVisualVerification, 'NOT PERFORMED');
    const text = formatHarmonicNotationReport(report).join('\n');
    assert.match(text, /Sibelius visual verification: NOT PERFORMED/);
    assert.match(text, /XML validation is not visual proof/);
    const sonority =
      report.sonority.underlyingOverRest +
      report.sonority.underlyingOverSingleNote +
      report.sonority.guitarVoicing +
      report.sonority.ensemble;
    assert.equal(sonority, 8);
    assert.ok(report.sonority.ensemble > 0);
    assert.equal(sha(wrongTurning), before);
    assert.equal(sha(wrongLead), leadBefore);
    console.log('\n' + text + '\n');
  });

  check("Meet Me at Hobo's V1.3 keeps 120 bars, 65 chords, 13 annotations", () => {
    const before = sha(hobos);
    const leadBefore = sha(hobosLead);
    const score = importWwhDuoMusicXml(fs.readFileSync(hobos, 'utf8'));
    const lead = importWwhDuoMusicXml(fs.readFileSync(hobosLead, 'utf8'));
    const report = assessHarmonicNotation({
      guitar: score.guitar,
      bass: score.bass,
      leadsheetGuitar: lead.guitar,
    });
    assert.equal(report.bars, 120);
    assert.equal(report.chordSymbols, 65);
    assert.equal(report.fieldLabels, 0);
    assert.equal(report.voicingAnnotations, 13);
    assert.equal(report.bassChordSymbols, 0);
    assert.deepEqual(report.droppedLeadsheetHarmony, []);
    assert.deepEqual(report.uncoveredBars, []);
    assert.deepEqual(report.soloSpansWithoutMark, []);
    assert.deepEqual(report.overcrowdedBars, []);
    assert.deepEqual(report.integrityBars, []);
    assert.equal(report.ok, true, report.failures.join('; '));
    assert.equal(report.sibeliusVisualVerification, 'NOT PERFORMED');
    const sonority =
      report.sonority.underlyingOverRest +
      report.sonority.underlyingOverSingleNote +
      report.sonority.guitarVoicing +
      report.sonority.ensemble;
    assert.equal(sonority, 65);
    assert.ok(report.sonority.underlyingOverSingleNote > 0);
    assert.ok(report.sonority.guitarVoicing + report.sonority.ensemble > 0);
    assert.equal(lead.guitar.measures.length, 24);
    assert.equal(sha(hobos), before);
    assert.equal(sha(hobosLead), leadBefore);
    console.log(formatHarmonicNotationReport(report).join('\n') + '\n');
  });

  check('a removed leadsheet chord fails LOCK and the file stays put', () => {
    const before = sha(hobos);
    const score = importWwhDuoMusicXml(fs.readFileSync(hobos, 'utf8'));
    const lead = importWwhDuoMusicXml(fs.readFileSync(hobosLead, 'utf8'));
    const guitar: WwhImportedPart = {
      ...score.guitar,
      measures: score.guitar.measures.map((bar, index) => (index === 0 ? { ...bar, harmony: [] } : bar)),
    };
    const report = assessHarmonicNotation({ guitar, bass: score.bass, leadsheetGuitar: lead.guitar });
    assert.equal(report.ok, false);
    assert.equal(report.droppedLeadsheetHarmony.length > 0, true);
    assert.match(report.failures.join('\n'), /LOCK dropped leadsheet harmony/);
    assert.equal(sha(hobos), before);
  });

  check('a chord name in words is not a chord symbol', () => {
    assert.equal(isFieldLabel('Gm11', false), false);
    assert.equal(isVoicingAnnotation('Gm11', false), false);
    const report = assessHarmonicNotation(
      duo([measure({ notes: [note('G')], words: ['Gm11'] })])
    );
    assert.equal(report.chordSymbols, 0);
    assert.equal(report.fieldLabels, 0);
    assert.deepEqual(report.uncoveredBars, [1]);
    assert.equal(report.ok, false);
  });

  check('a field covers a later rest and a single note', () => {
    const report = assessHarmonicNotation(
      duo([
        measure({ notes: [note('E')], words: ['E-cell field'] }),
        measure({ notes: [rest()] }),
        measure({ notes: [note('G')] }),
      ])
    );
    assert.deepEqual(report.uncoveredBars, []);
    assert.equal(report.fieldLabels, 1);
    assert.equal(report.chordSymbols, 0);
    assert.equal(report.ok, true, report.failures.join('; '));
  });

  check('a solo passage needs its own mark', () => {
    const report = assessHarmonicNotation(
      duo([
        measure({ notes: [note('E')], words: ['E-cell field'] }),
        measure({ notes: [note('E')], words: ['Solo 1'], rehearsal: ['E'] }),
        measure({ notes: [rest()] }),
      ])
    );
    assert.deepEqual(report.soloSpansWithoutMark, ['2–3']);
    assert.equal(report.ok, false);
  });

  check('symbols distinguish rest, single note, voicing, and ensemble', () => {
    const guitar = [
      measure({ notes: [rest()], harmony: ['Gm11'] }),
      measure({ notes: [note('A')], harmony: ['Ab6'] }),
      measure({ notes: [note('G'), { ...note('B', 4, -1), chord: true }], harmony: ['Gm'] }),
      measure({ notes: [note('A'), { ...note('B', 4, -1), chord: true }], harmony: ['F(add4)'] }),
    ];
    const bass = [
      measure({ notes: [note('G', 2)] }),
      measure({ notes: [note('A', 2, -1)] }),
      measure({ notes: [note('G', 2)] }),
      measure({ notes: [note('F', 2)] }),
    ];
    const report = assessHarmonicNotation(duo(guitar, bass));
    assert.equal(report.sonority.underlyingOverRest, 1);
    assert.equal(report.sonority.underlyingOverSingleNote, 1);
    assert.equal(report.sonority.guitarVoicing, 1);
    assert.equal(report.sonority.ensemble, 1);
    assert.equal(report.ok, true, report.failures.join('; '));
  });

  check('bass harmony, a broken bar, and a crowded bar fail', () => {
    const bassSymbol = assessHarmonicNotation({
      guitar: { id: 'P1', name: 'Electric Guitar', measures: [measure({ notes: [note('E')], words: ['E-cell field'] })] },
      bass: { id: 'P2', name: 'Upright Bass', measures: [measure({ notes: [note('E', 2)], harmony: ['E'] })] },
    });
    assert.match(bassSymbol.failures.join('\n'), /upright bass has 1 chord symbol/);

    const broken = assessHarmonicNotation(
      duo([measure({ notes: [note('E')], words: ['E-cell field'], gridAgrees: false })])
    );
    assert.match(broken.failures.join('\n'), /musical event integrity/);

    const crowded = assessHarmonicNotation(
      duo([
        measure({
          notes: [note('E')],
          words: ['E-cell field', 'one', 'two', 'three', 'four'],
          rehearsal: ['A'],
        }),
      ])
    );
    assert.deepEqual(crowded.overcrowdedBars, [1]);
    assert.match(crowded.failures.join('\n'), /potentially overcrowded/);
  });

  check('V1.2 does not apply the harmonic gate and V1.5 does', () => {
    const wrong = JSON.parse(fs.readFileSync(path.join(specDir, '06-wrong-turning.json'), 'utf8')) as WpsSongSpec;
    const historical = runWps(wrong);
    assert.equal(historical.ok, true, historical.lines.filter((line) => line.startsWith('FAIL')).join('; '));
    assert.equal(historical.lines.some((line) => line.startsWith('Harmonic notation:')), false);
    const gated = runWps({ ...wrong, wpsVersion: '1.5' });
    const text = gated.lines.join('\n');
    assert.match(text, /Harmonic notation:/);
    assert.match(text, /Sibelius visual verification: NOT PERFORMED/);
    assert.match(text, /XML validation is not visual proof/);
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
