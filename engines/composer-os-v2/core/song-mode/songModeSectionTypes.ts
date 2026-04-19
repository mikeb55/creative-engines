/**
 * Song Mode — shared section-role control (form-relative, reusable across songwriter/style slices).
 */

/** Roles are derived from form geometry + bar index, not hardcoded song layouts. */
export type SongModeSectionRole = 'OPENING' | 'BRIDGE_LIFT' | 'RETURN' | 'WHOLE' | 'OUTRO';

export type SongModeReturnVariationType =
  | 'none'
  | 'lighter_texture'
  | 'harmonic_recolour'
  | 'delayed_reentry'
  | 'evolved_comp';

/**
 * Compact per-slice declaration of section intent (biases are interpretive / metadata — not bar ranges).
 * Slices attach one descriptor when their surface applies; `finalizeSongModeSectionShaping` aggregates.
 */
export interface SongModeSectionBehaviourDescriptor {
  sliceId: string;
  densityBiasByRole?: Partial<Record<SongModeSectionRole, number>>;
  registerBiasByRole?: Partial<Record<SongModeSectionRole, number>>;
  harmonicColourBiasByRole?: Partial<Record<SongModeSectionRole, number>>;
  entryReturnGestures?: {
    emphasizeOpening?: boolean;
    emphasizeBridgeLift?: boolean;
    softenReturn?: boolean;
    reinforceOpening?: boolean;
  };
  returnVariationType?: SongModeReturnVariationType;
}

/** Stable eval / manifest payload (versioned). */
export interface SongModeSectionShapingDiagnosticsV1 {
  version: 1;
  totalBars: number;
  /** B vs A density — prefer Fagen keys-comp musical metrics when present. */
  densityDeltaBMinusA: number | null;
  /** B vs A harmonic colour — from Sophisticated Pop / Bacharach harmony diagnostics when present. */
  colourDeltaBMinusA: number | null;
  /** Opening vs return — prefer Fagen keys-comp rhythm delta when present. */
  openingVsReturnDelta: number | null;
  returnVariationSummary: string | null;
  returnVariationType: SongModeReturnVariationType | null;
  contributingSlices: string[];
}
