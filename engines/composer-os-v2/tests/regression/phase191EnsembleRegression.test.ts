/**
 * Phase 19.1 — Big Band + String Quartet MusicXML regression (fixed seeds / chord loops).
 *
 * Run: `npm run test:composer-os-regression` from `engines/composer-os-v2/`.
 *
 * Update golden JSON summaries (optional):
 *   set REGRESSION_UPDATE_GOLDENS=1 (Windows: `$env:REGRESSION_UPDATE_GOLDENS='1'`)
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildBigBandScoreModel } from '../../core/big-band/bigBandScoreBuilder';
import { buildQuartetScoreModel } from '../../core/string-quartet/quartetScoreBuilder';
import { exportScoreModelToMusicXml } from '../../core/export/musicxmlExporter';
import {
  extractEnsembleMusicXmlMetrics,
  normalizeMetricsForSnapshot,
  scrubMusicXmlForDiff,
  type EnsembleRegressionMetrics,
} from './musicXmlRegressionMetrics';
import {
  REGRESSION_SEED,
  bigBandFormPlanNBars,
  bigBandSectionPlanAllSections,
  fixedChordBarsBigBand,
  fixedChordBarsQuartet,
  quartetFormPlanNBars,
  quartetTexturePlanStatement,
} from './ensembleRegressionFixtures';

const goldDir = path.join(__dirname, 'goldens');

/** Recommended pass/fail bounds (tune when heuristics intentionally change). */
export const THRESHOLDS = {
  bigBand: {
    maxWholeNoteRatioGlobal: 0.85,
    maxHighWholeBarStreak: 12,
    maxAltoTenorUnisonStreak: 16,
    maxTrumpetOctaveAboveAltoStreak: 4,
    maxEmptyPianoWithHarmonyStreak: 3,
  },
  stringQuartet: {
    maxWholeNoteRatioGlobal: 0.92,
    maxHighWholeBarStreak: 14,
    maxConsecutiveDupV1Bars: 8,
    minV1V2OnsetDiversity: 0.05,
    /** 4-bar sliding window: allow fully whole-note V1 (current sketch can be 1.0). */
    maxWindowV1WholeDominance: 1,
  },
} as const;

function assertExportOk(xml: string): void {
  if (!xml.trim().startsWith('<?xml')) throw new Error('Expected XML header');
}

function exportOrThrow(score: import('../../core/score-model/scoreModelTypes').ScoreModel): string {
  const r = exportScoreModelToMusicXml(score, { bpm: score.tempo ?? 120 });
  if (!r.success || !r.xml) throw new Error(r.errors?.join('; ') ?? 'MusicXML export failed');
  return r.xml;
}

function runBigBand(totalBars: number): { xml: string; metrics: EnsembleRegressionMetrics } {
  const score = buildBigBandScoreModel({
    title: `Regression Big Band ${totalBars} bars`,
    seed: REGRESSION_SEED,
    formPlan: bigBandFormPlanNBars(totalBars),
    sectionPlan: bigBandSectionPlanAllSections(),
    chordBars: fixedChordBarsBigBand(totalBars),
    era: 'swing',
    padSketch: false,
  });
  const xml = exportOrThrow(score);
  assertExportOk(xml);
  return { xml, metrics: extractEnsembleMusicXmlMetrics(xml, { suite: 'bigBand' }) };
}

function runQuartet(totalBars: number): { xml: string; metrics: EnsembleRegressionMetrics } {
  const score = buildQuartetScoreModel({
    title: `Regression String Quartet ${totalBars} bars`,
    seed: REGRESSION_SEED,
    formPlan: quartetFormPlanNBars(totalBars),
    texturePlan: quartetTexturePlanStatement(),
    chordBars: fixedChordBarsQuartet(totalBars),
    era: 'swing',
    padSketch: false,
  });
  const xml = exportOrThrow(score);
  assertExportOk(xml);
  return { metrics: extractEnsembleMusicXmlMetrics(xml, { suite: 'stringQuartet' }), xml };
}

