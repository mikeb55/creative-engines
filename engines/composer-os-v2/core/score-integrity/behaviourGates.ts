/**
 * Composer OS V2 — Behaviour validation gates
 */

import type { SectionWithRole } from '../section-roles/sectionRoleTypes';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import type { GuitarBehaviourPlan, BassBehaviourPlan } from '../instrument-behaviours/behaviourTypes';
import { validateGuitarBehaviour, validateBassBehaviour } from '../instrument-behaviours/behaviourValidation';
import { validateRhythmBehaviour } from '../rhythm-engine/rhythmBehaviourValidation';
import type { RhythmicConstraints } from '../rhythm-engine/rhythmTypes';
import { getDensityForBar } from '../density/densityCurvePlanner';
import type { DensityCurvePlan } from '../density/densityCurveTypes';

export interface SectionContrastResult {
  valid: boolean;
  errors: string[];
}

export function validateSectionContrast(
  sections: SectionWithRole[],
  densityPlan: DensityCurvePlan,
  score: ScoreModel
): SectionContrastResult {
  const errors: string[] = [];
  if (sections.length < 2) return { valid: true, errors: [] };

  const densityA = getDensityForBar(densityPlan, 1);
  const densityB = getDensityForBar(densityPlan, 5);
  if (densityA === densityB) {
    const guitarPitchesA = score.parts
      .find((p) => p.instrumentIdentity === 'clean_electric_guitar')
      ?.measures.filter((m) => m.index >= 1 && m.index <= 4)
      .flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => (e as { pitch: number }).pitch)) ?? [];
    const guitarPitchesB = score.parts
      .find((p) => p.instrumentIdentity === 'clean_electric_guitar')
      ?.measures.filter((m) => m.index >= 5 && m.index <= 8)
      .flatMap((m) => m.events.filter((e) => e.kind === 'note').map((e) => (e as { pitch: number }).pitch)) ?? [];
    const avgA = guitarPitchesA.length ? guitarPitchesA.reduce((a, b) => a + b, 0) / guitarPitchesA.length : 0;
    const avgB = guitarPitchesB.length ? guitarPitchesB.reduce((a, b) => a + b, 0) / guitarPitchesB.length : 0;
    const eventCountA = score.parts.reduce((s, p) => s + p.measures.filter((m) => m.index <= 4).flatMap((m) => m.events).length, 0);
    const eventCountB = score.parts.reduce((s, p) => s + p.measures.filter((m) => m.index >= 5).flatMap((m) => m.events).length, 0);
    if (Math.abs(avgA - avgB) < 2 && Math.abs(eventCountA - eventCountB) < 4) {
      errors.push('Sections A and B lack meaningful contrast in density or register');
    }
  }
  return { valid: errors.length === 0, errors };
}

export interface BehaviourGatesResult {
  rhythmValid: boolean;
  guitarValid: boolean;
  bassValid: boolean;
  sectionContrastValid: boolean;
  allValid: boolean;
  errors: string[];
}

export function runBehaviourGates(
  score: ScoreModel,
  rhythmConstraints: RhythmicConstraints,
  guitarPlan: GuitarBehaviourPlan,
  bassPlan: BassBehaviourPlan,
  sections: SectionWithRole[],
  densityPlan: DensityCurvePlan
): BehaviourGatesResult {
  const errors: string[] = [];

  const rhythm = validateRhythmBehaviour(score, rhythmConstraints);
  if (!rhythm.valid) errors.push(...rhythm.errors);

  const guitar = validateGuitarBehaviour(score, guitarPlan);
  if (!guitar.valid) errors.push(...guitar.errors);

  const bass = validateBassBehaviour(score, bassPlan);
  if (!bass.valid) errors.push(...bass.errors);

  const contrast = validateSectionContrast(sections, densityPlan, score);
  if (!contrast.valid) errors.push(...contrast.errors);

  return {
    rhythmValid: rhythm.valid,
    guitarValid: guitar.valid,
    bassValid: bass.valid,
    sectionContrastValid: contrast.valid,
    allValid: errors.length === 0,
    errors,
  };
}
