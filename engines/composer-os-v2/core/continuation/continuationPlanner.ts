/**
 * Plan continuation steps — metadata only; engine runs use same mode + seed policy.
 */

import type { ContinuationPlan, ContinuationRequest } from './continuationTypes';
import { validateContinuationRequest } from './continuationValidation';

export function planContinuation(req: ContinuationRequest): ContinuationPlan {
  const v = validateContinuationRequest(req);
  if (!v.ok) {
    return {
      ok: false,
      presetId: req.presetId,
      seed: req.seed,
      suggestedAction: 'Fix validation errors before continuing',
      mustPreserveMode: true,
      errors: v.errors,
    };
  }
  const actions: Record<ContinuationRequest['intent'], string> = {
    continue_piece: 'Re-run generation with incremented seed; keep style stack and form length',
    next_section: 'Advance form planner — next section after ' + (req.fromSectionLabel ?? 'current'),
    extend_form: 'Increase total bars in planner input — preserve existing sections',
    developed_variation: 'Offset seed and keep locks off melody layer for variation pass',
  };
  return {
    ok: true,
    presetId: req.presetId,
    seed: req.seed,
    suggestedAction: actions[req.intent],
    mustPreserveMode: true,
  };
}
