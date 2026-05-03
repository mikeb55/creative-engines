/**
 * Combine era + optional composer style into a resolved rule id set + tuning (planning only).
 */

import { BIG_BAND_RULE_REGISTRY } from './bigBandRuleRegistry';
import type {
  BigBandArrangerProfileReceiptV1,
  BigBandComposerId,
  BigBandEraId,
  BigBandRuleTuning,
  ResolvedBigBandRuleSet,
} from './bigBandResearchTypes';

function tuningFor(era: BigBandEraId, composer: BigBandComposerId | null): BigBandRuleTuning {
  let riffVsLine: BigBandRuleTuning['riffVsLine'] = 'balanced';
  let spaceEmphasis = 0.35;
  let densityArc = true;
  let smoothTransitions = false;
  let shoutMotivicClimax = true;

  if (era === 'bebop') {
    riffVsLine = 'line_primary';
    spaceEmphasis = 0.2;
  } else if (era === 'swing') {
    riffVsLine = 'riff_primary';
    spaceEmphasis = 0.55;
    densityArc = false;
  } else if (era === 'contemporary') {
    smoothTransitions = true;
    spaceEmphasis = 0.4;
    riffVsLine = 'balanced';
  } else {
    riffVsLine = 'balanced';
    spaceEmphasis = 0.35;
    densityArc = true;
  }

  if (composer === 'basie') {
    riffVsLine = 'riff_primary';
    spaceEmphasis = Math.max(spaceEmphasis, 0.5);
  }
  if (era === 'bebop') {
    riffVsLine = 'line_primary';
  }
  if (composer === 'schneider') {
    smoothTransitions = true;
    shoutMotivicClimax = false;
  }
  if (composer === 'thad') {
    densityArc = true;
    shoutMotivicClimax = true;
  }

  let basieProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let ellingtonProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let schneiderProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let quincyJonesProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;

  if (composer === 'basie') {
    /** Paired with existing riff/sparse `applyBigBandRules` hooks. */
    smoothTransitions = false;
    densityArc = true;
    shoutMotivicClimax = true;
    spaceEmphasis = Math.max(spaceEmphasis, 0.48);
    basieProofOfConcept = {
      chordDensity: 2,
      extensionsPolicy: '9ths and 13ths only; no altered extensions',
      functionalHarmonyPercent: 90,
      harmonicRhythm: 'medium',
      overallDensity: 2,
      textureArc: 'gradual build; space then explosion',
      sectionBlending: 'clean separation',
      rhythmSectionWeight: 4,
      timeFeel: 'locked grid',
      hornRelationship: 'rhythm leads',
      buildStrategy: 'chorus-based; riff-based',
    };
  }

  if (composer === 'ellington') {
    smoothTransitions = true;
    densityArc = true;
    spaceEmphasis = Math.max(spaceEmphasis, 0.42);
    ellingtonProofOfConcept = {
      chordDensity: 4,
      extensionsPolicy: '9ths, 11ths, 13ths, altered, polytonal',
      functionalHarmonyPercent: 60,
      harmonicRhythm: 'medium',
      overallDensity: 4,
      textureArc: 'conversational, gradual build',
      sectionBlending: 'blurred, unusual combos',
      rhythmSectionWeight: 3,
      timeFeel: 'elastic / floating',
      hornRelationship: 'equal dialogue',
      buildStrategy: 'chorus-based, narrative arc',
      spaceUsage: 'continuous flow with pockets of space',
    };
  }

  if (composer === 'schneider') {
    schneiderProofOfConcept = {
      chordDensity: 5,
      extensionsPolicy: '9ths, 11ths, 13ths, altered, upper structure triads, polytonal',
      functionalHarmonyPercent: 40,
      harmonicRhythm: 'slow',
      overallDensity: 4,
      textureArc: 'gradual build, mosaic',
      sectionBlending: 'blurred, unusual combos',
      rhythmSectionWeight: 3,
      timeFeel: 'floating / groove-first',
      hornRelationship: 'equal dialogue',
      buildStrategy: 'narrative arc',
      spaceUsage: 'space then explosion / continuous flow',
    };
  }

  if (composer === 'quincy_jones') {
    smoothTransitions = false;
    densityArc = true;
    shoutMotivicClimax = true;
    spaceEmphasis = Math.max(spaceEmphasis, 0.44);
    quincyJonesProofOfConcept = {
      chordDensity: 3,
      extensionsPolicy: '9ths, 11ths, 13ths, altered, upper structure triads',
      functionalHarmonyPercent: 80,
      harmonicRhythm: 'medium',
      overallDensity: 3,
      textureArc: 'cinematic, gradual build',
      sectionBlending: 'mostly clean, some blends',
      rhythmSectionWeight: 5,
      timeFeel: 'groove-first / locked grid',
      hornRelationship: 'rhythm leads / equal dialogue',
      buildStrategy: 'chorus-based, cinematic',
      spaceUsage: 'space then explosion',
    };
  }

  return {
    riffVsLine,
    spaceEmphasis,
    densityArc,
    smoothTransitions,
    shoutMotivicClimax,
    ...(basieProofOfConcept ? { basieProofOfConcept } : {}),
    ...(ellingtonProofOfConcept ? { ellingtonProofOfConcept } : {}),
    ...(schneiderProofOfConcept ? { schneiderProofOfConcept } : {}),
    ...(quincyJonesProofOfConcept ? { quincyJonesProofOfConcept } : {}),
  };
}

export function resolveBigBandEraRules(
  era: BigBandEraId,
  composerStyle: BigBandComposerId | null,
  researchLoaded: boolean,
  researchErrors: string[]
): ResolvedBigBandRuleSet {
  const ruleIds: string[] = [];
  for (const r of BIG_BAND_RULE_REGISTRY.foundationalRules) ruleIds.push(r.id);
  for (const r of BIG_BAND_RULE_REGISTRY.eraRules[era]) ruleIds.push(r.id);
  for (const r of BIG_BAND_RULE_REGISTRY.functionalRules.shout) ruleIds.push(r.id);
  for (const r of BIG_BAND_RULE_REGISTRY.functionalRules.riff) ruleIds.push(r.id);
  for (const r of BIG_BAND_RULE_REGISTRY.functionalRules.soli) ruleIds.push(r.id);
  if (composerStyle) {
    for (const r of BIG_BAND_RULE_REGISTRY.composerRules[composerStyle]) ruleIds.push(r.id);
  }
  const tuning = tuningFor(era, composerStyle);
  return {
    era,
    composerStyle,
    ruleIds,
    tuning,
    researchLoaded,
    researchErrors: [...researchErrors],
  };
}
