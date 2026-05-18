/**
 * Cole Porter SQ VRB — σ=25 chromatic songbook profile verification.
 */

import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import { LINE_FIRST_DUO_ENGINE_VRB_ID_SET } from '../../goldenPath/lineFirstDuoEngineVrbIds';
import { GOLDSMITH_SQ_VRB_PROFILE } from './goldsmithFilmStubVrb';
import {
  COLE_PORTER_SQ_CONTRAPUNTAL_LINE_POLICY,
  COLE_PORTER_SQ_GCE_SCORER_ADJUSTMENTS,
  COLE_PORTER_SQ_VRB_PROFILE,
} from './colePorterSqVrb';
import { COLE_PORTER_VRB_FINGERPRINT_RECEIPTS } from './colePorterVrbFingerprints';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testSigma25(): boolean {
  return getSqVrbGceAdjustments('cole_porter')?.registerCohesionStdevCeilingSt === 25;
}

function testRegistryProfile(): boolean {
  return getSqVrbProfile('cole_porter') === COLE_PORTER_SQ_VRB_PROFILE;
}

function testVrbIdColePorter(): boolean {
  return getSqVrbProfile('cole_porter')?.vrbId === 'cole_porter';
}

function testParallelMotionAvoid(): boolean {
  return COLE_PORTER_SQ_CONTRAPUNTAL_LINE_POLICY.parallelMotionPolicy === 'avoid';
}

function testHarmonicRhythmMin1(): boolean {
  return getVoiceRuleBundle('cole_porter').harmonicRhythm.minChordDurationBars >= 1;
}

function testResolveParallelsTrue(): boolean {
  return getVoiceRuleBundle('cole_porter').repairPolicy.resolveParallels === true;
}

function testChromaticMediantCredit(): boolean {
  return (COLE_PORTER_SQ_GCE_SCORER_ADJUSTMENTS.chromaticMediantCredit ?? 0) >= 0.2;
}

function testAuthenticCadenceCredit(): boolean {
  return (COLE_PORTER_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit ?? 0) >= 0.2;
}

function testSuppressFunctionalResolutionFalse(): boolean {
  return getVoiceRuleBundle('cole_porter').suppressFunctionalResolution === false;
}

function testReceiptCount(): boolean {
  return COLE_PORTER_VRB_FINGERPRINT_RECEIPTS.length >= 35;
}

function testWorkNightAndDay(): boolean {
  return COLE_PORTER_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_NIGHT_AND_DAY'));
}

function testWorkIGotYou(): boolean {
  return COLE_PORTER_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_I_GOT_YOU'));
}

function testDiffVsGershwin(): boolean {
  return COLE_PORTER_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_GERSHWIN'));
}

function testDiffVsGoldsmith(): boolean {
  return COLE_PORTER_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_GOLDSMITH'));
}

function testBbGoldsmithForward(): boolean {
  const b = getVoiceRuleBundle('cole_porter');
  return (
    b.bestBbStyle === GOLDSMITH_SQ_VRB_PROFILE.bestBbStyle &&
    b.secondaryBbStyle === GOLDSMITH_SQ_VRB_PROFILE.secondaryBbStyle &&
    b.cautionBbStyle === GOLDSMITH_SQ_VRB_PROFILE.cautionBbStyle
  );
}

function testBassChromaticDescent(): boolean {
  return getVoiceRuleBundle('cole_porter').bassPolicy.role === 'chromatic-descent-or-root';
}

function testMelodicMaxLeap14(): boolean {
  return getVoiceRuleBundle('cole_porter').melodicPolicy.maxLeapSemitones <= 14;
}

function testFormAaba(): boolean {
  return getVoiceRuleBundle('cole_porter').formPolicy.narrativeArc === 'aaba-or-extended-refrain';
}

function testSwingFeelFalse(): boolean {
  return getVoiceRuleBundle('cole_porter').swingFeel === false;
}

function testNotLineFirstDuo(): boolean {
  return !LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has('cole_porter');
}

