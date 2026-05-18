/**
 * Per-section VRB context map — weights, dominant VRB, global backwards-compat builder.
 */

export interface VrbWeight {
  vrbId: string;
  /** 0.0–1.0; must sum to 1.0 per section */
  weight: number;
}

export interface SectionVrbContext {
  sectionId: string;
  /** length 1 = pure assignment; length N = blend (future) */
  vrbs: VrbWeight[];
  /** auto-computed, not user-facing */
  transitionBars: number;
}

export type VrbContextMap = Map<string, SectionVrbContext>;

const WEIGHT_SUM_TOLERANCE = 0.001;

/** Returns vrbId of highest-weight entry (O(1) when vrbs.length === 1). */
export function dominantVrb(ctx: SectionVrbContext): string {
  if (ctx.vrbs.length === 1) {
    return ctx.vrbs[0]!.vrbId;
  }
  let best = ctx.vrbs[0]!;
  for (let i = 1; i < ctx.vrbs.length; i++) {
    const entry = ctx.vrbs[i]!;
    if (entry.weight > best.weight) {
      best = entry;
    }
  }
  return best.vrbId;
}

/**
 * Single-section map for legacy compositions (sectionId `sq_bb`, bars 1..totalBars).
 * Used until a per-section map is supplied.
 */
export function buildGlobalVrbContextMap(vrbId: string, _totalBars: number): VrbContextMap {
  const ctx: SectionVrbContext = {
    sectionId: 'sq_bb',
    vrbs: [{ vrbId, weight: 1 }],
    transitionBars: 0,
  };
  return new Map([['sq_bb', ctx]]);
}

export function validateVrbWeights(ctx: SectionVrbContext): boolean {
  const sum = ctx.vrbs.reduce((acc, w) => acc + w.weight, 0);
  return Math.abs(sum - 1) <= WEIGHT_SUM_TOLERANCE;
}
