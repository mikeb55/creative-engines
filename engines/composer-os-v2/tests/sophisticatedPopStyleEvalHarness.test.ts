// @ts-nocheck
/**
 * Sophisticated Pop style eval harness — parsing, GCE score, CSV (no full Song Mode generation).
 */

import {
  computeGceStyleScore,
  extendedChordRatioFromBars,
  metricsFromParsedManifest,
  parseManifestJsonForSophPopEval,
  stringifyCsv,
  nonDiatonicChordHeuristicCount,
  rowToCsvRecord,
  SOPH_POP_EVAL_CSV_HEADERS,
} from '../scripts/eval/sophisticatedPopStyleEvalCore';
import type { GenerationMetadata } from '../core/compositionContext';
import { applyGrooveSoulStyleSurface, applySophisticatedPopStyleSurface } from '../core/song-mode/songModeStyleSurface';

function minimalMeta(partial: Partial<GenerationMetadata>): GenerationMetadata {
  return {
    generatedAt: new Date().toISOString(),
    ...partial,
  } as GenerationMetadata;
}

describe('sophisticatedPopStyleEvalCore', () => {
  it('parses manifests with missing optional fields safely', () => {
    const p = parseManifestJsonForSophPopEval('{}');
    expect(p.seed).toBeNull();
    expect(p.sophisticatedPopHarmonyDiagnostics).toBeNull();
    expect(p.parsedBars).toBeNull();
    const m = metricsFromParsedManifest(p);
    expect(m.extChordRatio).toBeNull();
  });

  it('extracts diagnostics and harmony bars when present', () => {
    const raw = JSON.stringify({
      seed: 42,
      styleProfile: 'STYLE_SOPHISTICATED_POP',
      parsedCustomProgressionBars: ['C', 'Am', 'F', 'G7'],
      sophisticatedPopHarmonyDiagnostics: {
        barsConsidered: 4,
        barsChanged: 2,
        meanColourDepth: 0.5,
        meanColourDepthSectionA: 0.4,
        meanColourDepthSectionB: 0.9,
        sectionContrastDelta: 0.5,
        extensionAdds: 2,
      },
      songModeStyleSurfaceNotes: ['STYLE_SOPHISTICATED_POP: test'],
      songwriterSyncopationBias: 0.56,
      songwriterDensityBias: 0.54,
    });
    const p = parseManifestJsonForSophPopEval(raw);
    expect(p.seed).toBe(42);
    expect(p.parsedBars?.length).toBe(4);
    const m = metricsFromParsedManifest(p);
    expect(m.sectionContrastDelta).toBe(0.5);
    expect(m.syncBias).toBe(0.56);
    expect(m.sophPopReceiptsPresent).toBe(true);
  });

  it('computes GCE-style score components', () => {
    const neutral = metricsFromParsedManifest(
      parseManifestJsonForSophPopEval(
        JSON.stringify({
          parsedCustomProgressionBars: ['C', 'C', 'C', 'C'],
          songwriterSyncopationBias: 0.5,
          songwriterDensityBias: 0.5,
        })
      )
    );
    const soph = metricsFromParsedManifest(
      parseManifestJsonForSophPopEval(
        JSON.stringify({
          parsedCustomProgressionBars: ['Cmaj7', 'Am7', 'Fmaj7', 'G13'],
          sophisticatedPopHarmonyDiagnostics: {
            barsConsidered: 4,
            barsChanged: 4,
            meanColourDepth: 1,
            meanColourDepthSectionA: 0.5,
            meanColourDepthSectionB: 1.2,
            sectionContrastDelta: 0.7,
            extensionAdds: 4,
          },
          songModeStyleSurfaceNotes: ['STYLE_SOPHISTICATED_POP: receipt'],
          songwriterSyncopationBias: 0.56,
          songwriterDensityBias: 0.54,
        })
      )
    );
    const { score, breakdown } = computeGceStyleScore(neutral, soph);
    expect(score).toBeGreaterThanOrEqual(2);
    expect(breakdown.receiptsPresent).toBe(true);
    expect(breakdown.extendedLift).toBe(true);
  });

  it('stringifyCsv aligns with SOPH_POP_EVAL_CSV_HEADERS', () => {
    const row = rowToCsvRecord({
      arm: 'soph_pop',
      seed: 1,
      styleName: 'STYLE_SOPHISTICATED_POP',
      success: true,
      engineDeclaredSuccess: true,
      manifestBehaviourGates: 'false',
      extChordRatio: '0.5',
      meanColourNorm: '0.25',
      nonDiatonicCount: '0',
      sectionContrastDelta: '0.1',
      densityColourA: '0.5',
      densityColourB: '0.6',
      openingReturnDelta: '0.05',
      syncBias: '0.55',
      densityBias: '0.52',
      receiptsSophPop: 'true',
      gceStyleScore: '3',
    });
    const csv = stringifyCsv([...SOPH_POP_EVAL_CSV_HEADERS], [row]);
    expect(csv.split('\n').length).toBe(3);
    expect(csv).toContain('soph_pop');
    expect(csv).toContain(',3');
  });

  it('extendedChordRatio and non-diatonic heuristics handle symbols', () => {
    expect(extendedChordRatioFromBars(['C', 'Cmaj7'])).toBeCloseTo(0.5, 5);
    expect(nonDiatonicChordHeuristicCount(['G7alt', 'Cmaj7'])).toBe(1);
  });

  it('Groove Soul surface unchanged when profile is not GROOVE_SOUL', () => {
    const m = minimalMeta({
      songModeHookFirstIdentity: true,
      songwriterSyncopationBias: 0.5,
      songwriterDensityBias: 0.5,
      songModeStyleSurfaceNotes: [],
    });
    applyGrooveSoulStyleSurface(m, 'STYLE_ECM');
    expect(m.songwriterSyncopationBias).toBe(0.5);
  });

  it('Sophisticated Pop surface does not apply to ECM', () => {
    const m = minimalMeta({
      songModeHookFirstIdentity: true,
      songwriterSyncopationBias: 0.5,
      songwriterDensityBias: 0.5,
      bacharachModalMixtureLevel: 0,
      songModeStyleSurfaceNotes: [],
    });
    applySophisticatedPopStyleSurface(m, 'STYLE_ECM');
    expect(m.songwriterSyncopationBias).toBe(0.5);
    expect((m.songModeStyleSurfaceNotes ?? []).some((s) => s.includes('SOPHISTICATED'))).toBe(false);
  });
});
