/**
 * Registry of Song Mode composer evaluation profiles (GCE style branch / tooling).
 * Keeps songwriter ids aligned with {@link defaultStyleProfileForPrimarySongwriter} defaults.
 */

import type { SongwriterRuleId } from '../song-mode/songwritingResearchTypes';
import type { StyleProfile } from './evaluationTypes';
import { songModeBurtBacharachStyleProfile } from './songModeBurtBacharachStyleProfile';
import { songModeEcmEnsembleStyleProfile } from './songModeEcmEnsembleStyleProfile';
import { songModePatMethenyStyleProfile } from './songModePatMethenyStyleProfile';

export const SONG_MODE_COMPOSER_EVAL_PROFILES: Partial<Record<SongwriterRuleId, StyleProfile>> = {
  pat_metheny: songModePatMethenyStyleProfile,
  bacharach: songModeBurtBacharachStyleProfile,
  ecm_chamber: songModeEcmEnsembleStyleProfile,
};

export function songModeEvalProfileForSongwriter(
  songwriterId: string | null | undefined
): StyleProfile | undefined {
  if (songwriterId == null || typeof songwriterId !== 'string') return undefined;
  const id = songwriterId.trim().toLowerCase() as SongwriterRuleId;
  return SONG_MODE_COMPOSER_EVAL_PROFILES[id];
}
