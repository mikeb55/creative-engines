/**
 * Composer OS V2 — App API types
 */

export interface AppPreset {
  id: string;
  name: string;
  description: string;
  supported: boolean;
}

export interface AppStyleModule {
  id: string;
  name: string;
  enabled: boolean;
  /** Registered modules may be used in primary, secondary, or colour slots */
  type?: 'primary' | 'secondary' | 'colour' | 'any';
}

export interface AppStyleStack {
  primary: string;
  secondary?: string;
  colour?: string;
  weights: { primary: number; secondary?: number; colour?: number };
}

export interface AppLocks {
  melody?: boolean;
  bass?: boolean;
  harmony?: boolean;
  rhythm?: boolean;
  sectionA?: boolean;
  sectionB?: boolean;
}

export interface GenerateRequest {
  presetId: string;
  styleStack: AppStyleStack;
  seed: number;
  locks?: AppLocks;
}

export interface ValidationSummary {
  scoreIntegrity: boolean;
  exportIntegrity: boolean;
  behaviourGates: boolean;
  mxValid: boolean;
  sibeliusSafe: boolean;
  readinessRelease: number;
  readinessMx: number;
  shareable: boolean;
  errors: string[];
}

export interface OutputEntry {
  filename: string;
  filepath: string;
  timestamp: string;
  presetId: string;
  styleStack: string[];
  seed: number;
  validation: ValidationSummary;
}
