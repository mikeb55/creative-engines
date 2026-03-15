/**
 * Ellington Orchestration Engine — Type definitions
 */

export type SectionRole = 'lead' | 'pad' | 'background' | 'counterline' | 'punctuation' | 'support' | 'tutti';

export type DensityLevel = 'sparse' | 'medium' | 'dense' | 'tutti';

export type ContrastMode = 'colour' | 'weight' | 'response' | 'combined';

export type SectionId =
  | 'saxes'
  | 'trumpets'
  | 'trombones'
  | 'rhythm'
  | 'alto1'
  | 'alto2'
  | 'tenor1'
  | 'tenor2'
  | 'baritone'
  | 'trumpet1'
  | 'trumpet2'
  | 'trumpet3'
  | 'trumpet4'
  | 'trombone1'
  | 'trombone2'
  | 'trombone3'
  | 'bass_trombone'
  | 'piano'
  | 'guitar'
  | 'bass'
  | 'drums';

export const SAX_SECTION: SectionId[] = ['alto1', 'alto2', 'tenor1', 'tenor2', 'baritone'];
export const TRUMPET_SECTION: SectionId[] = ['trumpet1', 'trumpet2', 'trumpet3', 'trumpet4'];
export const TROMBONE_SECTION: SectionId[] = ['trombone1', 'trombone2', 'trombone3', 'bass_trombone'];
export const RHYTHM_SECTION: SectionId[] = ['piano', 'guitar', 'bass', 'drums'];

export const BRASS_SECTIONS: SectionId[] = [...TRUMPET_SECTION, ...TROMBONE_SECTION];
export const REED_SECTIONS: SectionId[] = SAX_SECTION;

export interface ChordSegment {
  chord: string;
  bars: number;
}

export interface HarmonicInput {
  segments: ChordSegment[];
  totalBars: number;
}

export interface OrchestrationBarPlan {
  bar: number;
  chord: string;
  leadSection: string;
  supportSection: string;
  density: DensityLevel;
  contrastMode: ContrastMode;
  callResponse: 'call' | 'response' | 'none';
  tutti: boolean;
  background: string;
  comments: string[];
}

export interface OrchestrationPlan {
  bars: OrchestrationBarPlan[];
  totalBars: number;
  progression: ChordSegment[];
}

export interface EllingtonParameters {
  densityBias: number;
  contrastBias: number;
  backgroundFigureDensity: number;
  tuttiThreshold: number;
  callResponseStrength: number;
}

export const DEFAULT_PARAMS: EllingtonParameters = {
  densityBias: 0.5,
  contrastBias: 0.6,
  backgroundFigureDensity: 0.4,
  tuttiThreshold: 0.85,
  callResponseStrength: 0.6,
};
