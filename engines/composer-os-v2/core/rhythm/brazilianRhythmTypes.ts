/**
 * Brazilian rhythm — preset grid types for standalone MusicXML percussion export.
 */

export type BrazilianFamilyId = 'bossa-nova' | 'samba' | 'baiao' | 'son-clave';

export interface BrazilianMeter {
  signature: string;
  gridSteps: number;
  groups: number[];
  baseUnit: 'eighth' | 'sixteenth';
}

export interface BrazilianLaneNoteMap {
  low: number;
  high: number;
  jingle: number;
  ghost: number;
}

export interface BrazilianFeelProfile {
  subdivisionSkew: number;
  anticipationPush: number;
  lowPulseWeight: number;
  crossStickDryness: number;
  ghostDensity: number;
  jingleContinuity: number;
  accentVariance: number;
  surdoVariation: number;
  tempoBPMRange: [number, number];
}

export interface BrazilianRhythmPreset {
  id: string;
  family: BrazilianFamilyId;
  tags: string[];
  meter: BrazilianMeter;
  lanes: {
    low: number[];
    high: number[];
    jingle: number[];
    ghost: number[];
  };
  gmNoteMap: BrazilianLaneNoteMap;
  feel: BrazilianFeelProfile;
  accentVariant?: string;
  notes?: string;
}

export const DEFAULT_BRAZILIAN_GM_MAP: BrazilianLaneNoteMap = {
  low: 36,
  high: 38,
  jingle: 42,
  ghost: 37,
};
