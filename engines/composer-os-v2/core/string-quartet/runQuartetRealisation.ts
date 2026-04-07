/**
 * String Quartet — planning + voicing + score model + MusicXML (Prompt C/3).
 */

import type { BigBandEraId } from '../big-band/bigBandResearchTypes';
import { buildQuartetScoreModel } from './quartetScoreBuilder';
import { parseChordProgressionInputWithBarCount } from '../harmony/chordProgressionParser';
import { planQuartetVoicing } from './quartetVoicingPlanner';
import { runStringQuartetMode, type StringQuartetRunInput, type StringQuartetRunResult } from './runStringQuartetMode';
import { runEnsembleExportPipeline } from '../export/ensembleExport';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { validateEnsembleVoicing } from '../voicing/voicingValidation';
import type { EnsembleVoicingPlan } from '../voicing/voicingTypes';

export interface QuartetRealisationResult {
  planning: StringQuartetRunResult;
  voicingPlan: EnsembleVoicingPlan;
  voicingValidation: ReturnType<typeof validateEnsembleVoicing>;
  score: ScoreModel | undefined;
  exportPipeline: ReturnType<typeof runEnsembleExportPipeline>;
}

export function runQuartetRealisation(
  input: StringQuartetRunInput & { era?: BigBandEraId }
): QuartetRealisationResult {
  const planning = runStringQuartetMode(input);
  const voicingPlan = planQuartetVoicing(planning.orchestrationPlan);
  const voicingValidation = validateEnsembleVoicing(voicingPlan);

  if (!planning.validation.ok) {
    return {
      planning,
      voicingPlan,
      voicingValidation,
      score: undefined,
      exportPipeline: { ok: false, errors: ['Planning validation failed — score not built'] },
    };
  }

  const tb = planning.formPlan.totalBars;
  const raw =
    typeof input.chordProgressionText === 'string' ? input.chordProgressionText.trim() : '';
  let chordBars: string[] | undefined;
  if (raw) {
    const p = parseChordProgressionInputWithBarCount(raw, tb);
    chordBars = p.ok ? p.bars : undefined;
  }

  const score = buildQuartetScoreModel({
    title: planning.title,
    seed: input.seed,
    formPlan: planning.formPlan,
    texturePlan: planning.texturePlan,
    era: input.era,
    chordBars,
  });

  const exportPipeline = runEnsembleExportPipeline(score);

  return {
    planning,
    voicingPlan,
    voicingValidation,
    score,
    exportPipeline,
  };
}
