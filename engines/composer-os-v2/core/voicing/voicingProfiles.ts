/**
 * Default register centers (MIDI) per orchestration part id — spacing hints only.
 */

import { BB_PART_RHYTHM, BB_PART_SAXES, BB_PART_TROMBONES, BB_PART_TRUMPETS } from '../big-band/buildBigBandOrchestrationPlan';
import { SQ_PART_V1, SQ_PART_V2, SQ_PART_VA, SQ_PART_VC } from '../string-quartet/stringQuartetTypes';

export const BIG_BAND_REGISTER_CENTER: Record<string, number> = {
  [BB_PART_SAXES]: 66,
  [BB_PART_TRUMPETS]: 72,
  [BB_PART_TROMBONES]: 58,
  [BB_PART_RHYTHM]: 46,
};

export const QUARTET_REGISTER_CENTER: Record<string, number> = {
  [SQ_PART_V1]: 76,
  [SQ_PART_V2]: 69,
  [SQ_PART_VA]: 62,
  [SQ_PART_VC]: 48,
};

/** Absolute bounds per part for sanity checks (MIDI). */
export const BIG_BAND_MIDI_BOUNDS: Record<string, readonly [number, number]> = {
  [BB_PART_SAXES]: [55, 82],
  [BB_PART_TRUMPETS]: [60, 86],
  [BB_PART_TROMBONES]: [48, 72],
  [BB_PART_RHYTHM]: [36, 55],
};

export const QUARTET_MIDI_BOUNDS: Record<string, readonly [number, number]> = {
  [SQ_PART_V1]: [65, 96],
  [SQ_PART_V2]: [60, 84],
  [SQ_PART_VA]: [55, 77],
  [SQ_PART_VC]: [36, 65],
};
