/**
 * Ligeti SQ VRB — σ=32 micropolyphonic profile verification.
 */

import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import { LINE_FIRST_DUO_ENGINE_VRB_ID_SET } from '../../goldenPath/lineFirstDuoEngineVrbIds';
import {
  LIGETI_SQ_CONTRAPUNTAL_LINE_POLICY,
  LIGETI_SQ_GCE_SCORER_ADJUSTMENTS,
  LIGETI_SQ_VRB_PROFILE,
} from './ligetiSqVrb';
import { LIGETI_VRB_FINGERPRINT_RECEIPTS } from './ligetiVrbFingerprints';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testSigma32(): boolean {
  return getSqVrbGceAdjustments('ligeti')?.registerCohesionStdevCeilingSt === 32;
}

function testRegistryProfile(): boolean {
  return getSqVrbProfile('ligeti') === LIGETI_SQ_VRB_PROFILE;
}

function testContrapuntalEnabled(): boolean {
  return getVoiceRuleBundle('ligeti').contrapuntalLinePolicy?.enabled === true;
}

function testIndependenceHigh(): boolean {
  return LIGETI_SQ_CONTRAPUNTAL_LINE_POLICY.independenceLevel === 'high';
}

function testHarmonicRhythmMin4(): boolean {
  const b = getVoiceRuleBundle('ligeti');
  return b.harmonicRhythm.minChordDurationBars >= 4;
}

function testVoicingNoDoubling(): boolean {
  return getVoiceRuleBundle('ligeti').voicingPolicy.forbidOctaveDoubling === true;
}

function testAntiMetric(): boolean {
  return getVoiceRuleBundle('ligeti').rhythmPolicy.antiMetric === true;
}

function testNoCadentialRelease(): boolean {
  return getVoiceRuleBundle('ligeti').formPolicy.noCadentialRelease === true;
}

function testResolveParallelsFalse(): boolean {
  return getVoiceRuleBundle('ligeti').repairPolicy.resolveParallels === false;
}

function testReceiptCount(): boolean {
  return LIGETI_VRB_FINGERPRINT_RECEIPTS.length >= 35;
}

function testWorkAtmospheres(): boolean {
  return LIGETI_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_ATMOSPHERES'));
}

function testWorkLuxAeterna(): boolean {
  return LIGETI_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_LUX_AETERNA'));
}

function testDiffWebern(): boolean {
  return LIGETI_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_WEBERN'));
}

function testDiffGlass(): boolean {
  return LIGETI_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_GLASS'));
}

function testBbSchneider(): boolean {
  return getVoiceRuleBundle('ligeti').bestBbStyle === 'schneider';
}

function testBassRegistralBoundary(): boolean {
  return getVoiceRuleBundle('ligeti').bassPolicy.role === 'registral_boundary';
}

function testMelodicPreferredIc1(): boolean {
  const m = getVoiceRuleBundle('ligeti').melodicPolicy;
  return (
    Boolean(m.preferredIntervals?.includes(1)) ||
    Boolean(m.preferredIntervalSets?.includes(1))
  );
}

function testGoldenMeanClimax(): boolean {
  return getVoiceRuleBundle('ligeti').formPolicy.goldenMeanClimax === true;
}

function testGceClusterOverCadential(): boolean {
  const g = LIGETI_SQ_GCE_SCORER_ADJUSTMENTS;
  return (
    (g.chromaticClusterCredit ?? 0) > (g.cadentialResolutionPenalty ?? 1) &&
    (g.chromaticClusterCredit ?? 0) > 0
  );
}

function testNotLineFirstDuo(): boolean {
  return !LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has('ligeti');
}

function testPhaseDisplacement(): boolean {
  return getVoiceRuleBundle('ligeti').rhythmPolicy.phaseDisplacement === true;
}

function testParallelMotionAllow(): boolean {
  return getVoiceRuleBundle('ligeti').contrapuntalLinePolicy?.parallelMotionPolicy === 'allow';
}

function testPitchFieldSubstrate(): boolean {
  return LIGETI_SQ_VRB_PROFILE.harmonicSubstrate === 'pitch-field-spine';
}

function testPitchFieldGoverned(): boolean {
  return getVoiceRuleBundle('ligeti').pitchFieldGoverned === true;
}

function testStasisSurface(): boolean {
  return getVoiceRuleBundle('ligeti').formPolicy.stasisSurface === true;
}

function testPriorSigmaUnchanged(): boolean {
  return (
    getSqVrbGceAdjustments('shostakovich')?.registerCohesionStdevCeilingSt === 28 &&
    getSqVrbGceAdjustments('herrmann')?.registerCohesionStdevCeilingSt === 36 &&
    getSqVrbGceAdjustments('webern')?.registerCohesionStdevCeilingSt === 40
  );
}

export function runLigetiVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Ligeti VRB — σ ceiling 32 st', testSigma32],
    ['Ligeti VRB — registry profile', testRegistryProfile],
    ['Ligeti VRB — contrapuntalLinePolicy.enabled', testContrapuntalEnabled],
    ['Ligeti VRB — independenceLevel high', testIndependenceHigh],
    ['Ligeti VRB — harmonicRhythm min >= 4 bars', testHarmonicRhythmMin4],
    ['Ligeti VRB — voicing forbidOctaveDoubling', testVoicingNoDoubling],
    ['Ligeti VRB — rhythmPolicy.antiMetric', testAntiMetric],
    ['Ligeti VRB — formPolicy noCadentialRelease', testNoCadentialRelease],
    ['Ligeti VRB — repairPolicy resolveParallels false', testResolveParallelsFalse],
    ['Ligeti VRB — fingerprintReceipts >= 35', testReceiptCount],
    ['Ligeti VRB — WORK_ATMOSPHERES receipt', testWorkAtmospheres],
    ['Ligeti VRB — WORK_LUX_AETERNA receipt', testWorkLuxAeterna],
    ['Ligeti VRB — DIFF_VS_WEBERN receipt', testDiffWebern],
    ['Ligeti VRB — DIFF_VS_GLASS receipt', testDiffGlass],
    ['Ligeti VRB — bestBbStyle schneider', testBbSchneider],
    ['Ligeti VRB — bassPolicy registral_boundary', testBassRegistralBoundary],
    ['Ligeti VRB — melodic ic1 preference', testMelodicPreferredIc1],
    ['Ligeti VRB — formPolicy goldenMeanClimax', testGoldenMeanClimax],
    ['Ligeti VRB — GCE clusterCredit > cadentialPenalty', testGceClusterOverCadential],
    ['Ligeti VRB — not in LINE_FIRST_DUO_ENGINE_VRB_IDS', testNotLineFirstDuo],
    ['Ligeti VRB — rhythmPolicy phaseDisplacement', testPhaseDisplacement],
    ['Ligeti VRB — parallelMotionPolicy allow', testParallelMotionAllow],
    ['Ligeti VRB — harmonicSubstrate pitch-field-spine', testPitchFieldSubstrate],
    ['Ligeti VRB — pitchFieldGoverned true', testPitchFieldGoverned],
    ['Ligeti VRB — formPolicy stasisSurface', testStasisSurface],
    ['Ligeti VRB — prior VRB σ unchanged', testPriorSigmaUnchanged],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runLigetiVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
