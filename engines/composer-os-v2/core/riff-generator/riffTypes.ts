/**
 * Composer OS V2 — Riff Generator types (LOCK / DCR / GCE).
 */

import type { ScoreModel } from '../score-model/scoreModelTypes';

export type RiffGridMode = 'eighth' | 'sixteenth';
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
  bars: 1 | 2 | 3 | 4;
  density: RiffDensity;
  style: RiffStyleId;
  grid: RiffGridMode;
  lineMode: RiffLineMode;
  bassEnabled: boolean;
  /** 1–4 chord symbols (e.g. vamp or short loop). */
  chordSymbols: string[];
  bpm: number;
  title?: string;
}

export interface RiffGeneratorSuccess {
  success: true;
  score: ScoreModel;
  xml: string;
  gce: number;
  version: number;
}

export interface RiffGeneratorFailure {
  success: false;
  error: string;
}

export type RiffGeneratorResult = RiffGeneratorSuccess | RiffGeneratorFailure;
