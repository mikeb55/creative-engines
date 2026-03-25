/**
 * Named preset library (easy wins pack).
 */

import type { GenerateRequest } from '../app-api/appApiTypes';
import {
  NAMED_PRESET_LIBRARY,
  bigBandInputFromNamedPreset,
  getNamedPreset,
  listNamedPresetIds,
  mergeNamedPresetIntoGenerateRequest,
  songModeInputFromNamedPreset,
} from '../core/presets-plus/namedPresetLibrary';
import { validateNamedPresetDefinition, isValidNamedPresetId } from '../core/presets-plus/namedPresetValidation';

export function runNamedPresetLibraryTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: listNamedPresetIds().length === 10 && getNamedPreset('orbit_ecm')?.basePresetId === 'ecm_chamber',
    name: 'named presets list and resolve orbit_ecm',
  });

  const req: GenerateRequest = {
    presetId: 'ecm_chamber',
    seed: 1,
    styleStack: { primary: 'barry_harris' },
    ecmMode: 'ECM_METHENY_QUARTET',
  };
  const merged = mergeNamedPresetIntoGenerateRequest('ecm_song', req);
  out.push({
    ok: merged.ecmMode === 'ECM_SCHNEIDER_CHAMBER' && merged.styleStack.primary === 'metheny',
    name: 'mergeNamedPresetIntoGenerateRequest applies ecm_song defaults',
  });

  let threw = false;
  try {
    mergeNamedPresetIntoGenerateRequest('orbit_ecm', { ...req, presetId: 'guitar_bass_duo' });
  } catch {
    threw = true;
  }
  out.push({
    ok: threw,
    name: 'negative: merge named preset with wrong base preset throws',
  });

  const sm = songModeInputFromNamedPreset('bacharach_song', 9, 'T');
  out.push({
    ok: sm?.primarySongwriterStyle === 'bacharach' && sm.seed === 9,
    name: 'songModeInputFromNamedPreset returns song_mode options',
  });

  const bb = bigBandInputFromNamedPreset('big_band_bebop', 3);
  out.push({
    ok: bb?.era === 'bebop' && bb.seed === 3,
    name: 'bigBandInputFromNamedPreset returns big band era',
  });

  out.push({
    ok: validateNamedPresetDefinition('quartet_lyrical').ok && !isValidNamedPresetId('fake_preset_xyz'),
    name: 'named preset validation positive and negative id',
  });

  out.push({
    ok: NAMED_PRESET_LIBRARY.bacharach_song.outputFolderHint.includes('Song'),
    name: 'output folder hints align with preset subfolders',
  });

  out.push({
    ok:
      getNamedPreset('songwriter_modern')?.primarySongwriterStyle === 'max_martin' &&
      getNamedPreset('chamber_development')?.densityBias === 'medium',
    name: 'songwriter_modern and chamber_development presets',
  });

  return out;
}
