/**
 * Research-backed riff VRB profile schema (10-pass rock/funk/jazz guitar corpus).
 *
 * Distinct from {@link ../riff-generator/riffTypes} — those types drive the short-loop
 * Riff Generator app path; this module describes declarative posture for SQ/line-first VRBs.
 */

import type { SqVrbProfile } from '../counterpoint/vrbProfiles/sqVrbProfileTypes';
import type { FunkGridPolicyStyle } from '../rhythm/funkGridPolicy';
import type { OddMeterPolicyStyle } from '../rhythm/oddMeterEngine';
import type { RockRiffPolicyStyle } from '../rhythm/rockRiffPolicy';

/** Meter surface — simple 4/4, compound 6/8/12/8, or odd additive grouping. */
export type RiffMeterPolicy = 'simple' | 'compound' | 'odd_grouped';

/** Primary subdivision resolution per bar (slot count baseline in 4/4). */
export type RiffSubdivisionGrid = 8 | 16;

/**
 * Mahavishnu-style odd meter with alternate grouping vectors.
 * Presets: {@link ../rhythm/oddMeterEngine.getOddMeterPolicy} / {@link riffProfileSliceFromOddMeter}.
 */
export interface RiffOddMeterTemplate {
  meter: { num: number; denom: 8 | 4 };
  groups: number[][];
}

/** Density shaping across a cycle (Indian tihai = cadential compression). */
export type RiffDensityCurve = 'flat' | 'crescendo' | 'arch' | 'tihaiCadence';

/**
 * Fripp / Reich-style phase loop against bar grid.
 * Concrete values: {@link ../rhythm/oddMeterEngine.getOddMeterPolicy} (`fripp`, `mahavishnu`).
 */
export interface RiffPhaseOffsetPolicy {
  loopLengthBeats: number;
  barLengthBeats: number;
  startOffsetBeats: number;
  driftPerCycleBeats?: number;
  lockBackEveryCycles?: number;
}

/** Exact-loop vs variation operators for riff cells. */
export interface RiffRepetitionPolicy {
  exactLoopAllowed: boolean;
  pedalToneAllowed: boolean;
  barIdentityPersistence: number;
  minExactRepetitions: number;
}

export type RiffVariationOperator =
  | 'tailFill'
  | 'chromaticTag'
  | 'finalChordSubstitution'
  | 'articulationSwap'
  | 'targetToneShift'
  | 'startOffsetShift'
  | 'rhythmicWarp'
  | 'truncateOrExtend'
  | 'registerShift'
  | 'cellTransposition';

/** Reich/Glass-style process loop with micro-edits. */
export interface RiffProcessLoopPolicy {
  baseCellRepeatCount: number;
  microEditProbPerCycle: number;
  dynamicCurve: 'flat' | 'swell' | 'decay';
}

export interface RiffSilencePolicy {
  /** Per-slot rest probability; length aligns with subdivision grid slots per bar. */
  restProbabilityBySlot: number[];
  styleClass: string;
  /**
   * When set, `restProbabilityBySlot` / companion ghost fields are typically built via
   * {@link ../rhythm/funkGridPolicy.riffProfileSliceFromFunkGrid} from {@link getFunkGridPolicy}.
   */
  funkGridPreset?: FunkGridPolicyStyle;
  /**
   * When set, rock rest/accent slices and {@link RiffProfile.allowPitchStreak} are typically built via
   * {@link ../rhythm/rockRiffPolicy.riffProfileSliceFromRockRiff} from {@link getRockRiffPolicy}.
   */
  rockRiffPreset?: RockRiffPolicyStyle;
  /**
   * When set, odd-meter slices are typically built via
   * {@link ../rhythm/oddMeterEngine.riffProfileSliceFromOddMeter} from {@link getOddMeterPolicy}.
   */
  oddMeterPreset?: OddMeterPolicyStyle;
}

export type RiffAttackPolicy = 'choke' | 'sustain' | 'staccato' | 'tied_across_bar';

/** JB / Nile Rodgers directional ghost chains into target slot. */
export interface RiffGhostChainRule {
  voiceId: string;
  intoSlot: number;
  pattern: number[];
  probability: number;
}

/** Tom Morello binary kill-switch gating on subdivision. */
export interface RiffKillSwitchPattern {
  subdivision: '16th' | '8th';
  gate: number[];
  loopLength: number;
}

export interface RiffContourPolicy {
  rangeCeiling: number;
  apexTiming: number;
  returnTendency: number;
}

export type RiffRegisterAnchor = 'low_string' | 'mid_register' | 'upper_register';

export interface RiffRegisterBand {
  min: number;
  max: number;
}

export interface RiffPowerIntervalPolicy {
  fifthWeight: number;
  octaveWeight: number;
  pedalWeight: number;
}

