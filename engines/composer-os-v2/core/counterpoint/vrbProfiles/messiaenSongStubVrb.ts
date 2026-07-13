/**
 * Olivier Messiaen Song Mode / duo VRB stub -- mode-birdsong twin of Song Mode `messiaen`.
 * Must NOT alias into SQ `sq_vrb_messiaen` (string-quartet Messiaen VRB).
 * Parallel to Bartok Song stub vs sq_vrb_bartok / Steve Reich Song stub vs reich_glass.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';

/** Merge Song Mode mode-birdsong posture onto the song stub row (`messiaen` / `olivier_messiaen`). */
export function applyMessiaenSongStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  return {
    ...bundle,
    voiceId: 'messiaen',
    harmonicRhythm: {
      ...bundle.harmonicRhythm,
      minChordDurationBars: 2,
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 24),
      allowMidBarChange: false,
    },
    bassPolicy: {
      ...bundle.bassPolicy,
      role: 'root',
      allowOctaveDoubling: false,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'angular',
      maxLeapSemitones: 24,
      preferredIntervalSets: [1, 2, 3, 4, 6],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 14,
      maxSpreadSemitones: 38,
      clusterSizeNotes: [4, 10],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    formPolicy: {
      ...bundle.formPolicy,
      narrativeArc: 'free',
      sectionRecallEnforced: false,
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
        rhythmicIndependenceFloor: 0.7,
        registerInterlock: true,
        intervalPreference: 'ic1_tritone',
      }),
      rhythmicIndependenceFloor: 0.7,
      intervalPreference: 'ic1_tritone',
    },
  };
}