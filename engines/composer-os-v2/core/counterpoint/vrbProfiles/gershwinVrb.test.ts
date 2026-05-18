/**
 * George Gershwin SQ VRB — σ=27 jazz-concert profile verification.
 */

import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import { LINE_FIRST_DUO_ENGINE_VRB_ID_SET } from '../../goldenPath/lineFirstDuoEngineVrbIds';
import {
  GERSHWIN_SQ_CONTRAPUNTAL_LINE_POLICY,
  GERSHWIN_SQ_GCE_SCORER_ADJUSTMENTS,
  GERSHWIN_SQ_VRB_PROFILE,
} from './gershwinSqVrb';
import { GERSHWIN_VRB_FINGERPRINT_RECEIPTS } from './gershwinVrbFingerprints';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testSigma27(): boolean {
  return getSqVrbGceAdjustments('gershwin')?.registerCohesionStdevCeilingSt === 27;
}

function testRegistryProfile(): boolean {
  return getSqVrbProfile('gershwin') === GERSHWIN_SQ_VRB_PROFILE;
}

function testVrbIdGershwin(): boolean {
  return getSqVrbProfile('gershwin')?.vrbId === 'gershwin';
}

function testParallelMotionAvoid(): boolean {
  return GERSHWIN_SQ_CONTRAPUNTAL_LINE_POLICY.parallelMotionPolicy === 'avoid';
}

function testHarmonicRhythmMin1(): boolean {
  return getVoiceRuleBundle('gershwin').harmonicRhythm.minChordDurationBars >= 1;
}

function testResolveParallelsTrue(): boolean {
  return getVoiceRuleBundle('gershwin').repairPolicy.resolveParallels === true;
}

function testJazzExtensionCredit(): boolean {
  return (GERSHWIN_SQ_GCE_SCORER_ADJUSTMENTS.jazzExtensionCredit ?? 0) >= 0.2;
}

function testAuthenticCadenceCredit(): boolean {
  return (GERSHWIN_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadenceCredit ?? 0) >= 0.2;
}

function testChromaticMediantCredit(): boolean {
  return (GERSHWIN_SQ_GCE_SCORER_ADJUSTMENTS.chromaticMediantCredit ?? 0) >= 0.2;
}

function testSuppressFunctionalResolutionFalse(): boolean {
  return getVoiceRuleBundle('gershwin').suppressFunctionalResolution === false;
}

function testReceiptCount(): boolean {
  return GERSHWIN_VRB_FINGERPRINT_RECEIPTS.length >= 35;
}

function testWorkRhapsodyInBlue(): boolean {
  return GERSHWIN_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_RHAPSODY_IN_BLUE'));
}

function testWorkIGotRhythm(): boolean {
  return GERSHWIN_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_I_GOT_RHYTHM'));
}

function testWorkSummertime(): boolean {
  return GERSHWIN_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_SUMMERTIME'));
}

function testDiffVsPorter(): boolean {
  return GERSHWIN_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_PORTER'));
}

function testDiffVsWilliams(): boolean {
  return GERSHWIN_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_WILLIAMS'));
}

function testBbSchneider(): boolean {
  return getVoiceRuleBundle('gershwin').bestBbStyle === 'schneider';
}

function testBassWalking(): boolean {
  return getVoiceRuleBundle('gershwin').bassPolicy.role === 'walking-or-symphonic';
}

function testMelodicMaxLeap14(): boolean {
  return getVoiceRuleBundle('gershwin').melodicPolicy.maxLeapSemitones <= 14;
}

function testFormAabaRhapsody(): boolean {
  return getVoiceRuleBundle('gershwin').formPolicy.narrativeArc === 'aaba-or-rhapsody';
}

function testSwingFeelFalse(): boolean {
  return getVoiceRuleBundle('gershwin').swingFeel === false;
}

function testNotLineFirstDuo(): boolean {
  return !LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has('gershwin');
}

function testSigmaBetweenPorterShostakovich(): boolean {
  const gw = getSqVrbGceAdjustments('gershwin')?.registerCohesionStdevCeilingSt;
  const cp = getSqVrbGceAdjustments('cole_porter')?.registerCohesionStdevCeilingSt;
  const sh = getSqVrbGceAdjustments('shostakovich')?.registerCohesionStdevCeilingSt;
  return gw === 27 && cp === 25 && sh === 28 && gw! > cp! && gw! < sh!;
}

