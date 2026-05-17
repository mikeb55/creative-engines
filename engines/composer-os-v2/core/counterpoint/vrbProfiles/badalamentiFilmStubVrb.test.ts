/**
 * Angelo Badalamenti film stub SQ VRB — Session Harmonic Voice verification.
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
  BADALAMENTI_SQ_CHORD_VOCABULARY,
  BADALAMENTI_SQ_CONTRAPUNTAL_LINE_POLICY,
  BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS,
  BADALAMENTI_SQ_VRB_PROFILE,
  BADALAMENTI_THREE_TIER_TEXTURE,
} from './badalamentiFilmStubVrb';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testProfileLoads(): boolean {
  return getSqVrbProfile('badalamenti') === BADALAMENTI_SQ_VRB_PROFILE;
}

function testContrapuntalPolicy(): boolean {
  const p = BADALAMENTI_SQ_CONTRAPUNTAL_LINE_POLICY;
  return (
    p.enabled === true &&
    p.vrbId === 'badalamenti' &&
    p.independenceLevel === 'low' &&
    p.registerPolicy === 'mid_register_chromatic_inner_compression' &&
    p.phraseArticulation === 'through_composed_arch_no_cadence' &&
    p.imitationStyle === 'climactic_synthesis'
  );
}

function testThreeTierTexture(): boolean {
  const t = BADALAMENTI_SQ_VRB_PROFILE.badalamentiThreeTierTexture;
  return (
    t === BADALAMENTI_THREE_TIER_TEXTURE &&
    t.melodyLine === 'vln_i_lead' &&
    t.innerVoices === 'chromatic_jazz_extensions' &&
    t.bassLine === 'pedal_anchor'
  );
}

function testChordVocabulary(): boolean {
  const v = BADALAMENTI_SQ_CHORD_VOCABULARY;
  return (
    v.includes('modal_aeolian') &&
    v.includes('dom7') &&
    v.includes('dom9') &&
    v.includes('chromatic_mediants') &&
    v.includes('lydian_IV')
  );
}

function testBestBbStyles(): boolean {
  const b = getVoiceRuleBundle('badalamenti');
  return b.bestBbStyle === 'schneider' && b.secondaryBbStyle === 'brookmeyer';
}

function testGceSigma21(): boolean {
  return getSqVrbGceAdjustments('badalamenti')?.registerCohesionStdevCeilingSt === 21;
}

function testPhraseCellBarsRange(): boolean {
  const adj = getSqVrbGceAdjustments('badalamenti');
  return adj?.phraseCellBarsMin === 16 && adj?.phraseCellBarsMax === 20;
}

function testNoAuthenticCadence(): boolean {
  return (BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit ?? 1) === 0;
}

function testJazzExtensionCredit(): boolean {
  return (BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS.jazzExtensionCredit ?? 0) > 0;
}

function testBassPedalCredit(): boolean {
  return (BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS.bassPedalCredit ?? 0) > 0;
}

function testCodaDissolutionCredit(): boolean {
  return (BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS.codaDissolutionCredit ?? 0) > 0;
}

function testModalEndingsValid(): boolean {
  return BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS.modalEndingsValid === true;
}

function testNoPeriodicMultiple(): boolean {
  return BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS.phrasePeriodBars === 0;
}

function testWallToWallSuppressed(): boolean {
  return BADALAMENTI_SQ_GCE_SCORER_ADJUSTMENTS.wallToWallPhrasePenalty === 0;
}

function buildArchLine(): MelodicNote[] {
  const line: MelodicNote[] = [];
  let p = 60;
  const steps = [2, 1, 2, 2, 3, 2, 1, 2, -1, 2, 1, 2, 2, 1, -2, 1];
  for (let i = 0; i < 64; i++) {
    line.push({
      midi: p,
      bar: Math.floor(i / 4) + 1,
      beat: (i % 4) + 1,
      beats: 1,
      rest: false,
    });
    p += steps[i % steps.length]!;
  }
  return line;
}

function testThroughComposedPgValid(): boolean {
  const line = buildArchLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 16, cadenceStrength: 'weak' as const },
    { startBeat: 16, endBeat: 32, cadenceStrength: 'medium' as const },
    { startBeat: 32, endBeat: 48, cadenceStrength: 'medium' as const },
    { startBeat: 48, endBeat: 64, cadenceStrength: 'weak' as const },
  ];
  const pg = scorePhraseGrammar(line, {
    contrapuntalLinePolicy: true,
    sqVrbId: 'badalamenti',
    mesoSpans,
    cadenceTags: [{ positionBars: 64, type: 'modal', strength: 'weak' }],
  });
  return pg.score >= 6 && pg.justification.includes('[SQ badalamenti PG]');
}

function testBadalamentiMiPath(): boolean {
  const line = buildArchLine();
  const mesoSpans = [
    { startBeat: 0, endBeat: 16, cadenceStrength: 'weak' as const },
    { startBeat: 16, endBeat: 32, cadenceStrength: 'medium' as const },
    { startBeat: 32, endBeat: 48, cadenceStrength: 'medium' as const },
    { startBeat: 48, endBeat: 64, cadenceStrength: 'weak' as const },
  ];
  const mi = scoreMelodicIdentity(line, 'badalamenti', {
    contrapuntalLinePolicy: true,
    sqVrbId: 'badalamenti',
    mesoSpans,
    cadenceTags: [],
  });
  return mi.score >= 6.5 && mi.justification.includes('[SQ badalamenti MI]');
}

function testPriorVrbsUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('glass')?.registerCohesionStdevCeilingSt === 18 &&
    getSqVrbGceAdjustments('rota')?.registerCohesionStdevCeilingSt === 19 &&
    getSqVrbGceAdjustments('ravel')?.registerCohesionStdevCeilingSt === 20 &&
    getSqVrbGceAdjustments('morricone')?.registerCohesionStdevCeilingSt === 22 &&
    getSqVrbGceAdjustments('goldsmith')?.registerCohesionStdevCeilingSt === 24 &&
    getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('zimmer')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36
  );
}

function testPickerEnabled(): boolean {
  return SQ_TO_BB_SQ_COMPOSER_ENABLED.has('badalamenti');
}

function testUiPickerBadalamenti(): boolean {
  const uiPath = join(
    __dirname,
    '../../../../../apps/composer-os-app/src/types/sqToBbWorkflowUi.ts',
  );
  const src = readFileSync(uiPath, 'utf8');
  return (
    src.includes("id: 'badalamenti', label: 'Badalamenti', enabled: true") &&
    src.indexOf("'badalamenti'") > src.indexOf("'zimmer'")
  );
}

function testSqLineRouting(): boolean {
  return sqLineVrbIdForSqToBb('badalamenti', 'schneider') === 'badalamenti';
}

function testBundleWired(): boolean {
  return (
    getVoiceRuleBundle('angelo_badalamenti').sqVrbProfileId === 'badalamenti' &&
    getVoiceRuleBundle('badalamenti').sqVrbProfileId === 'badalamenti'
  );
}

export function runBadalamentiFilmStubVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Badalamenti SQ VRB — profile loads', testProfileLoads],
    ['Badalamenti SQ VRB — contrapuntalLinePolicy.enabled + vrbId', testContrapuntalPolicy],
    ['Badalamenti SQ VRB — independenceLevel low', () =>
      BADALAMENTI_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'low'],
    ['Badalamenti SQ VRB — registerPolicy mid_register_chromatic_inner_compression', () =>
      BADALAMENTI_SQ_CONTRAPUNTAL_LINE_POLICY.registerPolicy ===
      'mid_register_chromatic_inner_compression'],
    [
      'Badalamenti SQ VRB — phraseArticulation through_composed_arch_no_cadence',
      () =>
        BADALAMENTI_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation ===
        'through_composed_arch_no_cadence',
    ],
    ['Badalamenti SQ VRB — three-tier texture documented', testThreeTierTexture],
    ['Badalamenti SQ VRB — chord vocabulary aeolian jazz mediants', testChordVocabulary],
    ['Badalamenti SQ VRB — bestBbStyle schneider secondary brookmeyer', testBestBbStyles],
    ['Badalamenti SQ VRB — GCE σ ceiling 21 st', testGceSigma21],
    ['Badalamenti SQ VRB — phraseCellBars 16–20', testPhraseCellBarsRange],
    ['Badalamenti SQ VRB — authenticCadenceCredit 0', testNoAuthenticCadence],
    ['Badalamenti SQ VRB — jazzExtensionCredit', testJazzExtensionCredit],
    ['Badalamenti SQ VRB — bassPedalCredit', testBassPedalCredit],
    ['Badalamenti SQ VRB — codaDissolutionCredit', testCodaDissolutionCredit],
    ['Badalamenti SQ VRB — modalEndingsValid', testModalEndingsValid],
    ['Badalamenti SQ VRB — no periodic multiple bonus', testNoPeriodicMultiple],
    ['Badalamenti SQ VRB — wallToWallPhrasePenalty suppressed', testWallToWallSuppressed],
    ['Badalamenti SQ VRB — through-composed arch PG valid', testThroughComposedPgValid],
    ['Badalamenti SQ VRB — cool-jazz MI path', testBadalamentiMiPath],
    ['Badalamenti SQ VRB — picker enabled (engine)', testPickerEnabled],
    ['Badalamenti SQ VRB — picker enabled (UI after Zimmer)', testUiPickerBadalamenti],
    ['Badalamenti SQ VRB — sqLineVrbId routes badalamenti', testSqLineRouting],
    ['Badalamenti SQ VRB — voiceRuleBundle wired', testBundleWired],
    ['Badalamenti SQ VRB — prior VRBs σ unchanged', testPriorVrbsUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runBadalamentiFilmStubVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
