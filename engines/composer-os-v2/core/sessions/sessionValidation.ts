/**
 * Session payload validation.
 */

import { SESSION_FORMAT_VERSION, type ComposerSessionV1 } from './sessionTypes';

export function validateSessionPayload(raw: unknown): { ok: boolean; errors: string[]; session?: ComposerSessionV1 } {
  const errors: string[] = [];
  if (raw == null || typeof raw !== 'object') {
    return { ok: false, errors: ['session: not an object'] };
  }
  const o = raw as Record<string, unknown>;
  if (o.formatVersion !== SESSION_FORMAT_VERSION) {
    errors.push(`session: expected formatVersion ${SESSION_FORMAT_VERSION}`);
  }
  if (typeof o.presetId !== 'string' || !o.presetId) errors.push('session: presetId required');
  if (typeof o.seed !== 'number' || !Number.isFinite(o.seed)) errors.push('session: seed must be a number');
  if (!o.styleStack || typeof o.styleStack !== 'object') errors.push('session: styleStack required');
  const ss = o.styleStack as { primary?: unknown };
  if (typeof ss.primary !== 'string') errors.push('session: styleStack.primary required');
  if (typeof o.savedAt !== 'string') errors.push('session: savedAt should be ISO string');
  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], session: raw as ComposerSessionV1 };
}
