/**
 * Prompt 3/7 — Song Mode structural integration.
 */

import { invokeModule } from '../core/module-invocation/invokeModule';
import { MODULE_REGISTRY } from '../core/module-invocation/moduleRegistry';
import { runSongMode, type SongModeRunInput, type SongModeRunResult } from '../core/song-mode/runSongMode';
import { planExtendedPopStructure, planDefaultVerseChorusStructure } from '../core/song-mode/songSectionPlanner';
import { DEFAULT_SONG_VOICE_TYPE } from '../core/song-mode/songModeTypes';
import { validateSectionPlanForSongMode } from '../core/song-mode/songModeValidation';
import { defaultHookBearingOrders } from '../core/song-mode/songStructureTypes';

export function runSongModeIntegrationTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const run = runSongMode({ seed: 42_424, title: 'Integration Test Song' });
  out.push({
    ok: run.validation.valid && run.compiledSong.hook.id.length > 0 && run.leadSheetContract.chordSymbols.length > 0,
    name: 'Song Mode builds valid compiled song + lead sheet + validation',
  });

  out.push({
    ok: run.compiledSong.voiceType === DEFAULT_SONG_VOICE_TYPE && run.manifestHints.songModeVoiceType === 'male_tenor',
    name: 'default voice male_tenor on runSongMode',
  });

  out.push({
    ok: run.compiledSong.sectionSummary.includes('chorus'),
    name: 'default structure includes chorus',
  });

  const hookOrders = defaultHookBearingOrders({
    sections: planDefaultVerseChorusStructure(),
  });
  out.push({
    ok: hookOrders.length >= 1 && hookOrders.every((o) => [1, 3].includes(o)),
    name: 'hook-bearing orders point at chorus in default plan',
  });

  const ext = runSongMode({ seed: 7, variant: 'extended' });
  out.push({
    ok: ext.validation.valid && ext.compiledSong.sectionSummary.filter((s) => s === 'chorus').length >= 2,
    name: 'extended pop structure validates and repeats chorus',
  });

  out.push({
    ok: planExtendedPopStructure().length === 8,
    name: 'extended section plan has 8 sections',
  });

  const badPlan = [
    { order: 0, kind: 'verse' as const },
    { order: 1, kind: 'verse' as const },
  ];
  const badVal = validateSectionPlanForSongMode(badPlan);
  out.push({
    ok: !badVal.valid && badVal.errors.some((e) => e.includes('chorus')),
    name: 'negative: section plan without chorus fails validation',
  });

  out.push({
    ok: 'song_mode_compile' in MODULE_REGISTRY,
    name: 'song_mode_compile registered',
  });

  const viaRegistry = invokeModule<SongModeRunInput, SongModeRunResult>('song_mode_compile', {
    seed: 99,
    title: 'Registry',
  });
  out.push({
    ok: viaRegistry.validation.valid && viaRegistry.compiledSong.title.includes('Registry'),
    name: 'invokeModule song_mode_compile returns pipeline result',
  });

  return out;
}
