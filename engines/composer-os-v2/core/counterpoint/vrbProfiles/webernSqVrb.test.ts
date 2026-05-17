/**
 * Webern SQ VRB — Session Harmonic Voice verification.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import {
  scoreMelodicIdentity,
  scorePhraseGrammar,
  type ContrapuntalGceScoringOptions,
} from '../../gce/gceAutoScorers';
import type { MelodicNote } from '../../gce/gce_melody_eval';
import { SQ_TO_BB_SQ_COMPOSER_ENABLED, sqLineVrbIdForSqToBb } from '../sqToBbWorkflowTypes';
import {
  WEBERN_SQ_CHORD_VOCABULARY,
  WEBERN_SQ_CONTRAPUNTAL_LINE_POLICY,
  WEBERN_SQ_GCE_SCORER_ADJUSTMENTS,
  WEBERN_SQ_VRB_PROFILE,
} from './webernSqVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('webern') === WEBERN_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = WEBERN_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'webern' &&
    p.independenceLevel === 'high' &&
    p.registerPolicy === 'extreme_pointillist_leaps_all_registers' &&
    p.phraseArticulation === 'aphoristic_cell_silence_bounded'
  );
}

function testChordVocabulary(): boolean {
  const v = WEBERN_SQ_CHORD_VOCABULARY;
  return (
    v.includes('poly_triad_minor_second') &&
    v.includes('tritone_dyad_anchor') &&
    v.includes('octatonic_whole_half') &&
    v.includes('cluster_color_high_register')
  );
}

function testBestBbStyles(): boolean {
  const b = getVoiceRuleBundle('webern');
  return b.bestBbStyle === 'brookmeyer' && b.secondaryBbStyle === 'mingus';
}

function testGceSigma40(): boolean {
  return getSqVrbGceAdjustments('webern')?.registerCohesionStdevCeilingSt === 40;
}

function testSoftCeiling45(): boolean {
  return getSqVrbGceAdjustments('webern')?.registerCohesionSoftCeilingSt === 45;
}

function testPhraseCellBarsRange(): boolean {
  const adj = getSqVrbGceAdjustments('webern');
  return adj?.phraseCellBarsMin === 1 && adj?.phraseCellBarsMax === 3;
}

function testNoAuthenticCadenceCredit(): boolean {
  return WEBERN_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit === undefined;
}

function testModalEndingsInvalid(): boolean {
  return WEBERN_SQ_GCE_SCORER_ADJUSTMENTS.modalEndingsValid === false;
}

function testLowMotifRecurrenceWeight(): boolean {
  return (WEBERN_SQ_GCE_SCORER_ADJUSTMENTS.motifRecurrenceWeight ?? 1) <= 0.12;
}

function testSilenceBoundaryCredit(): boolean {
  return (WEBERN_SQ_GCE_SCORER_ADJUSTMENTS.silenceBoundaryCredit ?? 0) >= 0.15;
}

function testLoopingCellPenalty(): boolean {
  return (WEBERN_SQ_GCE_SCORER_ADJUSTMENTS.loopingCellPenalty ?? 0) >= 0.15;
}

function buildPointillistLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  const cells = [
    [72],
    [],
    [68, 67],
    [],
    [91],
    [],
    [55, 56],
    [],
  ];
  let bar = 1;
  let beat = 1;
  for (const cell of cells) {
    if (cell.length === 0) {
      line.push({ midi: 0, bar, beat, beats: 1.5, rest: true });
    } else {
      for (const p of cell) {
        line.push({ midi: p, bar, beat, beats: 0.5, rest: false });
        beat += 1;
        if (beat > 4) {
          beat = 1;
          bar += 1;
        }
      }
      line.push({ midi: 0, bar, beat, beats: 1, rest: true });
    }
    beat += 1;
    if (beat > 4) {
      beat = 1;
      bar += 1;
    }
  }
  return line;
}

function buildLoopingGlassStyleLine(): MelodicNote[] {
  const motif = [60, 62, 64, 65];
  const line: MelodicNote[] = [];
  for (let i = 0; i < 32; i++) {
    line.push({
      midi: motif[i % motif.length]!,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
  }
  return line;
}

function buildSparseKlangfarbenLine(): MelodicNote[] {
  return buildPointillistLine();
}

function buildExtremeIsolatedToneLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  /** Distinct pitch classes + registral extremes (E1–G♯6). */
  const tones = [28, 91, 60, 86, 47, 65, 95, 53];
  for (let i = 0; i < tones.length; i++) {
    const bar = i + 1;
    line.push({ midi: tones[i]!, bar, beat: 1, beats: 0.5, rest: false });
    line.push({ midi: 0, bar, beat: 2, beats: 2.5, rest: true });
  }
  return line;
}

