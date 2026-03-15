/**
 * Arranger-Assist Engine — Type definitions
 */

export type SuggestionRole =
  | 'background_figure'
  | 'punctuation'
  | 'soli_texture'
  | 'shout_ramp'
  | 'section_swap';

export type DensityLevel = 'sparse' | 'medium' | 'dense' | 'tutti';

export interface BarRange {
  startBar: number;
  endBar: number;
}

export interface BaseSuggestion {
  section: string;
  barRange: BarRange;
  role: SuggestionRole;
  density: DensityLevel;
  description: string;
  confidence: number;
  optionalRhythmText?: string;
  optionalVoicingHint?: string;
}

export interface BackgroundFigureSuggestion extends BaseSuggestion {
  role: 'background_figure';
  subtype?: 'sax_pad' | 'sax_rhythmic' | 'bone_support' | 'brass_punctuation_behind_lead';
}

export interface PunctuationSuggestion extends BaseSuggestion {
  role: 'punctuation';
  subtype?: 'brass_stab' | 'tutti_hit' | 'section_answer';
}

export interface SoliTextureSuggestion extends BaseSuggestion {
  role: 'soli_texture';
  subtype?: 'sax_soli' | 'brass_block_answer' | 'trombone_pad_support';
}

export interface ShoutRampSuggestion extends BaseSuggestion {
  role: 'shout_ramp';
  subtype?: 'setup' | 'intensification' | 'arrival' | 'release';
}

export interface SectionSwapSuggestion extends BaseSuggestion {
  role: 'section_swap';
  subtype?: 'reeds_brass_handoff' | 'sparse_dense_alternative';
}

export type ArrangerSuggestion =
  | BackgroundFigureSuggestion
  | PunctuationSuggestion
  | SoliTextureSuggestion
  | ShoutRampSuggestion
  | SectionSwapSuggestion;

export interface ArrangerAssistPlan {
  id: string;
  architectureName: string;
  progressionTemplate: string;
  totalBars: number;
  suggestions: ArrangerSuggestion[];
  generatedAt: string;
}

export interface ArrangerAssistParameters {
  seed?: number;
  arrangementMode?: 'classic' | 'ballad' | 'shout';
}