function testSqVrbProfileIdWired(): boolean {
  return getVoiceRuleBundle('gershwin').sqVrbProfileId === 'gershwin';
}

function testHalfStepApproachCredit(): boolean {
  return (GERSHWIN_SQ_GCE_SCORER_ADJUSTMENTS.halfStepApproachCredit ?? 0) >= 0.2;
}

function testLowDominantPenalty(): boolean {
  return (GERSHWIN_SQ_GCE_SCORER_ADJUSTMENTS.dominantResolutionPenalty ?? 1) <= 0.1;
}

function testBundleFlags(): boolean {
  const b = getVoiceRuleBundle('gershwin');
  return (
    b.jazzExtensionEnabled === true &&
    b.bluesColourEnabled === true &&
    b.rhythmChangesEnabled === true
  );
}

function testPriorSigmaUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('cole_porter')?.registerCohesionStdevCeilingSt === 25 &&
    getSqVrbGceAdjustments('williams')?.registerCohesionStdevCeilingSt === 26 &&
    getSqVrbGceAdjustments('shostakovich')?.registerCohesionStdevCeilingSt === 28 &&
    getSqVrbGceAdjustments('webern')?.registerCohesionStdevCeilingSt === 40
  );
}

export function runGershwinVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Gershwin VRB — σ ceiling 27 st', testSigma27],
    ['Gershwin VRB — registry profile', testRegistryProfile],
    ['Gershwin VRB — vrbId gershwin', testVrbIdGershwin],
    ['Gershwin VRB — parallelMotionPolicy avoid', testParallelMotionAvoid],
    ['Gershwin VRB — harmonicRhythm min >= 1 bar', testHarmonicRhythmMin1],
    ['Gershwin VRB — repairPolicy resolveParallels true', testResolveParallelsTrue],
    ['Gershwin VRB — jazzExtensionCredit present', testJazzExtensionCredit],
    ['Gershwin VRB — authenticCadenceCredit present', testAuthenticCadenceCredit],
    ['Gershwin VRB — chromaticMediantCredit present', testChromaticMediantCredit],
    ['Gershwin VRB — suppressFunctionalResolution false', testSuppressFunctionalResolutionFalse],
    ['Gershwin VRB — fingerprintReceipts >= 35', testReceiptCount],
    ['Gershwin VRB — WORK_RHAPSODY_IN_BLUE receipt', testWorkRhapsodyInBlue],
    ['Gershwin VRB — WORK_I_GOT_RHYTHM receipt', testWorkIGotRhythm],
    ['Gershwin VRB — WORK_SUMMERTIME receipt', testWorkSummertime],
    ['Gershwin VRB — DIFF_VS_PORTER receipt', testDiffVsPorter],
    ['Gershwin VRB — DIFF_VS_WILLIAMS receipt', testDiffVsWilliams],
    ['Gershwin VRB — bbCompatibility schneider', testBbSchneider],
    ['Gershwin VRB — bassPolicy walking', testBassWalking],
    ['Gershwin VRB — melodicPolicy maxLeap <= 14', testMelodicMaxLeap14],
    ['Gershwin VRB — formPolicy AABA + rhapsody', testFormAabaRhapsody],
    ['Gershwin VRB — swingFeel false', testSwingFeelFalse],
    ['Gershwin VRB — not in LINE_FIRST_DUO_ENGINE_VRB_IDS', testNotLineFirstDuo],
    ['Gershwin VRB — σ between cole_porter(25) and shostakovich(28)', testSigmaBetweenPorterShostakovich],
    ['Gershwin VRB — sqVrbProfileId wired', testSqVrbProfileIdWired],
    ['Gershwin VRB — halfStepApproachCredit', testHalfStepApproachCredit],
    ['Gershwin VRB — low dominantResolutionPenalty', testLowDominantPenalty],
    ['Gershwin VRB — jazz/blues/rhythmChanges bundle flags', testBundleFlags],
    ['Gershwin VRB — prior VRB σ unchanged', testPriorSigmaUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runGershwinVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
