/**
 * Composer OS — Group Mode defaults engine.
 */

import type { ComposerGroupId, GroupParams } from './composerGroupDefinitions';
import {
  COMPOSER_GROUP_DEFINITIONS,
  getComposerGroupAssignment,
  getGroupDefinition,
  normalizeComposerId,
} from './composerGroupDefinitions';
import type { ComposerProductionParams } from './composerProductionParams';

export type { ComposerGroupId, GroupParams, ComposerProductionParams };

export { COMPOSER_GROUP_DEFINITIONS, COMPOSER_GROUP_DISPLAY_LABELS, normalizeComposerId, POST_BOP_CORE_UI_COMPOSER_IDS } from './composerGroupDefinitions';

/** Returns active production group for composer, or null when unassigned / reserved. */
export function getComposerGroup(composerId: string): ComposerGroupId | null {
  return getComposerGroupAssignment(composerId);
}

/** Returns full default parameter object for an active group; null for placeholder groups. */
export function getGroupDefaults(groupName: string): GroupParams | null {
  const def = COMPOSER_GROUP_DEFINITIONS.find((g) => g.id === groupName);
  if (!def?.defaults) return null;
  return { ...def.defaults };
}

/** Merge group defaults with composer-specific overrides; override wins on conflict. */
export function resolveComposerParams(
  composerId: string,
  composerOverrides: Partial<GroupParams> = {}
): GroupParams | null {
  const group = getComposerGroup(composerId);
  if (!group) return null;
  const defaults = getGroupDefaults(group);
  if (!defaults) return null;
  return { ...defaults, ...composerOverrides };
}

export function isEcmChamber(composerId: string): boolean {
  return getComposerGroup(composerId) === 'ECM_CHAMBER_JAZZ';
}

export function isStudioOrchestral(composerId: string): boolean {
  return getComposerGroup(composerId) === 'STUDIO_ORCHESTRAL_JAZZ';
}

/** Returns false for all composers until Post-Bop Core defaults ship. */
export function isPostBopCore(_composerId: string): boolean {
  return false;
}

/** Canonical ids for UI optgroup ordering — fully implemented first, then partial. */
export function listGroupMemberComposerIds(groupId: ComposerGroupId): readonly string[] {
  const def = getGroupDefinition(groupId);
  if (!def) return [];
  const order: Record<string, number> = { fully_implemented: 0, partial_future: 1, precursor_reserved: 2 };
  return [...def.members]
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
    .map((m) => m.composerId);
}
