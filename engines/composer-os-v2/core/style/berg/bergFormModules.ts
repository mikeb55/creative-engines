/**
 * Berg-family formal scaffolds — passacaglia / suite / sonata / invention / palindrome,
 * climax scheduling, structural silence tags (planning + receipts).
 */

export type BergFormKind = 'passacaglia' | 'suite' | 'sonata' | 'invention' | 'palindrome';

export type BergStructuralPunctuation = 'silence' | 'fermata';

export interface BergSilenceTag {
  kind: BergStructuralPunctuation;
  /** 1-based bar index. */
  barIndex: number;
  /** Optional beat within bar (1-based). */
  beat?: number;
  durationBeats?: number;
}

/** Mirrored section lengths (bars) around pivot; pivot bar counted once if odd total. */
export interface BergPalindromePlan {
  segmentBarCounts: readonly number[];
  pivotBarIndex: number;
}

export interface BergClimaxPlan {
  /** Primary climax bar (1-based), targeted at ~0.62–0.68 of movement length. */
  climaxBar: number;
  /** Normalized position in (0.6, 0.7) when movementBars ≥ 8. */
  climaxNormalized: number;
  /** Planning hint: raise density + ic1/ic6 cadential emphasis near climax. */
  densityLift: number;
  ic16Lift: number;
}

export function planPalindromeBars(totalBars: number): BergPalindromePlan | null {
  if (totalBars < 4) return null;
  const pivotBarIndex = Math.ceil(totalBars / 2);
  const leftBars = pivotBarIndex - 1;
  const rightBars = totalBars - pivotBarIndex;
  return {
    segmentBarCounts: [leftBars, 1, rightBars],
    pivotBarIndex,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Place climax between 0.6–0.7 of movement; slight deterministic lift values for layering.
 */
export function scheduleClimax(movementBars: number, seedSalt = 0): BergClimaxPlan {
  const tb = Math.max(1, movementBars);
  const u = ((seedSalt * 1103515245 + 12345) >>> 0) / 0xffffffff;
  const targetNorm = 0.6 + u * 0.1;
  let climaxBar = Math.round(tb * targetNorm);
  climaxBar = clamp(climaxBar, 2, Math.max(2, tb - 1));
  const climaxNormalized = climaxBar / tb;
  return {
    climaxBar,
    climaxNormalized,
    densityLift: 0.55 + u * 0.2,
    ic16Lift: 0.5 + u * 0.25,
  };
}

export function tagStructuralSilences(
  totalBars: number,
  seedSalt: number,
  maxTags = 4
): BergSilenceTag[] {
  const out: BergSilenceTag[] = [];
  if (totalBars < 6) return out;
  const clim = scheduleClimax(totalBars, seedSalt);
  out.push({ kind: 'fermata', barIndex: clim.climaxBar });
  let h = seedSalt >>> 0;
  for (let t = 0; t < maxTags - 1; t++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const barIndex = 1 + (h % totalBars);
    const kind: BergStructuralPunctuation = h % 2 === 0 ? 'silence' : 'fermata';
    out.push({ kind, barIndex, durationBeats: 1 + (h % 2) });
  }
  out.sort((a, b) => a.barIndex - b.barIndex);
  return out;
}
