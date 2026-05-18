/**
 * Erik Satie SQ VRB — σ=19 furniture stasis profile verification.
 */

import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import { LINE_FIRST_DUO_ENGINE_VRB_ID_SET } from '../../goldenPath/lineFirstDuoEngineVrbIds';
import {
  SATIE_SQ_CHORD_VOCABULARY,
  SATIE_SQ_CONTRAPUNTAL_LINE_POLICY,
  SATIE_SQ_GCE_SCORER_ADJUSTMENTS,
  SATIE_SQ_VRB_PROFILE,
} from './satieSqVrb';
import { SATIE_VRB_FINGERPRINT_RECEIPTS } from './satieVrbFingerprints';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testSigma19(): boolean {
  return getSqVrbGceAdjustments('satie')?.registerCohesionStdevCeilingSt === 19;
}

function testRegistryProfile(): boolean {
  return getSqVrbProfile('satie') === SATIE_SQ_VRB_PROFILE;
}

function testVrbIdSatie(): boolean {
  return getSqVrbProfile('satie')?.vrbId === 'satie';
}

function testParallelMotionAllow(): boolean {
  return SATIE_SQ_CONTRAPUNTAL_LINE_POLICY.parallelMotionPolicy === 'allow';
}

function testHarmonicRhythmMin4(): boolean {
  return getVoiceRuleBundle('satie').harmonicRhythm.minChordDurationBars >= 4;
}

function testResolveParallelsFalse(): boolean {
  return getVoiceRuleBundle('satie').repairPolicy.resolveParallels === false;
}

function testParallelChordsEnabled(): boolean {
  return getVoiceRuleBundle('satie').parallelChordsEnabled === true;
}

function testNoSwing(): boolean {
  return getVoiceRuleBundle('satie').swingFeel === false;
}

function testFormStasis(): boolean {
  const f = getVoiceRuleBundle('satie').formPolicy;
  return f.stasisSurface === true && f.narrativeArc === 'non-teleological';
}

function testSuppressFunctionalResolution(): boolean {
  return getVoiceRuleBundle('satie').suppressFunctionalResolution === true;
}

function testReceiptCount(): boolean {
  return SATIE_VRB_FINGERPRINT_RECEIPTS.length >= 35;
}

function testWorkGymnopedie(): boolean {
  return SATIE_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_GYMNOPEDIE'));
}

function testWorkGnossienne(): boolean {
  return SATIE_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_GNOSSIENNE'));
}

function testDiffVsGlass(): boolean {
  return SATIE_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_GLASS'));
}

function testDiffVsRavel(): boolean {
  return SATIE_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_RAVEL'));
}

function testBbSchneider(): boolean {
  return getVoiceRuleBundle('satie').bestBbStyle === 'schneider';
}

function testBassPedalOrStatic(): boolean {
  const role = getVoiceRuleBundle('satie').bassPolicy.role;
  return role === 'pedal-or-static' || role === 'pedal-or-drone';
}

function testMelodicMaxLeap4(): boolean {
  return getVoiceRuleBundle('satie').melodicPolicy.maxLeapSemitones <= 4;
}

function testFurnitureMode(): boolean {
  return getVoiceRuleBundle('satie').furnitureModeEnabled === true;
}

function testSqVrbProfileIdWired(): boolean {
  return getVoiceRuleBundle('satie').sqVrbProfileId === 'satie';
}

function testVoicingNarrowSpread(): boolean {
  const v = getVoiceRuleBundle('satie').voicingPolicy;
  return v.minSpreadSemitones >= 12 && v.maxSpreadSemitones <= 18 && v.forbidParallelFifths === false;
}

function testNotLineFirstDuo(): boolean {
  return !LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has('satie');
}

function testGceHighCredits(): boolean {
  const g = SATIE_SQ_GCE_SCORER_ADJUSTMENTS;
  return (
    (g.parallelThirdSixthBonus ?? 0) >= 0.2 &&
    (g.inconclusiveEndingCredit ?? 0) >= 0.2 &&
    (g.dominantResolutionPenalty ?? 0) >= 0.2 &&
    (g.wallToWallPhrasePenalty ?? 1) === 0
  );
}

function testChordVocabulary(): boolean {
  const v = SATIE_SQ_CHORD_VOCABULARY;
  return (
    v.includes('triad_skeleton') &&
    v.includes('parallel_color_shift') &&
    v.includes('pandiatonic_chord') &&
    v.includes('dom7')
  );
}

function testPriorSigmaUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('glass')?.registerCohesionStdevCeilingSt === 18 &&
    getSqVrbGceAdjustments('rota')?.registerCohesionStdevCeilingSt === 19 &&
    getSqVrbGceAdjustments('ligeti')?.registerCohesionStdevCeilingSt === 32 &&
    getSqVrbGceAdjustments('webern')?.registerCohesionStdevCeilingSt === 40
  );
}

export function runSatieVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Satie VRB — σ ceiling 19 st', testSigma19],
    ['Satie VRB — registry profile', testRegistryProfile],
    ['Satie VRB — vrbId satie', testVrbIdSatie],
    ['Satie VRB — parallelMotionPolicy allow', testParallelMotionAllow],
    ['Satie VRB — harmonicRhythm min >= 4 bars', testHarmonicRhythmMin4],
    ['Satie VRB — repairPolicy resolveParallels false', testResolveParallelsFalse],
    ['Satie VRB — parallelChordsEnabled', testParallelChordsEnabled],
    ['Satie VRB — rhythmPolicy no swing', testNoSwing],
    ['Satie VRB — formPolicy stasis', testFormStasis],
    ['Satie VRB — suppressFunctionalResolution', testSuppressFunctionalResolution],
    ['Satie VRB — fingerprintReceipts >= 35', testReceiptCount],
    ['Satie VRB — WORK_GYMNOPEDIE receipt', testWorkGymnopedie],
    ['Satie VRB — WORK_GNOSSIENNE receipt', testWorkGnossienne],
    ['Satie VRB — DIFF_VS_GLASS receipt', testDiffVsGlass],
    ['Satie VRB — DIFF_VS_RAVEL receipt', testDiffVsRavel],
    ['Satie VRB — bestBbStyle schneider', testBbSchneider],
    ['Satie VRB — bassPolicy pedal or static', testBassPedalOrStatic],
    ['Satie VRB — melodicPolicy maxLeap <= 4', testMelodicMaxLeap4],
    ['Satie VRB — furnitureModeEnabled', testFurnitureMode],
    ['Satie VRB — sqVrbProfileId wired', testSqVrbProfileIdWired],
    ['Satie VRB — voicing narrow spread + parallel planing', testVoicingNarrowSpread],
    ['Satie VRB — not in LINE_FIRST_DUO_ENGINE_VRB_IDS', testNotLineFirstDuo],
    ['Satie VRB — GCE high parallel/modal/penalty credits', testGceHighCredits],
    ['Satie VRB — chord vocabulary', testChordVocabulary],
    ['Satie VRB — prior VRB σ unchanged', testPriorSigmaUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runSatieVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
