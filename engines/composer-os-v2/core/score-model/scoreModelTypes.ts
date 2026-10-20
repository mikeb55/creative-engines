/**
 * Composer OS V2 — Score model types
 * Single source of truth for export. All generation flows into this model.
 */

import type { WybleConsumptionReceipt } from '../wyble/wybleConsumptionReceipt';
import type { BarMeterMap } from '../rhythm/barMeterTypes';
import type { SonicYouthExtension } from './sonicYouthChordTypes';
import type { Technique, Transposition } from '../instruments/instrumentTypes';

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

/** V3.4 notation. Unused unless a note sets `notation`. */
export type ArticulationV34 = Articulation | 'marcato' | 'staccatissimo' | 'accent_staccato';

export interface HarmonicNotation {
  kind: 'natural' | 'artificial';
  touchedMidi?: number;
}

export interface NoteNotationV34 {
  articulations?: ArticulationV34[];
  slur?: 'start' | 'stop' | 'continue';
  technique?: Technique;
  harmonic?: HarmonicNotation;
  tremolo?: { type: 'single' | 'unmeasured'; marks?: 1 | 2 | 3 };
  divisi?: { group: string; index: number };
  /** Present only when a note is tied across a bar. Absent leaves export ties unchanged. */
  tie?: 'start' | 'stop' | 'continue';
}

export type DynamicMark = 'ppp' | 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'fff' | 'sfz' | 'fp';

export interface PartDynamicEvent {
  bar: number;
  /** 0-based quarter offset inside the bar. 0 is the downbeat. */
  beat: number;
  mark?: DynamicMark;
  wedge?: 'crescendo' | 'diminuendo' | 'stop';
}

/** Piano grand-staff sustain pedal. Absent leaves MusicXML and MIDI pedal-free. */
export interface PianoPedalEvent {
  bar: number;
  /** Quarter offset inside the bar. The right barline is beat 4. */
  beat: number;
  type: 'start' | 'stop' | 'change';
}

export type TempoBeatUnit = 'quarter' | 'half' | 'eighth' | 'dotted-quarter';

export interface TempoMapEvent {
  bar: number;
  /** 0-based quarter offset inside the bar. 0 is the downbeat. */
  beat: number;
  /** Beats of `beatUnit` per minute. */
  bpm: number;
  beatUnit: TempoBeatUnit;
  label?: string;
}

export interface TimecodeMark {
  bar: number;
  /** 0-based quarter offset inside the bar. 0 is the downbeat. */
  beat: number;
  smpte: string;
  label: string;
}

/** Playback / feel metadata (does not change bar structure). */
export interface FeelProfile {
  /** Long:short eighth ratio for swing interpretation (e.g. 2.0 ≈ triplet swing). */
  swingRatio: number;
  tempoFeel: 'slow' | 'medium' | 'fast';
  /** Smooth drift budget across the form (beats), for display / playback hints only. */
  driftTotalBeats: number;
}

/** Reduced rational in quarter-note units. */
export interface ExactQuarter {
  readonly n: number;
  readonly d: number;
}

/**
 * Piano V1.1 Stage A leaf. Sounding time is onsetQ/durationQ.
 * Written type and tuplet ratio are notation, not a second scaling of duration.
 */
export interface PianoExactTiming {
  onsetQ: ExactQuarter;
  durationQ: ExactQuarter;
  writtenType: string;
  dots: 0 | 1 | 2;
  tuplet?: {
    actualNotes: number;
    normalNotes: number;
    normalType: string;
    groupId: string;
    bracket: 'start' | 'continue' | 'stop';
  };
  logicalEventId: string;
  beams?: { number: number; value: 'begin' | 'continue' | 'end' | 'forward hook' | 'backward hook' }[];
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
  /**
   * Optional written spelling for this sounding pitch.
   * When set, MusicXML export uses this step and alter.
   * When absent, the existing key-signature enharmonic rule is unchanged.
   */
  spelling?: { step: string; alter: number };
  /**
   * Spellings aligned with [pitch, ...stack followers].
   * Absent leaves stack followers on the key-signature spelling.
   */
  stackSpellings?: { step: string; alter: number }[];
  /**
   * V3.4 optional notation. Absent means the existing articulation export is unchanged.
   */
  notation?: NoteNotationV34;
  /**
   * Piano V1.1 Stage A exact timing. Absent leaves legacy beat export unchanged.
   * `startBeat` / `duration` stay as derived floats and must agree with these rationals.
   */
  pianoExact?: PianoExactTiming;
}

