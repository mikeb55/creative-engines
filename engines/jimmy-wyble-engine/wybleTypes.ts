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
