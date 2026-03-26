/**
 * Modulation planning — guide layer only (not a chord generator). V4.0 Prompt 1/8.
 */

/** Supported transition families for section boundaries. */
export type ModulationType = 'none' | 'pivot' | 'chromatic' | 'modal' | 'direct';

/** Human-readable transition intent (planner output). */
export type TransitionIntent =
  | 'hold'
  | 'pivot_common_tone'
  | 'chromatic_approach'
  | 'modal_mixture'
  | 'direct_key_change'
  | 'dominant_prep'
  | 'semitone_slip'
  | 'tritone_bridge';

export type ReturnIntent =
  | 'none'
  | 'authentic'
  | 'plagal_colourized'
  | 'semitone_return'
  | 'modal_return'
  | 'transformed_cadence';
