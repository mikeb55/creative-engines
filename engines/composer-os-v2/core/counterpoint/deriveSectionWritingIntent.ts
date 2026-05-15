import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import type {
  AntiCollapsePolicy,
  DensityPlan,
  EnsembleSection,
  QuartetFeatures,
  SectionAssignment,
  SectionWritingIntent,
  TextureClass,
} from './quartetFeatureTypes';

type VoiceIdSatb = 'S' | 'A' | 'T' | 'B';

function clamp01(x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/** VRB bucket for Pass 2 style bias (Schneider / Basie / Mingus / Brookmeyer default). */
function resolveStyleBiasVrb(vrb: VoiceRuleBundle): 'schneider' | 'basie' | 'mingus' | 'brookmeyer' {
  const id = vrb.voiceId.toLowerCase();
  if (id.includes('schneider')) return 'schneider';
  if (id.includes('basie')) return 'basie';
  if (id.includes('mingus')) return 'mingus';
  return 'brookmeyer';
}

function deriveAntiCollapse(
  f: QuartetFeatures,
  vrb: VoiceRuleBundle,
  bias: 'schneider' | 'basie' | 'mingus' | 'brookmeyer',
): AntiCollapsePolicy {
  let forbidFullEnsembleChordHits = false;
  let minIndependentLineCount = 2;
  let maxConsecutiveHomorhythmicEvents = 6;
  let requireSourceLineMapping = true;

  if (f.textureClass === 'punctuated' || f.textureClass === 'riff_layered') {
    forbidFullEnsembleChordHits = true;
  } else if (f.homorhythmScore > 0.82 && f.contrapuntalIndependence < 0.22) {
    forbidFullEnsembleChordHits = false;
  } else if (f.verticalChangeRate > 0.55 && f.rhythmicDensity > 0.45) {
    forbidFullEnsembleChordHits = true;
  } else {
    forbidFullEnsembleChordHits = false;
  }

  if (f.contrapuntalIndependence > 0.62) {
    minIndependentLineCount = 4;
  } else if (f.contrapuntalIndependence > 0.38) {
    minIndependentLineCount = 3;
  } else if (f.textureClass === 'chorale' || f.textureClass === 'homorhythmic') {
    minIndependentLineCount = 2;
  } else {
    minIndependentLineCount = 2;
  }

  if (f.homorhythmScore > 0.9) {
    maxConsecutiveHomorhythmicEvents = 14;
  } else if (f.homorhythmScore > 0.65) {
    maxConsecutiveHomorhythmicEvents = 8;
  } else if (f.textureClass === 'polyphonic' || f.textureClass === 'contrapuntal') {
    maxConsecutiveHomorhythmicEvents = 4;
  } else {
    maxConsecutiveHomorhythmicEvents = 6;
  }

  if (f.imitationScore > 0.35 || f.pedalPresence) {
    requireSourceLineMapping = true;
  } else if (f.textureClass === 'punctuated') {
    requireSourceLineMapping = true;
  } else {
    requireSourceLineMapping = true;
  }

  if (bias === 'schneider') {
    forbidFullEnsembleChordHits = true;
    if (minIndependentLineCount < 3) minIndependentLineCount = 3;
    maxConsecutiveHomorhythmicEvents = Math.max(2, maxConsecutiveHomorhythmicEvents - 2);
    requireSourceLineMapping = true;
  } else if (bias === 'basie') {
    forbidFullEnsembleChordHits = false;
    if (minIndependentLineCount > 2) minIndependentLineCount = 2;
    maxConsecutiveHomorhythmicEvents = Math.min(16, maxConsecutiveHomorhythmicEvents + 4);
    requireSourceLineMapping = true;
  } else if (bias === 'mingus') {
    if (minIndependentLineCount < 2) minIndependentLineCount = 2;
    maxConsecutiveHomorhythmicEvents = Math.min(10, maxConsecutiveHomorhythmicEvents + 1);
    requireSourceLineMapping = true;
  } else {
    requireSourceLineMapping = true;
    if (vrbLineFirst(vrb) && minIndependentLineCount < 3) minIndependentLineCount = 3;
  }

  return {
    forbidFullEnsembleChordHits,
    minIndependentLineCount,
    maxConsecutiveHomorhythmicEvents,
    requireSourceLineMapping,
  };
}

function vrbLineFirst(vrb: VoiceRuleBundle): boolean {
  return vrb.lineFirstHierarchy === true;
}

function deriveOneIntent(
  f: QuartetFeatures,
  vrb: VoiceRuleBundle,
  styleProfileId: string | undefined,
  bias: 'schneider' | 'basie' | 'mingus' | 'brookmeyer',
): SectionWritingIntent {
  const vrbId = vrb.voiceId;

  // HEURISTIC 1 — textureGoal (TextureClass): explicit overrides from vertical/rhythm + imitation.
  let textureGoal: TextureClass = f.textureClass;
  if (f.textureClass === 'homorhythmic' && f.contrapuntalIndependence > 0.58) {
    textureGoal = 'polyphonic';
  } else if (f.textureClass === 'polyphonic' && f.imitationScore > 0.52) {
    textureGoal = 'imitative';
  } else if (f.textureClass === 'pedal_plus_lines' && f.rhythmicDensity > 0.5) {
    textureGoal = 'riff_layered';
  } else if (f.syncopationScore > 0.62 && f.textureClass === 'homorhythmic') {
    textureGoal = 'punctuated';
  } else {
    textureGoal = f.textureClass;
  }

  // HEURISTIC 2 — energyLevel (0–1): rhythm + syncopation + cadence + vertical motion.
  let energyLevel = 0;
  if (f.cadenceStrength === 'strong') {
    energyLevel = 0.72 + 0.18 * f.rhythmicDensity + 0.1 * f.syncopationScore;
  } else if (f.cadenceStrength === 'medium') {
    energyLevel = 0.55 + 0.22 * f.rhythmicDensity + 0.12 * f.verticalChangeRate;
  } else if (f.cadenceStrength === 'weak') {
    energyLevel = 0.38 + 0.28 * f.rhythmicDensity + 0.1 * f.syncopationScore;
  } else {
    energyLevel = 0.22 + 0.35 * f.rhythmicDensity + 0.22 * f.syncopationScore + 0.12 * f.verticalChangeRate;
  }
  energyLevel = clamp01(energyLevel);

  // HEURISTIC 3 — transparencyLevel (0–1): independence + anti-homorhythm + registral spread.
  let transparencyLevel = 0;
  if (f.registralSpreadSemitones > 28) {
    transparencyLevel = 0.55 + 0.35 * f.contrapuntalIndependence + 0.1 * (1 - f.homorhythmScore);
  } else if (f.registralSpreadSemitones > 14) {
    transparencyLevel = 0.4 + 0.4 * f.contrapuntalIndependence + 0.2 * (1 - f.homorhythmScore);
  } else if (f.textureClass === 'chorale') {
    transparencyLevel = 0.12 + 0.25 * (1 - f.homorhythmScore);
  } else {
    transparencyLevel = 0.28 + 0.45 * f.contrapuntalIndependence + 0.27 * (1 - f.homorhythmScore);
  }
  transparencyLevel = clamp01(transparencyLevel);

  // HEURISTIC 4 — motionRetention (0–1): motion profile + chordal stability + crossing load.
  let motionRetention = 0.5;
  if (f.motionProfile === 'mostly_stepwise') {
    motionRetention = 0.82 + 0.12 * f.chordalStabilityScore - 0.04 * Math.min(1, f.crossingCount / 12);
  } else if (f.motionProfile === 'mixed') {
    motionRetention = 0.55 + 0.2 * f.chordalStabilityScore - 0.05 * Math.min(1, f.crossingCount / 10);
  } else if (f.motionProfile === 'angular') {
    motionRetention = 0.28 + 0.12 * f.chordalStabilityScore;
  } else if (f.motionProfile === 'static_outer_active_inner') {
    motionRetention = 0.62 + 0.15 * (1 - f.verticalChangeRate);
  } else if (f.motionProfile === 'active_outer_static_inner') {
    motionRetention = 0.45 + 0.18 * f.chordalStabilityScore;
  } else {
    motionRetention = 0.5;
  }
  motionRetention = clamp01(motionRetention);

  // HEURISTIC 5 — leadSection + supportSections: texture + imitation + pedal.
  let leadSection: EnsembleSection = 'mixed_reeds_brass';
  let supportSections: EnsembleSection[] = ['saxes', 'trumpets', 'trombones'];
  if (f.textureClass === 'chorale' || f.textureClass === 'homorhythmic') {
    leadSection = 'saxes';
    supportSections = ['trumpets', 'trombones', 'rhythm'];
  } else if (f.textureClass === 'imitative' || f.imitationScore > 0.48) {
    leadSection = 'trumpets';
    supportSections = ['saxes', 'trombones'];
  } else if (f.textureClass === 'pedal_plus_lines' || f.pedalPresence) {
    leadSection = 'saxes';
    supportSections = ['rhythm', 'trombones', 'trumpets'];
  } else if (f.textureClass === 'riff_layered') {
    leadSection = 'rhythm';
    supportSections = ['saxes', 'trumpets', 'trombones'];
  } else if (f.textureClass === 'punctuated') {
    leadSection = 'trumpets';
    supportSections = ['saxes', 'rhythm', 'trombones'];
  } else if (f.textureClass === 'contrapuntal' || f.textureClass === 'polyphonic') {
    leadSection = 'mixed_reeds_brass';
    supportSections = ['saxes', 'trumpets', 'trombones'];
  } else {
    leadSection = 'mixed_reeds_brass';
    supportSections = ['saxes', 'trumpets', 'trombones', 'rhythm'];
  }

  // HEURISTIC 6 — assignments[]: line salience + texture + pedal doubles.
  const primary: VoiceIdSatb[] =
    f.primaryLineVoiceIds.length > 0 ? [...f.primaryLineVoiceIds] : ['S'];
  const secondary: VoiceIdSatb[] =
    f.secondaryLineVoiceIds.length > 0 ? [...f.secondaryLineVoiceIds] : ['A', 'T'];
  const assignments: SectionAssignment[] = [];
  if (f.textureClass === 'chorale' || f.textureClass === 'homorhythmic') {
    assignments.push({
      section: 'saxes',
      role: 'lead',
      sourceVoiceIds: [...primary],
      prominence: 1,
      lineDerived: true,
    });
    assignments.push({
      section: 'trumpets',
      role: 'pad',
      sourceVoiceIds: [...secondary],
      prominence: 0.45,
      lineDerived: true,
    });
    assignments.push({
      section: 'trombones',
      role: 'pad',
      sourceVoiceIds: ['B', 'T'],
      prominence: 0.38,
      lineDerived: true,
    });
    assignments.push({
      section: 'rhythm',
      role: 'punctuation',
      sourceVoiceIds: ['B'],
      prominence: 0.22,
      lineDerived: false,
    });
  } else if (f.textureClass === 'riff_layered' || f.rhythmicDensity > 0.55) {
    assignments.push({
      section: 'rhythm',
      role: 'lead',
      sourceVoiceIds: ['S', 'A'],
      prominence: 0.95,
      lineDerived: false,
    });
    assignments.push({
      section: 'saxes',
      role: 'counterline',
      sourceVoiceIds: [...primary],
      prominence: 0.72,
      lineDerived: true,
    });
    assignments.push({
      section: 'trumpets',
      role: 'punctuation',
      sourceVoiceIds: ['T', 'B'],
      prominence: 0.5,
      lineDerived: true,
    });
    assignments.push({
      section: 'trombones',
      role: 'pad',
      sourceVoiceIds: ['B'],
      prominence: 0.35,
      lineDerived: true,
    });
  } else if (f.textureClass === 'imitative' || f.imitationScore > 0.45) {
    assignments.push({
      section: 'trumpets',
      role: 'lead',
      sourceVoiceIds: [...primary],
      prominence: 0.92,
      lineDerived: true,
    });
    assignments.push({
      section: 'saxes',
      role: 'counterline',
      sourceVoiceIds: [...secondary],
      prominence: 0.68,
      lineDerived: true,
    });
    assignments.push({
      section: 'trombones',
      role: 'doubling',
      sourceVoiceIds: ['T', 'B'],
      prominence: 0.4,
      lineDerived: true,
    });
    assignments.push({
      section: 'rhythm',
      role: 'pad',
      sourceVoiceIds: ['B'],
      prominence: 0.25,
      lineDerived: false,
    });
  } else if (f.pedalPresence) {
    assignments.push({
      section: 'saxes',
      role: 'pedal',
      sourceVoiceIds: f.pedalVoiceIds.length > 0 ? [...f.pedalVoiceIds] : ['B'],
      prominence: 0.55,
      lineDerived: true,
    });
    assignments.push({
      section: 'trumpets',
      role: 'lead',
      sourceVoiceIds: [...primary],
      prominence: 0.88,
      lineDerived: true,
    });
    assignments.push({
      section: 'trombones',
      role: 'counterline',
      sourceVoiceIds: [...secondary],
      prominence: 0.52,
      lineDerived: true,
    });
    assignments.push({
      section: 'rhythm',
      role: 'punctuation',
      sourceVoiceIds: ['S'],
      prominence: 0.2,
      lineDerived: false,
    });
  } else if (f.textureClass === 'contrapuntal' || f.contrapuntalIndependence > 0.52) {
    assignments.push({
      section: 'mixed_reeds_brass',
      role: 'lead',
      sourceVoiceIds: [...primary],
      prominence: 0.9,
      lineDerived: true,
    });
    assignments.push({
      section: 'saxes',
      role: 'counterline',
      sourceVoiceIds: ['A', 'T'],
      prominence: 0.62,
      lineDerived: true,
    });
    assignments.push({
      section: 'trumpets',
      role: 'counterline',
      sourceVoiceIds: ['S'],
      prominence: 0.58,
      lineDerived: true,
    });
    assignments.push({
      section: 'trombones',
      role: 'pad',
      sourceVoiceIds: ['B'],
      prominence: 0.4,
      lineDerived: true,
    });
  } else if (f.textureClass === 'punctuated') {
    assignments.push({
      section: 'trumpets',
      role: 'punctuation',
      sourceVoiceIds: [...primary],
      prominence: 0.94,
      lineDerived: true,
    });
    assignments.push({
      section: 'saxes',
      role: 'lead',
      sourceVoiceIds: [...secondary],
      prominence: 0.55,
      lineDerived: true,
    });
    assignments.push({
      section: 'trombones',
      role: 'pad',
      sourceVoiceIds: ['B', 'T'],
      prominence: 0.42,
      lineDerived: true,
    });
    assignments.push({
      section: 'rhythm',
      role: 'punctuation',
      sourceVoiceIds: ['S', 'B'],
      prominence: 0.48,
      lineDerived: false,
    });
  } else {
    assignments.push({
      section: 'mixed_reeds_brass',
      role: 'lead',
      sourceVoiceIds: [...primary],
      prominence: 0.88,
      lineDerived: true,
    });
    assignments.push({
      section: 'saxes',
      role: 'pad',
      sourceVoiceIds: [...secondary],
      prominence: 0.48,
      lineDerived: true,
    });
    assignments.push({
      section: 'trumpets',
      role: 'counterline',
      sourceVoiceIds: ['T'],
      prominence: 0.5,
      lineDerived: true,
    });
    assignments.push({
      section: 'trombones',
      role: 'pad',
      sourceVoiceIds: ['B'],
      prominence: 0.36,
      lineDerived: true,
    });
  }

  // HEURISTIC 7 — densityPlan: texture + active voices + homorhythm.
  let densityPlan: DensityPlan = {
    simultaneousSections: 2,
    targetActiveParts: 9,
    allowSectionUnisons: true,
    allowPads: true,
    allowBackgroundFigures: true,
  };
  if (f.textureClass === 'chorale' || f.homorhythmScore > 0.78) {
    densityPlan = {
      simultaneousSections: 2,
      targetActiveParts: 8,
      allowSectionUnisons: true,
      allowPads: true,
      allowBackgroundFigures: false,
    };
  } else if (f.textureClass === 'polyphonic' || f.textureClass === 'contrapuntal') {
    densityPlan = {
      simultaneousSections: 4,
      targetActiveParts: 14,
      allowSectionUnisons: false,
      allowPads: true,
      allowBackgroundFigures: true,
    };
  } else if (f.textureClass === 'riff_layered' || f.rhythmicDensity > 0.45) {
    densityPlan = {
      simultaneousSections: 3,
      targetActiveParts: 11,
      allowSectionUnisons: true,
      allowPads: false,
      allowBackgroundFigures: true,
    };
  } else if (f.activeVoicesCount >= 3 && f.contrapuntalIndependence > 0.45) {
    densityPlan = {
      simultaneousSections: 3,
      targetActiveParts: 12,
      allowSectionUnisons: false,
      allowPads: true,
      allowBackgroundFigures: true,
    };
  } else if (f.textureClass === 'punctuated') {
    densityPlan = {
      simultaneousSections: 3,
      targetActiveParts: 10,
      allowSectionUnisons: true,
      allowPads: false,
      allowBackgroundFigures: false,
    };
  } else {
    densityPlan = {
      simultaneousSections: 2,
      targetActiveParts: 9,
      allowSectionUnisons: true,
      allowPads: true,
      allowBackgroundFigures: true,
    };
  }

  // HEURISTIC 8 — articulationFamily: sustain + syncopation + texture.
  let articulationFamily: SectionWritingIntent['articulationFamily'] = 'tenuto';
  if (f.textureClass === 'chorale' || f.textureClass === 'homorhythmic') {
    articulationFamily = 'legato';
  } else if (f.textureClass === 'punctuated' || f.syncopationScore > 0.55) {
    articulationFamily = 'light_marcato';
  } else if (f.textureClass === 'riff_layered' || f.rhythmicDensity > 0.5) {
    articulationFamily = 'accented';
  } else if (f.sustainedVoicesCount >= 3 && f.syncopationScore < 0.25) {
    articulationFamily = 'legato';
  } else if (f.contrapuntalIndependence > 0.5 && f.syncopationScore < 0.35) {
    articulationFamily = 'tenuto';
  } else {
    articulationFamily = 'mixed';
  }

  // HEURISTIC 9 — dynamicShape: cadence + convergence/divergence.
  let dynamicShape: SectionWritingIntent['dynamicShape'] = 'flat';
  if (f.cadenceStrength === 'strong') {
    dynamicShape = 'arrival_accented';
  } else if (f.cadenceStrength === 'medium' && f.convergenceScore > 0.58) {
    dynamicShape = 'crescendo';
  } else if (f.divergenceScore > 0.62) {
    dynamicShape = 'decrescendo';
  } else if (f.convergenceScore > 0.55 && f.divergenceScore > 0.55) {
    dynamicShape = 'swell';
  } else if (f.cadenceStrength === 'weak' && f.convergenceScore > 0.52) {
    dynamicShape = 'crescendo';
  } else {
    dynamicShape = 'flat';
  }

  // HEURISTIC 10 — harmonicHandling + preserve flags + permitBlockVoicingRelease.
  let harmonicHandling: SectionWritingIntent['harmonicHandling'] = 'line_implied';
  let preservePedal = false;
  let preserveImitation = false;
  let preserveVoiceIndependence = false;
  let permitBlockVoicingRelease = false;

  if (f.textureClass === 'chorale' || f.chordalStabilityScore > 0.72) {
    harmonicHandling = 'pad_support';
  } else if (f.textureClass === 'punctuated') {
    harmonicHandling = 'punctuation_only';
  } else if (f.verticalChangeRate > 0.48 || f.harmonicRhythmPerBar > 0.35) {
    harmonicHandling = 'selective_reharm';
  } else if (f.textureClass === 'riff_layered' && f.syncopationScore > 0.4) {
    harmonicHandling = 'punctuation_only';
  } else {
    harmonicHandling = 'line_implied';
  }

  if (f.pedalPresence) {
    preservePedal = true;
  } else if (f.textureClass === 'pedal_plus_lines') {
    preservePedal = true;
  } else {
    preservePedal = false;
  }

  if (f.imitationScore > 0.22 || f.textureClass === 'imitative') {
    preserveImitation = true;
  } else {
    preserveImitation = false;
  }

  if (f.contrapuntalIndependence > 0.36 || f.textureClass === 'contrapuntal') {
    preserveVoiceIndependence = true;
  } else {
    preserveVoiceIndependence = false;
  }

  if (f.homorhythmScore > 0.75 && (f.textureClass === 'chorale' || f.textureClass === 'homorhythmic')) {
    permitBlockVoicingRelease = true;
  } else if (f.chordalStabilityScore > 0.68 && f.syncopationScore < 0.3) {
    permitBlockVoicingRelease = true;
  } else {
    permitBlockVoicingRelease = false;
  }

  // Style bias (Schneider / Basie / Mingus / Brookmeyer): explicit post-adjustments.
  if (bias === 'schneider') {
    transparencyLevel = clamp01(transparencyLevel + 0.1);
    energyLevel = clamp01(energyLevel - 0.06);
    densityPlan = {
      ...densityPlan,
      simultaneousSections: Math.min(3, densityPlan.simultaneousSections),
      targetActiveParts: Math.min(12, densityPlan.targetActiveParts),
      allowSectionUnisons: false,
    };
    motionRetention = clamp01(motionRetention + 0.05);
  } else if (bias === 'basie') {
    energyLevel = clamp01(energyLevel + 0.08);
    densityPlan = {
      ...densityPlan,
      allowSectionUnisons: true,
      allowPads: true,
    };
    if (f.homorhythmScore > 0.65) {
      permitBlockVoicingRelease = true;
    }
    harmonicHandling = f.textureClass === 'chorale' ? 'pad_support' : harmonicHandling;
  } else if (bias === 'mingus') {
    energyLevel = clamp01(energyLevel + 0.05);
    densityPlan = {
      ...densityPlan,
      simultaneousSections: Math.min(5, densityPlan.simultaneousSections + 1),
      targetActiveParts: Math.min(16, densityPlan.targetActiveParts + 2),
      allowBackgroundFigures: true,
    };
    if (f.textureClass === 'punctuated' || f.syncopationScore > 0.45) {
      leadSection = 'trumpets';
      supportSections = ['saxes', 'trombones', 'rhythm', 'mixed_reeds_brass'];
    }
    preserveVoiceIndependence = true;
  } else {
    if (vrbLineFirst(vrb)) {
      preserveVoiceIndependence = true;
      if (f.contrapuntalIndependence > 0.28 && harmonicHandling === 'line_implied') {
        harmonicHandling = 'selective_reharm';
      }
    }
    transparencyLevel = clamp01(transparencyLevel - 0.04);
  }

  const antiCollapse = deriveAntiCollapse(f, vrb, bias);

  const notes: string[] = [
    `H1 textureGoal=${textureGoal}`,
    `H2 energy=${energyLevel.toFixed(3)}`,
    `H3 transparency=${transparencyLevel.toFixed(3)}`,
    `H4 motionRetention=${motionRetention.toFixed(3)}`,
    `H5 lead=${leadSection}`,
    `H6 assignments=${assignments.length}`,
    `H7 simultaneous=${densityPlan.simultaneousSections}`,
    `H8 articulation=${articulationFamily}`,
    `H9 dynamic=${dynamicShape}`,
    `H10 harmonic=${harmonicHandling}`,
    `bias=${bias}`,
  ];

  return {
    phraseId: f.phraseId,
    startBeat: f.startBeat,
    endBeat: f.endBeat,
    textureGoal,
    energyLevel,
    transparencyLevel,
    motionRetention,
    leadSection,
    supportSections,
    assignments,
    densityPlan,
    articulationFamily,
    dynamicShape,
    harmonicHandling,
    vrbProfileId: vrbId,
    styleProfileId,
    preservePedal,
    preserveImitation,
    preserveVoiceIndependence,
    permitBlockVoicingRelease,
    antiCollapse,
    notes,
  };
}

export function deriveSectionWritingIntent(
  features: QuartetFeatures[],
  vrb: VoiceRuleBundle,
  styleProfileId?: string,
): SectionWritingIntent[] {
  const bias = resolveStyleBiasVrb(vrb);
  return features.map((f) => deriveOneIntent(f, vrb, styleProfileId, bias));
}
