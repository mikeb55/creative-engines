/**
 * Lead-sheet format: melody staff + section chord symbols only (no bass).
 */

import type { MosaicModeSectionPlanEntry, MosaicTonicMap } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { PartModel, ScoreModel } from '../score-model/scoreModelTypes';
import { applyMelodyBassFormat } from './generateMelodyBassScore';

export function applyLeadSheetFormat(
  score: ScoreModel,
  sectionPlan: MosaicModeSectionPlanEntry[],
  tonicMap: MosaicTonicMap = {},
): ScoreModel {
  const mbScore = applyMelodyBassFormat(score, sectionPlan, tonicMap);
  const melodyOnly: ScoreModel = {
    ...mbScore,
    parts: mbScore.parts.filter(
      (p) => p.instrumentIdentity === 'clean_electric_guitar' || p.id === 'guitar',
    ),
  };

  const melodyPart = melodyOnly.parts[0];
  if (melodyPart) {
    melodyPart.name = 'Lead';
    (melodyPart as PartModel & { abbreviation?: string }).abbreviation = 'Ld.';
  }

  return melodyOnly;
}
