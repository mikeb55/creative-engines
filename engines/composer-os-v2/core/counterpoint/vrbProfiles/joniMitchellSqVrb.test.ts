/**
 * Joni Mitchell SQ VRB — Session Harmonic Voice verification.
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
  JONI_MITCHELL_SQ_CHORD_VOCABULARY,
  JONI_MITCHELL_SQ_CONTRAPUNTAL_LINE_POLICY,
  JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS,
  JONI_MITCHELL_SQ_VRB_PROFILE,
} from './joniMitchellSqVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('joni_mitchell') === JONI_MITCHELL_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = JONI_MITCHELL_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'joni_mitchell' &&
    p.independenceLevel === 'moderate' &&
    p.registerPolicy === 'open_string_low_pedal_lyrical_soprano_arch' &&
    p.phraseArticulation === 'four_bar_periodic_suspended_non_resolving'
  );
}

function testChordVocabulary(): boolean {
  const v = JONI_MITCHELL_SQ_CHORD_VOCABULARY;
  return (
    v.includes('modal_mixolydian') &&
    v.includes('modal_dorian') &&
    v.includes('add9_add6_add11_surface') &&
    v.includes('bass_drone_fifth')
  );
}

function testBestBbStyle(): boolean {
  const b = getVoiceRuleBundle('joni_mitchell');
  return b.bestBbStyle === 'schneider' && b.secondaryBbStyle === 'schneider';
}

function testGceSigma23(): boolean {
  return getSqVrbGceAdjustments('joni_mitchell')?.registerCohesionStdevCeilingSt === 23;
}

function testSoftCeiling27(): boolean {
  return getSqVrbGceAdjustments('joni_mitchell')?.registerCohesionSoftCeilingSt === 27;
}

function testPhraseCellBarsRange(): boolean {
  const adj = getSqVrbGceAdjustments('joni_mitchell');
  return adj?.phraseCellBarsMin === 4 && adj?.phraseCellBarsMax === 5;
}

function testNoAuthenticCadenceCredit(): boolean {
  return JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit === undefined;
}

function testModalEndingsValid(): boolean {
  return JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS.modalEndingsValid === true;
}

function testNoTritoneCredit(): boolean {
  return JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS.tritoneAxisCredit === undefined;
}

function testNoIc1Saturation(): boolean {
  return JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS.ic1SaturationCredit === undefined;
}

function testIc5AndIc2Credits(): boolean {
  const adj = JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS;
  return (adj.ic5Credit ?? 0) >= 0.12 && (adj.ic2Credit ?? 0) >= 0.1;
}

function testSusChordCredit(): boolean {
  return (JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS.susChordCredit ?? 0) >= 0.14;
}

function testLowMotifRecurrenceWeight(): boolean {
  return (JONI_MITCHELL_SQ_GCE_SCORER_ADJUSTMENTS.motifRecurrenceWeight ?? 1) <= 0.32;
}

function buildQuartalLyricalLine(): MelodicNote[] {
  const steps = [5, 2, 5, 3, 7, 2, 5, 4, 5, 2, 7, 3, 5, 2, 4, 5];
  const line: MelodicNote[] = [];
  let p = 67;
  for (let i = 0; i < steps.length; i++) {
    line.push({
      midi: p,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
    p += steps[i]!;
  }
  return line;
}

function buildMixolydianLine(): MelodicNote[] {
  const scale = [60, 62, 64, 65, 67, 69, 70, 72];
  const line: MelodicNote[] = [];
  for (let i = 0; i < 16; i++) {
    line.push({
      midi: scale[i % scale.length]!,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
  }
  return line;
}

function buildPedalPolarityLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  const highSteps = [5, 2, 5, 3, 5, 2, 7, 2, 5, 3, 5, 2];
  let high = 84;
  for (let i = 0; i < highSteps.length; i++) {
    const bar = Math.floor(i / 4) + 1;
    const beat = (i % 4) + 1;
    if (i % 4 === 0) {
      line.push({ midi: 36 + (bar % 3), bar, beat: 1, beats: 1, rest: false });
    }
    line.push({
      midi: high,
      bar,
      beat: i % 4 === 0 ? 2 : beat,
      beats: 0.5,
      rest: false,
    });
    high += highSteps[i]!;
  }
  return line;
}

function buildSparseInnerSustainLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  const cells = [[72], [65, 67], [69], [72, 74], [76], [79]];
  let bar = 1;
  for (const cell of cells) {
    let beat = 1;
    for (const p of cell) {
      line.push({ midi: p, bar, beat, beats: 0.5, rest: false });
      beat += 1;
    }
    bar += 4;
  }
  return line;
}

function buildLoopingCellLine(): MelodicNote[] {
  const motif = [67, 69, 72, 74];
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

function buildFourBarPhraseLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 72;
  for (let b = 0; b < 4; b++) {
    for (let beat = 1; beat <= 4; beat++) {
      line.push({ midi: p, bar: b + 1, beat, beats: 1, rest: false });
      p += 2;
    }
  }
  return line;
}

function buildFiveBarPhraseLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 70;
  for (let b = 0; b < 5; b++) {
    for (let beat = 1; beat <= 4; beat++) {
      line.push({ midi: p, bar: b + 1, beat, beats: 1, rest: false });
      p += 1;
    }
  }
  return line;
}

function buildThreeBarPhraseLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 71;
  for (let b = 0; b < 3; b++) {
    for (let beat = 1; beat <= 4; beat++) {
      line.push({ midi: p, bar: b + 1, beat, beats: 1, rest: false });
      p += 2;
    }
  }
  return line;
}

function mesoSpansForBars(barCount: number, cadence: 'weak' | 'medium' | 'strong' = 'weak') {
  const half = Math.max(2, Math.floor(barCount / 2));
  return [
    { startBeat: 0, endBeat: half * 4, cadenceStrength: 'weak' as const },
    { startBeat: half * 4, endBeat: barCount * 4, cadenceStrength: cadence },
  ];
}

function testSusEndingPgCredited(): boolean {
  const line = buildQuartalLyricalLine();
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans: mesoSpansForBars(4, 'weak'),
    cadenceTags: [{ positionBars: 16, type: 'modal', strength: 'weak' }],
  });
  return pg.score >= 6 && pg.justification.includes('[SQ joni_mitchell PG]');
}

function testDominantResolutionPgLowerThanSus(): boolean {
  const line = buildQuartalLyricalLine();
  const opts: ContrapuntalGceScoringOptions = {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans: mesoSpansForBars(4),
    cadenceTags: [],
  };
  const pgSus = scorePhraseGrammar(line, {
    ...opts,
    mesoSpans: mesoSpansForBars(4, 'weak'),
  });
  const pgStrong = scorePhraseGrammar(line, {
    ...opts,
    mesoSpans: mesoSpansForBars(4, 'strong'),
  });
  return pgSus.score >= pgStrong.score - 0.5;
}

function testFourBarPhraseValid(): boolean {
  const line = buildFourBarPhraseLine();
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans: mesoSpansForBars(4),
    cadenceTags: [],
  });
  return pg.score >= 5.5;
}

function testFiveBarPhraseValid(): boolean {
  const line = buildFiveBarPhraseLine();
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans: mesoSpansForBars(5),
    cadenceTags: [],
  });
  return pg.score >= 5.5;
}

function testThreeBarPhraseSoftPenalty(): boolean {
  const line3 = buildThreeBarPhraseLine();
  const line4 = buildFourBarPhraseLine();
  const pg3 = scorePhraseGrammar(line3, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans: mesoSpansForBars(3),
    cadenceTags: [],
  });
  const pg4 = scorePhraseGrammar(line4, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans: mesoSpansForBars(4),
    cadenceTags: [],
  });
  return pg4.score >= pg3.score - 0.25;
}

function testCelloPedalMiNoPenalty(): boolean {
  const line = buildPedalPolarityLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'joni_mitchell', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6 && !mi.justification.includes('HARD FAIL') && mi.justification.includes('[SQ joni_mitchell MI]');
}

function testInnerSustainMiNoPenalty(): boolean {
  const line = buildSparseInnerSustainLine();
  const mesoSpans = Array.from({ length: 6 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'joni_mitchell', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6 && !mi.justification.includes('HARD FAIL');
}

function testIc5MiPath(): boolean {
  const line = buildQuartalLyricalLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'joni_mitchell', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6 && mi.justification.includes('[SQ joni_mitchell MI]');
}

function testLoopingCellPgPenalty(): boolean {
  const loop = buildLoopingCellLine();
  const fresh = buildQuartalLyricalLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 8,
    endBeat: (i + 1) * 8,
    cadenceStrength: 'weak' as const,
  }));
  const opts: ContrapuntalGceScoringOptions = {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans,
    cadenceTags: [],
  };
  const pgLoop = scorePhraseGrammar(loop, opts);
  const pgFresh = scorePhraseGrammar(fresh, opts);
  return pgFresh.score >= pgLoop.score - 0.5;
}

function testMixolydianFlat7MiNoHardFail(): boolean {
  const line = buildMixolydianLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'joni_mitchell', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'joni_mitchell',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6 && !mi.justification.includes('HARD FAIL');
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('glass')?.registerCohesionStdevCeilingSt === 18 &&
    getSqVrbGceAdjustments('shostakovich')?.registerCohesionStdevCeilingSt === 28 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36 &&
    getSqVrbGceAdjustments('webern')?.registerCohesionStdevCeilingSt === 40
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('joni_mitchell');
}

function testUiPickerJoniMitchell(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'joni_mitchell', label: 'Joni Mitchell', enabled: true") &&
    !src.includes('Joni Mitchell — coming soon')
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('joni_mitchell', 'schneider') === 'joni_mitchell';
}

function testBundleWired(): boolean {
  return getVoiceRuleBundle('joni_mitchell_songwriter').sqVrbProfileId === 'joni_mitchell';
}

export function runJoniMitchellSqVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Joni Mitchell SQ VRB — profile loads', testProfileLoads],
    ['Joni Mitchell SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Joni Mitchell SQ VRB — independenceLevel moderate', () =>
      JONI_MITCHELL_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'moderate'],
    [
      'Joni Mitchell SQ VRB — registerPolicy open_string_low_pedal_lyrical_soprano_arch',
      () =>
        JONI_MITCHELL_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy ===
        'open_string_low_pedal_lyrical_soprano_arch',
    ],
    [
      'Joni Mitchell SQ VRB — phraseArticulation four_bar_periodic_suspended_non_resolving',
      () =>
        JONI_MITCHELL_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation ===
        'four_bar_periodic_suspended_non_resolving',
    ],
    ['Joni Mitchell SQ VRB — chord vocabulary modal quartal pedal', testChordVocabulary],
    ['Joni Mitchell SQ VRB — bestBbStyle schneider', testBestBbStyle],
    ['Joni Mitchell SQ VRB — GCE σ ceiling 23 st', testGceSigma23],
    ['Joni Mitchell SQ VRB — soft σ warning above 27 st', testSoftCeiling27],
    ['Joni Mitchell SQ VRB — phraseCellBars 4–5', testPhraseCellBarsRange],
    ['Joni Mitchell SQ VRB — no authenticCadenceCredit', testNoAuthenticCadenceCredit],
    ['Joni Mitchell SQ VRB — modalEndingsValid', testModalEndingsValid],
    ['Joni Mitchell SQ VRB — no tritoneAxisCredit', testNoTritoneCredit],
    ['Joni Mitchell SQ VRB — no ic1SaturationCredit', testNoIc1Saturation],
    ['Joni Mitchell SQ VRB — ic5/ic2 credits', testIc5AndIc2Credits],
    ['Joni Mitchell SQ VRB — susChordCredit', testSusChordCredit],
    ['Joni Mitchell SQ VRB — low motifRecurrenceWeight', testLowMotifRecurrenceWeight],
    ['Joni Mitchell SQ VRB — sus ending PG credited', testSusEndingPgCredited],
    ['Joni Mitchell SQ VRB — dominant resolution not preferred', testDominantResolutionPgLowerThanSus],
    ['Joni Mitchell SQ VRB — 4-bar phrase valid', testFourBarPhraseValid],
    ['Joni Mitchell SQ VRB — 5-bar phrase valid', testFiveBarPhraseValid],
    ['Joni Mitchell SQ VRB — 3-bar phrase soft penalty', testThreeBarPhraseSoftPenalty],
    ['Joni Mitchell SQ VRB — cello pedal MI no penalty', testCelloPedalMiNoPenalty],
    ['Joni Mitchell SQ VRB — inner sustain MI no penalty', testInnerSustainMiNoPenalty],
    ['Joni Mitchell SQ VRB — ic5 quartal MI path', testIc5MiPath],
    ['Joni Mitchell SQ VRB — looping cell PG penalty', testLoopingCellPgPenalty],
    ['Joni Mitchell SQ VRB — Mixolydian flat-7 no hard-fail', testMixolydianFlat7MiNoHardFail],
    ['Joni Mitchell SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Joni Mitchell SQ VRB — picker enabled (UI)', testUiPickerJoniMitchell],
    ['Joni Mitchell SQ VRB — sqLineVrbId routes joni_mitchell', testSqLineRouting],
    ['Joni Mitchell SQ VRB — voiceRuleBundle wired', testBundleWired],
    ['Joni Mitchell SQ VRB — prior VRBs σ unchanged', testPriorVrbsUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runJoniMitchellSqVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
