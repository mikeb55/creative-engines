/**
 * Universal lead sheet builder.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import type { StyleStack } from '../core/style-modules/styleModuleTypes';
import { buildUniversalLeadSheetFromCompositionContext, buildUniversalLeadSheetFromSongContract } from '../core/lead-sheet/universalLeadSheetBuilder';
import { runSongMode } from '../core/song-mode/runSongMode';

export function runUniversalLeadSheetBuilderTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const stack: StyleStack = { primary: 'barry_harris', weights: { primary: 1 } };
  const gp = runGoldenPath(55_555, {
    presetId: 'guitar_bass_duo',
    styleStack: stack,
  });
  const u = buildUniversalLeadSheetFromCompositionContext(gp.context, 'T');
  out.push({
    ok: u.mode === 'duo' && u.chordSymbols.length >= 8 && u.formSections.length >= 1 && u.rehearsalMarks.length >= 1,
    name: 'universal lead sheet from composition context has chords and form',
  });

  const sm = runSongMode({ seed: 1, title: 'ULS' });
  out.push({
    ok:
      sm.universalLeadSheet.mode === 'song' &&
      sm.universalLeadSheet.formSections.length > 0 &&
      sm.universalLeadSheet.chordSymbols.length > 0,
    name: 'runSongMode exposes universalLeadSheet',
  });

  const fromContract = buildUniversalLeadSheetFromSongContract(sm.leadSheetContract);
  out.push({
    ok: fromContract.title === sm.leadSheetContract.title && fromContract.source === 'song_lead_sheet',
    name: 'buildUniversalLeadSheetFromSongContract matches contract',
  });

  return out;
}
