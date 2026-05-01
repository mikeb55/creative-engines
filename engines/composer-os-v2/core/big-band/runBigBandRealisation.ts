/**
 * Big Band — planning + voicing + score model + MusicXML (Prompt C/3).
 */

import { buildBigBandScoreModel } from './bigBandScoreBuilder';
import type { LeadSheet } from '../lead-sheet/leadSheetTypes';
import { applyReferenceInfluence } from '../reference-import/applyReferenceInfluence';
import { extractReferenceBehaviour } from '../reference-import/extractReferenceBehaviour';
import { parseMusicXmlReference } from '../reference-import/musicXmlReferenceParser';
import type { ReferenceInfluenceEnvelope } from '../reference-import/referenceReuseTypes';
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
  /** Behaviour hints from optional ensemble MusicXML reference import (additive; no score cloning). */
  referenceInfluence?: ReferenceInfluenceEnvelope;
}

export function runBigBandRealisation(
  input: BigBandRunInput & {
    bpm?: number;
    leadSheet?: LeadSheet;
    /** Raw MusicXML for reference behaviour hints (same payload as app `ensembleLeadSheetMusicXml`). */
    ensembleLeadSheetMusicXml?: string;
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

  const referenceInfluence =
    typeof input.ensembleLeadSheetMusicXml === 'string' && input.ensembleLeadSheetMusicXml.trim().length > 0
      ? (() => {
          const refResult = parseMusicXmlReference(input.ensembleLeadSheetMusicXml);
          if (!refResult.ok || !refResult.piece) return undefined;
          const profile = extractReferenceBehaviour(refResult.piece);
          return applyReferenceInfluence(profile, 'big_band', 'hint_only', 'subtle');
        })()
      : undefined;

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
    ...(referenceInfluence ? { referenceInfluence } : {}),
  };
}
