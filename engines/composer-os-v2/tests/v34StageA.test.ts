/**
 * Composer OS V3.4 Stage A — catalogue, notation, transposition, tempo map.
 * New export fields are opt-in. Absent fields keep the baseline MusicXML hashes.
 */

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { validateExportedMusicXmlBarMath } from '../core/export/validateMusicXmlBarMath';
import { validateMusicXmlSchema } from '../core/export/musicxmlValidation';
import { validateWrittenMusicXmlComplete } from '../core/export/validateMusicXmlWrittenStrict';
import {
  documentedRangeLine,
  getInstrument,
  inspectCataloguePitch,
  listInstruments,
} from '../core/instruments/instrumentCatalogue';
import {
  ALTO_SAX_TRANSPOSITION,
  BARITONE_SAX_TRANSPOSITION,
  CELESTA_TRANSPOSITION,
  GLOCKENSPIEL_TRANSPOSITION,
  HORN_F_TRANSPOSITION,
  TENOR_SAX_TRANSPOSITION,
  TRUMPET_BB_TRANSPOSITION,
} from '../core/instruments/instrumentCatalogue';
import { soundingToWritten, spellMidi, writtenToSounding } from '../core/instruments/writtenPitch';
import { addEvent, createMeasure, createNote, createScore } from '../core/score-model/scoreEventBuilder';
import type { NoteNotationV34, PartModel, ScoreModel } from '../core/score-model/scoreModelTypes';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { runRiffGenerator } from '../core/riff-generator/runRiffGenerator';
import { roleOf } from '../core/musical-evaluation/canonicalScore';

const BASELINE = {
  'legacy-fields': 'dd5b911bcce37a2c4507e379c53938954158fbea3215cc6c6f4366009d337ec2',
  duo: '8e3ad7a3ff0dc85a03f65060ee00ad74ca7935ea0e889dd6b51acce8b83eb7fd',
  string_quartet: '2d7f15b4cd1f8b6438674c8b811ecbefb5f41135dba98be467e2592e2505289a',
  big_band: '2d7f15b4cd1f8b6438674c8b811ecbefb5f41135dba98be467e2592e2505289a',
  ecm: 'ff2a8d7dfd5466df366d2fdbc044e47e1338c8f10569169ac99d5d88aeca24a2',
  song_mode: '49a7bcd20a8eacf223c8edb2f96694ee71a478dbe35a48b880b066e7b71375aa',
  riff: '4303177d21535bc64a4783aea769680e6708b8dd486a7fc022fd5c1d1370ce18',
} as const;

