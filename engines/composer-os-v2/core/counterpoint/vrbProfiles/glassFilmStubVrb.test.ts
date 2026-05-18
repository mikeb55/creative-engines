/**
 * Philip Glass film stub SQ VRB — Session Harmonic Voice verification.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import {
  scoreMelodicIdentity,
  scorePhraseGrammar,
  scoreJazzIntervalBalance,
  type ContrapuntalGceScoringOptions,
} from '../../gce/gceAutoScorers';
import type { MelodicNote } from '../../gce/gce_melody_eval';
import { SQ_TO_BB_SQ_COMPOSER_ENABLED, sqLineVrbIdForSqToBb } from '../sqToBbWorkflowTypes';
import {
  GLASS_SQ_CHORD_VOCABULARY,
  GLASS_SQ_CONTRAPUNTAL_LINE_POLICY,
  GLASS_SQ_GCE_SCORER_ADJUSTMENTS,
  GLASS_SQ_VRB_PROFILE,
} from './glassFilmStubVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('glass') === GLASS_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = GLASS_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'glass' &&
    p.independenceLevel === 'low' &&
    p.registerPolicy === 'mid_register_additive_expansion' &&
    p.phraseArticulation === 'looping_cell_no_cadence'
  );
}

function testChordVocabulary(): boolean {
  const v = GLASS_SQ_CHORD_VOCABULARY;
  return (
    v.includes('modal_aeolian') &&
    v.includes('modal_dorian') &&
    v.includes('triad_skeleton') &&
    !v.includes('dom7alt')
  );
}

function testBestBbStyles(): boolean {
  const b = getVoiceRuleBundle('philip_glass_screen');
  return b.bestBbStyle === 'schneider' && b.secondaryBbStyle === 'brookmeyer';
}

function testGceSigma18(): boolean {
  return getSqVrbGceAdjustments('glass')?.registerCohesionStdevCeilingSt === 18;
}

function testSoftSigma16(): boolean {
  return getSqVrbGceAdjustments('glass')?.registerCohesionSoftCeilingSt === 16;
}

function testPhraseCellBarsRange(): boolean {
  const adj = getSqVrbGceAdjustments('glass');
  return adj?.phraseCellBarsMin === 2 && adj?.phraseCellBarsMax === 4;
}

function testNoAuthenticCadence(): boolean {
  return (GLASS_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit ?? 1) === 0;
}

function testHighMotifRecurrence(): boolean {
  return (GLASS_SQ_GCE_SCORER_ADJUSTMENTS.motifRecurrenceWeight ?? 0) >= 0.45;
}

function testModalEndingsAndChordBoundary(): boolean {
  return (
    GLASS_SQ_GCE_SCORER_ADJUSTMENTS.modalEndingsValid === true &&
    GLASS_SQ_GCE_SCORER_ADJUSTMENTS.chordTransitionAsBoundary === true &&
    (GLASS_SQ_GCE_SCORER_ADJUSTMENTS.wallToWallPhrasePenalty ?? 1) === 0
  );
}

function testNoPeriodicMultiple(): boolean {
  return GLASS_SQ_GCE_SCORER_ADJUSTMENTS.phrasePeriodBars === 0;
}

function buildLoopingCellLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 62;
  const pattern = [2, 3, 2, 1, 2, 3, 2, 1];
  for (let i = 0; i < 16; i++) {
    line.push({
      midi: p,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
    p += pattern[i % pattern.length]!;
  }
  return line;
}

function buildWideLeapLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 60;
  for (let i = 0; i < 8; i++) {
    line.push({
      midi: p,
      bar: i + 1,
      beat: 1,
      beats: 1,
      rest: false,
    });
    p += 12;
  }
  return line;
}

function testGlassIntervalTarget(): boolean {
  const loop = buildLoopingCellLine();
  const loopScore = scoreJazzIntervalBalance(
    loop.map((n) => n.midi),
    'glass',
    true,
  );
  const wideScore = scoreJazzIntervalBalance(
    buildWideLeapLine().map((n) => n.midi),
    'glass',
    true,
  );
  return loopScore > wideScore;
}

function testLoopingPgValid(): boolean {
  const line = buildLoopingCellLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 8, cadenceStrength: 'weak' as const },
    { startBeat: 8, endBeat: 16, cadenceStrength: 'medium' as const },
  ];
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'glass',
    mesoSpans,
    cadenceTags: [{ positionBars: 16, type: 'modal', strength: 'weak' }],
  });
  return pg.score >= 6 && pg.justification.includes('[SQ glass PG]');
}

function testGlassMiPath(): boolean {
  const line = buildLoopingCellLine();
  const mesoSpans = Array.from({ length: 4 }, (_, i) => ({
    startBeat: i * 4,
    endBeat: (i + 1) * 4,
    cadenceStrength: 'weak' as const,
  }));
  const mi = scoreMelodicIdentity(line, 'glass', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'glass',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6.5 && mi.justification.includes('[SQ glass MI]');
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('rota')?.registerCohesionStdevCeilingSt === 19 &&
    getSqVrbGceAdjustments('goldsmith')?.registerCohesionStdevCeilingSt === 24 &&
    getSqVrbGceAdjustments('morricone')?.registerCohesionStdevCeilingSt === 22 &&
    getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36 &&
    getSqVrbGceAdjustments('ravel')?.registerCohesionStdevCeilingSt === 20
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('glass');
}

function testUiPickerGlass(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'glass', label: 'Glass', enabled: true") &&
    src.indexOf("'glass'") > src.indexOf("'goldsmith'")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('glass', 'schneider') === 'glass';
}

function testFilmStubWired(): boolean {
  return getVoiceRuleBundle('philip_glass_film').sqVrbProfileId === 'glass';
}

function testFingerprintReceiptCount(): boolean {
  return (
    (getVoiceRuleBundle('philip_glass_screen').orchestrationPolicy.fingerprintReceipts?.length ?? 0) >=
    35
  );
}

function testFingerprintWorkReceipt(): boolean {
  const receipts =
    getVoiceRuleBundle('philip_glass_screen').orchestrationPolicy.fingerprintReceipts ?? [];
  return receipts.some((r) => r.includes('PG_WORK_'));
}

function testFingerprintDiffReceipt(): boolean {
  const receipts =
    getVoiceRuleBundle('philip_glass_screen').orchestrationPolicy.fingerprintReceipts ?? [];
  return receipts.some((r) => r.includes('PG_DIFF_'));
}

export function runGlassFilmStubVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Glass SQ VRB — profile loads', testProfileLoads],
    ['Glass SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Glass SQ VRB — independenceLevel low', () =>
      GLASS_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'low'],
    ['Glass SQ VRB — registerPolicy mid_register_additive_expansion', () =>
      GLASS_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy === 'mid_register_additive_expansion'],
    ['Glass SQ VRB — phraseArticulation looping_cell_no_cadence', () =>
      GLASS_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation === 'looping_cell_no_cadence'],
    ['Glass SQ VRB — modal chord vocabulary', testChordVocabulary],
    ['Glass SQ VRB — bestBbStyle schneider secondary brookmeyer', testBestBbStyles],
    ['Glass SQ VRB — GCE σ ceiling 18 st', testGceSigma18],
    ['Glass SQ VRB — soft σ flag 16 st', testSoftSigma16],
    ['Glass SQ VRB — phraseCellBars 2–4', testPhraseCellBarsRange],
    ['Glass SQ VRB — no authenticCadenceCredit', testNoAuthenticCadence],
    ['Glass SQ VRB — high motifRecurrenceWeight', testHighMotifRecurrence],
    ['Glass SQ VRB — modal endings + chord boundary + no wall penalty', testModalEndingsAndChordBoundary],
    ['Glass SQ VRB — no periodic multiple bonus', testNoPeriodicMultiple],
    ['Glass SQ VRB — pattern-loop interval target', testGlassIntervalTarget],
    ['Glass SQ VRB — looping cell PG valid', testLoopingPgValid],
    ['Glass SQ VRB — looping MI path', testGlassMiPath],
    ['Glass SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Glass SQ VRB — picker enabled (UI after Goldsmith)', testUiPickerGlass],
    ['Glass SQ VRB — sqLineVrbId routes glass', testSqLineRouting],
    ['Glass SQ VRB — philip_glass_film wired', testFilmStubWired],
    ['Glass SQ VRB — prior VRBs σ unchanged', testPriorVrbsUnchanged],
    ['Glass SQ VRB — fingerprintReceipts ≥35', testFingerprintReceiptCount],
    ['Glass SQ VRB — WORK_* receipt present', testFingerprintWorkReceipt],
    ['Glass SQ VRB — DIFF_* receipt present', testFingerprintDiffReceipt],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runGlassFilmStubVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
