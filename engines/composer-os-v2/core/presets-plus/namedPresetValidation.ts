/**
 * Validate named preset ids and consistency with base preset.
 */

import type { NamedPresetId } from './namedPresetTypes';
import { NAMED_PRESET_LIBRARY, listNamedPresetIds } from './namedPresetLibrary';

export function isValidNamedPresetId(raw: string): raw is NamedPresetId {
  return listNamedPresetIds().includes(raw as NamedPresetId);
}

export function validateNamedPresetDefinition(id: NamedPresetId): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const def = NAMED_PRESET_LIBRARY[id];
  if (!def) {
    errors.push(`unknown named preset: ${id}`);
    return { ok: false, errors };
  }
  if (!def.basePresetId) errors.push('named preset missing basePresetId');
  if (!def.defaultStyleStack?.primary) errors.push('named preset missing style primary');
  return { ok: errors.length === 0, errors };
}
