import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import type { EnsembleSection, SectionWritingIntent } from './quartetFeatureTypes';

/** Bar-level harmony slice for rhythm planning (Pass 3+4 local IR). */
export type HarmonyBarDensityClass = 'sparse' | 'medium' | 'busy';

export interface HarmonyBar {
  barIndex: number;
  densityClass: HarmonyBarDensityClass;
  /** Optional cadence-beat anchor in quarter-note units within the bar (e.g. 3 = beat 4 in 4/4). */
  cadenceBeat?: number;
}

export interface SoliRhythmPlan {
  /** Primary soli note lengths in beats (whole bar = 4 in 4/4). */
  primaryDurationsBeats: number[];
  rhythmicActivity: 'long_legato' | 'active_figures' | 'mixed';
  /** Beats in bar that may receive an accent (empty = none). */
  accentBeatsInBar: number[];
  /** When true, all sections would attack the same grid simultaneously (forbidden when anti-collapse says so). */
  fullEnsembleAttackCluster: boolean;
  soliUsesLongValues: boolean;
}

export interface BackgroundsRhythmPlan {
  backgroundsRhythm: 'whole' | 'half' | 'quarter' | 'eighth';
  sustainOneSectionAcrossBarline: boolean;
  sectionWithSustain?: EnsembleSection;
  fullEnsembleAttackCluster: boolean;
}

function cadenceBeatOrDefault(harmonyBar: HarmonyBar): number {
  if (harmonyBar.cadenceBeat != null && harmonyBar.cadenceBeat >= 0) {
    return harmonyBar.cadenceBeat;
  }
  return 3;
}

function pickSustainSection(intent: SectionWritingIntent): EnsembleSection {
  const pedalAssign = intent.assignments.find((a) => a.role === 'pedal');
  if (pedalAssign) return pedalAssign.section;
  const pad = intent.assignments.find((a) => a.role === 'pad');
  if (pad) return pad.section;
  if (intent.supportSections[0]) return intent.supportSections[0]!;
  return 'trombones';
}

export function planBackgroundsRhythm(
  intent: SectionWritingIntent,
  harmonyBar: HarmonyBar,
  _vrb: VoiceRuleBundle,
): BackgroundsRhythmPlan {
  let backgroundsRhythm: BackgroundsRhythmPlan['backgroundsRhythm'] = 'quarter';
  let sustainOneSectionAcrossBarline = false;
  let sectionWithSustain: EnsembleSection | undefined;
  let fullEnsembleAttackCluster = false;

  if (harmonyBar.densityClass === 'sparse' || intent.textureGoal === 'chorale') {
    backgroundsRhythm = 'whole';
  } else if (harmonyBar.densityClass === 'busy' && intent.textureGoal === 'contrapuntal') {
    backgroundsRhythm = 'half';
    if (intent.energyLevel > 0.52) {
      backgroundsRhythm = 'quarter';
    }
  } else if (harmonyBar.densityClass === 'busy') {
    backgroundsRhythm = 'half';
  } else {
    backgroundsRhythm = 'quarter';
  }

  if (intent.preservePedal) {
    sustainOneSectionAcrossBarline = true;
    sectionWithSustain = pickSustainSection(intent);
  } else {
    sustainOneSectionAcrossBarline = false;
    sectionWithSustain = undefined;
  }

  if (intent.antiCollapse.forbidFullEnsembleChordHits) {
    fullEnsembleAttackCluster = false;
  } else if (backgroundsRhythm === 'whole' && intent.densityPlan.simultaneousSections >= 4) {
    fullEnsembleAttackCluster = true;
  } else {
    fullEnsembleAttackCluster = false;
  }

  return {
    backgroundsRhythm,
    sustainOneSectionAcrossBarline,
    sectionWithSustain,
    fullEnsembleAttackCluster,
  };
}

export function planSoliRhythm(
  intent: SectionWritingIntent,
  harmonyBar: HarmonyBar,
  _vrb: VoiceRuleBundle,
): SoliRhythmPlan {
  let primaryDurationsBeats: number[] = [2];
  let rhythmicActivity: SoliRhythmPlan['rhythmicActivity'] = 'mixed';
  let accentBeatsInBar: number[] = [];
  let fullEnsembleAttackCluster = false;
  let soliUsesLongValues = false;

  if (harmonyBar.densityClass === 'sparse' || intent.textureGoal === 'chorale') {
    primaryDurationsBeats = [4];
    rhythmicActivity = 'long_legato';
    soliUsesLongValues = true;
  } else if (harmonyBar.densityClass === 'busy' && intent.textureGoal === 'contrapuntal') {
    primaryDurationsBeats = [0.5, 1, 0.5];
    rhythmicActivity = 'active_figures';
    soliUsesLongValues = false;
  } else if (harmonyBar.densityClass === 'busy') {
    primaryDurationsBeats = [1, 1];
    rhythmicActivity = 'active_figures';
    soliUsesLongValues = false;
  } else {
    primaryDurationsBeats = [2, 2];
    rhythmicActivity = 'mixed';
    soliUsesLongValues = false;
  }

  if (intent.dynamicShape === 'arrival_accented') {
    accentBeatsInBar = [cadenceBeatOrDefault(harmonyBar)];
  } else if (intent.dynamicShape === 'swell') {
    accentBeatsInBar = [0, cadenceBeatOrDefault(harmonyBar)];
  } else {
    accentBeatsInBar = [];
  }

  if (intent.antiCollapse.forbidFullEnsembleChordHits) {
    fullEnsembleAttackCluster = false;
  } else if (rhythmicActivity === 'active_figures' && intent.densityPlan.simultaneousSections >= 4) {
    fullEnsembleAttackCluster = true;
  } else {
    fullEnsembleAttackCluster = false;
  }

  return {
    primaryDurationsBeats,
    rhythmicActivity,
    accentBeatsInBar,
    fullEnsembleAttackCluster,
    soliUsesLongValues,
  };
}
