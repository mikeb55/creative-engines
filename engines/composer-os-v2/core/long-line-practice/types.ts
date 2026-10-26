/**
 * Long-Line Practice Lab — core request / result types.
 * Practice generation only. No MusicXML, UI, or composition gates.
 */

export const LONG_LINE_PRACTICE_VERSION = 'long-line-practice-2d';

export const LONG_LINE_PROFILES = ['lyrical', 'intervallic', 'experimental'] as const;
export type LongLineProfile = (typeof LONG_LINE_PROFILES)[number];

export interface LongLineRegister {
  /** Inclusive MIDI low. */
  low: number;
  /** Inclusive MIDI high. */
  high: number;
}

export interface LongLineRequest {
  /** Pitch-class vocabulary (0–11). Duplicates ignored; order ignored. */
  pitchClasses: readonly number[];
  /** Number of bars to write (positive integer). */
  bars: number;
  /** Inclusive MIDI register clamp. */
  register: LongLineRegister;
  profile: LongLineProfile;
  /** Deterministic seed. */
  seed: number;
  /** Beats per bar in quarter units. Default 4. */
  beatsPerBar?: number;
  /**
   * Optional start bias (harmonic-context adapter).
   * When omitted, context-free behaviour is unchanged.
   */
  anchorMidi?: number;
  /** Prefer these pitch classes at the opening when they sit inside pitchClasses. */
  preferPitchClasses?: readonly number[];
}

/** Source bass attack with verified timing (quarter-lengths). */
export interface LongLineTimedBassEvent {
  /** Onset within the bar, in quarter-lengths. */
  startBeat: number;
  /** Duration in quarter-lengths. */
  duration: number;
  midi: number;
}

/** Written MusicXML time signature for one bar. */
export interface LongLineMeter {
  /** Time-signature numerator (e.g. 3 in 3/4, 6 in 6/8). */
  beats: number;
  /** Time-signature denominator (e.g. 4, 8). */
  beatType: number;
}

/** One bar of harmonic context. Fields are pitch-class sets, not chord symbols. */
export interface LongLineHarmonyBar {
  pitchClasses: readonly number[];
  /** Optional bass MIDI notes — echoed verbatim; never rewritten. */
  bassMidis?: readonly number[];
  /**
   * Optional timed bass attacks from a source score.
   * When absent, exporters must not invent onsets/durations from bassMidis alone.
   */
  bassEvents?: readonly LongLineTimedBassEvent[];
  /** Optional source metre for this bar. When set, generation/export use its quarter span. */
  meter?: LongLineMeter;
}

export interface LongLineHarmonyRequest {
  bars: readonly LongLineHarmonyBar[];
  register: LongLineRegister;
  seed: number;
  /**
   * Default bar length in quarter-lengths when a bar omits meter.
   * Context-free callers and midis-only paths use this. Default 4.
   */
  beatsPerBar?: number;
  /** Defaults to all three profiles. */
  profiles?: readonly LongLineProfile[];
}

export interface LongLineHarmonyCandidate {
  profile: LongLineProfile;
  line: LongLineResult;
  /** Input bass notes per bar, preserved byte-for-byte as numbers. */
  bassByBar: readonly (readonly number[])[];
  /**
   * Timed bass attacks per bar when the source provided them.
   * Empty rows mean no verified timing for that bar (do not invent rhythm).
   */
  bassEventsByBar: readonly (readonly LongLineTimedBassEvent[])[];
}

export interface LongLineHarmonyResult {
  version: typeof LONG_LINE_PRACTICE_VERSION;
  seed: number;
  /**
   * Default quarter-span used when a bar has no meter.
   * Per-bar spans come from metersByBar when present.
   */
  beatsPerBar: number;
  /** Canonical pitch-class field per bar (source fields, not substitutions). */
  fields: readonly (readonly number[])[];
  /** Per-bar source metres when known; null means fall back to beatsPerBar. */
  metersByBar: readonly (LongLineMeter | null)[];
  candidates: readonly LongLineHarmonyCandidate[];
}

export interface LongLineEvent {
  /** Zero-based bar index. */
  bar: number;
  /** Onset within the bar, in quarter-lengths. */
  startBeat: number;
  /** Duration in quarter-lengths. */
  duration: number;
  midi: number;
  pitchClass: number;
}

