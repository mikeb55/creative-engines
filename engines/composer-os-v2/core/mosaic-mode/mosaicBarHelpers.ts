import type { CompositionContext } from '../compositionContext';

/**
 * Songwriter id for a bar — duo section ownership when merged harmony is active, else global primary.
 */
export function composerForBar(barIndex: number, context: CompositionContext): string {
  const meta = context.generationMetadata;
  const fallback = meta.songwriterStyleId ?? '';

  if (meta.mosaicMergedHarmonyBars && meta.mosaicSectionOwnership) {
    const owner = meta.mosaicSectionOwnership[barIndex];
    if (owner === undefined) return fallback;
    const section = meta.mosaicSectionPlan?.find((s) => s.sectionLabel === owner);
    if (section) return section.songwriterStyleId;
    return owner;
  }

  return fallback;
}

/** True when metadata carries a 2+ section Mosaic Mode plan. */
export function isMosaicModeActive(context: CompositionContext): boolean {
  const plan = context.generationMetadata.mosaicSectionPlan;
  return Array.isArray(plan) && plan.length >= 2;
}
