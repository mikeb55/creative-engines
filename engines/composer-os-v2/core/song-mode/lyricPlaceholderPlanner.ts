/**
 * Lyric placeholder ids aligned to prosody lines (extends basic section placeholders).
 */

import type { ProsodyPlaceholderPlan } from './lyricProsodyTypes';

export function buildLyricPlaceholderIdsFromProsody(plan: ProsodyPlaceholderPlan): string[] {
  return plan.lines.map((l) => `lyric_${l.phraseId}_prosody`);
}
