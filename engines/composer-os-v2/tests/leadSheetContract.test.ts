/**
 * Lead sheet contract validation (Prompt 3/7).
 */

import { buildCompiledSong, buildLeadSheetContractFromCompiled } from '../core/song-mode/songModeBuilder';
import { validateLeadSheetContract } from '../core/song-mode/songModeValidation';
import { planDefaultVerseChorusStructure } from '../core/song-mode/songSectionPlanner';

export function runLeadSheetContractTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];

  const compiled = buildCompiledSong({
    seed: 1,
    title: 'LS Test',
    sections: planDefaultVerseChorusStructure(),
  });
  const ls = buildLeadSheetContractFromCompiled(compiled);
  const v = validateLeadSheetContract(ls);

  out.push({
    ok: v.valid && ls.chordSymbols.length >= 4 && ls.formSummary.sections.length === 4,
    name: 'lead sheet contract validates for default compiled song',
  });

  out.push({
    ok:
      ls.lyricPlaceholders.length >= 1 &&
      ls.vocalMelody.adaptedRange[0] < ls.vocalMelody.adaptedRange[1] &&
      (ls.vocalMelody.eventCount ?? 0) === ls.vocalMelody.events.length &&
      ls.vocalMelody.events.length > 0,
    name: 'lead sheet has lyric placeholders, vocal range, and melody events',
  });

  const bad = { ...ls, chordSymbols: [] };
  const vbad = validateLeadSheetContract(bad);
  out.push({
    ok: !vbad.valid,
    name: 'lead sheet validation fails without chords',
  });

  return out;
}
