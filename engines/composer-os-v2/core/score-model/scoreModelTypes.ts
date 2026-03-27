/**
 * Composer OS V2 — Score model types
 * Single source of truth for export. All generation flows into this model.
 */

/**
 * MusicXML divisions per quarter note (fixed; Sibelius-safe integer tick grid).
 * All <duration> values and <type>/<dot/> come from the same tick integer in the exporter.
 */
export const DIVISIONS = 480;

/** Beats per measure (4/4). */
export const BEATS_PER_MEASURE = 4;

/** Measure duration in divisions (4/4 @ DIVISIONS=480 → 1920). */
export const MEASURE_DIVISIONS = DIVISIONS * BEATS_PER_MEASURE;

/** Alias for exporters that name ticks explicitly. */
export const MUSIC_XML_DIVISIONS_PER_QUARTER = DIVISIONS;
export const MEASURE_TICKS_4_4 = MEASURE_DIVISIONS;

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

/** Golden-path duo: how bar math seal snaps rhythm (ECM chamber keeps quarter-beat grid). */
export type DuoRhythmSnapMode = 'quarter' | 'eighth_beats';

/** Full score model. */
export interface ScoreModel {
  title: string;
  tempo?: number;
  timeSignature?: { beats: number; beatType: number };
  /** Optional duo feel hint (export as direction text; no structural change). */
  feelProfile?: FeelProfile;
  /** Set before finalize for guitar_bass_duo Sibelius-safe eighth-beat attacks; ECM omits (quarter grid). */
  duoRhythmSnap?: DuoRhythmSnapMode;
  /** V3.4 — exporter reads this for `<key>`; when omitted, defaults to C / visible. */
  keySignature?: KeySignatureLine;
  /** TEMP V3.4c — mirror receipt for export debug log; remove when stable. */
  keySignatureExportDebug?: { inferredKey: string; inferredFifths: number; exportKeyWritten: boolean };
  parts: PartModel[];
}
