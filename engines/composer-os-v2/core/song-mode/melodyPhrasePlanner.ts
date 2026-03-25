/**
 * Phrase boundaries aligned to section chord blocks.
 */

import type { SectionChordPlan } from './songCompilationTypes';
import type { MelodyPhrasePlanEntry, MelodyContourKind, MelodyRepetitionTag } from './leadMelodyTypes';
import type { SongSectionKind } from './songModeTypes';

function repetitionTagForSection(kind: SongSectionKind, isFirstChorus: boolean): MelodyRepetitionTag {
  if (kind === 'chorus') return isFirstChorus ? 'hook_return' : 'variation';
  return 'statement';
}

export function buildPhraseEntriesFromChordPlan(
  chordPlan: SectionChordPlan[],
  contourPerPhrase: MelodyContourKind[],
  hookReturnStartMeasure: number | undefined
): MelodyPhrasePlanEntry[] {
  let measure = 1;
  let chorusSeen = false;
  const out: MelodyPhrasePlanEntry[] = [];
  chordPlan.forEach((block, idx) => {
    const len = block.chordSymbols.length;
    const startMeasure = measure;
    const endMeasure = measure + len - 1;
    const cadenceMeasure = endMeasure;
    const isFirstChorus = block.sectionKind === 'chorus' && !chorusSeen;
    if (block.sectionKind === 'chorus') chorusSeen = true;
    out.push({
      phraseId: `ph_${block.sectionOrder}_${block.sectionKind}`,
      sectionOrder: block.sectionOrder,
      sectionKind: block.sectionKind,
      startMeasure,
      endMeasure,
      cadenceMeasure,
      contour: contourPerPhrase[idx] ?? 'arch',
      repetitionTag: repetitionTagForSection(block.sectionKind, isFirstChorus),
      phraseLengthBars: len,
    });
    measure = endMeasure + 1;
  });
  void hookReturnStartMeasure;
  return out;
}
