/**
 * Composer OS V2 — Triad Pairs module types
 * Bergonzi structure + Klemons guitar-aware execution.
 */

export const TRIAD_PAIRS_MODULE_ID = 'triad_pairs';

export interface TriadPairHints {
  pairedTriads: boolean;
  stableVsColourAlternation: boolean;
  dyadExtraction: boolean;
  syncopatedPlacement: boolean;
}
