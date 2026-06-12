/**
 * PROVISIONAL — Jimi Hendrix premium-melody profile (V89 Commit 2a/2b).
 * Pitch layer jh_blues_lead_v1: blues inflection, pentatonic anchor, riff recall,
 * call-response phrase architecture (4th optional pitch mechanism).
 * Reuses BH benchmark pitches for isolation/determinism only — native benchmark in 2c.
 */

import type {
  PremiumMelodyPitchProfile,
  PremiumMelodySignatureRuleId,
} from '../premium-melody/premiumMelodyPitchProfile';
import type { PremiumMelodyProfile } from '../premium-melody/premiumMelodyProfile';

export const JH_BLUES_LEAD_PITCH_PROFILE_ID = 'jh_blues_lead_v1';
export const JH_ISOLATION_PROVISIONAL_PROFILE_ID = 'jh_blues_lead_v1';

export function buildHendrixBluesLeadPitchProfile(): PremiumMelodyPitchProfile {
  return {
    id: JH_BLUES_LEAD_PITCH_PROFILE_ID,
    pitchSeedSalt: 90303,
    phrasePlanner: {
      contourArc: 'call_response_variation',
      registerMinMidi: 52,
      registerMaxMidi: 74,
      cadenceResolutionPc: 10,
      tonalCenterMode: 'chord_root',
      phraseBreakSource: 'premium_melody_phrase',
    },
    slotScorer: {
      weightInterval: 1.0,
      weightPrevInterval: 1.0,
      weightChordFit: 1.5,
      weightMetric: 0.9,
      weightRange: 1.0,
      weightContour: 1.1,
      weightComposerRules: 1.0,
      temperature: 0.52,
      maxLeapSemitones: 12,
      leapRecoveryBars: 1,
      intervalPreference: {
        1: 1.1,
        2: 1.2,
        3: 1.4,
        4: 1.05,
        5: 1.3,
        6: 1.15,
        7: 1.25,
        8: 0.9,
        9: 0.75,
        10: 1.2,
        11: 0.7,
        12: 0.65,
      },
      chordFitVector: {
        root: 1.3,
        third: 1.1,
        fifth: 0.85,
        seventh: 1.35,
        ninth: 1.05,
        eleventh: 0.9,
        thirteenth: 0.85,
        extension: 0.95,
        avoid: 0.4,
      },
    },
    bluesInflection: {
      enabled: true,
      minorThirdFifthMultiplier: 1.3,
      flatSeventhMultiplier: 1.2,
      weakBeatMultiplier: 1.08,
      globalWeight: 1.12,
    },
    pentatonicAnchor: {
      enabled: true,
      anchorPitchClasses: [0, 3, 5, 7, 10],
      baseWeight: 0.92,
      anchorHitBonus: 1.25,
    },
    riffCellRecall: {
      enabled: true,
      cells: [
        { intervals: [0, 3, 5, 7], weight: 1.0 },
        { intervals: [0, 3, 5, 10], weight: 1.0 },
        { intervals: [0, 2, 4, 7], weight: 0.85 },
        { intervals: [0, 4, 7, 9], weight: 0.85 },
        { intervals: [0, 3, 4, 5], weight: 0.7 },
      ],
      firstRecallMultiplier: 1.24,
      secondRecallMultiplier: 1.18,
      exactTranspositionMultiplier: 1.1,
      exactCopyPenalty: 0.6,
    },
    callResponsePhraseScore: {
      enabled: true,
      callSimilarityTarget: 0.55,
      responseMutationBonus: 1.32,
      exactPhraseRepeatPenalty: 0.52,
      bar3IntensityLift: 1.18,
      phraseEndSustainBonus: 1.25,
      longTargetVibratoBonus: 1.2,
    },
    surfaceRules: {
      enclosureEnabled: false,
      approachSemitones: [],
      bluesInflectionRate: 0,
      graceNoteRate: 0.08,
      bendTagRate: 0.25,
    },
    signatureRules: ['jh_blues_lead' as PremiumMelodySignatureRuleId],
  };
}

export function buildHendrixIsolationProvisionalProfile(): PremiumMelodyProfile {
  return {
    id: JH_ISOLATION_PROVISIONAL_PROFILE_ID,
    syncopationShiftRate: 0.4,
    anticipationBias: 0.3,
    offbeatTrimCeiling: 0.52,
    barSlotNudgesEnabled: false,
    structuralLandingMode: 'float_preserve',
    expressionCharacter: 'modal_lyric',
    rhythmSeedSalt: 90303,
    pitchProfile: buildHendrixBluesLeadPitchProfile(),
  };
}
