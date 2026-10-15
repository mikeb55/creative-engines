/**
 * Pentatonic Options V2.1 — field spelling and source rhythm.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/pentatonicSpellingRhythm.test.ts
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { CLEAN_ELECTRIC_GUITAR } from '../core/instrument-profiles/guitarProfile';
import { createNote, createPart, createScore } from '../core/score-model/scoreEventBuilder';
import { readWrittenStaffMeasure } from '../core/pentatonic/motifAnnotationExtract';
import { exportOrbitPracticePhrase } from '../core/pentatonic/orbitPhraseExport';
import {
  explicitSpelling,
  exportGuitarMusicXml,
  generatePracticeExample,
} from '../core/pentatonic/practiceFacade';
import { realisePentatonicPhrase, sourceRhythmAfterTransform, transformCell } from '../core/pentatonic/phraseOperators';
import { manualCollection } from '../core/pentatonic/dev4cWorkflow';
import { spellFromReference } from '../core/pentatonic/pitch';
import { getPentatonicArchetype } from '../core/pentatonic/registry';

const ORBIT = '/Users/user/Documents/DEVS/ECM-Album-Nov-2027/00 - WWH DUO LEADSHEETS/05-Orbit-Duo-Leadsheet-V2.1.musicxml';

function pitchesOf(notes: string): string {
  return notes
    .split(/\s+/)
    .map((token) => {
      const spelling = explicitSpelling(token);
      assert.ok(spelling, token);
      return `<step>${spelling.step}</step>${spelling.alter === 0 ? '' : `<alter>${spelling.alter}</alter>`}`;
    })
    .join('\n');
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

  check('F minor pentatonic spells F Ab Bb C Eb', () => {
    const archetype = getPentatonicArchetype('minor_pentatonic');
    assert.ok(archetype);
    const notes = spellFromReference('F', archetype.intervals, archetype.letterSteps);
    assert.deepEqual(notes, ['F', 'Ab', 'Bb', 'C', 'Eb']);
    const xml = exportGuitarMusicXml({
      title: 'F minor pentatonic',
      chord: 'N.C.',
      bars: [[65, 68, 70, 72, 75]],
      pitchClassSpelling: { 5: 'F', 8: 'Ab', 10: 'Bb', 0: 'C', 3: 'Eb' },
    });
    assert.match(xml, /<kind text="N\.C\.">none<\/kind>/);
    assert.doesNotMatch(xml, /<kind[^>]*>major<\/kind>/);
    assert.match(xml, /<step>A<\/step><alter>-1<\/alter>/);
    assert.match(xml, /<step>B<\/step><alter>-1<\/alter>/);
    assert.match(xml, /<step>E<\/step><alter>-1<\/alter>/);
    assert.equal(xml.includes('<step>D</step><alter>1</alter>'), false);
    assert.equal(xml.includes('<step>G</step><alter>1</alter>'), false);
    assert.equal(xml.includes('<step>A</step><alter>1</alter>'), false);
    assert.equal(pitchesOf(notes.join(' ')).includes('<step>A</step>'), true);
  });

  check('E major pentatonic spells E F# G# B C#', () => {
    const archetype = getPentatonicArchetype('major_pentatonic');
    assert.ok(archetype);
    const notes = spellFromReference('E', archetype.intervals, archetype.letterSteps);
    assert.deepEqual(notes, ['E', 'F#', 'G#', 'B', 'C#']);
    const xml = exportGuitarMusicXml({
      title: 'E major pentatonic',
      chord: 'N.C.',
      bars: [[64, 66, 68, 71, 73]],
      pitchClassSpelling: { 4: 'E', 6: 'F#', 8: 'G#', 11: 'B', 1: 'C#' },
    });
    assert.match(xml, /<step>F<\/step><alter>1<\/alter>/);
    assert.match(xml, /<step>G<\/step><alter>1<\/alter>/);
    assert.match(xml, /<step>C<\/step><alter>1<\/alter>/);
    assert.equal(xml.includes('<alter>-1</alter>'), false);
  });

  check('generated F-minor field does not substitute D# G# A#', () => {
    const example = generatePracticeExample({
      category: 'CELL_LINEAGE',
      centre: 'F',
      fieldId: 'minor_pentatonic',
      motif: 'F Eb G# Bb',
      chord: 'Fmaj7#11',
      variation: 0,
    });
    assert.equal(example.musicXml.includes('<step>D</step><alter>1</alter>'), false);
    assert.equal(example.musicXml.includes('<step>G</step><alter>1</alter>'), false);
    assert.equal(example.musicXml.includes('<step>A</step><alter>1</alter>'), false);
    assert.match(example.notes, /Eb|Ab|Bb/);
  });

  check('source G# remains G#', () => {
    const xml = exportGuitarMusicXml({
      title: 'source G#',
      chord: 'N.C.',
      bars: [[68]],
      timed: [[{ kind: 'note', startBeat: 0, duration: 4, pitch: 68, spelling: { step: 'G', alter: 1 } }]],
      pitchClassSpelling: { 8: 'Ab' },
    });
    assert.match(xml, /<step>G<\/step><alter>1<\/alter>/);
    assert.equal(xml.includes('<step>A</step><alter>-1</alter>'), false);
  });

  check('SLIP outside field uses its own spelling', () => {
    const example = generatePracticeExample({
      category: 'OUTSIDE_RETURN',
      centre: 'F',
      fieldId: 'minor_pentatonic',
      motif: 'F Ab C',
      chord: 'Fmaj7#11',
      variation: 2,
    });
    if (example.operator !== 'SLIP' || example.pitches.length === 0) return;
    assert.equal(example.musicXml.includes('<step>D</step><alter>1</alter>'), false);
    assert.match(example.musicXml, /<step>[A-G]<\/step>/);
  });

  check('exporter without explicit spelling stays on the sharp default', () => {
    const part = createPart('guitar', 'Electric Guitar', CLEAN_ELECTRIC_GUITAR.instrumentIdentity, CLEAN_ELECTRIC_GUITAR.midiProgram, 'treble', 1, () => 'C', () => undefined);
    part.measures[0]!.measureBeatSpanQuarters = 4;
    part.measures[0]!.events = [createNote(63, 0, 4, 1)];
    const score = createScore('plain', [part], { tempo: 120 });
    score.timeSignature = { beats: 4, beatType: 4 };
    score.barMeterMap = { 1: { numerator: 4, denominator: 4 } };
    const first = exportScoreModelToMusicXml(score);
    const second = exportScoreModelToMusicXml(score);
    assert.equal(first.success && second.success, true);
    assert.equal(first.xml, second.xml);
    assert.match(first.xml ?? '', /<step>D<\/step><alter>1<\/alter>/);
    const spelled = createNote(63, 0, 4, 1);
    spelled.spelling = { step: 'E', alter: -1 };
    part.measures[0]!.events = [spelled];
    const flat = exportScoreModelToMusicXml(score);
    assert.match(flat.xml ?? '', /<step>E<\/step><alter>-1<\/alter>/);
    assert.notEqual(flat.xml, first.xml);
  });

  check('Orbit source-derived cell keeps source rhythm and rests', () => {
    const source = fs.readFileSync(ORBIT, 'utf8');
    const bar = readWrittenStaffMeasure(source, 'guitar', '2');
    const home = manualCollection('minor_pentatonic', 'F');
    const motif = {
      id: 'orbit-2',
      barCount: 1,
      notes: bar.events.filter((event) => event.kind === 'note').map((event) => ({ pitch: event.pitch!, startBeat: event.startBeat, duration: event.duration })),
    };
    const realisation = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home,
      motif,
      operator: 'CELL_LINEAGE',
      sourceRhythm: bar.events.map((event) => ({ kind: event.kind, startBeat: event.startBeat, duration: event.duration })),
    });
    assert.equal(realisation.rhythm, 'source');
    assert.deepEqual(
      realisation.rhythmEvents.map((event) => [event.kind, event.startBeat, event.duration]),
      bar.events.map((event) => [event.kind, event.startBeat, event.duration])
    );
    const phrase = exportOrbitPracticePhrase(source);
    const exported = readWrittenStaffMeasure(phrase.xml, 'guitar', '2');
    const sourceDurations = bar.events.map((event) => event.duration);
    const exportedDurations = exported.events.map((event) => event.duration);
    sourceDurations.forEach((duration, index) => {
      assert.ok(Math.abs(duration - (exportedDurations[index] ?? -1)) < 0.02, `${duration} vs ${exportedDurations[index]}`);
    });
  });

  check('RESEAT of a source motif keeps source rhythm', () => {
    const home = manualCollection('minor_pentatonic', 'F');
    const rhythm = [
      { kind: 'rest' as const, startBeat: 0, duration: 0.5 },
      { kind: 'note' as const, startBeat: 0.5, duration: 1 },
      { kind: 'note' as const, startBeat: 1.5, duration: 0.5 },
      { kind: 'note' as const, startBeat: 2, duration: 1.5 },
      { kind: 'rest' as const, startBeat: 3.5, duration: 0.5 },
    ];
    const realisation = realisePentatonicPhrase({
      purpose: 'MOTIF',
      home,
      motif: {
        id: 'reseat',
        barCount: 1,
        notes: [
          { pitch: 65, startBeat: 0.5, duration: 1 },
          { pitch: 68, startBeat: 1.5, duration: 0.5 },
          { pitch: 70, startBeat: 2, duration: 1.5 },
        ],
      },
      operator: 'RESEAT',
      explicitReseat: true,
      sourceRhythm: rhythm,
      reseat: { preference: 'bass', bassPc: 5 },
    });
    assert.equal(realisation.rhythm, 'source');
    assert.deepEqual(
      realisation.rhythmEvents.map((event) => [event.kind, event.startBeat, event.duration]),
      rhythm.map((event) => [event.kind, event.startBeat, event.duration])
    );
  });

  check('transformCell keeps the supplied source rhythm beside the mapped pitches', () => {
    const home = manualCollection('minor_pentatonic', 'F');
    const rhythm = [
      { kind: 'note' as const, startBeat: 0, duration: 1.5 },
      { kind: 'rest' as const, startBeat: 1.5, duration: 0.5 },
      { kind: 'note' as const, startBeat: 2, duration: 0.25 },
      { kind: 'note' as const, startBeat: 2.25, duration: 0.75 },
    ];
    const pitches = transformCell({ pitches: [65, 68, 70], collection: home, transform: 'M-DEG', target: home });
    const kept = sourceRhythmAfterTransform(rhythm);
    assert.deepEqual(kept, rhythm);
    assert.equal(pitches.length, 3);
  });

  check('a manual example with no source motif stays on even rhythm', () => {
    const example = generatePracticeExample({ category: 'CELL_LINEAGE', centre: 'C', motif: 'C Eb F', variation: 0 });
    assert.equal(example.rhythm, 'generated');
    assert.match(example.musicXml, /<type>quarter<\/type>/);
  });

  return rows;
}

const rows = run();
for (const row of rows) console.log(`${row.ok ? 'PASS' : 'FAIL'} ${row.name}`);
if (rows.some((row) => !row.ok)) process.exit(1);
