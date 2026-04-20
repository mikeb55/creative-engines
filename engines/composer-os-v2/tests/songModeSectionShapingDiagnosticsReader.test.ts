/**
 * Manifest reader for `songModeSectionShapingDiagnostics` (eval wiring).
 */

import {
  readSongModeSectionShapingDiagnosticsFromManifestJson,
  readSongModeSectionShapingDiagnosticsFromManifestRoot,
} from '../scripts/eval/songModeSectionShapingDiagnosticsReader';

describe('songModeSectionShapingDiagnosticsReader', () => {
  it('reads full V1 payload from manifest JSON', () => {
    const raw = JSON.stringify({
      seed: 1,
      songModeSectionShapingDiagnostics: {
        version: 1,
        totalBars: 32,
        densityDeltaBMinusA: 0.12,
        colourDeltaBMinusA: 0.08,
        openingVsReturnDelta: 0.4,
        returnVariationSummary: 'test summary',
        returnVariationType: 'harmonic_recolour',
        contributingSlices: ['a', 'b'],
      },
    });
    const d = readSongModeSectionShapingDiagnosticsFromManifestJson(raw);
    expect(d.version).toBe(1);
    expect(d.totalBars).toBe(32);
    expect(d.densityDeltaBMinusA).toBeCloseTo(0.12);
    expect(d.colourDeltaBMinusA).toBeCloseTo(0.08);
    expect(d.openingVsReturnDelta).toBeCloseTo(0.4);
    expect(d.returnVariationSummary).toBe('test summary');
    expect(d.returnVariationType).toBe('harmonic_recolour');
    expect(d.contributingSliceCount).toBe(2);
  });

  it('returns nulls when diagnostics missing', () => {
    const d = readSongModeSectionShapingDiagnosticsFromManifestJson('{"seed":9}');
    expect(d.densityDeltaBMinusA).toBeNull();
    expect(d.colourDeltaBMinusA).toBeNull();
    expect(d.returnVariationType).toBeNull();
    expect(d.contributingSliceCount).toBeNull();
  });

  it('ignores invalid returnVariationType strings', () => {
    const d = readSongModeSectionShapingDiagnosticsFromManifestRoot({
      songModeSectionShapingDiagnostics: {
        version: 1,
        totalBars: 8,
        returnVariationType: 'not_a_real_type',
      },
    });
    expect(d.returnVariationType).toBeNull();
  });

  it('invalid JSON yields all-null snapshot', () => {
    const d = readSongModeSectionShapingDiagnosticsFromManifestJson('{');
    expect(d.version).toBeNull();
    expect(d.densityDeltaBMinusA).toBeNull();
  });
});
