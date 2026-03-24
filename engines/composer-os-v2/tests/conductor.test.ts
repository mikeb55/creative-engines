/**
 * Composer OS V2 — Conductor tests
 * Contract validity and pipeline execution.
 */

import { runConductorPipeline } from '../core/conductor/conductor';
import { validateConductorResult } from '../core/conductor/conductorValidation';
import type { PipelineStep } from '../core/conductor/conductorTypes';

function testConductorPipelineRuns(): boolean {
  const result = runConductorPipeline(12345, 'guitar_bass_duo');
  if (!result.success) return false;
  if (!result.context) return false;
  return result.pipelineSteps.length >= 10;
}

function testConductorResultValidation(): boolean {
  const result = runConductorPipeline(1, 'guitar_bass_duo');
  const validation = validateConductorResult(result);
  return validation.valid;
}

function testConductorUsesPreset(): boolean {
  const result = runConductorPipeline(42, 'guitar_bass_duo');
  if (!result.success || !result.context) return false;
  const profiles = result.context.instrumentProfiles;
  return profiles.length >= 2;
}

function testConductorRunManifest(): boolean {
  const result = runConductorPipeline(999, 'ecm_chamber');
  if (!result.success || !result.runManifest) return false;
  return result.runManifest.seed === 999 && result.runManifest.presetId === 'ecm_chamber';
}

function testConductorAllPipelineSteps(): boolean {
  const result = runConductorPipeline(0, 'big_band');
  const steps = new Set(result.pipelineSteps.map((s) => s.step));
  const required: PipelineStep[] = ['form', 'feel', 'harmony', 'instrument_behaviour', 'counterpoint_texture', 'score_integrity', 'musicxml_export', 'mx_validation', 'readiness_scoring', 'release_gate'];
  return required.every((s) => steps.has(s));
}

export function runConductorTests(): { name: string; ok: boolean }[] {
  return [
    ['Pipeline runs', testConductorPipelineRuns],
    ['Result validation passes', testConductorResultValidation],
    ['Uses preset instrument profiles', testConductorUsesPreset],
    ['Run manifest created', testConductorRunManifest],
    ['All pipeline steps present', testConductorAllPipelineSteps],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
