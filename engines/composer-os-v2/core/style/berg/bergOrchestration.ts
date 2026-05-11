/**
 * Berg-style orchestration semantics — four planes, extended techniques, brass/string roles.
 * Metadata / receipts only until exporters consume tags.
 */

export type BergOrchestrationPlane = 'melodic' | 'contrapuntal' | 'harmonic_pad' | 'rhythmic';

export type BergExtendedTechnique =
  | 'sul_ponticello'
  | 'col_legno'
  | 'sprechstimme'
  | 'ord';

export interface BergTechniqueTag {
  technique: BergExtendedTechnique;
  /** Semantic hint for scoring / tension curves. */
  affect?: 'tension' | 'brutality' | 'psychological_rawness' | 'neutral';
}

export function techniqueSemantics(t: BergExtendedTechnique): BergTechniqueTag['affect'] {
  if (t === 'sul_ponticello') return 'tension';
  if (t === 'col_legno') return 'brutality';
  if (t === 'sprechstimme') return 'psychological_rawness';
  return 'neutral';
}

export type BergBrassRegistration = 'muted_pad' | 'open_peak';

export interface BergStringDivisiPolicy {
  /** 0 = dense clusters, 1 = wide harmonic clarity. */
  harmonicClarity: number;
  /** 0 = thin, 1 = saturated divisi. */
  density: number;
}

/**
 * Derive cluster compactness from clarity vs density (0–1 each).
 */
export function clusterCompactnessFromDivisi(p: BergStringDivisiPolicy): number {
  const c = clamp01(p.harmonicClarity);
  const d = clamp01(p.density);
  return (1 - c) * 0.65 + d * 0.35;
}

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
