/**
 * Wyble consumption receipts on scores and duo run manifests (metadata only).
 */

import { buildQuartetScoreModel } from '../core/string-quartet/quartetScoreBuilder';
import { buildBigBandScoreModel } from '../core/big-band/bigBandScoreBuilder';
import { runGoldenPathOnce } from '../core/goldenPath/runGoldenPath';
import { WYBLE_ROLE_MAP_STRING_QUARTET, WYBLE_ROLE_MAP_BIG_BAND } from '../core/wyble/ensembleWybleRoleMaps';
import {
  bigBandFormPlanNBars,
  bigBandSectionPlanAllSections,
  fixedChordBarsBigBand,
  quartetFormPlanNBars,
  quartetTexturePlanStatement,
  fixedChordBarsQuartet,
  REGRESSION_SEED,
} from './regression/ensembleRegressionFixtures';

describe('Wyble consumption diagnostics', () => {
  it('string quartet score carries quartet_inner_swap receipt when static map is used', () => {
    const score = buildQuartetScoreModel({
      title: 'SQ Wyble receipt',
      seed: REGRESSION_SEED,
      formPlan: quartetFormPlanNBars(1),
      texturePlan: quartetTexturePlanStatement(),
      chordBars: fixedChordBarsQuartet(1),
      wybleVoiceLayout: WYBLE_ROLE_MAP_STRING_QUARTET,
    });
    expect(score.wybleConsumptionReceipt).toMatchObject({
      wybleLayoutPresent: true,
      wybleLayoutConsumed: true,
      wybleConsumptionMode: 'quartet_inner_swap',
    });
    expect(score.wybleConsumptionReceipt?.wybleConsumptionSummary).toContain('String quartet');
  });

  it('big band score carries big_band_sax_split receipt when static map is used', () => {
    const score = buildBigBandScoreModel({
      title: 'BB Wyble receipt',
      seed: REGRESSION_SEED,
      formPlan: bigBandFormPlanNBars(1),
      sectionPlan: bigBandSectionPlanAllSections(),
      chordBars: fixedChordBarsBigBand(1),
      era: 'swing',
      wybleVoiceLayout: WYBLE_ROLE_MAP_BIG_BAND,
    });
    expect(score.wybleConsumptionReceipt).toMatchObject({
      wybleLayoutPresent: true,
      wybleLayoutConsumed: true,
      wybleConsumptionMode: 'big_band_sax_split',
    });
    expect(score.wybleConsumptionReceipt?.wybleConsumptionSummary).toContain('Big band');
  });

  it('duo golden path echoes receipt on score, generationMetadata, and runManifest', () => {
    const r = runGoldenPathOnce(11, { presetId: 'guitar_bass_duo' });
    expect(r.score.wybleConsumptionReceipt?.wybleConsumptionMode).toBe('duo_bass_anchor_nudge');
    expect(r.score.wybleConsumptionReceipt?.wybleLayoutConsumed).toBe(true);
    expect(r.context.generationMetadata.wybleConsumptionReceipt).toEqual(r.score.wybleConsumptionReceipt);
    expect(r.runManifest?.wybleConsumptionReceipt).toEqual(r.score.wybleConsumptionReceipt);
  });
});
