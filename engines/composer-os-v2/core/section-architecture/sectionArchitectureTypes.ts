/**
 * V64 P5 — Section architecture TypeScript interfaces (Song → section → bar resolution).
 *
 * Geometry primitives remain in {@link ./sectionArchitectureDomain.ts}.
 * Merge/resolution implementations land in P6; per-section meter engine wiring in P7.
 */

import type { SectionMeterSpan } from './sectionArchitectureDomain';

/** Inclusive 1-based bar span. */
export interface BarRange {
  /** @constraint Must be >= 1 when present on a section. */
  startBar: number;
  /** @constraint Must be >= startBar. */
  endBar: number;
}

export type InstrumentKind =
  | 'guitar'
  | 'guitarA'
  | 'guitarB'
  | 'guitar_2'
  | 'bass'
  | 'keys'
  | 'drums'
  | 'strings'
  | 'brass'
  | 'woodwinds'
  | 'generic';

export type SlonimskyCellSetId =
  | 'tritone_progression'
  | 'ditone_progression'
  | 'sesquitone_progression'
  | 'whole_tone_progression'
  | 'semitone_progression'
  | 'quadritone_progression'
  | 'sesquiquadritone'
  | 'quinquetone_diatessaron'
  | 'twelve_tone_dodecaphonic'
  | 'intervallic_mirror_permutations'
  | 'polytonal_scales'
  | 'heptatonic_scales'
  | 'pentatonic_scales'
  | string;

/** Named reusable profile bucket (referenced by id from sections). */
export interface NamedProfile<T> {
  id: string;
  label?: string;
  value: T;
}

export interface TuningProfile {
  /** @constraint Must match the instrument receiving this override. */
  instrumentType: InstrumentKind;
  tuningId?: string;
  /** @preference Open-string spellings for grip / export hints. */
  openStrings?: readonly string[];
}

export interface PitchProfile {
  /** @preference Register floor MIDI (inclusive). */
  registerFloor?: number;
  /** @preference Register ceiling MIDI (inclusive). */
  registerCeiling?: number;
  /** @preference Allowed outside level 0–2 (Slonimsky lane). */
  allowedOutsideLevel?: 0 | 1 | 2;
  /** @preference Chromatic budget 0–1 on riff profile. */
  chromaticBudget?: number;
  /** @preference Slonimsky catalogue families active in this section. */
  cellSets?: readonly SlonimskyCellSetId[];
}

export interface RhythmProfile {
  /** @preference Primary subdivision feel. */
  subdivision?: '8th' | '16th' | 'triplet' | 'mixed';
  /** @preference Anti-metric posture. */
  antiMetric?: boolean;
  /** @preference Metric displacement weight 0–1. */
  metricDisplacement?: number;
}

export interface VoicingProfile {
  /** @preference Minimum spread semitones. */
  minSpreadSemitones?: number;
  /** @preference Maximum spread semitones. */
  maxSpreadSemitones?: number;
  /** @preference Harmonic rhythm min/max bars per chord. */
  minChordDurationBars?: number;
  maxChordDurationBars?: number;
}

/** @preference Density band or scalar 0–1. */
export type DensityLevel = 'sparse' | 'moderate' | 'dense' | number;

export interface HumanizeSettings {
  /** @preference Timing jitter 0–1. */
  timingJitter?: number;
  /** @preference Velocity jitter 0–1. */
  velocityJitter?: number;
}

export interface GrooveScaffoldSettings {
  /** @preference Opt-in symbolic drum accompaniment. Omitted/false means no drum part. */
  enabled: boolean;
  /** @preference Global groove feel; odd meters auto-route to odd_meter per bar. */
  feel?: 'swing' | 'funk' | 'rock' | 'bossa' | 'ballad' | 'odd_meter';
}

export interface SongDefaults {
  /** @preference Global tempo BPM. */
  tempo?: number;
  /** @preference Global written meter label (e.g. 4/4). */
  meter?: string;
  defaultPitchProfile?: PitchProfile;
  defaultRhythmProfile?: RhythmProfile;
  defaultVoicingProfile?: VoicingProfile;
  /** @preference Default density for sections without override. */
  defaultDensity?: DensityLevel;
  /** @preference Per-instrument tuning defaults keyed by instrumentType. */
  defaultTuningByInstrument?: Partial<Record<InstrumentKind, TuningProfile>>;
  humanize?: HumanizeSettings;
  /** V65 P4 — opt-in groove scaffold; requires a Song object and enabled=true. */
  grooveScaffold?: GrooveScaffoldSettings;
}

