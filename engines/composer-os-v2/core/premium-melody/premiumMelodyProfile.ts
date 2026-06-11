/**
 * Shared premium-melody profile - rhythm/expression params consumed by the engine.
 * Composer-specific builders (e.g. buildBarryHarrisPremiumMelodyProfile) map local profiles here.
 */

/** Beat-1/3 grounded structural landing (Barry Harris default). */
export type PremiumMelodyStructuralLandingMode = 'bh_grounded';

/** Barry Harris bebop articulation + velocity arc (default expression character). */
export type PremiumMelodyExpressionCharacter = 'bh_bebop';

export const PREMIUM_MELODY_DEFAULT_OFFBEAT_TRIM_CEILING = 0.74;
export const PREMIUM_MELODY_DEFAULT_BAR_SLOT_NUDGES_ENABLED = true;
export const PREMIUM_MELODY_DEFAULT_STRUCTURAL_LANDING_MODE: PremiumMelodyStructuralLandingMode =
  'bh_grounded';
export const PREMIUM_MELODY_DEFAULT_PROJECTED_OFFBEAT_BLOCK_THRESHOLD = 0.72;
export const PREMIUM_MELODY_DEFAULT_REST_PHRASE_BREAK_BEATS = 1.75;
export const PREMIUM_MELODY_DEFAULT_LONG_NOTE_PHRASE_BREAK_BEATS = 1.25;
export const PREMIUM_MELODY_DEFAULT_EXPRESSION_CHARACTER: PremiumMelodyExpressionCharacter =
  'bh_bebop';
export const PREMIUM_MELODY_DEFAULT_RHYTHM_SEED_SALT = 0;

export interface PremiumMelodyProfile {
  id: string;
  /** 0-1 - share of quarter-grid strong attacks pushed off-grid. */
  syncopationShiftRate: number;
  /** 0-1 - prefer eighth anticipations (+/-0.5) over weak-quarter slots. */
  anticipationBias: number;
  /** Max interior offbeat ratio before trim pass snaps attacks to quarter grid. */
  offbeatTrimCeiling?: number;
  /** When true, multi-note bars get late-bar slot nudges (BH default). */
  barSlotNudgesEnabled?: boolean;
  /** Structural phrase-start/end onset anchoring strategy. */
  structuralLandingMode?: PremiumMelodyStructuralLandingMode;
  /** Projected offbeat rate above which triplet_pickup + anticipate are blocked. */
  projectedOffbeatBlockThreshold?: number;
  /** Silent gap (beats) that triggers a rest-like phrase break. */
  restPhraseBreakBeats?: number;
  /** Held-note duration (beats) that can trigger phrase break with trailing silence. */
  longNotePhraseBreakBeats?: number;
  /** Articulation / velocity / durationAccent character selector. */
  expressionCharacter?: PremiumMelodyExpressionCharacter;
  /** XOR salt mixed into per-note rhythm PRNG derivation (0 = legacy BH). */
  rhythmSeedSalt?: number;
}
