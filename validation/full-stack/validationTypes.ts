/**
 * Full-Stack Validation — Type definitions
 */

export interface TestProgression {
  id: string;
  chords: { chord: string; bars: number }[];
  bars: number;
  timeSignature: { beats: number; beatType: number };
  style: string;
}

export interface PipelineResult {
  progressionId: string;
  seed: number;
  success: boolean;
  error?: string;
  architecture?: unknown;
  ellingtonPlan?: unknown;
  arrangerAssistPlan?: unknown;
  selectivePlan?: unknown;
  musicXml?: string;
  scores: {
    architectureQuality: number;
    orchestrationPlausibility: number;
    arrangerUsefulness: number;
    noteGenerationPlausibility: number;
    musicXmlValidity: number;
  };
  timings: {
    architecture: number;
    ellington: number;
    arrangerAssist: number;
    selective: number;
    musicXml: number;
  };
}

export interface ValidationReport {
  runs: number;
  failures: number;
  averageScore: number;
  bestScore: number;
  worstScore: number;
  engineTimings: {
    architecture: number;
    ellington: number;
    arrangerAssist: number;
    selective: number;
    musicXml: number;
  };
  results: PipelineResult[];
  generatedAt: string;
}
