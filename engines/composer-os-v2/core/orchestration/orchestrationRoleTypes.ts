/**
 * Shared orchestration layer — ensemble-agnostic role labels (Prompt 4/7).
 * Planning metadata only; no score generation.
 */

/** Canonical role labels usable across duo, ECM chamber, big band, string quartet, lead-sheet. */
export type OrchestrationRoleLabel =
  | 'lead'
  | 'support'
  | 'pad'
  | 'counterline'
  | 'bass_anchor'
  | 'inner_motion'
  | 'silence';

/** Melodic/harmonic responsibility for a part. */
export type InstrumentRole = OrchestrationRoleLabel;

/** Layering / textural responsibility (same vocabulary; interpreted in context). */
export type TextureRole = OrchestrationRoleLabel;
