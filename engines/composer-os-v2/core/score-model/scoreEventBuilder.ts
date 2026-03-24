/**
 * Composer OS V2 — Score event builder
 * Builds score model from structured plans.
 */

import type {
  ScoreModel,
  PartModel,
  MeasureModel,
  NoteEvent,
  RestEvent,
  ScoreEvent,
  FeelProfile,
} from './scoreModelTypes';

/** Create empty measure. */
export function createMeasure(index: number, chord?: string, rehearsalMark?: string): MeasureModel {
  return {
    index,
    events: [],
    chord,
    rehearsalMark,
  };
}

/** Create note event. */
export function createNote(pitch: number, startBeat: number, duration: number, voice = 1): NoteEvent {
  return { kind: 'note', pitch, startBeat, duration, voice };
}

/** Create rest event. */
export function createRest(startBeat: number, duration: number, voice = 1): RestEvent {
  return { kind: 'rest', startBeat, duration, voice };
}

/** Add event to measure. */
export function addEvent(measure: MeasureModel, event: ScoreEvent): void {
  measure.events.push(event);
}

/** Create part with empty measures. */
export function createPart(
  id: string,
  name: string,
  instrumentIdentity: string,
  midiProgram: number,
  clef: 'treble' | 'bass',
  measureCount: number,
  chordPerBar: (barIndex: number) => string | undefined,
  rehearsalPerBar: (barIndex: number) => string | undefined
): PartModel {
  const measures: MeasureModel[] = [];
  for (let i = 1; i <= measureCount; i++) {
    measures.push(
      createMeasure(i, chordPerBar(i), rehearsalPerBar(i))
    );
  }
  return { id, name, instrumentIdentity, midiProgram, clef, measures };
}

/** Create score model. */
export function createScore(
  title: string,
  parts: PartModel[],
  options?: { tempo?: number; feelProfile?: FeelProfile }
): ScoreModel {
  return {
    title,
    tempo: options?.tempo,
    timeSignature: { beats: 4, beatType: 4 },
    feelProfile: options?.feelProfile,
    parts,
  };
}
