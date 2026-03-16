/**
 * Conductor Engine — Type definitions
 * Coordinates form → harmony → counterpoint → orchestration → export
 */

export type CompositionStyle = 'chamber_jazz' | 'big_band' | 'guitar_duo';

export type FormTemplate =
  | 'AABA'
  | 'blues'
  | 'rhythm_changes'
  | 'through_composed'
  | 'custom';

export type CounterpointMode = 'wyble' | 'contemporary';

export type OrchestrationMode = 'ellington' | 'chamber';

export interface CompositionRequest {
  style: CompositionStyle;
  form: FormTemplate;
  progression?: string[];
  importMusicXML?: string;
  counterpointMode?: CounterpointMode;
  orchestrationMode?: OrchestrationMode;
  progressionTemplate?: string;
  seed?: number;
}

export interface FormStructure {
  template: FormTemplate;
  sections: { name: string; startBar: number; length: number }[];
  totalBars: number;
}

export interface ChordSegment {
  chord: string;
  bars: number;
}

export interface CompositionSection {
  name: string;
  role: string;
  startBar: number;
  length: number;
  leadSection?: string;
  density?: string;
}

export interface EngineCall {
  engine: string;
  input: unknown;
  output?: unknown;
  success: boolean;
  error?: string;
}

export interface CounterpointLine {
  voiceId: string;
  notes: { pitch: number; startBeat: number; duration: number }[];
}

export interface OrchestrationPlan {
  bars: unknown[];
  totalBars: number;
  progression: ChordSegment[];
}

export interface ArchitecturePlan {
  id: string;
  name: string;
  sections: CompositionSection[];
  totalBars: number;
  progressionTemplate: string;
}

export interface CompositionArchitecture {
  request: CompositionRequest;
  formStructure: FormStructure;
  progression: ChordSegment[];
  counterpointLines?: CounterpointLine[];
  orchestrationPlan?: OrchestrationPlan;
  architecturePlan?: ArchitecturePlan;
  engineCalls: EngineCall[];
  generatedAt: string;
}

export interface GenerationResult {
  success: boolean;
  architecture: CompositionArchitecture;
  compositionPlanPath?: string;
  architectureJsonPath?: string;
  scoreMusicPath?: string;
  error?: string;
}
