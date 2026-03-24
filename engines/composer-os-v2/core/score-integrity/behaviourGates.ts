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
import type { MotifTrackerState } from '../motif/motifTypes';
import { validateMotifIntegrity } from '../motif/motifValidation';
import { validateBarryHarrisConformance } from '../style-modules/barry-harris/moduleValidation';
import { validateMethenyConformance } from '../style-modules/metheny/moduleValidation';
import { validateTriadPairConformance } from '../style-modules/triad-pairs/moduleValidation';
import type { StyleStack } from '../style-modules/styleModuleTypes';
import { normalizeStyleWeights } from '../style-modules/styleModuleTypes';
import type { InteractionPlan } from '../interaction/interactionTypes';
import { validateInteractionIntegrity, validateRegisterSeparation } from '../interaction/interactionValidation';

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
  motifValid: boolean;
  styleValid: boolean;
  styleBlendValid: boolean;
  triadPairValid: boolean;
  methenyValid: boolean;
  interactionValid: boolean;
  registerSeparationValid: boolean;
  allValid: boolean;
  errors: string[];
}

function validateStyleBlendIntegrity(stack: StyleStack): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const w = normalizeStyleWeights(stack);
  if (w.primary <= 0) errors.push('Style stack primary weight must be > 0');
  if (w.primary + w.secondary + w.colour < 0.01) errors.push('Style stack has no effective influence');
  return { valid: errors.length === 0, errors };
}

export function runBehaviourGates(
  score: ScoreModel,
  rhythmConstraints: RhythmicConstraints,
  guitarPlan: GuitarBehaviourPlan,
  bassPlan: BassBehaviourPlan,
  sections: SectionWithRole[],
  densityPlan: DensityCurvePlan,
  opts?: { motifState?: MotifTrackerState; styleStack?: StyleStack; interactionPlan?: InteractionPlan }
): BehaviourGatesResult {
  const errors: string[] = [];
  const styleStack = opts?.styleStack;
  const styleModules = styleStack
    ? [styleStack.primary, styleStack.secondary, styleStack.colour].filter(Boolean) as string[]
    : [];

  const rhythm = validateRhythmBehaviour(score, rhythmConstraints);
  if (!rhythm.valid) errors.push(...rhythm.errors);

  const guitar = validateGuitarBehaviour(score, guitarPlan);
  if (!guitar.valid) errors.push(...guitar.errors);

  const bass = validateBassBehaviour(score, bassPlan);
  if (!bass.valid) errors.push(...bass.errors);

  const contrast = validateSectionContrast(sections, densityPlan, score);
  if (!contrast.valid) errors.push(...contrast.errors);

  let motifValid = true;
  if (opts?.motifState) {
    const motif = validateMotifIntegrity(opts.motifState, score);
    motifValid = motif.valid;
    if (!motif.valid) errors.push(...motif.errors);
  }

  let styleBlendValid = true;
  let styleValid = true;
  if (styleStack) {
    const blend = validateStyleBlendIntegrity(styleStack);
    styleBlendValid = blend.valid;
    if (!blend.valid) errors.push(...blend.errors);

    if (styleModules.includes('barry_harris')) {
      const style = validateBarryHarrisConformance(score);
      styleValid = style.valid;
      if (!style.valid) errors.push(...style.errors);
    }
  }

  let triadPairValid = true;
  if (styleModules.includes('triad_pairs')) {
    const tp = validateTriadPairConformance(score);
    triadPairValid = tp.valid;
    if (!tp.valid) errors.push(...tp.errors);
  }

  let methenyValid = true;
  if (styleModules.includes('metheny')) {
    const metheny = validateMethenyConformance(score);
    methenyValid = metheny.valid;
    if (!metheny.valid) errors.push(...metheny.errors);
  }

  let interactionValid = true;
  let registerSeparationValid = true;
  if (opts?.interactionPlan) {
    const ia = validateInteractionIntegrity(score, opts.interactionPlan);
    interactionValid = ia.valid;
    if (!ia.valid) errors.push(...ia.errors);
    const rs = validateRegisterSeparation(score, opts.interactionPlan);
    registerSeparationValid = rs.valid;
    if (!rs.valid) errors.push(...rs.errors);
  }

  return {
    rhythmValid: rhythm.valid,
    guitarValid: guitar.valid,
    bassValid: bass.valid,
    sectionContrastValid: contrast.valid,
    motifValid,
    styleValid,
    styleBlendValid,
    triadPairValid,
    methenyValid,
    interactionValid,
    registerSeparationValid,
    allValid: errors.length === 0,
    errors,
  };
}
