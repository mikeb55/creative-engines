/**
 * Composer OS V2 — Score model types
 * Single source of truth for export. All generation flows into this model.
 */

import type { WybleConsumptionReceipt } from '../wyble/wybleConsumptionReceipt';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { SonicYouthExtension } from './sonicYouthChordTypes';

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
  /** Optional multi-pitch stack (same startBeat/duration); exporter emits as `<chord/>` followers. */
  pitches?: number[];
  startBeat: number;
  duration: number;
  voice?: number;
  articulation?: Articulation;
  /** MIDI velocity 1–127; optional expressive shaping (ghost notes, comp). */
  velocity?: number;
  /** Export-only duration emphasis (MusicXML stress); does not change note duration. */
  durationAccent?: 'none' | 'stress';
  /** Optional motif/riff identity tag (symbolic layer; not exported to MusicXML). */
  motifRef?: string;
}

/** Rest event. */
export interface RestEvent {
  kind: 'rest';
  startBeat: number;
  duration: number;
  voice?: number;
}

/** Timed chord stack (multiple MIDI pitches, one rhythmic attack); exporter emits MusicXML `<chord/>` followers. */
export interface ChordEvent {
  kind: 'chord';
  pitches: number[];
  startBeat: number;
  duration: number;
  voice: number;
  motifRef?: string;
  /** Optional resolved symbol for this stack (Sonic Youth / lead-sheet bridges); null = explicitly none. PIPELINE: guard before string ops. */
  chordSymbol?: string | null;
  /** Sonic Youth v1 — alternate tunings, drones, cross-guitar dissonance (profile-gated). */
  sonicYouth?: SonicYouthExtension;
  /** James Brown slice — short comp attack (horns / stab rhythm); export may treat as staccato. */
  stabDuration?: 'short' | 'long';
  /** James Brown slice — minor-pentatonic-over-dominant colour flag (not a harmony change). */
  bluesTension?: boolean;
}

/** Union of note, rest, and timed chord stack. */
export type ScoreEvent = NoteEvent | RestEvent | ChordEvent;

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
  /** Lead-sheet / melody-bass format section chord symbol (also mirrored to {@link chord} for export). */
  chordSymbol?: string;
  rehearsalMark?: string;
  /**
   * Quarter-note beats in this measure (e.g. 3.5 for 7/8). When omitted, treated as {@link BEATS_PER_MEASURE}.
   * Should match `resolveMeasureDivisionsForBar(index, barMeterMap) / DIVISIONS` when using mixed meters.
   */
  measureBeatSpanQuarters?: number;
  /** Optional duo narrative tag (peak bar, handoff, final cadence). */
  momentTag?: MomentTag;
}

/** Duo-electric / arrangement shaping (optional; golden-path Indie separate route uses this first). */
export type DuoElectricVoiceRole = 'chordal' | 'balanced' | 'melodic';

/** One part (e.g. guitar, bass). */
export interface PartModel {
  id: string;
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
  measures: MeasureModel[];
  /** Song Mode keyboard-centric writer: export harmony staff as Piano / keys comp (same event layout as duo guitar). */
  songModePresentAsPianoComp?: boolean;
  /** MusicXML `<instrument-name>` inside `<score-instrument>` (defaults to part display name when omitted). */
  scoreInstrumentName?: string;
  /** Optional voice role for dual-electric chord/melody shaping (future ArrangementIntent hook). */
  voiceRole?: DuoElectricVoiceRole;
  /** 0–1: probability roll for adding chord tones on voice 2 from voice-1 anchors (deterministic per bar). */
  chordBias?: number;
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

/** MusicXML repeat barline hints for export only (1-based bar index = exported measure number). */
export type ScoreRepeatMarkerKind = 'repeat_start' | 'repeat_end';

export interface ScoreRepeatMarker {
  bar: number;
  kind: ScoreRepeatMarkerKind;
}

/** Full score model. */
export interface ScoreModel {
  title: string;
  /** When set, MusicXML export + written validation use the same per-bar meters as score construction. */
  barMeterMap?: BarMeterMap;
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
  /** Hook repetition bias from songwriter profile — used by duoBarMathFinalize to gate bar 25 restoration. */
  _hookRepetitionBias?: number;
  /** Portable Wyble: which static map (if any) was applied on this score build (metadata only). */
  wybleConsumptionReceipt?: WybleConsumptionReceipt;
  /**
   * Measure-1 only: per-part tuning labels for MusicXML `<direction><words>` (e.g. Indie separate dual-electric).
   * Keys are part ids (`guitar`, `guitar_2`).
   */
  exportMeasure1TuningWordsByPartId?: Record<string, string>;
  /** V65 P2: per-bar section tuning ids for score/export diagnostics. */
  sectionArchitectureTuningByBarByPartId?: Record<number, Record<string, string>>;
  /** V65 P2: per-bar section profile echo for ensemble score diagnostics. */
  sectionArchitectureProfileByBar?: Record<
    number,
    {
      density?: string;
      minSpreadSemitones?: number;
      maxSpreadSemitones?: number;
      registerFloor?: number;
      registerCeiling?: number;
    }
  >;
  /**
   * Measure-1 `<attributes>` only: chromatic transposition for fixed-offset guitar presets (e.g. Drop D, Eb standard).
   * Keys are part ids; values are semitone offsets (negative = written pitch sounds lower).
   */
  exportPartTransposeSemitones?: Record<string, number>;
  /**
   * When set, MusicXML export emits repeat barlines at the given measures (see `musicxmlExporter`).
   * Generators may omit; pipeline/tests attach for repeat truth.
   */
  repeatMarkers?: ScoreRepeatMarker[];
  /**
   * 1-based measure number → written dynamics token (`pp`, `mf`, `ff`, …) on staff 1 of part 0.
   * Exporter maps to MusicXML &lt;direction&gt;&lt;dynamics&gt;.
   */
  measureDynamicsMarkings?: Record<number, string>;
  parts: PartModel[];
}
