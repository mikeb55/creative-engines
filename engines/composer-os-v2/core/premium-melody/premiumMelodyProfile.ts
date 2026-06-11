/**
 * Shared premium-melody profile - rhythm/expression params consumed by the engine.
 * Composer-specific builders (e.g. buildBarryHarrisPremiumMelodyProfile) map local profiles here.
 */

export interface PremiumMelodyProfile {
  id: string;
  /** 0-1 - share of quarter-grid strong attacks pushed off-grid. */
  syncopationShiftRate: number;
  /** 0-1 - prefer eighth anticipations (+/-0.5) over weak-quarter slots. */
  anticipationBias: number;
}
