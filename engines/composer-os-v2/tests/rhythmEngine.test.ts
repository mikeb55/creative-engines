/**
 * Composer OS V2 — Rhythm Engine tests
 * Feel config validation and constraint output.
 */

import { computeRhythmicConstraints } from '../core/rhythm-engine/rhythmEngine';
import { validateFeelConfig } from '../core/rhythm-engine/rhythmValidation';

function testValidFeelReturnsConstraints(): boolean {
  const constraints = computeRhythmicConstraints({
    mode: 'swing',
    intensity: 0.7,
    syncopationDensity: 'medium',
  });
  return constraints.mode === 'swing' && constraints.intensity === 0.7;
}

function testInvalidIntensityFails(): boolean {
  const result = validateFeelConfig({
    mode: 'swing',
    intensity: 1.5,
    syncopationDensity: 'low',
  });
  return !result.valid && result.errors.some((e) => e.includes('intensity'));
}

function testStraightHighSyncopationIncoherent(): boolean {
  const result = validateFeelConfig({
    mode: 'straight',
    intensity: 0.5,
    syncopationDensity: 'high',
  });
  return !result.valid && result.errors.length > 0;
}

function testAllFeelModesValid(): boolean {
  const modes = ['swing', 'straight', 'hybrid'] as const;
  for (const mode of modes) {
    const r = computeRhythmicConstraints({
      mode,
      intensity: 0.5,
      syncopationDensity: 'low',
    });
    if (r.mode !== mode) return false;
  }
  return true;
}

function testSyncopationAffectsOffbeatWeight(): boolean {
  const low = computeRhythmicConstraints({ mode: 'swing', intensity: 0.5, syncopationDensity: 'low' });
  const high = computeRhythmicConstraints({ mode: 'swing', intensity: 0.5, syncopationDensity: 'high' });
  return high.offbeatWeight > low.offbeatWeight;
}

export function runRhythmEngineTests(): { name: string; ok: boolean }[] {
  return [
    ['Valid feel returns constraints', testValidFeelReturnsConstraints],
    ['Invalid intensity fails validation', testInvalidIntensityFails],
    ['Straight + high syncopation incoherent', testStraightHighSyncopationIncoherent],
    ['All feel modes valid', testAllFeelModesValid],
    ['Syncopation affects offbeat weight', testSyncopationAffectsOffbeatWeight],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