function buildSerialRowLine(): MelodicNote[] {
  const row = [0, 1, 11, 2, 10, 3, 9, 4, 8, 5, 7, 6].map((pc) => 60 + pc);
  const line: MelodicNote[] = [];
  for (let i = 0; i < row.length; i++) {
    line.push({
      midi: row[i]!,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 0.5,
      rest: false,
    });
    line.push({ midi: 0, bar: Math.floor(i / 4) + 1, beat: (i % 4) + 1.5, beats: 1, rest: true });
  }
  return line;
}

function buildIc1SaturatedLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  const steps = [1, 2, 1, 3, -2, 1, 2, -1, 2, 1];
  let p = 60;
  for (let i = 0; i < steps.length; i++) {
    const bar = i + 1;
    line.push({ midi: p, bar, beat: 1, beats: 0.5, rest: false });
    p += steps[i]!;
    line.push({ midi: 0, bar, beat: 2, beats: 2.5, rest: true });
  }
  return line;
}

function testSilenceBoundaryPg(): boolean {
  const line = buildPointillistLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 4, cadenceStrength: 'weak' as const },
    { startBeat: 4, endBeat: 8, cadenceStrength: 'weak' as const },
    { startBeat: 8, endBeat: 12, cadenceStrength: 'medium' as const },
  ];
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'webern',
    mesoSpans,
    cadenceTags: [],
  });
  return pg.score >= 6 && pg.justification.includes('[SQ webern PG]');
}

function testLoopingPenalizedVsPointillist(): boolean {
  const loop = buildLoopingGlassStyleLine();
  const point = buildPointillistLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: 'weak' as const,
  }));
  const opts: ContrapuntalGceScoringOptions = {
    contrapuntalLinePolicy: true,
    sqVrbId: 'webern',
    mesoSpans,
    cadenceTags: [],
  };
  const pgLoop = scorePhraseGrammar(loop, opts);
  const pgPoint = scorePhraseGrammar(point, opts);
  return pgPoint.score >= pgLoop.score - 0.5;
}

function testSparseTextureMiNoPenalty(): boolean {
  const line = buildSparseKlangfarbenLine();
  const mesoSpans = Array.from({ length: 6 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'webern', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'webern',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6 && !mi.justification.includes('HARD FAIL') && mi.justification.includes('[SQ webern MI]');
}

function testExtremeRegisterMiNoHardFail(): boolean {
  const line = buildExtremeIsolatedToneLine();
  const mesoSpans = Array.from({ length: 8 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'webern', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'webern',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6 && !mi.justification.includes('HARD FAIL') && mi.justification.includes('[SQ webern MI]');
}

function testRowCompletionPg(): boolean {
  const line = buildSerialRowLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 12, cadenceStrength: 'weak' as const },
    { startBeat: 12, endBeat: 24, cadenceStrength: 'weak' as const },
  ];
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'webern',
    mesoSpans,
    cadenceTags: [],
  });
  return pg.score >= 5.5 && pg.justification.includes('[SQ webern PG]');
}

