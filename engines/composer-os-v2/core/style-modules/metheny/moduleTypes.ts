/**
 * Composer OS V2 — Metheny style module types
 */

export const METHENY_MODULE_ID = 'metheny';

export interface MethenyStyleHints {
  lyricalMotif: boolean;
  intervallicShapes: boolean;
  sustainTendency: number;
  attackDensityReduced: boolean;
  phraseOverBarlines: boolean;
}
