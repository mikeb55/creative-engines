/**
 * Contemporary Counterpoint Engine — Type definitions
 */

export interface CounterpointParameters {
  lineCount: number;
  rhythmicOffsetBias: number;
  dissonanceLevel: number;
  intervallicCellBias: number;
  overlapTolerance: number;
  registerSeparationStrength: number;
}

export interface HarmonicSegment {
  chord: string;
  bars: number;
}

export interface HarmonicInput {
  segments: HarmonicSegment[];
  totalBars: number;
}

export interface CounterpointNote {
  pitch: number; // MIDI
  onset: number; // beats
  duration: number;
  voiceIndex: number;
}

export interface CounterpointLine {
  voiceIndex: number;
  notes: CounterpointNote[];
  register: 'low' | 'mid' | 'high';
  rhythmicProfile: string[];
}

export interface CounterpointOutput {
  lines: CounterpointLine[];
  impliedHarmony: string[];
  totalBars: number;
  handoffPoints: number[];
  overlapPoints: number[];
}

export interface CounterpointInput {
  harmonicContext: HarmonicInput | HarmonicSegment[];
  parameters?: Partial<CounterpointParameters>;
  seed?: number;
}

export const DEFAULT_PARAMS: CounterpointParameters = {
  lineCount: 2,
  rhythmicOffsetBias: 0.6,
  dissonanceLevel: 0.5,
  intervallicCellBias: 0.5,
  overlapTolerance: 0.5,
  registerSeparationStrength: 0.6,
};
