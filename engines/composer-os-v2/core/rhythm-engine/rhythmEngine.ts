/**
 * Composer OS V2 — Rhythm Engine
 * Returns rhythmic behaviour constraints, not final notes.
 */

import type { FeelConfig, RhythmicConstraints } from './rhythmTypes';
import { validateFeelConfig } from './rhythmValidation';

/**
 * Convert feel config to rhythmic constraints.
 * Stub: returns typed constraints; no deep generation.
 */
export function computeRhythmicConstraints(feel: FeelConfig): RhythmicConstraints {
  const result = validateFeelConfig(feel);
  if (!result.valid) {
    throw new Error(`Feel config invalid: ${result.errors.join('; ')}`);
  }

  const subdivision =
    feel.syncopationDensity === 'high' ? 'sixteenth' :
    feel.syncopationDensity === 'medium' ? 'mixed' : 'eighth';

  const offbeatWeight =
    feel.syncopationDensity === 'high' ? 0.7 :
    feel.syncopationDensity === 'medium' ? 0.5 : 0.3;

  const tripletHint = feel.mode === 'swing' || feel.mode === 'hybrid';
  const phraseDisplacementTendency = feel.mode === 'swing' || feel.mode === 'hybrid' ? 0.3 : 0.1;
  const sustainTendency = feel.intensity < 0.5 ? 0.7 : 0.5;
  const attackDensityTendency = feel.syncopationDensity === 'high' ? 0.7 : feel.syncopationDensity === 'medium' ? 0.5 : 0.3;

  return {
    mode: feel.mode,
    intensity: feel.intensity,
    syncopationDensity: feel.syncopationDensity,
    subdivisionPreference: subdivision,
    offbeatWeight,
    tripletHint,
    phraseDisplacementTendency,
    sustainTendency,
    attackDensityTendency,
  };
}
