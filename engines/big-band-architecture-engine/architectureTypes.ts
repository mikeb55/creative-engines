/**
 * Big Band Architecture Engine — Type definitions
 */

export type SectionRole =
  | 'intro'
  | 'head'
  | 'background_chorus'
  | 'soli'
  | 'shout_chorus'
  | 'interlude'
  | 'tag'
  | 'outro';

export type LeadSection = 'saxes' | 'trumpets' | 'trombones' | 'rhythm' | 'tutti';

export type DensityLevel = 'sparse' | 'medium' | 'dense' | 'tutti';

export interface ChordSegment {
  chord: string;
  bars: number;
}

export interface ArrangementSection {
  name: string;
  role: SectionRole;
  startBar: number;
  length: number;
  leadSection: LeadSection;
  density: DensityLevel;
  notes: string;
}

export interface ArrangementArchitecture {
  id: string;
  name: string;
  sections: ArrangementSection[];
  totalBars: number;
  progressionTemplate: string;
}

export interface ArchitectureParameters {
  style?: 'standard_swing' | 'ellington_style' | 'ballad_form';
  seed?: number;
  progressionTemplate?: string;
}
