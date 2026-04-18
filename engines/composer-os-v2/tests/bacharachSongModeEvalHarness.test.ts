/**
 * Bacharach Song Mode GCE-style eval harness — parsing, metrics, composite score (no generation).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  aggregateBacharachGce,
  buildBacharachEvalReportMarkdown,
  computeBacharachGceScore,
  metricsFromParsedBacharachManifest,
  parseManifestJsonForBacharachEval,
  smoothMaj7M7RatioFromBars,
  type ParsedBacharachManifest,
} from '../scripts/eval/bacharachSongModeEvalCore';
import { stringifyCsv } from '../scripts/eval/sophisticatedPopStyleEvalCore';

describe('bacharachSongModeEvalCore', () => {
  it('parses manifests with missing optional fields safely', () => {
    const p = parseManifestJsonForBacharachEval('{}');
    expect(p.seed).toBeNull();
    expect(p.bacharachHarmonyDiagnostics).toBeNull();
    expect(p.parsedBars).toBeNull();
    expect(parseManifestJsonForBacharachEval('not json').parseError).toBeTruthy();
  });

  it('extracts bacharachHarmonyDiagnostics and parsed bars when present', () => {
    const raw = JSON.stringify({
      seed: 42,
      songwriterStyleId: 'bacharach',
      parsedCustomProgressionBars: ['Cmaj7', 'Fmaj7', 'G7', 'Am7'],
      bacharachHarmonyDiagnostics: {
        barsConsidered: 4,
        barsChanged: 4,
        meanColourDepth: 1,
        meanColourDepthSectionA: 0.9,
        meanColourDepthSectionB: 1.1,
        sectionContrastDelta: 0.2,
        bridgeColourApplied: true,
        returnCadenceLiftApplied: false,
        secondaryDominantTouches: 1,
        mixtureTouches: 1,
      },
      songModeStyleSurfaceNotes: [
        'Bacharach slice: favoured smooth I/IV/vi maj7-m7 colours and light secondary-dominant motion on key cadences.',
        'Bacharach slice: bridge allowed a small controlled key-colour shift before returning home.',
        'Bacharach slice: accompaniment stayed lighter and melody-supportive rather than densely syncopated.',
      ],
    });
    const p = parseManifestJsonForBacharachEval(raw);
    expect(p.seed).toBe(42);
    expect(p.bacharachHarmonyDiagnostics?.secondaryDominantTouches).toBe(1);
    expect(p.parsedBars?.length).toBe(4);
    const m = metricsFromParsedBacharachManifest(p);
    expect(m.receiptsDescribeBehaviours).toBe(true);
    expect(m.bacharachSliceReceiptLines).toBe(3);
  });

  it('computes Bacharach GCE score 0–4 on synthetic neutral vs Bacharach manifests', () => {
    const neutralBars = ['C', 'F', 'G', 'Am', 'C', 'F', 'G', 'Am', 'C', 'F', 'G', 'Am', 'C', 'F', 'G', 'Am'];
    const bachBars = neutralBars.map((c) => (c === 'C' ? 'Cmaj7' : c === 'F' ? 'Fmaj7' : c === 'Am' ? 'Am7' : c));
    const neutral: ParsedBacharachManifest = {
      seed: 1,
      songwriterStyleId: 'carole_king',
      parsedBars: neutralBars,
      songModeStyleSurfaceNotes: [],
      bacharachHarmonyDiagnostics: null,
      songwriterSyncopationBias: null,
      songwriterDensityBias: null,
      manifestBehaviourGates: null,
    };
    const bach: ParsedBacharachManifest = {
      seed: 1,
      songwriterStyleId: 'bacharach',
      parsedBars: bachBars,
      songModeStyleSurfaceNotes: [
        'Bacharach slice: favoured smooth I/IV/vi maj7-m7 colours and light secondary-dominant motion on key cadences.',
        'Bacharach slice: bridge allowed a small controlled key-colour shift before returning home.',
        'Bacharach slice: accompaniment stayed lighter and melody-supportive rather than densely syncopated.',
      ],
      bacharachHarmonyDiagnostics: {
        barsConsidered: 16,
        barsChanged: 12,
        meanColourDepth: 1,
        meanColourDepthSectionA: 0.8,
        meanColourDepthSectionB: 1.2,
        sectionContrastDelta: 0.15,
        bridgeColourApplied: true,
        returnCadenceLiftApplied: true,
        secondaryDominantTouches: 2,
        mixtureTouches: 1,
      },
      songwriterSyncopationBias: null,
      songwriterDensityBias: null,
      manifestBehaviourGates: null,
    };
    const mn = metricsFromParsedBacharachManifest(neutral);
    const mb = metricsFromParsedBacharachManifest(bach);
    const { score, breakdown } = computeBacharachGceScore(mn, mb, bach);
    expect(breakdown.smoothVersusNeutral).toBe(true);
    expect(breakdown.receiptsOk).toBe(true);
    expect(score).toBeGreaterThanOrEqual(3);
  });

  it('aggregateBacharachGce summarises breakdown flags', () => {
    const breakdowns = new Map([
      [
        1,
        {
          smoothVersusNeutral: true,
          bridgeMoreAdventurousBounded: false,
          returnVariationVersusNeutral: true,
          receiptsOk: true,
        },
      ],
    ]);
    const scores = new Map([[1, 3]]);
    const agg = aggregateBacharachGce([1], scores, breakdowns);
    expect(agg.smoothWinRate).toBe(1);
    expect(agg.bridgeContrastRate).toBe(0);
    expect(agg.returnWinRate).toBe(1);
    expect(agg.receiptsRate).toBe(1);
  });

  it('writes CSV and Markdown via helpers', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bach-eval-'));
    const csv = stringifyCsv(
      ['a', 'b'],
      [
        { a: 1, b: 'x' },
        { a: 2, b: 'y' },
      ]
    );
    fs.writeFileSync(path.join(dir, 't.csv'), csv, 'utf-8');
    const md = buildBacharachEvalReportMarkdown({
      neutralPrimary: 'carole_king',
      seeds: [1, 2],
      outDirRel: 'output/bacharach-eval',
      agg: {
        seeds: [1, 2],
        artifactFailures: 0,
        softFailures: 1,
        meanGce: 2.5,
        medianGce: 2.5,
        gceScoreHistogram: [0, 0, 2, 0, 0],
        smoothWinRate: 0.5,
        bridgeContrastRate: 0.5,
        returnWinRate: 0.5,
        receiptsRate: 1,
        bachRunsWithArtifacts: 2,
      },
      neutralHigherSmoothCount: 0,
      metricsPresentSeeds: 2,
    });
    fs.writeFileSync(path.join(dir, 't.md'), md, 'utf-8');
    expect(fs.readFileSync(path.join(dir, 't.csv'), 'utf-8')).toContain('a,b');
    expect(md).toContain('carole_king');
    expect(md).toContain('GCE');
    fs.rmSync(dir, { recursive: true });
  });

  it('smoothMaj7M7RatioFromBars counts maj7 and m7 family', () => {
    expect(smoothMaj7M7RatioFromBars(['Cmaj7', 'Am7', 'G', 'G7'])).toBeCloseTo(0.5, 5);
  });
});
