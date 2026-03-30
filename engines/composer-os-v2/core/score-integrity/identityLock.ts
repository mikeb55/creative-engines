/**
 * Identity Lock — shared guard for all mutation passes.
 * Any module that can alter pitch, duration, contour, or note count
 * must call isProtectedBar() before operating on a target bar.
 * Protected bars are currently bar 1 and bar 25.
 * Future: read from context metadata for dynamic hook-tagged regions.
 */
import type { CompositionContext } from '../compositionContext';

/** Currently protected bars — bar 1 (hook statement) and bar 25 (hook return). */
const STATIC_PROTECTED_BARS = new Set([1, 25]);

/**
 * Returns true if the given bar index is identity-protected.
 * Mutation modules must skip or return original material unchanged if true.
 */
export function isProtectedBar(barIndex: number, context?: CompositionContext): boolean {
  if (STATIC_PROTECTED_BARS.has(barIndex)) return true;
  const meta = context?.generationMetadata as Record<string, unknown> | undefined;
  const tagged = meta?.identityLockedBars;
  if (Array.isArray(tagged) && tagged.includes(barIndex)) return true;
  return false;
}

/**
 * Returns true if any bar in the given range intersects a protected region.
 */
export function intersectsProtectedRegion(
  startBar: number,
  endBar: number,
  context?: CompositionContext
): boolean {
  for (let b = startBar; b <= endBar; b++) {
    if (isProtectedBar(b, context)) return true;
  }
  return false;
}