/** Rest event. */
export interface RestEvent {
  kind: 'rest';
  startBeat: number;
  duration: number;
  voice?: number;
  /** Piano V1.1 Stage A exact timing. Absent leaves legacy rest export unchanged. */
  pianoExact?: PianoExactTiming;
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
  /**
   * Piano V1.1 Stage A beat groups, in denominator-note units.
   * Absent leaves MusicXML `<time>` as a single numerator.
   */
  pianoBeatGroups?: number[];
  /**
   * Bartók B1 opt-in only. Sixteenth snap for this bar, and undotted splits of one
   * note stay one sounding attack. Absent leaves the existing eighth seal unchanged.
   */
  b1PulsePreserve?: true;
  /**
   * Piano V1.1 polychord. Two MusicXML 3.1 harmony elements plus a words fallback.
   * Absent leaves the single chord-symbol harmony unchanged.
   */
  pianoPolychord?: {
    upper: { step: string; alter: number; kind: 'major' | 'minor' | 'augmented' | 'diminished' };
    lower: { step: string; alter: number; kind: 'major' | 'minor' | 'augmented' | 'diminished' };
    display: string;
  };
}

/** Duo-electric / arrangement shaping (optional; golden-path Indie separate route uses this first). */
export type DuoElectricVoiceRole = 'chordal' | 'balanced' | 'melodic';

/**
 * Opt-in grand staff. Absent leaves clef, staves and voice export unchanged.
 * Voice 1 = RH melody, staff 1. Voice 2 = optional RH inner strand, staff 1. Voice 3 = LH, staff 2.
 */
export interface PianoGrandStaffV1 {
  kind: 'grand-staff-v1';
  innerVoiceEnabled: boolean;
}

/** One part (e.g. guitar, bass). */
export interface PartModel {
  id: string;
  name: string;
  instrumentIdentity: string;
  midiProgram: number;
  clef: 'treble' | 'bass';
  /** Explicit piano grand-staff contract. Does not apply to guitar, TAB or renamed keyboard parts. */
  pianoGrandStaff?: PianoGrandStaffV1;
  /** Harp grand staff. Identity stays harp. This is not a piano part. */
  harpGrandStaff?: PianoGrandStaffV1;
  measures: MeasureModel[];
  /** Song Mode keyboard-centric writer: export harmony staff as Piano / keys comp (same event layout as duo guitar). */
  songModePresentAsPianoComp?: boolean;
  /** MusicXML `<instrument-name>` inside `<score-instrument>` (defaults to part display name when omitted). */
  scoreInstrumentName?: string;
  /** Optional voice role for dual-electric chord/melody shaping (future ArrangementIntent hook). */
  voiceRole?: DuoElectricVoiceRole;
  /** 0–1: probability roll for adding chord tones on voice 2 from voice-1 anchors (deterministic per bar). */
  chordBias?: number;
  /**
   * V3.4 catalogue `<instrument-sound>` id.
   * Absent leaves the existing instrument-sound export unchanged.
   */
  catalogueInstrumentSound?: string;
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
   * V3.4 full MusicXML transposition. When a part id is present here, it replaces
   * `exportPartTransposeSemitones` for that part. Absent leaves the chromatic element unchanged.
   */
  exportPartTranspose?: Record<string, Transposition>;
  /**
   * V3.4 per-part dynamics and hairpins. Absent leaves `measureDynamicsMarkings` on part 0 only.
   * Beat 0 is the downbeat.
   */
  partDynamics?: Record<string, PartDynamicEvent[]>;
  /**
   * V4.0 Phase 3 MIDI CC11 expression. Absent leaves MIDI bytes unchanged.
   * Beat is a 0-based quarter offset inside the bar.
   */
  midiExpression?: Array<{ partId: string; bar: number; beat: number; controller: 11; value: number }>;
  /**
   * Sustain-pedal directions for a piano grand staff.
   * Absent leaves export unchanged.
   */
  pianoPedal?: PianoPedalEvent[];
  /**
   * Piano V1.1 Stage A exact timing. Absent keeps PPQ 480 legacy export.
   * Adaptive PPQ above 480 is not an export mode.
   */
  pianoV11StageA?: { enabled: true; divisions: number };
  /**
   * E2 opt-in MIDI projection. Absent leaves generic MIDI on the legacy path:
   * written pitch numbers, no tie merging, no tempo-map conductor events.
   */
  e2SoundingMidi?: true;
  /**
   * V3.4 tempo map. Absent or empty keeps the single score tempo direction.
   */
  tempoMap?: TempoMapEvent[];
  /** V3.4 timecode words above part 0. Absent means no timecode directions. */
  timecodeMarks?: TimecodeMark[];
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
  /**
   * 1-based measure number → italic performance/section words on part 0.
   */
  measureWordsMarkings?: Record<number, string>;
  /**
   * Per-part italic technique / performance words (part id → 1-based measure → text).
   * When present for a part, exporter writes `<words>` on that staff.
   */
  partMeasureWordsMarkings?: Record<string, Record<number, string>>;
  /**
   * Context spelling for export. Keys are pitch classes 0–11. Values are note tokens (`Eb`, `F#`).
   * Applied only when set. Other notes keep the existing enharmonic rule.
   * Does not change MIDI pitch.
   */
  pitchClassSpelling?: Readonly<Record<number, string>>;
  parts: PartModel[];
}
