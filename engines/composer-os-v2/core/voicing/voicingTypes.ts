/**
 * Ensemble voicing — planning layer for big band and string quartet realisation (Prompt C/3).
 */

export type VoicingSpreadStyle = 'open' | 'cluster' | 'balanced';

export interface PartVoicingRow {
  partId: string;
  spreadStyle: VoicingSpreadStyle;
  /** Approximate MIDI center for register-aware spacing */
  registerCenterMidi: number;
}

export interface EnsembleVoicingSlice {
  sectionIndex: number;
  startBar: number;
  endBar: number;
  rows: PartVoicingRow[];
}

export type EnsembleVoicingFamily = 'big_band' | 'string_quartet';

export interface EnsembleVoicingPlan {
  ensembleFamily: EnsembleVoicingFamily;
  totalBars: number;
  slices: EnsembleVoicingSlice[];
}

export interface VoicingValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