export type RiffHomeChordType =
  | 'dom7#9'
  | 'dom7'
  | 'min7'
  | 'maj7'
  | 'power5'
  | 'quartal';

export interface RiffIntervalCell {
  steps: number[];
  transpositionMode: 'diatonic' | 'chromatic';
}

export interface RiffHarmonicColourCycle {
  baseChord: string;
  variants: string[];
  cyclePattern: number[];
}

export interface RiffThumbBassPolicy {
  rootString: number;
  upperVoiceStrings: number[];
  embellishmentAllowed: boolean;
}

export interface RiffOrnamentPolicy {
  slides: boolean;
  ghosts: boolean;
  graceAttacks: boolean;
  bends: boolean;
  deadNotes: boolean;
}

export interface RiffWhammyEvent {
  slot: number;
  mode: '+12' | '-12' | '+24' | '+7' | 'sweepUp' | 'sweepDown';
  durationPulses: number;
}

export interface RiffHornStabTopology {
  slots: number[];
  minRestAfter: number;
  repeatEveryBars: 1 | 2 | 4;
}

export interface RiffChordFragmentVocabulary {
  intervalRoles: string[];
  preferredStringSets: number[][];
  maxSpanSemitones: number;
}

export interface RiffCounterpartVoicePolicy {
  primaryVoice: string;
  registerSeparation: number;
  rhythmicOffsetBias: 'staggered';
  harmonyRole: 'lead' | 'broken-chord' | 'switching';
  collisionAvoidance: 'no-unison-non-cadence';
}

export type RiffEnsembleInterlockMode =
  | 'unisonRiff+drumPolyrhythm'
  | 'layeredOstinati'
  | 'callResponse'
  | 'independent';

export type RiffModalUsage = 'linear-melodic' | 'scalar-run' | 'chord-driven' | 'process-cell';

export type RiffSwingStyle = 'straight' | 'concert' | 'jazz' | 'funk16th' | 'shuffle';

/** Page / Zep multi-tuning register bands (MIDI anchors only). */
export interface RiffTuningPolicy {
  tuningOptions: Record<string, number>;
  midiFloor: number;
  midiCeiling: number;
  riffLowBand: [number, number];
  riffMidBand: [number, number];
}

export interface RiffRhythmFeelPolicy {
  primarySubdivision: '8th' | '16th';
  feelProfiles: string[];
  swingRatio: Record<string, number>;
  beatPlacement?: 'on_grid' | 'slightly_behind' | 'slightly_ahead';
}

export interface RiffIntervalWeightMap {
  m3?: number;
  M3?: number;
  P4?: number;
  P5?: number;
  M2?: number;
  m2?: number;
  tritone?: number;
}

export interface RiffTextureMixWeights {
  singleNoteRiff: number;
  powerChordRiff: number;
  hybridSinglePlusChord: number;
  openStringDroneProb?: number;
}

export interface RiffOddMeterUsagePolicy {
  meters: Array<{ label: string; groups: number[] }>;
  isSuperimposed: boolean;
}

export interface RiffSpacePolicy {
  internalRestProb: number;
  phraseEndRestBeats: number[];
  callResponsePattern: string;
}

export interface RiffCadenceTypeWeights {
  tail_fill: number;
  sustained_sus_chord: number;
  hard_stop_rest: number;
}

export interface RiffStyleModePool {
  blues_rock?: { scales: string[] };
  folk_modal?: { scales: string[]; droneUsage: 'high' | 'medium' | 'low' };
  epic_modal_heavy?: { scales: string[]; droneUsage: 'very_high' | 'high' | 'medium' };
}

export interface RiffContourPreferenceMap {
  heavyRiffs?: { descending: number; ascending: number; arched: number };
  folkModal?: { oscillating: number; ascending: number; descending: number };
}

export interface RiffPedalPointPolicy {
  enabled: boolean;
  targets: string;
}

export interface RiffChromaticApproachRule {
  degrees: number[];
  chordContext: string;
  probability: number;
}

/**
 * Declarative riff-generation posture for rock / funk / jazz guitar VRBs.
 * Consumers: future riff engines, VRB registry entries, research→code receipts.
 */
export interface RiffProfile {
  // —— Core meter and subdivision ——
  meterPolicy: RiffMeterPolicy;
  subdivisionGrid: RiffSubdivisionGrid;
  /** Presets via {@link ../rhythm/oddMeterEngine.riffProfileSliceFromOddMeter}. */
  oddMeterTemplate?: RiffOddMeterTemplate;
  /** Indian classical cycle length in pulses (Mahavishnu). */
  talaCycleLength?: number;
  densityCurve?: RiffDensityCurve;

