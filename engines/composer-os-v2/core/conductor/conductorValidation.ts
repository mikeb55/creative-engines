/**
 * Composer OS V2 — Conductor validation
 * Validates conductor inputs and pipeline invariants.
 */

import type { ConductorResult, PipelineStep } from './conductorTypes';

export interface ConductorValidationResult {
  valid: boolean;
  errors: string[];
}

/** Validate conductor pipeline result. */
export function validateConductorResult(result: ConductorResult): ConductorValidationResult {
  const errors: string[] = [];

  if (!result.success && !result.error) {
    errors.push('Failed result must include error message');
  }

  if (result.success && !result.context) {
    errors.push('Successful result must include context');
  }

  const requiredSteps: PipelineStep[] = [
    'form',
    'feel',
    'harmony',
    'instrument_behaviour',
    'counterpoint_texture',
    'score_integrity',
    'musicxml_export',
    'mx_validation',
    'readiness_scoring',
    'release_gate',
  ];

  const stepNames = result.pipelineSteps.map((s) => s.step);
  for (const req of requiredSteps) {
    if (!stepNames.includes(req)) {
      errors.push(`Missing pipeline step: ${req}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
