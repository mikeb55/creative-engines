/**
 * Compatibility shims — ECM texture → orchestration roles; Song Mode → section intents (Prompt 4/7).
 * Pure mapping helpers; does not call generation or mutate scores.
 */

import type { SongSectionKind } from '../song-mode/songModeTypes';
import type { OrchestrationRoleLabel } from './orchestrationRoleTypes';

/** Map ECM metric texture state strings to orchestration roles (heuristic, stable). */
export function mapEcmTextureStateToOrchestrationRoles(state: string): OrchestrationRoleLabel[] {
  const s = state.toLowerCase();
  if (s.includes('thin') || s.includes('solo')) return ['lead', 'support'];
  if (s.includes('hover') || s.includes('float') || s.includes('cloud')) return ['pad', 'lead'];
  if (s.includes('swell') || s.includes('bloom') || s.includes('layered')) return ['inner_motion', 'pad'];
  if (s.includes('release') || s.includes('cadence')) return ['support', 'bass_anchor'];
  if (s.includes('echo') || s.includes('return')) return ['counterline', 'lead'];
  if (s.includes('plateau')) return ['pad', 'lead'];
  if (s.includes('chamber')) return ['inner_motion', 'support'];
  if (s.includes('open_fifth') || s.includes('suspended')) return ['pad', 'bass_anchor'];
  return ['support', 'lead'];
}

export function mapEcmTextureStatesToPrimaryRole(states: readonly string[]): OrchestrationRoleLabel {
  if (states.length === 0) return 'support';
  const first = mapEcmTextureStateToOrchestrationRoles(states[0]);
  return first[0] ?? 'lead';
}

export interface SongSectionOrchestrationIntent {
  sectionKind: SongSectionKind;
  /** Primary melodic/orchestration intent for future big-band/quartet hooks. */
  primaryRole: OrchestrationRoleLabel;
  hookPriority: number;
  tension: 'low' | 'medium' | 'high';
}

export function mapSongSectionKindToOrchestrationIntent(kind: SongSectionKind): SongSectionOrchestrationIntent {
  switch (kind) {
    case 'verse':
      return { sectionKind: kind, primaryRole: 'support', hookPriority: 0.35, tension: 'low' };
    case 'pre_chorus':
      return { sectionKind: kind, primaryRole: 'inner_motion', hookPriority: 0.55, tension: 'medium' };
    case 'chorus':
      return { sectionKind: kind, primaryRole: 'lead', hookPriority: 1, tension: 'high' };
    case 'bridge':
      return { sectionKind: kind, primaryRole: 'counterline', hookPriority: 0.5, tension: 'medium' };
    default:
      return { sectionKind: 'verse', primaryRole: 'support', hookPriority: 0.3, tension: 'low' };
  }
}
