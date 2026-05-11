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
  if (composer === 'thad_jones') {
    densityArc = true;
    shoutMotivicClimax = true;
  }
  if (composer === 'wayne_shorter') {
    densityArc = true;
    smoothTransitions = true;
    riffVsLine = 'line_primary';
  }
  if (composer === 'gil_evans') {
    smoothTransitions = true;
    shoutMotivicClimax = false;
    spaceEmphasis = Math.max(spaceEmphasis, 0.44);
    riffVsLine = 'balanced';
  }
  if (composer === 'bob_brookmeyer') {
    smoothTransitions = false;
    riffVsLine = 'line_primary';
    densityArc = true;
  }
  if (composer === 'clare_fischer') {
    smoothTransitions = true;
    densityArc = true;
    shoutMotivicClimax = false;
  }
  if (composer === 'oliver_nelson') {
    densityArc = true;
    shoutMotivicClimax = true;
    smoothTransitions = false;
  }
  if (composer === 'sammy_nestico') {
    riffVsLine = 'riff_primary';
    smoothTransitions = false;
    spaceEmphasis = Math.max(spaceEmphasis, 0.49);
    shoutMotivicClimax = true;
  }

  let basieProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let ellingtonProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let schneiderProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let quincyJonesProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let thadProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let wayneShorterProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let gilEvansProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let bobBrookmeyerProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let clareFischerProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let oliverNelsonProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;
  let sammyNesticoProofOfConcept: BigBandArrangerProfileReceiptV1 | undefined;

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

  if (composer === 'thad_jones') {
    thadProofOfConcept = {
      chordDensity: 4,
      extensionsPolicy: '9ths–13ths, altered dominants, poly-chords, side-step shifts',
      functionalHarmonyPercent: 72,
      harmonicRhythm: 'medium',
      overallDensity: 4,
      textureArc: 'planned waves; solo backgrounds arc toward shout',
      sectionBlending: 'cross-section voicing; dense yet clear',
      rhythmSectionWeight: 4,
      timeFeel: 'tight swing; metric tension at cadences',
      hornRelationship: 'motive-led dialogue',
      buildStrategy: 'extended forms; interludes and shout sequences',
      spaceUsage: 'continuous motion with arranged peaks',
    };
  }

  if (composer === 'wayne_shorter') {
    wayneShorterProofOfConcept = {
      chordDensity: 4,
      extensionsPolicy: '9ths–13ths; altered dominants; sus colours; chromatic mediants',
      functionalHarmonyPercent: 52,
      harmonicRhythm: 'medium–slow plateaus',
      overallDensity: 3,
      textureArc: 'floating centres with lateral pivots',
      sectionBlending: 'cross-section colour stacks',
      rhythmSectionWeight: 3,
      timeFeel: 'elastic swing pocket',
      hornRelationship: 'motivic dialogue',
      buildStrategy: 'development arcs; mosaic cadences',
      spaceUsage: 'breaths between colour shifts',
    };
  }

  if (composer === 'gil_evans') {
    gilEvansProofOfConcept = {
      chordDensity: 3,
      extensionsPolicy: '9ths, 11ths, altered sparingly; modal washes',
      functionalHarmonyPercent: 48,
      harmonicRhythm: 'slow',
      overallDensity: 2,
      textureArc: 'colour wash; gradual orchestral swell',
      sectionBlending: 'atmospheric blended registers',
      rhythmSectionWeight: 3,
      timeFeel: 'elastic / floating',
      hornRelationship: 'equal dialogue',
      buildStrategy: 'narrative arc; colour over groove',
      spaceUsage: 'wide phrase space; sparse punches',
    };
  }

  if (composer === 'bob_brookmeyer') {
    bobBrookmeyerProofOfConcept = {
      chordDensity: 4,
      extensionsPolicy: 'quartal/quintal clusters; altered upper structures',
      functionalHarmonyPercent: 58,
      harmonicRhythm: 'medium',
      overallDensity: 4,
      textureArc: 'contrapuntal wave build',
      sectionBlending: 'cross-section linear stacks',
      rhythmSectionWeight: 3,
      timeFeel: 'modern swing pocket',
      hornRelationship: 'contrapuntal dialogue',
      buildStrategy: 'through-section development',
      spaceUsage: 'alternating dense lines and light grooves',
    };
  }

  if (composer === 'clare_fischer') {
    clareFischerProofOfConcept = {
      chordDensity: 5,
      extensionsPolicy: 'dense alterations; clusters; Latin colour extensions',
      functionalHarmonyPercent: 52,
      harmonicRhythm: 'slow',
      overallDensity: 5,
      textureArc: 'harmonic density waves',
      sectionBlending: 'brass/reed colour stacks',
      rhythmSectionWeight: 4,
      timeFeel: 'groove-first with elastic overlays',
      hornRelationship: 'rhythm section drives voicing pads',
      buildStrategy: 'sectional contrast + harmonic escalation',
      spaceUsage: 'tight punches between lush spreads',
    };
  }

  if (composer === 'oliver_nelson') {
    oliverNelsonProofOfConcept = {
      chordDensity: 3,
      extensionsPolicy: 'functional extensions; blues colour',
      functionalHarmonyPercent: 82,
      harmonicRhythm: 'medium',
      overallDensity: 3,
      textureArc: 'sectional contrast; blues arcs',
      sectionBlending: 'clean sectional hits',
      rhythmSectionWeight: 4,
      timeFeel: 'locked swing grid',
      hornRelationship: 'section leaders alternate',
      buildStrategy: 'head–solos–shout economy',
      spaceUsage: 'chart-clear punches',
    };
  }

  if (composer === 'sammy_nestico') {
    sammyNesticoProofOfConcept = {
      chordDensity: 2,
      extensionsPolicy: '9ths and 13ths; limited altered colour',
      functionalHarmonyPercent: 90,
      harmonicRhythm: 'medium',
      overallDensity: 2,
      textureArc: 'riff punches; Basie-style lifts',
      sectionBlending: 'clean separation',
      rhythmSectionWeight: 5,
      timeFeel: 'locked grid',
      hornRelationship: 'rhythm section drives kicks',
      buildStrategy: 'chart-efficient hits',
      spaceUsage: 'economical space between punches',
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
    ...(thadProofOfConcept ? { thadProofOfConcept } : {}),
    ...(wayneShorterProofOfConcept ? { wayneShorterProofOfConcept } : {}),
    ...(gilEvansProofOfConcept ? { gilEvansProofOfConcept } : {}),
    ...(bobBrookmeyerProofOfConcept ? { bobBrookmeyerProofOfConcept } : {}),
    ...(clareFischerProofOfConcept ? { clareFischerProofOfConcept } : {}),
    ...(oliverNelsonProofOfConcept ? { oliverNelsonProofOfConcept } : {}),
    ...(sammyNesticoProofOfConcept ? { sammyNesticoProofOfConcept } : {}),
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
