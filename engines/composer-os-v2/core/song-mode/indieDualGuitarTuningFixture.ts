import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { addEvent, createMeasure, createNote, createScore } from '../score-model/scoreEventBuilder';

export const INDIE_TUNING_FIXTURE_FRETS = [0, 3, 5, 7, 12] as const;
export type IndieTuningFixtureFret = (typeof INDIE_TUNING_FIXTURE_FRETS)[number];

export const INDIE_TUNING_FIXTURE_GUITAR_1 = ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'] as const;
export const INDIE_TUNING_FIXTURE_GUITAR_2 = ['C2', 'G2', 'D3', 'G3', 'B3', 'D4'] as const;
const INDIE_TUNING_FIXTURE_STANDARD = ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'] as const;

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

function noteNameToMidi(note: string): number {
  const m = /^([A-G])([#b]?)(-?\d+)$/.exec(note.trim());
  if (!m) throw new Error(`Invalid note format: ${note}`);
  const key = `${m[1]}${m[2] ?? ''}`;
  const semitone = NOTE_TO_SEMITONE[key];
  if (semitone == null) throw new Error(`Unsupported note spelling: ${note}`);
  const octave = Number(m[3]);
  return (octave + 1) * 12 + semitone;
}

function transposeSet(midi: readonly number[], semitones: number): number[] {
  return midi.map((p) => p + semitones);
}

function buildSixNoteBar(index: number, pitches: readonly number[]): MeasureModel {
  const m = createMeasure(index);
  for (const p of pitches) {
    addEvent(m, createNote(p, 0, 4, 1));
  }
  return m;
}

function buildFixturePart(
  id: 'guitar' | 'guitar_2',
  name: 'Clean Electric Guitar' | 'Electric Guitar 2',
  openMidi: readonly number[]
): PartModel {
  const measures: MeasureModel[] = [];
  for (let i = 0; i < INDIE_TUNING_FIXTURE_FRETS.length; i++) {
    const fret = INDIE_TUNING_FIXTURE_FRETS[i]!;
    measures.push(buildSixNoteBar(i + 1, transposeSet(openMidi, fret)));
  }
  return {
    id,
    name,
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures,
  };
}

export function expectedPitchTableForTuning(tuning: readonly string[]): Record<IndieTuningFixtureFret, number[]> {
  const openMidi = tuning.map(noteNameToMidi);
  return {
    0: transposeSet(openMidi, 0),
    3: transposeSet(openMidi, 3),
    5: transposeSet(openMidi, 5),
    7: transposeSet(openMidi, 7),
    12: transposeSet(openMidi, 12),
  };
}

export function buildIndieDualGuitarTuningFixtureScore(): ScoreModel {
  const guitar1Open = INDIE_TUNING_FIXTURE_GUITAR_1.map(noteNameToMidi);
  const guitar2Open = INDIE_TUNING_FIXTURE_GUITAR_2.map(noteNameToMidi);
  return createScore(
    'Indie Art Pop Dual Guitar Tuning Verification Fixture',
    [
      buildFixturePart('guitar', 'Clean Electric Guitar', guitar1Open),
      buildFixturePart('guitar_2', 'Electric Guitar 2', guitar2Open),
    ],
    { tempo: 72 }
  );
}

export function standardGuitarMidiSet(): number[] {
  return INDIE_TUNING_FIXTURE_STANDARD.map(noteNameToMidi);
}
