/**
 * Ellington Orchestration Engine — Type definitions
 */

export type SectionRole = 'lead' | 'pad' | 'background' | 'counterline' | 'punctuation' | 'support' | 'tutti';

export type DensityLevel = 'sparse' | 'medium' | 'dense' | 'tutti';

export type ContrastMode = 'colour' | 'weight' | 'response' | 'combined';

export type PhraseType = 'setup' | 'response' | 'intensification' | 'release' | 'arrival';

export type PhraseSpan = 2 | 4;

export interface PhraseRolePlan {
  startBar: number;
  endBar: number;
  span: number;
  leadSection: string;
  supportSection: string;
  phraseType: PhraseType;
  densityTarget: DensityLevel;
  background: string;
  leadSectionPersistence: number;
  answerSectionPersistence: number;
}

export interface PhraseDensityArc {
  phraseIndex: number;
  startBar: number;
  endBar: number;
  densityTarget: DensityLevel;
  phraseType: PhraseType;
}

export interface FormLiteArc {
  bar: number;
  phraseType: PhraseType;
  densityTarget: DensityLevel;
}

export interface EllingtonParameters {
  densityBias: number;
  contrastBias: number;
  backgroundFigureDensity: number;
  tuttiThreshold: number;
  callResponseStrength: number;
  arrangementMode?: ArrangementMode;
  phraseSpan?: PhraseSpan;
  minLeadPersistence?: number;
  minSupportPersistence?: number;
  releaseBars?: number;
  intensificationBars?: number;
}

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
  phrasePlans?: PhraseRolePlan[];
}

export type ArrangementMode = 'classic' | 'ballad' | 'shout';

export const DEFAULT_PARAMS: EllingtonParameters = {
  densityBias: 0.5,
  contrastBias: 0.6,
  backgroundFigureDensity: 0.4,
  tuttiThreshold: 0.85,
  callResponseStrength: 0.6,
  phraseSpan: 4,
  minLeadPersistence: 2,
  minSupportPersistence: 1,
  releaseBars: 2,
  intensificationBars: 2,
};

export const MODE_PARAMS: Record<ArrangementMode, Partial<EllingtonParameters>> = {
  classic: {
    densityBias: 0.5,
    contrastBias: 0.65,
    backgroundFigureDensity: 0.4,
    tuttiThreshold: 0.85,
    callResponseStrength: 0.6,
    phraseSpan: 4,
    minLeadPersistence: 2,
    minSupportPersistence: 2,
    releaseBars: 2,
    intensificationBars: 2,
  },
  ballad: {
    densityBias: 0.3,
    contrastBias: 0.4,
    backgroundFigureDensity: 0.25,
    tuttiThreshold: 0.95,
    callResponseStrength: 0.35,
    phraseSpan: 4,
    minLeadPersistence: 3,
    minSupportPersistence: 3,
    releaseBars: 3,
    intensificationBars: 1,
  },
  shout: {
    densityBias: 0.7,
    contrastBias: 0.75,
    backgroundFigureDensity: 0.55,
    tuttiThreshold: 0.75,
    callResponseStrength: 0.7,
    phraseSpan: 2,
    minLeadPersistence: 1,
    minSupportPersistence: 1,
    releaseBars: 1,
    intensificationBars: 3,
  },
};
