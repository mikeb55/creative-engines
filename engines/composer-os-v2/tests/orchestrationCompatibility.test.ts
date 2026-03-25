/**
 * Orchestration compatibility — ECM texture + Song Mode sections (Prompt 4/7).
 */

import {
  mapEcmTextureStateToOrchestrationRoles,
  mapEcmTextureStatesToPrimaryRole,
  mapSongSectionKindToOrchestrationIntent,
} from '../core/orchestration/orchestrationCompatibility';

export function runOrchestrationCompatibilityTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const hoverRoles = mapEcmTextureStateToOrchestrationRoles('hover');
  const primaryFromPlateau = mapEcmTextureStatesToPrimaryRole(['intro_plateau', 'hover']);
  out.push({
    ok: hoverRoles.includes('pad') && primaryFromPlateau === 'pad',
    name: 'ECM compatibility mapping works without changing ECM',
  });

  const chorus = mapSongSectionKindToOrchestrationIntent('chorus');
  const verse = mapSongSectionKindToOrchestrationIntent('verse');
  out.push({
    ok: chorus.primaryRole === 'lead' && chorus.hookPriority > verse.hookPriority,
    name: 'Song Mode compatibility: chorus vs verse intents',
  });

  return out;
}
