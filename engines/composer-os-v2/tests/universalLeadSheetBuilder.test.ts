/**
 * Universal lead sheet builder.
 */

import { runGoldenPath } from '../core/goldenPath/runGoldenPath';
import { runBigBandMode } from '../core/big-band/runBigBandMode';
import type { StyleStack } from '../core/style-modules/styleModuleTypes';
import { buildUniversalLeadSheetFromCompositionContext, buildUniversalLeadSheetFromSongContract } from '../core/lead-sheet/universalLeadSheetBuilder';
import { runSongMode } from '../core/song-mode/runSongMode';
import { runStringQuartetMode } from '../core/string-quartet/runStringQuartetMode';

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

  const bb = runBigBandMode({ seed: 101, title: 'ULS BB' });
  out.push({
    ok:
      bb.universalLeadSheet?.mode === 'big_band' &&
      bb.universalLeadSheet.source === 'big_band_plan' &&
      (bb.universalLeadSheet.sectionLabels?.length ?? 0) > 0,
    name: 'runBigBandMode exposes universalLeadSheet planning contract',
  });

  const sq = runStringQuartetMode({ seed: 202, title: 'ULS SQ' });
  out.push({
    ok: sq.universalLeadSheet?.mode === 'quartet' && sq.universalLeadSheet.source === 'quartet_plan',
    name: 'runStringQuartetMode exposes universalLeadSheet planning contract',
  });

  return out;
}
