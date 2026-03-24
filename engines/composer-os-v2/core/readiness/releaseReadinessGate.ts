/**
 * Composer OS V2 — Release Readiness Gate
 * No output marked shareable unless thresholds pass.
 */

import { computeReleaseReadiness } from './readinessScorer';
import { computeMxReadiness } from './mxReadinessScorer';
import type { ReleaseReadinessResult } from './readinessTypes';
import type { MxReadinessResult } from './mxReadinessScorer';
import { RRG_THRESHOLD } from './readinessTypes';
import { MX_READINESS_THRESHOLD } from './mxReadinessScorer';

export interface ReleaseGateInput {
  validationPassed: boolean;
  exportValid: boolean;
  mxValid?: boolean;
  rhythmicCorrect?: boolean;
  registerCorrect?: boolean;
  sibeliusSafe?: boolean;
  chordRehearsalComplete?: boolean;
  exportIntegrity?: boolean;
}

export interface ReleaseGateResult {
  shareable: boolean;
  release: ReleaseReadinessResult;
  mx: MxReadinessResult;
}

/** Run release readiness gate. Output is shareable only if both pass. */
export function runReleaseReadinessGate(input: ReleaseGateInput): ReleaseGateResult {
  const release = computeReleaseReadiness({
    validationPassed: input.validationPassed,
    exportValid: input.exportValid,
    mxValid: input.mxValid,
  });

  const mx = computeMxReadiness({
    rhythmicCorrect: input.rhythmicCorrect ?? false,
    registerCorrect: input.registerCorrect ?? false,
    musicXmlValid: input.mxValid ?? false,
    sibeliusSafe: input.sibeliusSafe ?? false,
    chordRehearsalComplete: input.chordRehearsalComplete ?? false,
    exportIntegrity: input.exportIntegrity ?? true,
  });

  const shareable =
    release.passed &&
    release.overall >= RRG_THRESHOLD &&
    mx.passed &&
    mx.overall >= MX_READINESS_THRESHOLD;

  return { shareable, release, mx };
}
