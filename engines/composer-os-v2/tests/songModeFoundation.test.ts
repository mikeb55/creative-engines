/**
 * Phase 1A+1B — Song Mode scaffold (preset + section planner).
 */

import { createRunManifest } from '../core/run-ledger/createRunManifest';
import { planDefaultVerseChorusStructure, planExtendedPopStructure } from '../core/song-mode/songSectionPlanner';
import { PRIMARY_HOOK_SECTION_KIND } from '../core/song-mode/songModeTypes';
import {
  DEFAULT_SONG_VOICE_TYPE,
  SONG_MODE_SECTION_KINDS,
  type SongSectionKind,
} from '../core/song-mode/songModeTypes';
import { songModePreset, SONG_MODE_DEFAULT_VOICE, SONG_MODE_METADATA } from '../presets/songModePreset';

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

  out.push({
    ok:
      SONG_MODE_METADATA.melodyFirst === true &&
      SONG_MODE_METADATA.hookFirst === true &&
      SONG_MODE_METADATA.leadSheetReady === true &&
      SONG_MODE_METADATA.voiceType === 'male_tenor',
    name: 'song mode metadata flags (melodyFirst, hookFirst, leadSheetReady, voiceType)',
  });

  const kinds: SongSectionKind[] = ['verse', 'pre_chorus', 'chorus', 'bridge'];
  out.push({
    ok: kinds.every((k) => SONG_MODE_SECTION_KINDS.includes(k)),
    name: 'song mode supports verse, pre_chorus, chorus, bridge kinds',
  });

  const sections = planDefaultVerseChorusStructure();
  const skinds = sections.map((s) => s.kind);
  const expected = ['verse', 'chorus', 'verse', 'chorus'] as const;
  const match =
    sections.length === 4 &&
    skinds.every((k, i) => k === expected[i]) &&
    sections.every((s, i) => s.order === i);

  out.push({
    ok: match,
    name: 'planDefaultVerseChorusStructure is verse/chorus/verse/chorus',
  });

  const ext = planExtendedPopStructure();
  out.push({
    ok: ext.length === 8 && ext.some((s) => s.kind === 'pre_chorus') && ext.filter((s) => s.kind === 'chorus').length >= 2,
    name: 'planExtendedPopStructure has pre_chorus and multiple choruses',
  });

  out.push({
    ok: PRIMARY_HOOK_SECTION_KIND === 'chorus',
    name: 'primary hook section kind is chorus',
  });

  const m = createRunManifest({
    version: '2.0.0',
    seed: 1,
    presetId: 'song_mode',
    activeModules: ['song_mode_scaffold'],
    activeModuleCategories: ['songwriting'],
    presetType: 'song_mode',
    songModeVoiceType: 'male_tenor',
    songSectionSummary: ['verse', 'chorus', 'verse', 'chorus'],
    songHookId: 'hook_test',
    songHookSummary: 'hook=hook_test',
    songLeadSheetReady: true,
    songwritingModuleIds: ['song_mode_compile'],
    feelMode: 'straight',
    instrumentProfiles: ['clean_electric_guitar'],
    readinessScores: { release: 1, mx: 1 },
    validationPassed: true,
    timestamp: new Date().toISOString(),
  });
  out.push({
    ok: Boolean(
      m.presetType === 'song_mode' &&
        m.songModeVoiceType === 'male_tenor' &&
        m.songSectionSummary?.length === 4 &&
        m.activeModuleCategories?.includes('songwriting') &&
        m.songHookId === 'hook_test' &&
        m.songLeadSheetReady === true &&
        m.songwritingModuleIds?.includes('song_mode_compile')
    ),
    name: 'run manifest accepts optional song mode fields',
  });

  return out;
}
