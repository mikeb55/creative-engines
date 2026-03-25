/**
 * Big band ensemble size / colour — planning-only (Prompt 2/2).
 */

import type { BigBandInstrumentSection } from './bigBandSectionTypes';

export type BigBandEnsembleConfigId =
  | 'full_band'
  | 'medium_band'
  | 'small_band'
  | 'reeds_only'
  | 'brass_only'
  | 'custom';

/** Which horn sections participate (rhythm is always implied true). */
export interface BigBandEnsembleSectionMask {
  saxes: boolean;
  trumpets: boolean;
  trombones: boolean;
  /** Always true in resolved masks — bass + harmony role preserved. */
  rhythm_section: true;
}

export const FULL_BIG_BAND_MASK: BigBandEnsembleSectionMask = {
  saxes: true,
  trumpets: true,
  trombones: true,
  rhythm_section: true,
};
