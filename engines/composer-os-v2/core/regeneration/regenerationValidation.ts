/**
 * Validate section regeneration requests.
 */

import type { SectionRegenerationRequest } from './regenerationTypes';

export function validateSectionRegenerationRequest(req: SectionRegenerationRequest): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!req.target || String(req.target).trim() === '') errors.push('target section required');
  return { ok: errors.length === 0, errors };
}
