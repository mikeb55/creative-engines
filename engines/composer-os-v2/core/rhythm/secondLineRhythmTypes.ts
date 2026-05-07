/**
 * New Orleans second line / brass band — preset grid types for MusicXML percussion export.
 */

export type SecondLineFamilyId = 'second-line' | 'brass-band' | 'mardi-gras' | 'new-orleans-funk';

export interface SecondLineMeter {
  signature: string;
  gridSteps: number;
  groups: number[];
  baseUnit: 'eighth' | 'sixteenth';
}

export interface SecondLineLaneNoteMap {
  low: number;
  high: number;
  jingle: number;
  ghost: number;
}

export interface SecondLineFeelProfile {
  subdivisionWarp: number;
  snareDensity: number;
  ruffProbability: number;
  pressRollLength: number;
  bassDrumSyncopation: number;
  openHiHatFrequency: number;
  jingleContinuity: number;
  bigFourWeight: number;
  tempoBPMRange: [number, number];
}

export interface SecondLineRhythmPreset {
  id: string;
  family: SecondLineFamilyId;
  tags: string[];
  meter: SecondLineMeter;
  lanes: {
    low: number[];
    high: number[];
    jingle: number[];
    ghost: number[];
  };
  gmNoteMap: SecondLineLaneNoteMap;
  feel: SecondLineFeelProfile;
  notes?: string;
}

export const DEFAULT_SECOND_LINE_GM_MAP: SecondLineLaneNoteMap = {
  low: 36,
  high: 38,
  jingle: 42,
  ghost: 37,
};
