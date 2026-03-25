/**
 * Continuation planner.
 */

import type { BaseAppPresetId } from '../core/presets-plus/namedPresetTypes';
import { planContinuation } from '../core/continuation/continuationPlanner';
import { validateContinuationRequest } from '../core/continuation/continuationValidation';

export function runContinuationPlannerTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const okReq = validateContinuationRequest({
    presetId: 'ecm_chamber',
    seed: 3,
    intent: 'next_section',
    fromSectionLabel: 'A',
  });
  out.push({
    ok: okReq.ok,
    name: 'continuation validation accepts ecm request',
  });

  const plan = planContinuation({
    presetId: 'song_mode',
    seed: 9,
    intent: 'developed_variation',
  });
  out.push({
    ok: plan.ok && plan.mustPreserveMode === true,
    name: 'continuation planner ok for song_mode',
  });

  const bad = validateContinuationRequest({
    presetId: 'ecm_chamber',
    seed: NaN,
    intent: 'continue_piece',
  });
  out.push({
    ok: !bad.ok,
    name: 'negative: invalid seed rejected',
  });

  const badPlan = planContinuation({
    presetId: 'ecm_chamber',
    seed: NaN,
    intent: 'continue_piece',
  });
  out.push({
    ok: !badPlan.ok && (badPlan.errors?.length ?? 0) > 0,
    name: 'negative: continuation planner surfaces errors',
  });

  const badPreset = validateContinuationRequest({
    presetId: 'bogus_mode' as BaseAppPresetId,
    seed: 1,
    intent: 'continue_piece',
  });
  out.push({
    ok: !badPreset.ok,
    name: 'negative: unknown preset for continuation',
  });

  return out;
}