export type SectionType =
  | 'intro'
  | 'verse'
  | 'chorus'
  | 'bridge'
  | 'development'
  | 'solo'
  | 'outro'
  | 'custom';

export interface TransitionProfile {
  /** @preference Transition window length in bars at section seam. */
  bars?: number;
  /** @preference Crossfade density toward next section. */
  interpolateDensity?: boolean;
  /** @preference Crossfade register toward next section. */
  interpolateRegister?: boolean;
  /** @preference Allow motif tails to continue across boundary. */
  allowCarryoverNotes?: boolean;
}

export interface InstrumentOverride {
  /** @constraint When set, instrumentType must match target part. */
  tuningProfile?: TuningProfile;
  /** @preference MIDI register window for this instrument in section. */
  registerWindow?: { floor: number; ceil: number };
  /** @preference Riff generator mode id. */
  riffMode?: string;
  density?: DensityLevel;
  /** @preference 0–1 probability bass follows harmonic root. */
  followRootProbability?: number;
}

/**
 * One compositional section within a {@link Song}.
 * Distinct from P4 {@link ./sectionArchitectureDomain#SectionTemplateBundle} (saved template container).
 */
export interface SectionPreset {
  id: string;
  label: string;
  type: SectionType;
  /** @constraint Must lie within song totalBars and not overlap sibling sections. */
  barRange: BarRange;
  /** @preference Parent section preset id for profile inheritance. */
  inheritsFrom?: string;
  pitchProfile?: PitchProfile;
  rhythmProfile?: RhythmProfile;
  voicingProfile?: VoicingProfile;
  /**
   * Per-section written meter timeline.
   * @preference Merged into render-time barMeterMap via resolveBarMeterMapFromSong (P6/P7).
   */
  meterMap?: readonly SectionMeterSpan[];
  /** @preference Section energy 0–1. */
  energy?: number;
  transitionIn?: TransitionProfile;
  transitionOut?: TransitionProfile;
  /** @preference Per-instrument overrides within this section. */
  instrumentOverrides?: readonly InstrumentOverride[];
}

export type LocalOverrideTarget = 'song' | 'section' | 'instrument' | 'bar';

export interface LocalOverride {
  barRange: BarRange;
  target: LocalOverrideTarget;
  /** Dot-path into resolved context (e.g. rhythmProfile.metricDisplacement). */
  parameterPath: string;
  value: unknown;
}

/**
 * Song-level architecture document (P5 schema).
 * @constraint schemaVersion required on persist; missing → migration treats as v0 single section.
 */
export interface Song {
  /** @constraint Semantic schema version for migrations. */
  schemaVersion: number;
  id: string;
  title: string;
  globalDefaults: SongDefaults;
  /** @preference Named profile libraries referenced by sections. */
  profiles?: {
    pitch?: readonly NamedProfile<PitchProfile>[];
    rhythm?: readonly NamedProfile<RhythmProfile>[];
    voicing?: readonly NamedProfile<VoicingProfile>[];
  };
  sections: readonly SectionPreset[];
  localOverrides: readonly LocalOverride[];
  /** @constraint Total bar count; must match partition end. */
  totalBars: number;
}

/** Fully resolved generation posture for one bar after precedence merge (P6 implements). */
export interface EffectiveGenerationContext {
  bar: number;
  sectionId: string;
  sectionLabel: string;
  sectionType: SectionType;
  tempo: number;
  meter: string;
  pitch: PitchProfile;
  rhythm: RhythmProfile;
  voicing: VoicingProfile;
  density: DensityLevel;
  humanize: HumanizeSettings;
  tuningByInstrument: Partial<Record<InstrumentKind, TuningProfile>>;
  /** @preference Written meter spans active at this bar (not applied until P7). */
  meterMap?: readonly SectionMeterSpan[];
  energy?: number;
  transition?: TransitionProfile;
  /** Provenance receipts for diagnostics. */
  resolutionTrace?: readonly string[];
}

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: ValidationSeverity;
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  ok: boolean;
  issues: readonly ValidationIssue[];
}
