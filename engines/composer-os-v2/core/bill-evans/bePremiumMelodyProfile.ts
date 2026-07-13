/**
 * FROZEN — Bill Evans premium-melody profile (V87 Commit 2c).
 * Stylistic anchor: lyrical ballad float — arch contour, stepwise voice-leading,
 * guide-tone cadences (3rd/7th track on BE_Benchmark_LyricalBallad).
 * Pitch v2: guide-tone track, climax-arc, approach-pattern (opt-in engine blocks).
 */

import type {
  PremiumMelodyPitchProfile,
  PremiumMelodySignatureRuleId,
} from '../premium-melody/premiumMelodyPitchProfile';
import type { PremiumMelodyProfile } from '../premium-melody/premiumMelodyProfile';

export const BE_JAZZ_BALLAD_PITCH_PROFILE_ID = 'be_jazz_ballad_v1';
export const BE_ISOLATION_PROVISIONAL_PROFILE_ID = 'be_jazz_ballad_v1';

/** Evans ballad RH register band — MIDI 55–79 ≈ middle-to-upper staff (G3–G5 written). */
export function buildBillEvansJazzBalladPitchProfile(): PremiumMelodyPitchProfile {
  return {
    id: BE_JAZZ_BALLAD_PITCH_PROFILE_ID,
    pitchSeedSalt: 90301,
    phrasePlanner: {
      contourArc: 'arch',
      registerMinMidi: 55,
      registerMaxMidi: 79,
      cadenceResolutionPc: 4,
      tonalCenterMode: 'chord_third',
      phraseBreakSource: 'premium_melody_phrase',
    },
    slotScorer: {
      weightInterval: 1.0,
      weightPrevInterval: 1.2,
      weightChordFit: 1.7,
      weightGuideToneProximity: 2.1,
      weightMetric: 0.8,
      weightRange: 1.0,
      weightContour: 1.0,
      localContourWeight: 0.95,
      weightPhraseArc: 1.35,
      weightComposerRules: 1.0,
      temperature: 0.4,
      maxLeapSemitones: 5,
      leapRecoveryBars: 2,
      approachPatternRate: 0.6,
      intervalPreference: {
        1: 1.45,
        2: 1.35,
        3: 1.15,
        4: 0.95,
        5: 0.8,
        6: 0.55,
        7: 0.65,
        8: 0.5,
        9: 0.45,
        10: 0.4,
        11: 0.35,
        12: 0.3,
      },
      chordFitVector: {
        root: 0.95,
        third: 1.35,
        fifth: 0.9,
        seventh: 1.25,
        ninth: 1.2,
        eleventh: 1.15,
        thirteenth: 1.05,
        extension: 1.0,
        avoid: 0.2,
      },
      chordFitVectorFunctional: {
        root: 0.5,
        third: 1.6,
        fifth: 0.7,
        seventh: 1.7,
        ninth: 1.3,
        eleventh: 0.8,
        thirteenth: 1.1,
        extension: 1.0,
        avoid: 0.2,
      },
      chordFitVectorTonicMajor: {
        root: 0.6,
        third: 1.5,
        fifth: 0.7,
        sixth: 1.4,
        seventh: 1.0,
        ninth: 1.2,
        eleventh: 0.8,
        thirteenth: 1.0,
        extension: 1.0,
        avoid: 0.2,
      },
    },
    guideTone: {
      enabled: true,
      proximitySigma: 1.5,
      hitBonusPrimary: 1.7,
      hitBonusSecondary: 1.4,
      minExactHitRatePerBar: 0.5,
      maxExactHitRatePerBar: 0.7,
      targetGlobalExactHitRateMin: 0.6,
      targetGlobalExactHitRateMax: 0.7,
      barPrimaryGuideTonePc: {
        1: 5,
        2: 5,
        3: 4,
        4: 6,
        5: 7,
        6: 9,
        7: 5,
        8: 4,
      },
    },
    climaxArc: {
      enabled: true,
      climaxMaxLeapSemitones: 5,
      colorToneBiasEnabled: true,
      colorToneProximitySemitones: 2,
    },
    approachPattern: { enabled: true },
    /**
     * Two-cell interval recall (±2 GCE motif tolerance):
     * Cell A: bars 1–2 → 5–6; Cell B: distinct bars 2–3 → 7–8.
     */
    melodicIntervalCellRecall: {
      enabled: true,
      cellSize: 4,
      intervalTolerance: 2,
      cells: [
        { seedBars: [1, 2], targetBars: [5, 6] },
        { seedBars: [2, 3], targetBars: [7, 8] },
      ],
    },
    surfaceRules: {
      enclosureEnabled: true,
      approachSemitones: [1, -1, 2],
      bluesInflectionRate: 0,
      graceNoteRate: 0.05,
      bendTagRate: 0,
    },
    signatureRules: ['be_voice_leading' as PremiumMelodySignatureRuleId],
  };
}

export function buildBillEvansIsolationProvisionalProfile(): PremiumMelodyProfile {
  return {
    id: BE_ISOLATION_PROVISIONAL_PROFILE_ID,
    syncopationShiftRate: 0.22,
    anticipationBias: 0.25,
    offbeatTrimCeiling: 0.36,
    projectedOffbeatBlockThreshold: 0.42,
    barSlotNudgesEnabled: false,
    clampLastNoteToBarEnd: true,
    structuralLandingMode: 'float_preserve',
    expressionCharacter: 'modal_lyric',
    rhythmSeedSalt: 90301,
    modalLyricVelocityPeak: 77,
    modalLyricVelocityJitter: 1.5,
    cellFamilyWeightScale: {
      long_gap: 4.0,
      delayed: 0.35,
      dotted: 0.25,
      anticipate: 0.15,
      and_of_2: 0.12,
      triplet_pickup: 0.08,
    },
    pitchProfile: buildBillEvansJazzBalladPitchProfile(),
  };
}
