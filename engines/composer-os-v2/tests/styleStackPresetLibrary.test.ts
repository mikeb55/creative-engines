/**
 * Style stack preset library.
 */

import { getStyleStackPreset, listStyleStackPresetIds, STYLE_STACK_PRESET_LIBRARY } from '../core/style-stack-presets/styleStackPresetLibrary';

export function runStyleStackPresetLibraryTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  out.push({
    ok: listStyleStackPresetIds().length === 4 && STYLE_STACK_PRESET_LIBRARY.thad_bebop_swing.stack.primary === 'barry_harris',
    name: 'style stack presets list and resolve',
  });

  const g = getStyleStackPreset('songwriter_classic_hook');
  out.push({
    ok: g?.stack.secondary === 'metheny',
    name: 'songwriter_classic_hook has expected stack',
  });

  out.push({
    ok: getStyleStackPreset('bacharach_pattison_ecm')?.stack.colour === 'triad_pairs',
    name: 'bacharach_pattison_ecm colour slot',
  });

  return out;
}
