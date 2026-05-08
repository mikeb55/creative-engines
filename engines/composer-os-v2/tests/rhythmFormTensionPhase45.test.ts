/**
 * Phase 4+5 — additive: RhythmDNA binding, form controller, tension scheduler.
 */

import { getVoiceRuleBundle } from '../core/composer/voiceRuleBundles';
import {
  antiMetricPenaltyForCell,
  coltraneAllowsTiedSyncopationCell,
  mingusShoutInjectActive,
} from '../core/composer/rhythmDnaMotifBinder';
import {
  buildFormSections,
  formDevelopmentSectionHasRisingTension,
  freeFormAvoidsSteepArc,
  mingusSuiteHasCollectiveImprovThird,
} from '../core/composer/formController';
import { interpolateTensionForBarRange, voicingColorForTension } from '../core/composer/tensionScheduler';

function testThreadgillAntiMetricPenaltyOnBeat(): boolean {
  const th = getVoiceRuleBundle('henry_threadgill');
  return antiMetricPenaltyForCell('rd_quarter_on_1', th) === 55;
}

function testMingusShoutAfterThreshold(): boolean {
  const m = getVoiceRuleBundle('charles_mingus');
  return mingusShoutInjectActive(25, m) && !mingusShoutInjectActive(23, m);
}

function testColtraneTieAcrossAllowed(): boolean {
  const c = getVoiceRuleBundle('john_coltrane');
  return coltraneAllowsTiedSyncopationCell('rd_tie_across_bar', c);
}

function testGilEvansContinuousCurveDevelopmentRises(): boolean {
  const g = getVoiceRuleBundle('gil_evans');
  const sections = buildFormSections({ totalBars: 32, sections: [{ label: 'A', startBar: 1, length: 32 }] }, g);
  return formDevelopmentSectionHasRisingTension(sections);
}

function testMingusCollectiveImprovThirdSection(): boolean {
  const m = getVoiceRuleBundle('charles_mingus');
  const sections = buildFormSections({ totalBars: 40, sections: [{ label: 'A', startBar: 1, length: 40 }] }, m);
  return mingusSuiteHasCollectiveImprovThird(sections);
}

function testShorterFreeNoSteepArc(): boolean {
  const w = getVoiceRuleBundle('wayne_shorter');
  const sections = buildFormSections({ totalBars: 24, sections: [{ label: 'A', startBar: 1, length: 24 }] }, w);
  return freeFormAvoidsSteepArc(sections);
}

function testInterpolationMidpoint(): boolean {
  const mid = interpolateTensionForBarRange(1, 7, 0.2, 0.8, 4);
  return Math.abs(mid - 0.5) < 0.001;
}

function testVoicingColorsStableAndPeak(): boolean {
  return voicingColorForTension(0.15) === 'stable' && voicingColorForTension(0.85) === 'tritone-sus';
}

export function runRhythmFormTensionPhase45Tests(): { name: string; ok: boolean }[] {
  return [
    ['Phase 4+5 RhythmDNA — Threadgill antiMetric penalises on-beat cell', testThreadgillAntiMetricPenaltyOnBeat],
    ['Phase 4+5 RhythmDNA — Mingus shout gate after bar threshold', testMingusShoutAfterThreshold],
    ['Phase 4+5 RhythmDNA — Coltrane allows tied cross-bar cell', testColtraneTieAcrossAllowed],
    ['Phase 4+5 Form — Gil Evans continuous-curve development rises', testGilEvansContinuousCurveDevelopmentRises],
    ['Phase 4+5 Form — Mingus suite collective-improv third section', testMingusCollectiveImprovThirdSection],
    ['Phase 4+5 Form — Wayne Shorter free arc stays shallow', testShorterFreeNoSteepArc],
    ['Phase 4+5 Tension — linear interpolation midpoint bar 4 of 1–7', testInterpolationMidpoint],
    ['Phase 4+5 Tension — voicing colour stable vs tritone-sus', testVoicingColorsStableAndPeak],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
