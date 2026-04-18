/**
 * Fagen Song Mode evaluation harness — parsing, metrics, CSV (no full generation).
 */

import {
  buildRowFromManifest,
  computeFagenQualityScore,
  FAGEN_EVAL_CSV_HEADERS,
  parseManifestJsonContent,
  rowToCsvRecord,
  stringifyCsv,
} from '../scripts/eval/fagenSongModeEvalCore';

const MINIMAL_MANIFEST = JSON.stringify({
  seed: 42,
  songwriterStyleId: 'donald_fagen',
  songModeFagenKeysCompV15Applied: true,
  fagenKeysCompMusicalDiagnostics: {
    rhythmPatternFamily: 'mixed_syncopated',
    meanSyncopationIndex: 0.12,
    syncopationIndexBySection: { a_open: 0.1, b: 0.14, a_return: 0.11, closing: 0.13 },
    avgInnerMotionSemitonesV2Top: 1.5,
    meanRhMidiV1OpenA: 64,
    meanRhMidiV1SectionB: 66,
    densityDeltaBMinusA: 0.4,
    voicingDensityBySection: { a_open: 3, b: 3.6, a_return: 3.2, closing: 3.5 },
    openingVsReturnRhMeanDelta: 1.2,
    returnVariationSummary: 'delayed_entry_velocity|bars=17,20',
    returnPhraseGesturesApplied: 2,
    signatureMoment: { applied: true, pivotBar: 16, kind: 'chromatic_side_slip' },
    phraseTensionMeanDensityByPhrase: [3.2, 3.4, 3.1, 3.5],
  },
  songModeStyleSurfaceNotes: ['a', 'b', 'c', 'd'],
});

describe('fagenSongModeEvalCore', () => {
  it('parses manifest safely when optional fields are missing', () => {
    const p = parseManifestJsonContent('{}');
    expect(p.seed).toBeNull();
    expect(p.fagenDiagnostics).toBeNull();

    const p2 = parseManifestJsonContent('{ "not-json-trailing": ');
    expect(p2.parseError).toBeDefined();
    expect(p2.fagenDiagnostics).toBeNull();
  });

  it('computes B minus A sync/density deltas from section maps', () => {
    const row = buildRowFromManifest({
      arm: 'fagen',
      seed: 1,
      songwriterId: 'donald_fagen',
      success: true,
      engineDeclaredSuccess: true,
      manifestBehaviourGates: null,
      errorMessage: '',
      musicXmlPath: '/x.musicxml',
      manifestPath: '/_meta/x.manifest.json',
      manifestContent: MINIMAL_MANIFEST,
    });
    expect(row.syncBMinusA).toBeCloseTo(0.04, 5);
    expect(row.densBMinusA).toBeCloseTo(0.6, 5);
    expect(row.signatureRuleOk).toBe(true);
    expect(row.fagenQualityEvalScore).toBeGreaterThan(50);
  });

  it('flags signature rule failure when eval extension lists multiple pivot bars', () => {
    const multi = JSON.stringify({
      seed: 7,
      fagenSignaturePivotBars: [16, 17],
      fagenKeysCompMusicalDiagnostics: {
        meanSyncopationIndex: 0.1,
        signatureMoment: { applied: true, pivotBar: 16, kind: 'x' },
      },
    });
    const row = buildRowFromManifest({
      arm: 'fagen',
      seed: 7,
      songwriterId: 'donald_fagen',
      success: true,
      engineDeclaredSuccess: true,
      manifestBehaviourGates: null,
      errorMessage: '',
      musicXmlPath: '',
      manifestPath: '',
      manifestContent: multi,
    });
    expect(row.signatureRuleOk).toBe(false);
  });

  it('stringifyCsv produces rows aligned with FAGEN_EVAL_CSV_HEADERS', () => {
    const row = buildRowFromManifest({
      arm: 'fagen',
      seed: 2,
      songwriterId: 'donald_fagen',
      success: true,
      engineDeclaredSuccess: true,
      manifestBehaviourGates: null,
      errorMessage: '',
      musicXmlPath: 'p',
      manifestPath: 'm',
      manifestContent: MINIMAL_MANIFEST,
    });
    const csv = stringifyCsv([...FAGEN_EVAL_CSV_HEADERS], [rowToCsvRecord(row)]);
    expect(csv.split('\n').length).toBe(3);
    expect(csv).toContain('fagen');
    expect(csv).toContain(',2,');
  });

  it('computeFagenQualityScore handles missing diagnostics', () => {
    const s = computeFagenQualityScore({
      fd: null,
      passSectionContrast: false,
      passReturnEvolution: false,
      signatureRuleOk: true,
      receiptLineCount: 0,
      hasDiagnostics: false,
    });
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
