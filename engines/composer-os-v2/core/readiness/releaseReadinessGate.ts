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
  /** When false, output is not shareable (MusicXML bar-math / export round-trip). */
  exportRoundTrip?: boolean;
  /** Song Mode: non-blocking phrase behaviour warnings — reduces readiness scores only. */
  phraseBehaviourWarningCount?: number;
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

  const wc = input.phraseBehaviourWarningCount ?? 0;
  const penalty = wc > 0 ? Math.min(0.2, 0.03 * wc) : 0;
  const releaseOverall = Math.max(0, release.overall - penalty);
  const mxOverall = Math.max(0, mx.overall - penalty);
  const releaseOut = { ...release, overall: releaseOverall };
  const mxOut = { ...mx, overall: mxOverall };

  const shareable =
    releaseOut.passed &&
    releaseOverall >= RRG_THRESHOLD &&
    mxOut.passed &&
    mxOverall >= MX_READINESS_THRESHOLD &&
    input.exportRoundTrip !== false;

  return { shareable, release: releaseOut, mx: mxOut };
}
