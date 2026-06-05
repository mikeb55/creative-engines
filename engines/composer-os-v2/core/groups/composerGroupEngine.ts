/**
 * Composer OS — Group Mode defaults engine.
 */

import type { ComposerGroupAssignment, ComposerGroupId, GroupParams } from './composerGroupDefinitions';
import {
  COMPOSER_GROUP_DEFINITIONS,
  getComposerGroupAssignment,
  getDualGroupAssignment,
  getGroupDefinition,
  normalizeComposerId,
} from './composerGroupDefinitions';
import type { ComposerProductionParams } from './composerProductionParams';

export type { ComposerGroupId, GroupParams, ComposerProductionParams, ComposerGroupAssignment };

export {
  COMPOSER_GROUP_DEFINITIONS,
  COMPOSER_GROUP_DISPLAY_LABELS,
  DUAL_GROUP_COMPOSER_ASSIGNMENTS,
  normalizeComposerId,
} from './composerGroupDefinitions';

/** Returns default production group for composer (dual-group uses defaultTo). */
export function getComposerGroup(composerId: string): ComposerGroupId | null {
  return getComposerGroupAssignment(composerId);
}

/** Full group assignment including dual-group primary / secondary / defaultTo. */
export function getComposerGroups(composerId: string): ComposerGroupAssignment | null {
  const canonical = normalizeComposerId(composerId);
  const dual = getDualGroupAssignment(canonical);
  if (dual) return { ...dual };
  const group = getComposerGroupAssignment(canonical);
  if (!group) return null;
  return { primary: group, defaultTo: group };
}

/** Returns full default parameter object for a production group. */
export function getGroupDefaults(groupName: string): GroupParams | null {
  const def = COMPOSER_GROUP_DEFINITIONS.find((g) => g.id === groupName);
  if (!def?.defaults) return null;
  return { ...def.defaults };
}

/** Merge group defaults with composer overrides; optional groupOverride for dual-group secondary world. */
export function resolveComposerParams(
  composerId: string,
  composerOverrides: Partial<GroupParams> = {},
  groupOverride?: ComposerGroupId
): GroupParams | null {
  const canonical = normalizeComposerId(composerId);
  let group: ComposerGroupId | null = groupOverride ?? null;
  if (!group) {
    group = getComposerGroupAssignment(canonical);
  }
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

export function isPostBopCore(composerId: string): boolean {
  return getComposerGroup(composerId) === 'POST_BOP_CORE';
}

/** Canonical ids for group ordering — fully implemented first, then partial. */
export function listGroupMemberComposerIds(groupId: ComposerGroupId): readonly string[] {
  const def = getGroupDefinition(groupId);
  if (!def) return [];
  const order: Record<string, number> = {
    fully_implemented: 0,
    stub_exposed: 1,
    partial_future: 2,
    precursor_reserved: 3,
  };
  return [...def.members]
    .sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9))
    .map((m) => m.composerId);
}

/** UI roster — dual-group composers appear only under defaultTo group. */
export function listGroupMemberComposerIdsForUi(groupId: ComposerGroupId): readonly string[] {
  return listGroupMemberComposerIds(groupId).filter((composerId) => {
    const dual = getDualGroupAssignment(composerId);
    if (!dual) return true;
    return dual.defaultTo === groupId;
  });
}
