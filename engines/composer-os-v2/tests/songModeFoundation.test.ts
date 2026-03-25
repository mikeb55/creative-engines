/**
 * Phase 1A — Song Mode scaffold (preset + section planner).
 */

import { planDefaultVerseChorusStructure } from '../core/song-mode/songSectionPlanner';
import { DEFAULT_SONG_VOICE_TYPE } from '../core/song-mode/songModeTypes';
import { songModePreset, SONG_MODE_DEFAULT_VOICE } from '../presets/songModePreset';

export function runSongModeFoundationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: songModePreset.id === 'song_mode' && songModePreset.instrumentProfiles.length >= 1,
    name: 'songModePreset loads',
  });

  out.push({
    ok: SONG_MODE_DEFAULT_VOICE === 'male_tenor' && DEFAULT_SONG_VOICE_TYPE === 'male_tenor',
    name: 'male_tenor default preserved',
  });

  const sections = planDefaultVerseChorusStructure();
  const kinds = sections.map((s) => s.kind);
  const expected = ['verse', 'chorus', 'verse', 'chorus'] as const;
  const match =
    sections.length === 4 &&
    kinds.every((k, i) => k === expected[i]) &&
    sections.every((s, i) => s.order === i);

  out.push({
    ok: match,
    name: 'planDefaultVerseChorusStructure is verse/chorus/verse/chorus',
  });

  return out;
}