function testSigmaBetweenGoldsmithWilliams(): boolean {
  const cp = getSqVrbGceAdjustments('cole_porter')?.registerCohesionStdevCeilingSt;
  const gs = getSqVrbGceAdjustments('goldsmith')?.registerCohesionStdevCeilingSt;
  const wi = getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt;
  return cp === 25 && gs === 24 && wi === 26 && cp! > gs! && cp! < wi!;
}

function testSqVrbProfileIdWired(): boolean {
  return getVoiceRuleBundle('cole_porter').sqVrbProfileId === 'cole_porter';
}

function testHalfStepApproachCredit(): boolean {
  return (COLE_PORTER_SQ_GCE_SCORER_ADJUSTMENTS.halfStepApproachCredit ?? 0) >= 0.2;
}

function testSequentialAscentCredit(): boolean {
  return (COLE_PORTER_SQ_GCE_SCORER_ADJUSTMENTS.sequentialAscentCredit ?? 0) >= 0.2;
}

function testLowDominantPenalty(): boolean {
  return (COLE_PORTER_SQ_GCE_SCORER_ADJUSTMENTS.dominantResolutionPenalty ?? 1) <= 0.1;
}

function testPriorSigmaUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('glass')?.registerCohesionStdevCeilingSt === 18 &&
    getSqVrbGceAdjustments('satie')?.registerCohesionStdevCeilingSt === 19 &&
    getSqVrbGceAdjustments('goldsmith')?.registerCohesionStdevCeilingSt === 24 &&
    getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('webern')?.registerCohesionStdevCeilingSt === 40
  );
}

export function runColePorterVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Porter VRB — σ ceiling 25 st', testSigma25],
    ['Porter VRB — registry profile', testRegistryProfile],
    ['Porter VRB — vrbId cole_porter', testVrbIdColePorter],
    ['Porter VRB — parallelMotionPolicy avoid', testParallelMotionAvoid],
    ['Porter VRB — harmonicRhythm min >= 1 bar', testHarmonicRhythmMin1],
    ['Porter VRB — repairPolicy resolveParallels true', testResolveParallelsTrue],
    ['Porter VRB — chromaticMediantCredit present', testChromaticMediantCredit],
    ['Porter VRB — authenticCadenceCredit present', testAuthenticCadenceCredit],
    ['Porter VRB — suppressFunctionalResolution false', testSuppressFunctionalResolutionFalse],
    ['Porter VRB — fingerprintReceipts >= 35', testReceiptCount],
    ['Porter VRB — WORK_NIGHT_AND_DAY receipt', testWorkNightAndDay],
    ['Porter VRB — WORK_I_GOT_YOU receipt', testWorkIGotYou],
    ['Porter VRB — DIFF_VS_GERSHWIN receipt', testDiffVsGershwin],
    ['Porter VRB — DIFF_VS_GOLDSMITH receipt', testDiffVsGoldsmith],
    ['Porter VRB — bbCompatibility goldsmith-forward', testBbGoldsmithForward],
    ['Porter VRB — bassPolicy chromatic descent', testBassChromaticDescent],
    ['Porter VRB — melodicPolicy maxLeap <= 14', testMelodicMaxLeap14],
    ['Porter VRB — formPolicy AABA', testFormAaba],
    ['Porter VRB — swingFeel false', testSwingFeelFalse],
    ['Porter VRB — not in LINE_FIRST_DUO_ENGINE_VRB_IDS', testNotLineFirstDuo],
    ['Porter VRB — σ between goldsmith(24) and williams(26)', testSigmaBetweenGoldsmithWilliams],
    ['Porter VRB — sqVrbProfileId wired', testSqVrbProfileIdWired],
    ['Porter VRB — halfStepApproachCredit', testHalfStepApproachCredit],
    ['Porter VRB — sequentialAscentCredit', testSequentialAscentCredit],
    ['Porter VRB — low dominantResolutionPenalty', testLowDominantPenalty],
    ['Porter VRB — prior VRB σ unchanged', testPriorSigmaUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runColePorterVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
