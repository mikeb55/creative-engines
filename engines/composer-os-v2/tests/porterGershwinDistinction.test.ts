/**
 * Porter vs Gershwin fine-grain — swing intensity + anticipation distinction.
 */

import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import { SQ_SWING_RHYTHM_BY_VRB_ID } from '../core/counterpoint/vrbProfiles/sqSwingRhythm';
import { rhythmExpectationForVrb } from '../core/gce/gceAutoScorers';

function testColePorterSwingIntensity(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.swingIntensity === 0.52;
}

function testGershwinSwingIntensity(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.gershwin.swingIntensity === 0.65;
}

function testIntensityGap013(): boolean {
  const gap =
    SQ_SWING_RHYTHM_BY_VRB_ID.gershwin.swingIntensity -
    SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.swingIntensity;
  return gap === 0.13 && gap >= 0.1;
}

function testColePorterSwingStyleConcert(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.swingStyle === 'concert';
}

function testGershwinSwingStyleConcert(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.gershwin.swingStyle === 'concert';
}

function testTurtleIslandIntensityUnchanged(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.turtle_island.swingIntensity === 0.8;
}

function testColePorterAnticipationMax(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.cole_porter.anticipationRateMax === 0.1;
}

function testGershwinAnticipationMax(): boolean {
  return SQ_SWING_RHYTHM_BY_VRB_ID.gershwin.anticipationRateMax === 0.14;
}

function testRhythmExpColePorterAnticipation(): boolean {
  return rhythmExpectationForVrb('cole_porter')?.anticipationRateMax === 0.1;
}

function testRhythmExpGershwinAnticipation(): boolean {
  return rhythmExpectationForVrb('gershwin')?.anticipationRateMax === 0.14;
}

function testBundlePorterLessThanGershwin(): boolean {
  const p = getVoiceRuleBundle('cole_porter').swingIntensity ?? 0;
  const g = getVoiceRuleBundle('gershwin').swingIntensity ?? 0;
  return p < g && g - p >= 0.1;
}

export function runPorterGershwinDistinctionTests(): { name: string; ok: boolean }[] {
  return [
    ['Porter/Gershwin — cole_porter swingIntensity 0.52', testColePorterSwingIntensity],
    ['Porter/Gershwin — gershwin swingIntensity 0.65', testGershwinSwingIntensity],
    ['Porter/Gershwin — intensity gap 0.13 (>= 0.10)', testIntensityGap013],
    ['Porter/Gershwin — cole_porter swingStyle concert', testColePorterSwingStyleConcert],
    ['Porter/Gershwin — gershwin swingStyle concert', testGershwinSwingStyleConcert],
    ['Porter/Gershwin — turtle_island swingIntensity 0.80', testTurtleIslandIntensityUnchanged],
    ['Porter/Gershwin — cole_porter anticipationRateMax 0.10', testColePorterAnticipationMax],
    ['Porter/Gershwin — gershwin anticipationRateMax 0.14', testGershwinAnticipationMax],
    ['Porter/Gershwin — rhythmExpectation cole_porter anticipation 0.10', testRhythmExpColePorterAnticipation],
    ['Porter/Gershwin — rhythmExpectation gershwin anticipation 0.14', testRhythmExpGershwinAnticipation],
    ['Porter/Gershwin — bundle porter swing < gershwin gap >= 0.10', testBundlePorterLessThanGershwin],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