function sha(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function wholeBar(index: number, pitch: number, notation?: NoteNotationV34) {
  const measure = createMeasure(index);
  const note = createNote(pitch, 0, 4);
  if (notation) note.notation = notation;
  addEvent(measure, note);
  return measure;
}

function part(id: string, name: string, clef: 'treble' | 'bass', measures: PartModel['measures']): PartModel {
  return {
    id,
    name,
    instrumentIdentity: id,
    midiProgram: 0,
    clef,
    measures,
  };
}

export function runV34StageATests(): Array<{ name: string; ok: boolean; detail?: string }> {
  const rows: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const check = (name: string, fn: () => void) => {
    try {
      fn();
      rows.push({ name, ok: true });
    } catch (error) {
      rows.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  };

  check('T1 Bb trumpet written D5', () => {
    const written = soundingToWritten(72, TRUMPET_BB_TRANSPOSITION);
    assert.equal(written.midi, 74);
    assert.equal(written.step, 'D');
    assert.equal(written.alter, 0);
    assert.equal(written.octave, 5);
    assert.deepEqual(getInstrument('trumpet_bb').transposition, { diatonic: -1, chromatic: -2, octaveChange: 0 });
    const score = transposedPartScore('tpt', 74, TRUMPET_BB_TRANSPOSITION);
    const xml = mustXml(score);
    assert.match(xml, /<diatonic>-1<\/diatonic>/);
    assert.match(xml, /<chromatic>-2<\/chromatic>/);
    assert.match(xml, /<octave-change>0<\/octave-change>/);
    assert.match(xml, /<step>D<\/step><octave>5<\/octave>/);
  });

  check('T2 alto sax written C5', () => {
    const written = soundingToWritten(63, ALTO_SAX_TRANSPOSITION);
    assert.equal(written.midi, 72);
    assert.equal(written.step, 'C');
    assert.equal(written.octave, 5);
    assert.deepEqual(getInstrument('alto_sax').transposition, { diatonic: -5, chromatic: -9, octaveChange: 0 });
  });

  check('T3 tenor sax written C5', () => {
    const written = soundingToWritten(58, TENOR_SAX_TRANSPOSITION);
    assert.equal(written.midi, 72);
    assert.equal(written.step, 'C');
    assert.equal(written.octave, 5);
    assert.deepEqual(getInstrument('tenor_sax').transposition, { diatonic: -1, chromatic: -2, octaveChange: -1 });
  });

  check('T4 baritone sax written C5', () => {
    const written = soundingToWritten(51, BARITONE_SAX_TRANSPOSITION);
    assert.equal(written.midi, 72);
    assert.equal(written.step, 'C');
    assert.equal(written.octave, 5);
    assert.deepEqual(getInstrument('baritone_sax').transposition, { diatonic: -5, chromatic: -9, octaveChange: -1 });
  });

  check('T5 horn in F written C5', () => {
    const written = soundingToWritten(65, HORN_F_TRANSPOSITION);
    assert.equal(written.midi, 72);
    assert.equal(written.step, 'C');
    assert.equal(written.octave, 5);
    assert.deepEqual(getInstrument('horn_f').transposition, { diatonic: -4, chromatic: -7, octaveChange: 0 });
  });

  check('T6 glockenspiel and celesta sounding octaves', () => {
    const written = spellMidi(72);
    const glock = writtenToSounding(written, GLOCKENSPIEL_TRANSPOSITION);
    const celesta = writtenToSounding(written, CELESTA_TRANSPOSITION);
    assert.equal(glock.midi, 96);
    assert.equal(glock.step, 'C');
    assert.equal(glock.octave, 7);
    assert.equal(celesta.midi, 84);
    assert.equal(celesta.octave, 6);
    assert.equal(getInstrument('glockenspiel').transposition.octaveChange, 2);
    assert.equal(getInstrument('celesta').transposition.octaveChange, 1);
  });

  check('T7 documented sounding ranges', () => {
    assert.equal(documentedRangeLine('violin'), '55–105');
    assert.equal(documentedRangeLine('viola'), '48–93');
    assert.equal(documentedRangeLine('cello'), '36–81');
    assert.equal(documentedRangeLine('double_bass'), '23–67');
    assert.equal(documentedRangeLine('flute'), '59–98');
    assert.equal(documentedRangeLine('oboe'), '58–91');
    assert.equal(documentedRangeLine('bassoon'), '34–75');
    assert.equal(documentedRangeLine('horn_f'), '35–77');
    assert.equal(documentedRangeLine('trumpet_bb'), '52–84');
    assert.equal(documentedRangeLine('trombone'), '40–77');
    assert.equal(documentedRangeLine('tuba'), '26–67');
    assert.equal(documentedRangeLine('alto_sax'), '49–82');
    assert.equal(documentedRangeLine('tenor_sax'), '44–77');
    assert.equal(documentedRangeLine('baritone_sax'), '37–70 (36 with low-A extension)');
    assert.equal(documentedRangeLine('harp'), '23–104');
    assert.equal(getInstrument('baritone_sax').soundingHardRange?.[0], 36);
    for (const item of listInstruments()) {
      assert.equal(item.comfortInferred, true);
      assert.ok(item.sources.length > 0);
      if (item.soundingHardRange && item.soundingComfortRange) {
        assert.ok(item.soundingComfortRange[0] >= item.soundingHardRange[0]);
        assert.ok(item.soundingComfortRange[1] <= item.soundingHardRange[1]);
      }
    }
  });

  check('T8 violin F#3 flagged and not moved', () => {
    const result = inspectCataloguePitch('violin', 54);
    assert.equal(result.pitch, 54);
    assert.equal(result.flags[0]?.kind, 'outside_hard_range');
  });

  check('T20 slur pizz and cello hairpin', () => {
    const vn = part('vn1', 'Violin I', 'treble', [
      wholeBar(1, 72, { slur: 'start' }),
      wholeBar(2, 74, { slur: 'stop' }),
      wholeBar(3, 76, { technique: 'pizz' }),
    ]);
    const vc = part('vc', 'Cello', 'bass', [
      wholeBar(1, 48),
      wholeBar(2, 48),
      wholeBar(3, 48),
    ]);
    const score = createScore('Notation', [vn, vc], { tempo: 72 });
    score.partDynamics = {
      vc: [
        { bar: 1, beat: 0, wedge: 'crescendo' },
        { bar: 2, beat: 0, wedge: 'stop' },
      ],
    };
    const xml = mustXml(score);
    const vcPart = xml.split('<part id="vc">')[1]?.split('</part>')[0] ?? '';
    assert.match(xml, /<slur type="start"\/>/);
    assert.match(xml, /<slur type="stop"\/>/);
    assert.match(xml, /<sound pizzicato="yes"\/>/);
    assert.match(vcPart, /<wedge type="crescendo"\/>/);
    assert.match(vcPart, /<wedge type="stop"\/>/);
    assert.equal(vcPart.includes('<slur'), false);
    const barMath = validateExportedMusicXmlBarMath(xml);
    assert.equal(barMath.valid, true, barMath.errors.join('; '));
    const strict = validateWrittenMusicXmlComplete(score, xml);
    assert.equal(strict.valid, true, strict.errors.join('; '));
    const schema = validateMusicXmlSchema(xml);
    assert.equal(schema.valid, true, schema.errors.join('; '));
  });

  check('T20 chromatic transpose element stays the old shape', () => {
    const legacy = legacyScore();
    const xml = mustXml(legacy);
    assert.match(xml, /<transpose><chromatic>-2<\/chromatic><\/transpose>/);
    assert.equal(xml.includes('<diatonic>'), false);
    assert.equal(xml.includes('<octave-change>'), false);
    assert.equal(sha(xml), BASELINE['legacy-fields']);
  });

  check('X3 tempo map and timecode', () => {
    const score = createScore('Tempo', [part('p', 'Flute', 'treble', [wholeBar(1, 72), wholeBar(2, 74)])], { tempo: 120 });
    score.tempoMap = [
      { bar: 1, beat: 0, bpm: 84, beatUnit: 'quarter' },
      { bar: 2, beat: 2, bpm: 60, beatUnit: 'half', label: 'slower' },
    ];
    score.timecodeMarks = [{ bar: 1, beat: 0, smpte: '01:00:00:00', label: 'picture start' }];
    const xml = mustXml(score);
    assert.equal((xml.match(/<sound tempo="/g) ?? []).length, 2);
    assert.match(xml, /<per-minute>84<\/per-minute>/);
    assert.match(xml, /<sound tempo="84"\/>/);
    assert.match(xml, /<beat-unit>half<\/beat-unit>/);
    assert.match(xml, /<per-minute>60<\/per-minute>/);
    assert.match(xml, /<sound tempo="120"\/>/);
    assert.match(xml, /<offset>960<\/offset>/);
    assert.match(xml, /01:00:00:00 picture start/);
    const strict = validateWrittenMusicXmlComplete(score, xml);
    assert.equal(strict.valid, true, strict.errors.join('; '));
    const schema = validateMusicXmlSchema(xml);
    assert.equal(schema.valid, true, schema.errors.join('; '));
  });

  check('X6 orchestral roles', () => {
    assert.equal(roleOf('Flute'), 'flute');
    assert.equal(roleOf('Oboe'), 'oboe');
    assert.equal(roleOf('Clarinet in Bb'), 'clarinet');
    assert.equal(roleOf('Bassoon'), 'bassoon');
    assert.equal(roleOf('Horn in F'), 'horn');
    assert.equal(roleOf('Trumpet'), 'trumpet');
    assert.equal(roleOf('Tenor Trombone'), 'trombone');
    assert.equal(roleOf('Tuba'), 'tuba');
    assert.equal(roleOf('Alto Sax'), 'saxophone');
    assert.equal(roleOf('Harp'), 'harp');
    assert.equal(roleOf('Timpani'), 'percussion');
    assert.equal(roleOf('Synth'), 'synth');
    assert.equal(roleOf('Electric Guitar'), 'guitar');
    assert.equal(roleOf('Cello'), 'cello');
  });

  check('T21 generation fingerprints', () => {
    const legacy = mustXml(legacyScore());
    assert.equal(sha(legacy), BASELINE['legacy-fields']);
    const duo = runGoldenPathOnce(3340, { presetId: 'guitar_bass_duo', totalBars: 8 });
    const sq = runGoldenPathOnce(3340, { presetId: 'string_quartet', totalBars: 8 });
    const bb = runGoldenPathOnce(3340, { presetId: 'big_band', totalBars: 8 });
    const ecm = runGoldenPathOnce(3340, { presetId: 'ecm_chamber', totalBars: 8 });
    const song = runGoldenPathOnce(3340, { presetId: 'song_mode', totalBars: 8, primarySongwriterStyle: 'bacharach' });
    const riff = runRiffGenerator(3340, {
      bars: 2,
      style: 'neutral',
      grid: 'eighth',
      density: 'medium',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 120,
    });
    assert.equal(sha(duo.xml ?? ''), BASELINE.duo);
    assert.equal(sha(sq.xml ?? ''), BASELINE.string_quartet);
    assert.equal(sha(bb.xml ?? ''), BASELINE.big_band);
    assert.equal(sha(ecm.xml ?? ''), BASELINE.ecm);
    assert.equal(sha(song.xml ?? ''), BASELINE.song_mode);
    assert.equal(sha(riff.xml ?? ''), BASELINE.riff);
  });

  return rows;
}

function transposedPartScore(id: string, writtenMidi: number, transposition: { diatonic: number; chromatic: number; octaveChange: number }): ScoreModel {
  const score = createScore('Transpose', [part(id, id, 'treble', [wholeBar(1, writtenMidi)])], { tempo: 120 });
  score.exportPartTranspose = { [id]: transposition };
  return score;
}

function legacyScore(): ScoreModel {
  const measure = createMeasure(1, 'Cmaj7');
  addEvent(measure, createNote(60, 0, 2, 1));
  const accented = createNote(64, 2, 2, 1);
  accented.articulation = 'staccato';
  addEvent(measure, accented);
  const score = createScore('Legacy', [
    {
      id: 'guitar',
      name: 'Guitar',
      instrumentIdentity: 'clean_electric_guitar',
      midiProgram: 27,
      clef: 'treble',
      measures: [measure],
    },
  ], { tempo: 96 });
  score.measureDynamicsMarkings = { 1: 'mf' };
  score.exportPartTransposeSemitones = { guitar: -2 };
  return score;
}

function mustXml(score: ScoreModel): string {
  const result = exportScoreModelToMusicXml(score);
  assert.equal(result.success, true, result.errors.join('; '));
  return result.xml ?? '';
}

const direct = process.argv[1]?.includes('v34StageA');
if (direct) {
  const rows = runV34StageATests();
  for (const row of rows) {
    console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}${row.detail ? ` — ${row.detail}` : ''}`);
  }
  const failed = rows.filter((row) => !row.ok).length;
  console.log(`${rows.length - failed}/${rows.length}`);
  process.exit(failed === 0 ? 0 : 1);
}
