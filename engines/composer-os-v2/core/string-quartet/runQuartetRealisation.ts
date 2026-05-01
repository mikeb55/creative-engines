/**
 * String Quartet — planning + voicing + score model + MusicXML (Prompt C/3).
 */

import type { BigBandEraId } from '../big-band/bigBandResearchTypes';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
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
  input: StringQuartetRunInput & {
    era?: BigBandEraId;
    bpm?: number;
    leadSheet?: LeadSheet;
    /** Jest / A–B: omit orchestration `wybleVoiceLayout` so the quartet score build skips the Wyble inner-line chord-tone swap. */
    suppressWybleVoiceLayoutForTest?: boolean;
  }
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
  let raw =
    typeof input.chordProgressionText === 'string' ? input.chordProgressionText.trim() : '';
  if (input.leadSheet?.chordEvents?.length) {
    /** Event field is `symbol` (not chordSymbol). Pipe-separated cells → one chord per bar for parseChordProgressionInputWithBarCount. */
    const sorted = [...input.leadSheet.chordEvents].sort(
      (a, b) => a.bar - b.bar || a.beat - b.beat
    );
    const primaryByBar = new Map<number, string>();
    for (const e of sorted) {
      if (e.bar >= 1 && e.bar <= tb && !primaryByBar.has(e.bar)) {
        primaryByBar.set(e.bar, e.symbol);
      }
    }
    let carry = 'C';
    const cells: string[] = [];
    for (let bar = 1; bar <= tb; bar++) {
      const sym = primaryByBar.get(bar);
      if (sym !== undefined) carry = sym;
      cells.push(carry);
    }
    raw = cells.join(' | ');
  }
  let chordBars: string[] | undefined;
  if (raw) {
    const p = parseChordProgressionInputWithBarCount(raw, tb);
    chordBars = p.ok ? p.bars : undefined;
  }

  const wybleLayout =
    input.suppressWybleVoiceLayoutForTest === true ? undefined : planning.orchestrationPlan.wybleVoiceLayout;

  const score = buildQuartetScoreModel({
    title: planning.title,
    seed: input.seed,
    formPlan: planning.formPlan,
    texturePlan: planning.texturePlan,
    era: input.era,
    chordBars,
    wybleVoiceLayout: wybleLayout,
    ...(typeof input.songwriterStyleId === 'string' && input.songwriterStyleId.trim()
      ? { songwriterStyleId: input.songwriterStyleId.trim() }
      : {}),
    ...(input.allowedOutsideOverride !== undefined
      ? { allowedOutsideOverride: input.allowedOutsideOverride }
      : {}),
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
