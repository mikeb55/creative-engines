/**
 * Cuban / Afro-Cuban rhythm — preset grid types for MusicXML percussion export.
 */

export type ClaveDirection = '3-2' | '2-3' | '6-8';

export type CubanFamilyId =
  | 'son'
  | 'rumba'
  | 'mambo'
  | 'cha-cha'
  | 'bolero'
  | 'mozambique'
  | 'afro';

export interface CubanMeter {
  signature: string;
  gridSteps: number;
  groups: number[];
  baseUnit: 'eighth' | 'sixteenth';
}

export interface CubanLaneNoteMap {
  low: number;
  high: number;
  jingle: number;
  ghost: number;
}

export interface CubanFeelProfile {
  claveDirection: ClaveDirection;
  tumbaoDensity: number;
  montunoAlignment: number;
  cascaraVsBell: number;
  openClosedCongaContrast: number;
  guiroContinuity: number;
  bellBrightness: number;
  ghostHandDensity: number;
  tempoBPMRange: [number, number];
}

export interface CubanRhythmPreset {
  id: string;
  family: CubanFamilyId;
  tags: string[];
  claveDirection: ClaveDirection;
  meter: CubanMeter;
  lanes: {
    low: number[];
    high: number[];
    jingle: number[];
    ghost: number[];
  };
  gmNoteMap: CubanLaneNoteMap;
  feel: CubanFeelProfile;
  notes?: string;
}

export const DEFAULT_CUBAN_GM_MAP: CubanLaneNoteMap = {
  low: 36,
  high: 75,
  jingle: 56,
  ghost: 64,
};
