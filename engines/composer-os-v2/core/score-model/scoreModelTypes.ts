/**
 * Composer OS V2 — Score model types
 * Single source of truth for export. All generation flows into this model.
 */

/** Divisions per quarter note (MusicXML standard). */
export const DIVISIONS = 4;

/** Beats per measure (4/4). */
export const BEATS_PER_MEASURE = 4;

/** Measure duration in divisions. */
export const MEASURE_DIVISIONS = DIVISIONS * BEATS_PER_MEASURE;

/** Articulation metadata (performance pass). */
export type Articulation = 'staccato' | 'tenuto' | 'accent';

/** Note event: pitch in MIDI, startBeat 0–4, duration in beats. */
export interface NoteEvent {
  kind: 'note';
  pitch: number;
  startBeat: number;
  duration: number;
  voice?: number;
  articulation?: Articulation;
}

/** Rest event. */
export interface RestEvent {
  kind: 'rest';
  startBeat: number;
  duration: number;
  voice?: number;
}

/** Union of note/rest. */
export type ScoreEvent = NoteEvent | RestEvent;

/** Chord symbol event (measure-level). */
export interface ChordSymbolEvent {
  kind: 'chord';
  chord: string;
}

/** Rehearsal mark event (measure-level). */
export interface RehearsalMarkEvent {
  kind: 'rehearsal';
  label: string;
}

/** Tempo event (score-level, typically measure 1). */
export interface TempoEvent {
  kind: 'tempo';
  bpm: number;
}

/** Time signature event. */
export interface TimeSignatureEvent {
  kind: 'time';
  beats: number;
  beatType: number;
}

/** One measure: events + optional chord + optional rehearsal mark. */
export interface MeasureModel {
  index: number; // 1-based
  events: ScoreEvent[];
  chord?: string;
  rehearsalMark?: string;
}

/** One part (e.g. guitar, bass). */
export interface PartModel {
  id: string;
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
  measures: MeasureModel[];
}

/** Full score model. */
export interface ScoreModel {
  title: string;
  tempo?: number;
  timeSignature?: { beats: number; beatType: number };
  parts: PartModel[];
}
