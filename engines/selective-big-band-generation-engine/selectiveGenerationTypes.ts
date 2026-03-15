/**
 * Selective Big-Band Generation Engine — Type definitions
 */

export type TargetType =
  | 'background_figures'
  | 'brass_punctuation'
  | 'sax_soli_texture'
  | 'shout_ramp_material';

export type DensityLevel = 'sparse' | 'medium' | 'dense' | 'tutti';

export interface BarRange {
  startBar: number;
  endBar: number;
}

export interface GeneratedUnit {
  barRange: BarRange;
  section: string;
  targetType: TargetType;
  density: DensityLevel;
  notes: string;
  rhythmPattern: string;
  voicingHint: string;
  confidence: number;
  staffIds: string[];
  noteEvents?: NoteEvent[];
}

export interface NoteEvent {
  bar: number;
  beat: number;
  duration: number;
  pitch: string;
  staffId: string;
}

export interface SelectiveMaterialPlan {
  id: string;
  targetType: TargetType;
  architectureName: string;
  totalBars: number;
  units: GeneratedUnit[];
  generatedAt: string;
}

export interface SelectiveGenerationParameters {
  seed?: number;
}
