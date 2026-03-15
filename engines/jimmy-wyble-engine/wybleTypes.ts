/**
 * Jimmy Wyble Engine — Type definitions
 * Implements design spec from gml-composer-engines
 */

export interface NoteEvent {
  pitch: number;      // MIDI note number
  duration: number;  // in beats
  beat: number;      // position in bar
  isDyad: boolean;   // true when both voices sound
}

export interface VoiceLine {
  events: NoteEvent[];
  register: 'upper' | 'lower';
}

export interface ChordSpec {
  root: string;
  quality: string;
  bars: number;
}

export interface HarmonicContext {
  chords: Array<ChordSpec | string>;
  key?: string;
}

export type VoiceRatioMode = 'one_to_one' | 'two_to_one' | 'three_to_one' | 'mixed';
export type PracticeMode = 'etude' | 'exercise' | 'improvisation';

export interface WybleParameters {
  harmonicContext: HarmonicContext;
  phraseLength?: number;
  motifSeed?: number[];
  independenceBias?: number;
  contraryMotionBias?: number;
  dyadDensity?: number;
  chromaticismLevel?: number;
  registerOverlapTolerance?: number;
  guitarPositionSpan?: number;
  voiceRatioMode?: VoiceRatioMode;
  alteredDominantBias?: number;
  staggeredAttackFeel?: boolean;
  practiceMode?: PracticeMode;
  pedalToneEnabled?: boolean;
}

export interface ImpliedHarmony {
  chord: string;
  bar: number;
  beat: number;
  confidence: number;
}

export interface WybleOutput {
  upper_line: VoiceLine;
  lower_line: VoiceLine;
  implied_harmony: ImpliedHarmony[];
}
