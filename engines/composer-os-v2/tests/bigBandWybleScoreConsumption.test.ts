/**
 * Big band: `wybleVoiceLayout` is consumed when building the score (alto lead vs tenor inner separation).
 */

import { buildBigBandScoreModel } from '../core/big-band/bigBandScoreBuilder';
import { runBigBandRealisation } from '../core/big-band/runBigBandRealisation';
import type { ScoreModel } from '../core/score-model/scoreModelTypes';
import { WYBLE_ROLE_MAP_BIG_BAND } from '../core/wyble/ensembleWybleRoleMaps';
import { WYBLE_BB_INNER_BELOW_LEAD_SEMITONES } from '../core/big-band/bigBandWybleHornVoicing';
import {
  REGRESSION_SEED,
  bigBandFormPlanNBars,
  bigBandSectionPlanAllSections,
  fixedChordBarsBigBand,
} from './regression/ensembleRegressionFixtures';

function firstNoteMidiInBar(score: ScoreModel, partId: string, barIndex1: number): number {
  const p = score.parts.find((x) => x.id === partId);
  const m = p?.measures[barIndex1 - 1];
  const ev = m?.events.find((e) => e.kind === 'note');
  if (ev?.kind !== 'note') throw new Error(`expected note on ${partId} bar ${barIndex1}`);
  return ev.pitch;
}

describe('Big band Wyble layout score consumption', () => {
  it('separates alto and tenor sax midis when Wyble BB map is passed', () => {
    const formPlan = bigBandFormPlanNBars(1);
    const sectionPlan = bigBandSectionPlanAllSections();
    const chordBars = fixedChordBarsBigBand(1);

    const base = buildBigBandScoreModel({
      title: 'Wyble BB base',
      seed: REGRESSION_SEED,
      formPlan,
      sectionPlan,
      chordBars,
      era: 'swing',
    });

    const withWyble = buildBigBandScoreModel({
      title: 'Wyble BB layout',
      seed: REGRESSION_SEED,
      formPlan,
      sectionPlan,
      chordBars,
      era: 'swing',
      wybleVoiceLayout: WYBLE_ROLE_MAP_BIG_BAND,
    });

    const altoBase = firstNoteMidiInBar(base, 'bb_alto_sax', 1);
    const tenorBase = firstNoteMidiInBar(base, 'bb_tenor_sax', 1);
    const altoWyble = firstNoteMidiInBar(withWyble, 'bb_alto_sax', 1);
    const tenorWyble = firstNoteMidiInBar(withWyble, 'bb_tenor_sax', 1);

    expect(altoWyble).toBe(altoBase);
    expect(tenorBase).toBe(altoBase);
    expect(tenorWyble).not.toBe(tenorBase);
    expect(tenorWyble).not.toBe(altoWyble);
    expect(altoWyble - tenorWyble).toBe(WYBLE_BB_INNER_BELOW_LEAD_SEMITONES);
  });

  it('runBigBandRealisation forwards orchestration wybleVoiceLayout into the score', () => {
    const r = runBigBandRealisation({ seed: REGRESSION_SEED, totalBars: 16, era: 'swing' });
    expect(r.score).toBeDefined();
    const pipe = r.score!;
    const direct = buildBigBandScoreModel({
      title: r.planning.title,
      seed: REGRESSION_SEED,
      formPlan: r.planning.formPlan,
      sectionPlan: r.planning.sectionPlan,
      era: r.planning.era,
      wybleVoiceLayout: WYBLE_ROLE_MAP_BIG_BAND,
    });
    expect(firstNoteMidiInBar(pipe, 'bb_alto_sax', 1)).toBe(firstNoteMidiInBar(direct, 'bb_alto_sax', 1));
    expect(firstNoteMidiInBar(pipe, 'bb_tenor_sax', 1)).toBe(firstNoteMidiInBar(direct, 'bb_tenor_sax', 1));
  });
});