export interface LongLineResult {
  version: typeof LONG_LINE_PRACTICE_VERSION;
  profile: LongLineProfile;
  seed: number;
  bars: number;
  beatsPerBar: number;
  pitchClasses: readonly number[];
  register: LongLineRegister;
  events: readonly LongLineEvent[];
  /** Compact event signature for determinism / distinction checks. */
  signature: string;
}

/** How a bar's pitch field was obtained from the source score. */
export type LongLineHarmonyStatus = 'explicit' | 'carried' | 'missing' | 'ambiguous';

export interface LongLineSourceMelodyEvent {
  /** Original written bar number (1-based sequential ingest index). */
  sourceBar: number;
  /** MusicXML printed measure number attribute when present. */
  printedBar: string;
  partId: string;
  partName: string;
  onsetQuarters: number;
  durationQuarters: number;
  midi: number;
  pitchClass: number;
}

export interface LongLineMusicXmlBarContext {
  /** 1-based sequential bar index from ingest (preserved selection key). */
  sourceBar: number;
  printedBar: string;
  harmonyStatus: LongLineHarmonyStatus;
  /** Chord symbol reconstructed from MusicXML harmony, or null. */
  chordSymbol: string | null;
  /** Pitch-class field when known; null when missing/ambiguous. */
  pitchClasses: readonly number[] | null;
  /**
   * Source time signature for this bar (carried forward when unmarked).
   * Null only when no metre has been seen yet in the score.
   */
  meter: LongLineMeter | null;
  /** Bass sounding midis in this bar — source notes only, document order. */
  bassMidis: readonly number[];
  /** Bass attacks with source onset/duration — document order; never invented. */
  bassEvents: readonly LongLineTimedBassEvent[];
  /** Melodic (non-bass) sounding notes in this bar. */
  melodyEvents: readonly LongLineSourceMelodyEvent[];
  issues: readonly string[];
}

export interface LongLineMusicXmlRange {
  /** Inclusive 1-based sequential bar index. */
  startBar: number;
  /** Inclusive 1-based sequential bar index. */
  endBar: number;
}

export interface LongLineMusicXmlContext {
  version: typeof LONG_LINE_PRACTICE_VERSION;
  sourceSha256: string;
  range: LongLineMusicXmlRange;
  bars: readonly LongLineMusicXmlBarContext[];
  /**
   * Tempo from the source score when a `<sound tempo>` (or metronome playback) mark exists.
   * Null when the source does not state one — export must not invent BPM.
   */
  tempoBpm: number | null;
  /** Aggregate issues (missing/ambiguous harmony, range errors). */
  issues: readonly string[];
  /** True only when every selected bar has a non-null pitch field. */
  canGenerate: boolean;
}

export interface LongLineExportBarMeta {
  /** Original source bar index (1-based). Written as staff text. */
  sourceBar: number;
  printedBar?: string;
  /** Written only when non-null / non-empty — never invented. */
  chordSymbol?: string | null;
  /** Per-bar metre when known; overrides request-level beats/beatType for that bar. */
  meter?: LongLineMeter | null;
}

export interface LongLineExportRequest {
  harmony: LongLineHarmonyResult;
  /** Per-bar metadata; length should match harmony bar count. */
  barMeta?: readonly LongLineExportBarMeta[];
  /**
   * Verified tempo in BPM. Required — callers pass a source-extracted or user-confirmed value.
   * This module does not invent tempo.
   */
  tempoBpm: number;
  titlePrefix?: string;
  /**
   * Fallback time-signature numerator when a bar has no source metre.
   * Default 4. Ignored for bars that carry a source meter.
   */
  beats?: number;
  /**
   * Fallback time-signature denominator when a bar has no source metre.
   * Default 4. Ignored for bars that carry a source meter.
   */
  beatType?: number;
}

export interface LongLineExportedScore {
  profile: LongLineProfile;
  title: string;
  xml: string;
}

export interface LongLineMusicXmlGenerateRequest {
  xml: string;
  range: LongLineMusicXmlRange;
  register: LongLineRegister;
  seed: number;
  beatsPerBar?: number;
  profiles?: readonly LongLineProfile[];
}

export interface LongLineMusicXmlGenerateResult {
  context: LongLineMusicXmlContext;
  /** Null when context.canGenerate is false — no invented fields. */
  harmony: LongLineHarmonyResult | null;
}
