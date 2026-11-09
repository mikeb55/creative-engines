/**
 * exactSingleStaffEventsToXml — ChordEvent grip + pianoExact melody in one 4/4 bar.
 * Run: npx tsx --tsconfig tsconfig.json engines/composer-os-v2/tests/exactSingleStaffChordGrip.test.ts
 */
import assert from 'node:assert/strict';
import { exportScoreModelToMusicXml } from '../core/export/musicxmlExporter';
import { exactSingleStaffEventsToXml, measureUsesExactStaff } from '../core/export/exactSingleStaffXml';
import { q } from '../core/piano/pianoExactTiming';
import { MEASURE_DIVISIONS } from '../core/score-model/scoreModelTypes';
import type { ChordEvent, NoteEvent, PartModel, PianoExactTiming } from '../core/score-model/scoreModelTypes';
import { addEvent, createMeasure, createScore } from '../core/score-model/scoreEventBuilder';

function exactQuarter(onsetBeats: number, durationBeats: number, id: string): PianoExactTiming {
  return {
    onsetQ: q(onsetBeats),
    durationQ: q(durationBeats),
    writtenType: durationBeats === 1 ? 'quarter' : durationBeats === 4 ? 'whole' : 'quarter',
    dots: 0,
    logicalEventId: id,
  };
}

function melodyNote(midi: number, onset: number, id: string): NoteEvent {
  return {
    kind: 'note',
    pitch: midi,
    startBeat: onset,
    duration: 1,
    voice: 1,
    pianoExact: exactQuarter(onset, 1, id),
  };
}

function gripChord(pitches: number[]): ChordEvent {
  return {
    kind: 'chord',
    pitches: [...pitches],
    startBeat: 0,
    duration: 4,
    voice: 2,
    chordSymbol: 'C',
  };
}

function guitarPart(measureEvents: Parameters<typeof addEvent>[1][]): PartModel {
  const m = createMeasure(1);
  for (const event of measureEvents) addEvent(m, event);
  return {
    id: 'guitar',
    name: 'Guitar 1',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures: [m],
  };
}

/** Focused: exact rhythmic melody (v1) + sustained polychord grip (v2). */
{
  const melody = [
    melodyNote(72, 0, 'm0'),
    melodyNote(74, 1, 'm1'),
    melodyNote(76, 2, 'm2'),
    melodyNote(77, 3, 'm3'),
  ];
  const grip = gripChord([60, 64, 67]);
  const part = guitarPart([...melody, grip]);
  const measure = part.measures[0]!;
  assert.equal(measureUsesExactStaff(measure), true);

  const fragment = exactSingleStaffEventsToXml(measure, part, false, MEASURE_DIVISIONS);
  assert.match(fragment, /<voice>1<\/voice>/);
  assert.match(fragment, /<voice>2<\/voice>/);
  assert.match(fragment, /<backup><duration>1920<\/duration><\/backup>/);
  assert.match(fragment, /<octave>5<\/octave>/); // melody C5=72
  assert.match(fragment, /<chord\/>/); // grip stack followers
  assert.equal((fragment.match(/<duration>480<\/duration>/g) ?? []).length, 4); // four quarters v1
  assert.match(fragment, /<duration>1920<\/duration>/); // whole-bar grip
  assert.doesNotMatch(fragment, /<harmony>/); // beat-1 harmony is exporter front-matter, not exact path

  const score = createScore('exact+grip probe', [part], { tempo: 96 });
  score.exportPartTranspose = {
    guitar: { diatonic: 0, chromatic: 0, octaveChange: -1 },
  };
  const exported = exportScoreModelToMusicXml(score);
  assert.equal(exported.success, true, exported.errors?.join('; '));
  const xml = exported.xml!;
  assert.match(xml, /<harmony\b/); // beat-1 from ChordEvent.chordSymbol
  assert.match(xml, /<root-step>C<\/root-step>/);
  assert.match(xml, /<octave-change>-1<\/octave-change>/);
  assert.match(xml, /<voice>1<\/voice>/);
  assert.match(xml, /<voice>2<\/voice>/);
  assert.match(xml, /<backup><duration>1920<\/duration><\/backup>/);
  console.log('PASS exact+grip: both voices, pitches, durations, beat-1 harmony, transpose');
}

/** Regression: exact melody only (no ChordEvent) still exports. */
{
  const melody = [
    melodyNote(60, 0, 'a0'),
    melodyNote(62, 1, 'a1'),
    melodyNote(64, 2, 'a2'),
    melodyNote(65, 3, 'a3'),
  ];
  const part = guitarPart(melody);
  const exported = exportScoreModelToMusicXml(createScore('exact-only probe', [part], { tempo: 96 }));
  assert.equal(exported.success, true, exported.errors?.join('; '));
  const xml = exported.xml!;
  assert.match(xml, /<voice>1<\/voice>/);
  assert.doesNotMatch(xml, /<voice>2<\/voice>/);
  assert.doesNotMatch(xml, /<backup>/);
  assert.equal((xml.match(/<duration>480<\/duration>/g) ?? []).length, 4);
  console.log('PASS exact-only: pianoExact single-voice unchanged');
}

console.log('exactSingleStaffChordGrip: all PASS');
