/**
 * Composer OS V2 — Riff Generator types (LOCK / DCR / GCE).
 */

import type { OddMeterPolicyStyle } from '../rhythm/oddMeterEngine';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { CoreMotif } from '../motif/motifEngineTypes';
import type { RiffCarryForward } from './riffCarryForward';

export type RiffGeneratorOp = 'full' | 'regenerate' | 'mutate';

export type RiffGridMode = 'eighth' | 'sixteenth';
/** Loop length stepper values (bars). */
export const RIFF_BAR_STEP_VALUES = [1, 2, 4, 8, 16, 32] as const;
export type RiffBarCount = (typeof RIFF_BAR_STEP_VALUES)[number];
export type RiffDensity = 'sparse' | 'medium' | 'dense';
export type RiffStyleId = 'metheny' | 'scofield' | 'funk' | 'neutral';
export type RiffLineMode = 'single_line' | 'guitar_bass' | 'octave_double';

export interface RiffRhythmSegment {
  startBeat: number;
  duration: number;
  /** true = rest */
  rest: boolean;
}

export interface RiffGeneratorParams {
  seed: number;
  /** Loop length in bars (UI stepper: 1, 2, 4, 8, 16, 32). */
  bars: RiffBarCount;
  density: RiffDensity;
  style: RiffStyleId;
  grid: RiffGridMode;
  lineMode: RiffLineMode;
  bassEnabled: boolean;
  /** VoiceRuleBundle id when using riff VRB registry (e.g. `nile_rodgers`). */
  vrbId?: string;
  /** Odd-meter overlay when family is fusion / art_rock. */
  oddMeterPreset?: OddMeterPolicyStyle;
  /** Chord symbols cycled across `bars` (e.g. vamp or short loop). */
  chordSymbols: string[];
  /** Resolved external progression (defaults to `chordSymbols` when from user input). */
  chordProgression?: string[];
  bpm: number;
  title?: string;
  /** UI regen/mutate — default `full`. */
  riffOp?: RiffGeneratorOp;
  /** Per-bar lock (length ≤ bars); locked bars skip regen/mutate. */
  barLocks?: boolean[];
  /** Prior bar snapshots from last successful riff generate. */
  carryForward?: RiffCarryForward;
}

export interface RiffGeneratorSuccess {
  success: true;
  score: ScoreModel;
  xml: string;
  gce: number;
  version: number;
  /** Planned rhythm layers (hook for riff-only structural checks). */
  perBarRhythm: RiffRhythmSegment[][];
  /** Riff supplement — not duo GCE; see `riffQualityRules.ts`. */
  riffQuality: import('./riffQualityRules').RiffQualitySummary;
  /** Style-aware 8-rule gate — see `riffMusicalityGate.ts`. */
  riffMusicality: import('./riffMusicalityGate').RiffMusicalityResult;
  /** Abstract motif this riff realization derives from (identity linkage). */
  coreMotif?: CoreMotif;
  /** Echo for UI lock/regen/mutate on next request. */
  riffCarryForward?: RiffCarryForward;
}

export interface RiffGeneratorFailure {
  success: false;
  error: string;
}

export type RiffGeneratorResult = RiffGeneratorSuccess | RiffGeneratorFailure;
