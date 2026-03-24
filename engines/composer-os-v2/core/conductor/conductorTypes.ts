/**
 * Composer OS V2 — Conductor types
 * Pipeline coordinator: form → feel → harmony → instrument → counterpoint → integrity → export → readiness.
 */

import type { CompositionContext } from '../compositionContext';
import type { RunManifest } from '../run-ledger/runLedgerTypes';

/** Validation result for a single gate. */
export interface GateValidation {
  gate: string;
  passed: boolean;
  errors: string[];
}

/** Aggregated validation results. */
export interface ValidationResults {
  gates: GateValidation[];
  passed: boolean;
}

/** Pipeline step identifier. */
export type PipelineStep =
  | 'form'
  | 'feel'
  | 'harmony'
  | 'instrument_behaviour'
  | 'counterpoint_texture'
  | 'score_integrity'
  | 'musicxml_export'
  | 'mx_validation'
  | 'readiness_scoring'
  | 'release_gate';

/** Conductor run result. */
export interface ConductorResult {
  success: boolean;
  context: CompositionContext;
  pipelineSteps: Array<{ step: PipelineStep; success: boolean }>;
  runManifest?: RunManifest;
  error?: string;
}