  // —— Accent and rhythm ——
  /** Per-slot base accent weight; length typically equals {@link subdivisionGrid} (4/4). */
  accentTopology: number[];
  accentTemplatePerVoice?: Record<string, number[]>;
  antiCoincidenceVoices?: string[][];
  preferCoincidenceSlots?: number[];
  /** Internal additive cells (Weather Report); presets via {@link ../rhythm/oddMeterEngine}. */
  groupingPatterns?: number[][];
  metricDisplacement?: number;
  /** Fripp/Mahavishnu phase loops — {@link ../rhythm/oddMeterEngine.getOddMeterPolicy}. */
  phaseOffsetPolicy?: RiffPhaseOffsetPolicy;

  // —— Repetition and variation ——
  repetitionPolicy: RiffRepetitionPolicy;
  variationOperators?: RiffVariationOperator[];
  processLoopPolicy?: RiffProcessLoopPolicy;

  // —— Silence and attack ——
  silencePolicy: RiffSilencePolicy;
  attackPolicy: RiffAttackPolicy;
  ghostChainRules?: RiffGhostChainRule[];
  killSwitchPattern?: RiffKillSwitchPattern;

  // —— Contour and register ——
  riffContourPolicy: RiffContourPolicy;
  registerAnchor: RiffRegisterAnchor;
  riffRegisterFloor: number;
  riffRegisterCeiling: number;
  registerBandPerVoice?: Record<string, RiffRegisterBand>;
  pedalBias: number;
  octaveDisplacementTolerance: number;
  crossInstrumentUnisonProb?: number;

  // —— Harmonic ——
  powerIntervalPolicy: RiffPowerIntervalPolicy;
  tritoneStable?: boolean;
  homeChordType?: RiffHomeChordType;
  chordQualitySet?: string[];
  /** 0–1 fraction of notes allowed outside parent mode (high Mahavishnu, low Weather Report). */
  chromaticBudget?: number;
  intervalCell?: RiffIntervalCell;
  shorterCellLibrary?: number[][];
  harmonicColourCycle?: RiffHarmonicColourCycle;
  topNoteLinePolicy?: boolean;
  thumbBassPolicy?: RiffThumbBassPolicy;

  // —— Ornament and FX ——
  ornamentPolicy: RiffOrnamentPolicy;
  whammyEvents?: RiffWhammyEvent[];
  hornStabTopology?: RiffHornStabTopology[];
  chordFragmentVocabulary?: RiffChordFragmentVocabulary;

  // —— Counterpoint ——
  counterpartVoicePolicy?: RiffCounterpartVoicePolicy;
  ensembleInterlockMode?: RiffEnsembleInterlockMode;
  polyGroupingMode?: boolean;

  // —— Style flags ——
  /**
   * When true, bypasses pitch-streak repetition gate for intentional riff loops (Iommi, Zep, VH).
   * Prefer {@link ../rhythm/rockRiffPolicy.riffProfileSliceFromRockRiff} / {@link rockRiffAllowsPitchStreak}
   * so VRB posture stays aligned with {@link RockRiffPolicy}.
   */
  allowPitchStreak: boolean;
  modalUsage?: RiffModalUsage;
  swingStyle?: RiffSwingStyle;
  /** Weighted scale/mode pool (rock VRB stubs). */
  scalePool?: Record<string, number>;
  /** Funk colour-cycle length in bars (Nile Rodgers). */
  riffHarmonicCycleLengthBars?: number;
  /** Hendrix chord-lead blend hints. */
  rhythmLeadBlendPolicy?: {
    minChordsPerBar: number;
    minFillsPerBar: number;
    fillCellTypes: string[];
  };
  /** Hendrix upper-string double-stop pairs. */
  doubleStopPolicy?: {
    intervalsAllowed: number[];
    stringPairs: number[][];
  };
  /** Led Zeppelin / Page research extensions (declarative; riff engine hooks). */
  tuningPolicy?: RiffTuningPolicy;
  rhythmFeel?: RiffRhythmFeelPolicy;
  intervalWeights?: RiffIntervalWeightMap;
  textureMix?: RiffTextureMixWeights;
  oddMeterUsage?: RiffOddMeterUsagePolicy;
  spacePolicy?: RiffSpacePolicy;
  phraseLengthBeats?: number[];
  cadenceTypes?: RiffCadenceTypeWeights;
  styleModes?: RiffStyleModePool;
  contourPreferences?: RiffContourPreferenceMap;
  pedalPoint?: RiffPedalPointPolicy;
  chromaticApproachRules?: RiffChromaticApproachRule[];
}

/** SQ VRB profile with optional research riff posture (rock/funk guitar VRB path). */
export interface RiffVrbProfile extends SqVrbProfile {
  riffProfile?: RiffProfile;
}
