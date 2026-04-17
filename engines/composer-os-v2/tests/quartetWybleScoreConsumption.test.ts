/**
 * String quartet: `wybleVoiceLayout` is consumed when building the score (chord-tone swap V2 ↔ viola).
 */

import { buildQuartetScoreModel } from '../core/string-quartet/quartetScoreBuilder';
import { runQuartetRealisation } from '../core/string-quartet/runQuartetRealisation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { SQ_PART_V2, SQ_PART_VA } from '../core/string-quartet/stringQuartetTypes';
import { WYBLE_ROLE_MAP_STRING_QUARTET } from '../core/wyble/ensembleWybleRoleMaps';
import {
  quartetFormPlanNBars,
  quartetTexturePlanStatement,
  fixedChordBarsQuartet,
  REGRESSION_SEED,
} from './regression/ensembleRegressionFixtures';

function firstNoteMidiInBar(score: ScoreModel, partId: string, barIndex1: number): number {
  const p = score.parts.find((x) => x.id === partId);
  const m = p?.measures[barIndex1 - 1];
  const ev = m?.events.find((e) => e.kind === 'note');
  if (ev?.kind !== 'note') throw new Error(`expected note on ${partId} bar ${barIndex1}`);
  return ev.pitch;
}

describe('String quartet Wyble layout score consumption', () => {
  it('swaps violin II and viola chord tones when Wyble SQ map is passed', () => {
    const formPlan = quartetFormPlanNBars(1);
    const texturePlan = quartetTexturePlanStatement();
    const chordBars = fixedChordBarsQuartet(1);

    const base = buildQuartetScoreModel({
      title: 'Wyble SQ base',
      seed: REGRESSION_SEED,
      formPlan,
      texturePlan,
      chordBars,
    });

    const withWyble = buildQuartetScoreModel({
      title: 'Wyble SQ layout',
      seed: REGRESSION_SEED,
      formPlan,
      texturePlan,
      chordBars,
      wybleVoiceLayout: WYBLE_ROLE_MAP_STRING_QUARTET,
    });

    const v2Base = firstNoteMidiInBar(base, SQ_PART_V2, 1);
    const vaBase = firstNoteMidiInBar(base, SQ_PART_VA, 1);
    const v2Wyble = firstNoteMidiInBar(withWyble, SQ_PART_V2, 1);
    const vaWyble = firstNoteMidiInBar(withWyble, SQ_PART_VA, 1);

    expect(v2Wyble).toBe(vaBase);
    expect(vaWyble).toBe(v2Base);
    expect(v2Wyble).not.toBe(v2Base);
  });

  it('runQuartetRealisation forwards orchestration wybleVoiceLayout into the score', () => {
    const r = runQuartetRealisation({ seed: REGRESSION_SEED, totalBars: 16 });
    expect(r.score).toBeDefined();
    const pipe = r.score!;
    const direct = buildQuartetScoreModel({
      title: r.planning.title,
      seed: REGRESSION_SEED,
      formPlan: r.planning.formPlan,
      texturePlan: r.planning.texturePlan,
      wybleVoiceLayout: WYBLE_ROLE_MAP_STRING_QUARTET,
    });
    expect(firstNoteMidiInBar(pipe, SQ_PART_V2, 1)).toBe(firstNoteMidiInBar(direct, SQ_PART_V2, 1));
    expect(firstNoteMidiInBar(pipe, SQ_PART_VA, 1)).toBe(firstNoteMidiInBar(direct, SQ_PART_VA, 1));
  });
});
