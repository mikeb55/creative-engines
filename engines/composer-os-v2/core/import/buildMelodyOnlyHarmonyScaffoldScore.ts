/**
 * Phase 1 - parallel duo bypass scaffold: single lead staff + section chord symbols only.
 * Used by debussy leadsheet-input proof; does not invoke generateGoldenPathDuoScore.
 */

import { BEATS_PER_MEASURE } from '../score-model/scoreModelTypes';
import type { MeasureModel, PartModel, ScoreModel } from '../score-model/scoreModelTypes';

export function buildMelodyOnlyHarmonyScaffoldScore(
  harmonyBars: readonly string[],
  opts?: { title?: string; tempo?: number }
): ScoreModel {
  const totalBars = harmonyBars.length;
  const measures: MeasureModel[] = [];
  for (let i = 0; i < totalBars; i++) {
    const index = i + 1;
    measures.push({
      index,
      chord: harmonyBars[i] ?? '',
      measureBeatSpanQuarters: BEATS_PER_MEASURE,
      events: [{ kind: 'rest', startBeat: 0, duration: BEATS_PER_MEASURE, voice: 1 }],
    });
  }

  const leadPart: PartModel = {
    id: 'guitar',
    name: 'Lead',
    instrumentIdentity: 'clean_electric_guitar',
    midiProgram: 27,
    clef: 'treble',
    measures,
  };

  return {
    title: opts?.title ?? 'LeadSheet Input Proof',
    tempo: opts?.tempo ?? 96,
    timeSignature: { beats: 4, beatType: 4 },
    parts: [leadPart],
  };
}