/**
 * Arvo Pärt SQ VRB — σ=16 tintinnabuli profile verification.
 */

import { rhythmExpectationForVrb } from '../../gce/gceAutoScorers';
import { getVoiceRuleBundle } from '../../composer/voiceRuleBundles';
import { LINE_FIRST_DUO_ENGINE_VRB_ID_SET } from '../../goldenPath/lineFirstDuoEngineVrbIds';
import {
  ARVO_PART_SQ_CHORD_VOCABULARY,
  ARVO_PART_SQ_CONTRAPUNTAL_LINE_POLICY,
  ARVO_PART_SQ_GCE_SCORER_ADJUSTMENTS,
  ARVO_PART_SQ_VRB_PROFILE,
} from './partSqVrb';
import { ARVO_PART_VRB_FINGERPRINT_RECEIPTS } from './partVrbFingerprints';
import { getSqVrbGceAdjustments, getSqVrbProfile } from './sqVrbProfileRegistry';

function testSigma16(): boolean {
  return getSqVrbGceAdjustments('arvo_part')?.registerCohesionStdevCeilingSt === 16;
}

function testRegistryProfile(): boolean {
  return getSqVrbProfile('arvo_part') === ARVO_PART_SQ_VRB_PROFILE;
}

function testMaxLeap3(): boolean {
  return getVoiceRuleBundle('arvo_part').melodicPolicy.maxLeapSemitones <= 3;
}

function testParallelMotionAllow(): boolean {
  return ARVO_PART_SQ_CONTRAPUNTAL_LINE_POLICY.parallelMotionPolicy === 'allow';
}

function testSuppressFunctionalResolution(): boolean {
  return getVoiceRuleBundle('arvo_part').suppressFunctionalResolution === true;
}

function testPhraseNonResolving(): boolean {
  return ARVO_PART_SQ_CONTRAPUNTAL_LINE_POLICY.phraseArticulation === 'non_resolving';
}

function testGceDominantPenalty(): boolean {
  return (ARVO_PART_SQ_GCE_SCORER_ADJUSTMENTS.dominantResolutionPenalty ?? 0) > 0;
}

function testGceSilenceBoundary(): boolean {
  return (ARVO_PART_SQ_GCE_SCORER_ADJUSTMENTS.silenceBoundaryCredit ?? 0) > 0;
}

function testGceBassPedal(): boolean {
  return (ARVO_PART_SQ_GCE_SCORER_ADJUSTMENTS.bassPedalCredit ?? 0) > 0;
}

function testGceInconclusiveEnding(): boolean {
  return (ARVO_PART_SQ_GCE_SCORER_ADJUSTMENTS.inconclusiveEndingCredit ?? 0) > 0;
}

function testGceAuthenticCadencePenalty(): boolean {
  return (ARVO_PART_SQ_GCE_SCORER_ADJUSTMENTS.authenticCadencePenalty ?? 0) > 0;
}

function testBbSchneider(): boolean {
  return getVoiceRuleBundle('arvo_part').bestBbStyle === 'schneider';
}

function testReceiptCount(): boolean {
  return ARVO_PART_VRB_FINGERPRINT_RECEIPTS.length >= 30;
}

function testWorkSpiegel(): boolean {
  return ARVO_PART_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_SPIEGEL_IM_SPIEGEL'));
}

function testWorkFratres(): boolean {
  return ARVO_PART_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_FRATRES'));
}

function testWorkFurAlina(): boolean {
  return ARVO_PART_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('WORK_FUR_ALINA'));
}

function testDiffVsGlass(): boolean {
  return ARVO_PART_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_GLASS'));
}

function testDiffVsSatie(): boolean {
  return ARVO_PART_VRB_FINGERPRINT_RECEIPTS.some((r) => r.includes('DIFF_VS_SATIE'));
}

function testNotLineFirstDuoArvoPart(): boolean {
  return !LINE_FIRST_DUO_ENGINE_VRB_ID_SET.has('arvo_part');
}

function testSigmaLowestInRegistry(): boolean {
  const arvo = getSqVrbGceAdjustments('arvo_part')?.registerCohesionStdevCeilingSt;
  if (arvo !== 16) return false;
  const ids = [
    'ravel',
    'herrmann',
    'morricone',
    'williams',
    'rota',
    'goldsmith',
    'glass',
    'zimmer',
    'badalamenti',
    'shostakovich',
    'webern',
    'joni_mitchell',
    'ligeti',
    'satie',
    'cole_porter',
    'gershwin',
  ] as const;
  return ids.every((id) => (getSqVrbGceAdjustments(id)?.registerCohesionStdevCeilingSt ?? 99) >= 16);
}

