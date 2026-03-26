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

/** Articulation metadata (performance pass / expressive feel). */
export type Articulation = 'staccato' | 'tenuto' | 'accent';

/** Playback / feel metadata (does not change bar structure). */
export interface FeelProfile {
  /** Long:short eighth ratio for swing interpretation (e.g. 2.0 ≈ triplet swing). */
  swingRatio: number;
  tempoFeel: 'slow' | 'medium' | 'fast';
  /** Smooth drift budget across the form (beats), for display / playback hints only. */
  driftTotalBeats: number;
}

/** Note event: pitch in MIDI, startBeat 0–4, duration in beats. */
export interface NoteEvent {
  kind: 'note';
  pitch: number;
  startBeat: number;
  duration: number;
  voice?: number;
  articulation?: Articulation;
  /** MIDI velocity 1–127; optional expressive shaping (ghost notes, comp). */
  velocity?: number;
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

/** Narrative / moment hint for duo shaping (metadata only; not read by exporter). */
export type MomentTag = 'peak' | 'cadence' | 'handoff';

/** One measure: events + optional chord + optional rehearsal mark. */
export interface MeasureModel {
  index: number; // 1-based
  events: ScoreEvent[];
  chord?: string;
  rehearsalMark?: string;
  /** Optional duo narrative tag (peak bar, handoff, final cadence). */
  momentTag?: MomentTag;
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

/** MusicXML key signature line (additive; does not change harmony generation). */
export interface KeySignatureLine {
  fifths: number;
  mode: 'major' | 'minor';
  hideKeySignature: boolean;
  caption?: string;
}

/** Full score model. */
export interface ScoreModel {
  title: string;
  tempo?: number;
  timeSignature?: { beats: number; beatType: number };
  /** Optional duo feel hint (export as direction text; no structural change). */
  feelProfile?: FeelProfile;
  /** V3.4 — exporter reads this for `<key>`; when omitted, defaults to C / visible. */
  keySignature?: KeySignatureLine;
  parts: PartModel[];
}