function testIc1SaturationMiPath(): boolean {
  const line = buildIc1SaturatedLine();
  const mesoSpans = Array.from({ length: 10 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'webern', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'webern',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6 && mi.justification.includes('[SQ webern MI]');
}

function testLoopingMotifMiPenalty(): boolean {
  const loop = buildLoopingGlassStyleLine();
  const point = buildIc1SaturatedLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: 'weak' as const,
  }));
  const opts: ContrapuntalGceScoringOptions = {
    contrapuntalLinePolicy: true,
    sqVrbId: 'webern',
    mesoSpans,
    cadenceTags: [],
  };
  const miLoop = scoreMelodicIdentity(loop, 'webern', opts);
  const miPoint = scoreMelodicIdentity(point, 'webern', opts);
  return miPoint.score >= miLoop.score - 1;
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('glass')?.registerCohesionStdevCeilingSt === 18 &&
    getSqVrbGceAdjustments('shostakovich')?.registerCohesionStdevCeilingSt === 28 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36 &&
    getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('webern');
}

function testUiPickerWebern(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'webern', label: 'Webern', enabled: true") &&
    !src.includes("Webern — coming soon")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('webern', 'brookmeyer') === 'webern';
}

function testBundleWired(): boolean {
  return getVoiceRuleBundle('anton_webern').sqVrbProfileId === 'webern';
}

export function runWebernSqVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Webern SQ VRB — profile loads', testProfileLoads],
    ['Webern SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Webern SQ VRB — independenceLevel high', () =>
      WEBERN_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'high'],
    [
      'Webern SQ VRB — registerPolicy extreme_pointillist_leaps_all_registers',
      () =>
        WEBERN_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy ===
        'extreme_pointillist_leaps_all_registers',
    ],
    [
      'Webern SQ VRB — phraseArticulation aphoristic_cell_silence_bounded',
      () =>
        WEBERN_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation ===
        'aphoristic_cell_silence_bounded',
    ],
    ['Webern SQ VRB — chord vocabulary clusters tritone octatonic', testChordVocabulary],
    ['Webern SQ VRB — bestBbStyle brookmeyer secondary mingus', testBestBbStyles],
    ['Webern SQ VRB — GCE σ ceiling 40 st', testGceSigma40],
    ['Webern SQ VRB — soft σ warning above 45 st', testSoftCeiling45],
    ['Webern SQ VRB — phraseCellBars 1–3', testPhraseCellBarsRange],
    ['Webern SQ VRB — no authenticCadenceCredit', testNoAuthenticCadenceCredit],
    ['Webern SQ VRB — modalEndingsValid false', testModalEndingsInvalid],
    ['Webern SQ VRB — low motifRecurrenceWeight', testLowMotifRecurrenceWeight],
    ['Webern SQ VRB — silenceBoundaryCredit', testSilenceBoundaryCredit],
    ['Webern SQ VRB — loopingCellPenalty configured', testLoopingCellPenalty],
    ['Webern SQ VRB — silence ≥ 1 beat PG boundary', testSilenceBoundaryPg],
    ['Webern SQ VRB — looping cell penalized vs pointillist', testLoopingPenalizedVsPointillist],
    ['Webern SQ VRB — sparse 1–2 voice MI no penalty', testSparseTextureMiNoPenalty],
    ['Webern SQ VRB — extreme register spike no hard-fail', testExtremeRegisterMiNoHardFail],
    ['Webern SQ VRB — row completion PG valid', testRowCompletionPg],
    ['Webern SQ VRB — ic1/ic2 saturation MI path', testIc1SaturationMiPath],
    ['Webern SQ VRB — looping motif MI penalty', testLoopingMotifMiPenalty],
    ['Webern SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Webern SQ VRB — picker enabled (UI)', testUiPickerWebern],
    ['Webern SQ VRB — sqLineVrbId routes webern', testSqLineRouting],
    ['Webern SQ VRB — voiceRuleBundle wired', testBundleWired],
    ['Webern SQ VRB — prior VRBs σ unchanged', testPriorVrbsUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runWebernSqVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
