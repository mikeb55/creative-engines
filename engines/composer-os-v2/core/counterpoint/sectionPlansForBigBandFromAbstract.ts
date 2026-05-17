import type { AbstractLineSet } from './abstractLineSet';
import { chooseVoicingGeometry, type VoicingGeometry } from './chooseVoicingGeometry';
import { deriveSectionWritingIntent } from './deriveSectionWritingIntent';
import { extractQuartetFeatures } from './extractQuartetFeatures';
import { quantizePhrasesForOrchestration } from './quantizePhrasesForOrchestration';
import type { QuartetFeatures, SectionWritingIntent } from './quartetFeatureTypes';
import {
  planBackgroundsRhythm,
  planSoliRhythm,
  type BackgroundsRhythmPlan,
  type HarmonyBar,
  type SoliRhythmPlan,
} from './planSoliAndBackgroundsRhythm';
import type { CompositionContext } from '../compositionContext';
import type { HarmonicScene } from '../composer/harmonicScene';
import type { VoiceRuleBundle } from '../composer/voiceRuleBundle';
import type {
  BackgroundsPlan,
  SoliPlan,
} from '../composer/bigBandSectionWriter';
import {
  backgroundsPlanFromScene,
  soliPlanForBundle,
} from '../composer/bigBandSectionWriter';

export interface SectionPlansForBigBandFromAbstractResult {
  soliPlan: SoliPlan;
  backgroundsPlan: BackgroundsPlan;
  quartetFeatures: QuartetFeatures[];
  sectionWritingIntents: SectionWritingIntent[];
  voicingGeometries: VoicingGeometry[];
  soliRhythmPlans: SoliRhythmPlan[];
  backgroundsRhythmPlans: BackgroundsRhythmPlan[];
}

function harmonyBarForPhraseIndex(scene: HarmonicScene | undefined, phraseIdx: number): HarmonyBar {
  if (!scene) {
    return { barIndex: phraseIdx, densityClass: phraseIdx === 0 ? 'sparse' : 'medium' };
  }
  const ext = scene as HarmonicScene & { harmonyBars?: HarmonyBar[] };
  const bars = ext.harmonyBars;
  if (bars && bars.length > 0) {
    const b = bars[Math.min(phraseIdx, bars.length - 1)];
    if (b) return { ...b, barIndex: b.barIndex ?? phraseIdx };
  }
  return { barIndex: phraseIdx, densityClass: phraseIdx === 0 ? 'sparse' : 'medium' };
}

function routerSoliBackgrounds(
  bundle: VoiceRuleBundle,
  scene: HarmonicScene | undefined,
): { soliPlan: SoliPlan; backgroundsPlan: BackgroundsPlan } {
  const baseSoli = soliPlanForBundle(bundle);
  const baseBg = backgroundsPlanFromScene(scene);
  const id = bundle.voiceId;
  switch (id) {
    case 'charles_mingus':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: true,
          spreadMin: Math.min(18, Math.max(baseSoli.spreadMin, 8)),
          spreadMax: Math.min(34, baseSoli.spreadMax + 6),
          derivationTag: 'mingus_collective_texture',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'half',
          voicingColor: 'collective_inner_from_outer_line_intersection',
          derivationTag: 'mingus_collective_texture',
        },
      };
    case 'duke_ellington':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: true,
          spreadMin: Math.min(14, baseSoli.spreadMin + 2),
          derivationTag: 'ellington_voice_colour',
        },
        backgroundsPlan: {
          ...baseBg,
          voicingColor: 'chromatic_pass_between_soprano_bass',
          derivationTag: 'ellington_voice_colour',
        },
      };
    case 'count_basie':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: true,
          spreadMin: Math.max(4, baseSoli.spreadMin - 2),
          spreadMax: Math.min(22, baseSoli.spreadMax),
          derivationTag: 'basie_freddie_green_riff',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'half',
          voicingColor: 'on_beat_sparse_stabs_from_soprano_line',
          derivationTag: 'basie_freddie_green_riff',
        },
      };
    case 'oliver_nelson':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: false,
          spreadMin: baseSoli.spreadMin,
          spreadMax: Math.min(40, baseSoli.spreadMax + 10),
          derivationTag: 'nelson_orchestral_wedge',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'half',
          voicingColor: 'wedge_outward_from_bass_meet_mid_phrase',
          derivationTag: 'nelson_orchestral_wedge',
        },
      };
    case 'thad_jones':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: true,
          spreadMin: Math.min(16, baseSoli.spreadMin + 1),
          derivationTag: 'thad_chromatic_voice_leading',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'half',
          voicingColor: 'chromatic_pass_soprano_bass_comp_behind',
          derivationTag: 'thad_chromatic_voice_leading',
        },
      };
    case 'maria_schneider':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: false,
          spreadMax: Math.min(38, baseSoli.spreadMax + 4),
          derivationTag: 'schneider_sustained_orchestral',
        },
        backgroundsPlan: {
          ...baseBg,
          rhythm: 'whole',
          voicingColor: 'sustain_pad_upper_extension_from_soprano',
          derivationTag: 'schneider_sustained_orchestral',
        },
      };
    case 'bill_evans':
      return {
        soliPlan: {
          ...baseSoli,
          closePosition: false,
          spreadMin: Math.min(12, baseSoli.spreadMin + 3),
          spreadMax: Math.min(36, baseSoli.spreadMax + 4),
          derivationTag: 'evans_bb_upper_extension',
        },
        backgroundsPlan: {
          ...baseBg,
          voicingColor: 'upper_extension_independence_no_downbeat_double',
          derivationTag: 'evans_bb_upper_extension',
        },
      };
    default:
      return { soliPlan: baseSoli, backgroundsPlan: baseBg };
  }
}

/**
 * BB router + Phase 6 quartet feature pipeline (additive metadata on top of legacy soli/backgrounds plans).
 */
export function sectionPlansForBigBandFromAbstract(
  bundle: VoiceRuleBundle,
  scene: HarmonicScene | undefined,
  lines: AbstractLineSet | undefined,
  styleProfileId?: string,
  context?: CompositionContext,
): SectionPlansForBigBandFromAbstractResult {
  const { soliPlan, backgroundsPlan } = routerSoliBackgrounds(bundle, scene);
  if (!lines) {
    return {
      soliPlan,
      backgroundsPlan,
      quartetFeatures: [],
      sectionWritingIntents: [],
      voicingGeometries: [],
      soliRhythmPlans: [],
      backgroundsRhythmPlans: [],
    };
  }

  const rawQuartetFeatures = extractQuartetFeatures(lines);
  const quartetFeatures =
    bundle.contrapuntalLinePolicy?.enabled === true
      ? quantizePhrasesForOrchestration(lines, rawQuartetFeatures, { context })
      : rawQuartetFeatures;
  const sectionWritingIntents = deriveSectionWritingIntent(quartetFeatures, bundle, styleProfileId);
  const voicingGeometries = sectionWritingIntents.map((i) => chooseVoicingGeometry(i, bundle));
  const soliRhythmPlans = sectionWritingIntents.map((i, idx) =>
    planSoliRhythm(i, harmonyBarForPhraseIndex(scene, idx), bundle),
  );
  const backgroundsRhythmPlans = sectionWritingIntents.map((i, idx) =>
    planBackgroundsRhythm(i, harmonyBarForPhraseIndex(scene, idx), bundle),
  );

  return {
    soliPlan,
    backgroundsPlan,
    quartetFeatures,
    sectionWritingIntents,
    voicingGeometries,
    soliRhythmPlans,
    backgroundsRhythmPlans,
  };
}
