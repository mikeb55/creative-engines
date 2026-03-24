/**
 * Composer OS V2 — Readiness tests
 */

import { runReleaseReadinessGate } from '../core/readiness/releaseReadinessGate';
import { computeReleaseReadiness } from '../core/readiness/readinessScorer';
import { computeMxReadiness } from '../core/readiness/mxReadinessScorer';

function testReleaseReadinessGatePassesWhenValid(): boolean {
  const r = runReleaseReadinessGate({
    validationPassed: true,
    exportValid: true,
    mxValid: true,
    rhythmicCorrect: true,
    registerCorrect: true,
    sibeliusSafe: true,
    chordRehearsalComplete: true,
  });
  return r.shareable;
}

function testReleaseReadinessGateFailsWhenInvalid(): boolean {
  const r = runReleaseReadinessGate({
    validationPassed: false,
    exportValid: false,
  });
  return !r.shareable;
}

function testReadinessScorerReturnsCategories(): boolean {
  const r = computeReleaseReadiness({
    validationPassed: true,
    exportValid: true,
  });
  return r.categories.length >= 6 && typeof r.overall === 'number';
}

function testMxReadinessReturnsCategories(): boolean {
  const r = computeMxReadiness({
    rhythmicCorrect: true,
    registerCorrect: true,
    musicXmlValid: true,
    sibeliusSafe: true,
    chordRehearsalComplete: true,
  });
  return r.categories.length >= 5 && r.passed;
}

function testShareableRequiresBothGates(): boolean {
  const r = runReleaseReadinessGate({
    validationPassed: true,
    exportValid: true,
    mxValid: false,
  });
  return !r.shareable;
}

export function runReadinessTests(): { name: string; ok: boolean }[] {
  return [
    ['Release gate passes when valid', testReleaseReadinessGatePassesWhenValid],
    ['Release gate fails when invalid', testReleaseReadinessGateFailsWhenInvalid],
    ['Readiness scorer returns categories', testReadinessScorerReturnsCategories],
    ['MX readiness returns categories', testMxReadinessReturnsCategories],
    ['Shareable requires both gates', testShareableRequiresBothGates],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
