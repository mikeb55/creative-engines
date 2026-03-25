/**
 * String quartet planning validation (Prompt 6/7).
 */

import { planDefaultQuartetForm } from '../core/string-quartet/quartetFormPlanner';
import type { QuartetDensityPlan } from '../core/string-quartet/quartetPlanTypes';
import {
  buildAllConstantMotionTextureFailure,
  validateNotAllPartsConstantMotion,
  validateQuartetPlanningBundle,
  validateQuartetRegisterOwnership,
  validateSingleLeadPerSlice,
} from '../core/string-quartet/quartetValidation';
import { assembleQuartetOrchestrationPlan } from '../core/string-quartet/buildQuartetOrchestrationPlan';
import { planQuartetDensity } from '../core/string-quartet/quartetDensityPlanner';
import { planQuartetTexture } from '../core/string-quartet/quartetTexturePlanner';
import { validateDensityNoOverload } from '../core/orchestration/orchestrationValidation';

export function runStringQuartetValidationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const form = planDefaultQuartetForm(99_001);
  const goodTexture = planQuartetTexture(form, 99_001);
  const goodDensity = planQuartetDensity(form);
  out.push({
    ok: validateQuartetPlanningBundle(form, goodTexture, goodDensity).ok,
    name: 'default quartet planning bundle passes validation',
  });

  const badTexture = buildAllConstantMotionTextureFailure(1);
  const allDense: QuartetDensityPlan = {
    slices: form.slices.map((s) => ({
      formSliceIndex: s.index,
      phase: s.phase,
      density: 'dense',
    })),
  };
  const bad = validateQuartetPlanningBundle(form, badTexture, allDense);
  out.push({
    ok: !bad.ok && bad.errors.some((e) => e.includes('all-parts constant motion')),
    name: 'negative: all-dense + all-moving texture fails constant-motion rule',
  });

  out.push({
    ok: !validateNotAllPartsConstantMotion(badTexture, allDense).ok,
    name: 'validateNotAllPartsConstantMotion rejects overload case',
  });

  const collisionTexture = {
    slices: goodTexture.slices.map((sl, i) =>
      i === 0
        ? {
            ...sl,
            rolesByInstrument: {
              ...sl.rolesByInstrument,
              violin_1: 'lead' as const,
              violin_2: 'lead' as const,
            },
          }
        : sl
    ),
  };
  out.push({
    ok: !validateSingleLeadPerSlice(collisionTexture).ok,
    name: 'validation catches multiple leads in one slice',
  });

  const orch = assembleQuartetOrchestrationPlan({
    formPlan: form,
    texturePlan: goodTexture,
    densityPlan: goodDensity,
  });
  out.push({
    ok: validateQuartetRegisterOwnership(orch).ok && validateDensityNoOverload(orch).ok,
    name: 'register ownership + density overload OK on default quartet orchestration',
  });

  return out;
}