function testRhythmGrid(): boolean {
  return rhythmExpectationForVrb('arvo_part')?.placementMode === 'grid';
}

function testRhythmAnticipationMax(): boolean {
  return (rhythmExpectationForVrb('arvo_part')?.anticipationRateMax ?? 1) <= 0.02;
}

function testChordOpenFifth(): boolean {
  return ARVO_PART_SQ_CHORD_VOCABULARY.includes('modal_open_fifth');
}

function testChordTonicPedal(): boolean {
  return ARVO_PART_SQ_CHORD_VOCABULARY.includes('tonic_pedal');
}

function testPreferredFifth(): boolean {
  return ARVO_PART_SQ_CONTRAPUNTAL_LINE_POLICY.preferredIntervals?.includes(7) === true;
}

function testSigmaBelowGlass(): boolean {
  const arvo = getSqVrbGceAdjustments('arvo_part')?.registerCohesionStdevCeilingSt;
  const glass = getSqVrbGceAdjustments('glass')?.registerCohesionStdevCeilingSt;
  return arvo === 16 && glass === 18 && arvo < glass;
}

export function runArvoPartVrbTests(): { name: string; ok: boolean }[] {
  return [
    ['Arvo Pärt VRB — σ ceiling 16 st', testSigma16],
    ['Arvo Pärt VRB — registry profile arvo_part', testRegistryProfile],
    ['Arvo Pärt VRB — melodicPolicy maxLeap <= 3', testMaxLeap3],
    ['Arvo Pärt VRB — parallelMotionPolicy allow', testParallelMotionAllow],
    ['Arvo Pärt VRB — suppressFunctionalResolution', testSuppressFunctionalResolution],
    ['Arvo Pärt VRB — phraseArticulation non_resolving', testPhraseNonResolving],
    ['Arvo Pärt VRB — GCE dominantResolutionPenalty', testGceDominantPenalty],
    ['Arvo Pärt VRB — GCE silenceBoundaryCredit', testGceSilenceBoundary],
    ['Arvo Pärt VRB — GCE bassPedalCredit', testGceBassPedal],
    ['Arvo Pärt VRB — GCE inconclusiveEndingCredit', testGceInconclusiveEnding],
    ['Arvo Pärt VRB — GCE authenticCadencePenalty', testGceAuthenticCadencePenalty],
    ['Arvo Pärt VRB — bestBbStyle schneider', testBbSchneider],
    ['Arvo Pärt VRB — fingerprintReceipts >= 30', testReceiptCount],
    ['Arvo Pärt VRB — WORK_SPIEGEL_IM_SPIEGEL receipt', testWorkSpiegel],
    ['Arvo Pärt VRB — WORK_FRATRES receipt', testWorkFratres],
    ['Arvo Pärt VRB — WORK_FUR_ALINA receipt', testWorkFurAlina],
    ['Arvo Pärt VRB — DIFF_VS_GLASS receipt', testDiffVsGlass],
    ['Arvo Pärt VRB — DIFF_VS_SATIE receipt', testDiffVsSatie],
    ['Arvo Pärt VRB — arvo_part not in LINE_FIRST_DUO_ENGINE_VRB_IDS', testNotLineFirstDuoArvoPart],
    ['Arvo Pärt VRB — σ=16 lowest in registry (below glass 18)', testSigmaBelowGlass],
    ['Arvo Pärt VRB — rhythmExpectation grid placement', testRhythmGrid],
    ['Arvo Pärt VRB — rhythmExpectation anticipationRateMax <= 0.02', testRhythmAnticipationMax],
    ['Arvo Pärt VRB — chordVocabulary modal_open_fifth', testChordOpenFifth],
    ['Arvo Pärt VRB — chordVocabulary tonic_pedal', testChordTonicPedal],
    ['Arvo Pärt VRB — preferredIntervals includes fifth (7)', testPreferredFifth],
    ['Arvo Pärt VRB — σ floor 16 across prior 16 registry VRBs', testSigmaLowestInRegistry],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}

if (require.main === module) {
  const rows = runArvoPartVrbTests();
  let bad = 0;
  for (const r of rows) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}: ${r.name}`);
    if (!r.ok) bad++;
  }
  process.exit(bad > 0 ? 1 : 0);
}
