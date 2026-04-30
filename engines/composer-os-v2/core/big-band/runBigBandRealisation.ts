/**
 * Big Band — planning + voicing + score model + MusicXML (Prompt C/3).
 */

import { buildBigBandScoreModel } from './bigBandScoreBuilder';
import { parseChordProgressionInputWithBarCount } from '../harmony/chordProgressionParser';
import { planBigBandVoicing } from './bigBandVoicingPlanner';
import { runBigBandMode, type BigBandRunInput, type BigBandRunResult } from './runBigBandMode';
import { runEnsembleExportPipeline } from '../export/ensembleExport';
import type { ScoreModel } from '../score-model/scoreModelTypes';
import { validateEnsembleVoicing } from '../voicing/voicingValidation';
import type { EnsembleVoicingPlan } from '../voicing/voicingTypes';

export interface BigBandRealisationResult {
  planning: BigBandRunResult;
  voicingPlan: EnsembleVoicingPlan;
  voicingValidation: ReturnType<typeof validateEnsembleVoicing>;
  score: ScoreModel | undefined;
  exportPipeline: ReturnType<typeof runEnsembleExportPipeline>;
}

export function runBigBandRealisation(
  input: BigBandRunInput & {
    bpm?: number;
    /** Jest / A–B: omit orchestration `wybleVoiceLayout` so the BB score skips Wyble alto/tenor sax separation. */
    suppressWybleVoiceLayoutForTest?: boolean;
  }
): BigBandRealisationResult {
  const planning = runBigBandMode(input);
  const voicingPlan = planBigBandVoicing(planning.orchestrationPlan);
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

  const wybleLayout =
    input.suppressWybleVoiceLayoutForTest === true ? undefined : planning.orchestrationPlan.wybleVoiceLayout;

  const score = buildBigBandScoreModel({
    title: planning.title,
    seed: input.seed,
    formPlan: planning.formPlan,
    sectionPlan: planning.sectionPlan,
    era: planning.era,
    chordBars,
    wybleVoiceLayout: wybleLayout,
    orchestrationPlan: planning.orchestrationPlan,
    enhancedPlanning: planning.enhancedPlanning,
  });

  const exportPipeline = runEnsembleExportPipeline(score, {
    ...(typeof input.bpm === 'number' && Number.isFinite(input.bpm) ? { bpm: input.bpm } : {}),
  });

  return {
    planning,
    voicingPlan,
    voicingValidation,
    score,
    exportPipeline,
  };
}
