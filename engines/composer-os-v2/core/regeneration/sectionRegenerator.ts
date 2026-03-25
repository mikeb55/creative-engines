/**
 * Section regeneration gate — safe defaults; callers attach real regen when available.
 */

import type { SectionRegenerationRequest, SectionRegenerationResult } from './regenerationTypes';
import { validateSectionRegenerationRequest } from './regenerationValidation';

export function planSectionRegeneration(req: SectionRegenerationRequest): SectionRegenerationResult {
  const v = validateSectionRegenerationRequest(req);
  if (!v.ok) {
    return { ok: false, canRegenerate: false, reason: v.errors.join('; ') };
  }
  if (req.locks?.form) {
    return {
      ok: true,
      canRegenerate: false,
      reason: 'Form lock on — section boundaries fixed; adjust locks to regenerate interior',
    };
  }
  return {
    ok: true,
    canRegenerate: true,
    reason: `Regenerate ${req.sectionId ?? req.target} with current locks respected`,
  };
}
