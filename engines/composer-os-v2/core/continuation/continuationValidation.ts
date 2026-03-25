/**
 * Validate continuation requests.
 */

import type { ContinuationRequest } from './continuationTypes';

const PRESETS = new Set([
  'guitar_bass_duo',
  'ecm_chamber',
  'song_mode',
  'big_band',
  'string_quartet',
]);

export function validateContinuationRequest(req: ContinuationRequest): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!PRESETS.has(req.presetId)) errors.push('Unknown preset for continuation');
  if (typeof req.seed !== 'number' || !Number.isFinite(req.seed)) errors.push('seed must be finite');
  if (!req.intent) errors.push('intent required');
  return { ok: errors.length === 0, errors };
}