function maybeWriteGolden(name: string, payload: unknown): void {
  if (process.env.REGRESSION_UPDATE_GOLDENS !== '1') return;
  if (!fs.existsSync(goldDir)) fs.mkdirSync(goldDir, { recursive: true });
  const p = path.join(goldDir, `${name}.json`);
  fs.writeFileSync(p, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function maybeCompareGolden(name: string, actual: unknown): void {
  const p = path.join(goldDir, `${name}.json`);
  if (!fs.existsSync(p)) return;
  const expected = JSON.parse(fs.readFileSync(p, 'utf8')) as unknown;
  expect(actual).toEqual(expected);
}

describe('Phase 19.1 ensemble regression (MusicXML metrics)', () => {
  test('Big Band 16 bars — structural + horn / piano heuristics within thresholds', () => {
    const { metrics, xml } = runBigBand(16);
    expect(metrics.kind).toBe('bigBand');
    const mm = metrics;
    if (mm.kind !== 'bigBand') throw new Error('Expected bigBand');
    maybeWriteGolden('bigband-16', normalizeMetricsForSnapshot(mm));
    maybeCompareGolden('bigband-16', normalizeMetricsForSnapshot(mm));

    expect(mm.barCount).toBe(16);
    expect(mm.partIds).toContain('bb_alto_sax');
    expect(mm.partIds).toContain('bb_piano');
    expect(mm.totalNonRestNotes).toBeGreaterThan(50);

    expect(mm.wholeNoteRatioGlobal).toBeLessThan(THRESHOLDS.bigBand.maxWholeNoteRatioGlobal);
    expect(mm.maxConsecutiveBarsHighWholeRatio).toBeLessThanOrEqual(THRESHOLDS.bigBand.maxHighWholeBarStreak);

    expect(mm.maxAltoTenorUnisonStreak).toBeLessThanOrEqual(THRESHOLDS.bigBand.maxAltoTenorUnisonStreak);
    expect(mm.maxTrumpetOctaveAboveAltoStreak).toBeLessThanOrEqual(
      THRESHOLDS.bigBand.maxTrumpetOctaveAboveAltoStreak
    );
    expect(mm.maxEmptyPianoBarsStreakWithHarmony).toBeLessThanOrEqual(
      THRESHOLDS.bigBand.maxEmptyPianoWithHarmonyStreak
    );

    expect(scrubMusicXmlForDiff(xml).length).toBeGreaterThan(1000);
  });

  test('Big Band 40 bars — within thresholds', () => {
    const { metrics } = runBigBand(40);
    expect(metrics.kind).toBe('bigBand');
    const mm = metrics;
    if (mm.kind !== 'bigBand') throw new Error('Expected bigBand');
    maybeWriteGolden('bigband-40', normalizeMetricsForSnapshot(mm));
    maybeCompareGolden('bigband-40', normalizeMetricsForSnapshot(mm));

    expect(mm.barCount).toBe(40);
    expect(mm.wholeNoteRatioGlobal).toBeLessThan(THRESHOLDS.bigBand.maxWholeNoteRatioGlobal);
    expect(mm.maxAltoTenorUnisonStreak).toBeLessThanOrEqual(THRESHOLDS.bigBand.maxAltoTenorUnisonStreak);
  });

  test('String Quartet 16 bars — texture + diversity proxies', () => {
    const { metrics, xml } = runQuartet(16);
    expect(metrics.kind).toBe('stringQuartet');
    const sm = metrics;
    if (sm.kind !== 'stringQuartet') throw new Error('Expected stringQuartet');
    maybeWriteGolden('quartet-16', normalizeMetricsForSnapshot(sm));
    maybeCompareGolden('quartet-16', normalizeMetricsForSnapshot(sm));

    expect(sm.barCount).toBe(16);
    expect(sm.partIds).toEqual(expect.arrayContaining(['sq_violin_1', 'sq_violin_2', 'sq_viola', 'sq_cello']));
    expect(sm.wholeNoteRatioGlobal).toBeLessThan(THRESHOLDS.stringQuartet.maxWholeNoteRatioGlobal);
    expect(sm.maxConsecutiveDuplicateV1Bars).toBeLessThanOrEqual(
      THRESHOLDS.stringQuartet.maxConsecutiveDupV1Bars
    );
    expect(sm.v1v2OnsetDiversity).toBeGreaterThanOrEqual(THRESHOLDS.stringQuartet.minV1V2OnsetDiversity);
    expect(sm.maxWindowV1WholeDominance).toBeLessThanOrEqual(
      THRESHOLDS.stringQuartet.maxWindowV1WholeDominance
    );

    expect(scrubMusicXmlForDiff(xml).length).toBeGreaterThan(500);
  });

  test('String Quartet 40 bars — within thresholds', () => {
    const { metrics } = runQuartet(40);
    expect(metrics.kind).toBe('stringQuartet');
    const sm = metrics;
    if (sm.kind !== 'stringQuartet') throw new Error('Expected stringQuartet');
    maybeWriteGolden('quartet-40', normalizeMetricsForSnapshot(sm));
    maybeCompareGolden('quartet-40', normalizeMetricsForSnapshot(sm));
    expect(sm.barCount).toBe(40);
  });
});
