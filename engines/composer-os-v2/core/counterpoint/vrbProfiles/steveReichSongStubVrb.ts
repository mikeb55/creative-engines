/**
 * Steve Reich Song Mode / duo VRB stub — process-field twin of Song Mode `steve_reich`.
 * Must NOT alias into REICH_GLASS (SQ minimalist-process dual-profile).
 * Parallel to Philip Glass film stub (`philip_glass_screen`) vs reich_glass.
 */

import type { VoiceRuleBundle } from '../../composer/voiceRuleBundle';

/** Merge Song Mode process-field posture onto the song stub row (`steve_reich` / `reich`). */
export function applySteveReichSongStubVrbProfile(bundle: VoiceRuleBundle): VoiceRuleBundle {
  return {
    ...bundle,
    voiceId: 'steve_reich',
    harmonicRhythm: {
      ...bundle.harmonicRhythm,
      minChordDurationBars: 8,
      maxChordDurationBars: Math.max(bundle.harmonicRhythm.maxChordDurationBars, 32),
      allowMidBarChange: false,
    },
    bassPolicy: {
      ...bundle.bassPolicy,
      role: 'pattern-bass',
      allowOctaveDoubling: true,
    },
    melodicPolicy: {
      ...bundle.melodicPolicy,
      contour: 'pattern-loop',
      maxLeapSemitones: 7,
      preferredIntervalSets: [2, 3, 4, 5, 7],
    },
    voicingPolicy: {
      ...bundle.voicingPolicy,
      minSpreadSemitones: 7,
      maxSpreadSemitones: 24,
      clusterSizeNotes: [2, 4],
      forbidParallelFifths: false,
      forbidOctaveDoubling: false,
    },
    formPolicy: {
      ...bundle.formPolicy,
      narrativeArc: 'minimalist-process',
      sectionRecallEnforced: false,
    },
    rhythmPolicy: {
      ...bundle.rhythmPolicy,
      antiMetric: false,
    },
    repairPolicy: {
      ...bundle.repairPolicy,
      resolveParallels: false,
    },
    pulseState: 'steady',
    phaseProcessEnabled: true,
    additiveProcessEnabled: true,
    patternIntegrityMinRepeats: 2,
    duoVoicePolicy: {
      ...(bundle.duoVoicePolicy ?? {
        guitarSource: 'soprano_line',
        bassSource: 'bass_line',
        rhythmicIndependenceFloor: 0.42,
        registerInterlock: true,
        intervalPreference: 'diatonic',
      }),
      rhythmicIndependenceFloor: 0.42,
      intervalPreference: 'diatonic',
    },
  };
}