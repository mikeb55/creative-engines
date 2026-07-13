/**
 * Bela Bartok Song Mode / duo VRB stub -- axis-folk twin of Song Mode `bartok`.
 * Must NOT alias into SQ `sq_vrb_bartok` (string-quartet Bartok VRB).
 * Parallel to Steve Reich Song stub vs reich_glass.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';

/** Merge Song Mode axis-folk posture onto the song stub row (`bartok` / `bela_bartok` / `bela`). */
export function applyBartokSongStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  return {
    ...bundle,
    voiceId: 'bartok',
    harmonicRhythm: {
      ...bundle.harmonicRhythm,
      minChordDurationBars: 1,
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 8),
      allowMidBarChange: true,
    },
    bassPolicy: {
      ...bundle.bassPolicy,
      role: 'chromatic-first',
      allowOctaveDoubling: false,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'angular',
      maxLeapSemitones: 12,
      preferredIntervalSets: [1, 2, 5, 6, 7],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 4,
      maxSpreadSemitones: 28,
      clusterSizeNotes: [2, 5],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    formPolicy: {
      ...bundle.formPolicy,
      narrativeArc: 'suite',
      sectionRecallEnforced: true,
    },
    rhythmPolicy: {
      ...bundle.rhythmPolicy,
      antiMetric: true,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: false,
    },
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.55,
        registerInterlock: true,
        intervalPreference: 'ic1_tritone',
      }),
      rhythmicIndependenceFloor: 0.55,
      intervalPreference: 'ic1_tritone',
    },
  };
}