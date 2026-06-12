/**
 * PROVISIONAL — Bill Evans premium-melody profile (V87 Commit 2b).
 * Stylistic anchor: "My Foolish Heart" / "Peace Piece" / "Blue in Green" —
 * floating pulse, arch contour, stepwise voice-leading, chord-tone cadences.
 * Reuses BH benchmark pitches for isolation until native benchmark in 2c.
 */

import type { PremiumMelodyPitchProfile } from '../premium-melody/premiumMelodyPitchProfile';
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
      /** Runtime picks chord 3rd or 7th closer to prev pitch at phrase cadences. */
      cadenceResolutionPc: 4,
      tonalCenterMode: 'chord_third',
      phraseBreakSource: 'premium_melody_phrase',
    },
    slotScorer: {
      weightInterval: 1.0,
      weightPrevInterval: 1.35,
      weightChordFit: 1.5,
      weightMetric: 0.85,
      weightRange: 1.1,
      weightContour: 1.25,
      weightComposerRules: 1.0,
      temperature: 0.42,
      maxLeapSemitones: 7,
      leapRecoveryBars: 2,
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
    },
    surfaceRules: {
      enclosureEnabled: true,
      approachSemitones: [1, -1, 2],
      bluesInflectionRate: 0,
      graceNoteRate: 0.05,
      bendTagRate: 0,
    },
    signatureRules: [],
  };
}

export function buildBillEvansIsolationProvisionalProfile(): PremiumMelodyProfile {
  return {
    id: BE_ISOLATION_PROVISIONAL_PROFILE_ID,
    syncopationShiftRate: 0.22,
    anticipationBias: 0.25,
    /** Trim to 2b-provisional offbeat band (0.20–0.40) on BH isolation benchmark. */
    offbeatTrimCeiling: 0.36,
    projectedOffbeatBlockThreshold: 0.42,
    barSlotNudgesEnabled: false,
    structuralLandingMode: 'float_preserve',
    expressionCharacter: 'modal_lyric',
    rhythmSeedSalt: 90301,
    /** Narrower ballad dynamics vs Wayne modal_lyric defaults (spread ≤10). */
    modalLyricVelocityPeak: 77,
    modalLyricVelocityJitter: 1.5,
    /** Ballad pulse: favour on-beat long_gap cells → lower offbeat + IOI entropy. */
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
