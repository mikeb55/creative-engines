import type { CompositionContext } from '../compositionContext';

/**
 * Songwriter id for a bar — duo section ownership when merged harmony is active, else global primary.
 */
export function composerForBar(barIndex: number, context: CompositionContext): string {
  const meta = context.generationMetadata;
  const fallback = meta.songwriterStyleId ?? '';

  if (meta.duoMergedHarmonyBars && meta.duoSectionOwnership) {
    const owner = meta.duoSectionOwnership[barIndex];
    if (owner === undefined) return fallback;
    const section = meta.duoSongModeSectionPlan?.find((s) => s.sectionLabel === owner);
    if (section) return section.songwriterStyleId;
    return owner;
  }

  return fallback;
}

/** True when metadata carries a 2+ section Duo Song Mode plan. */
export function isDuoModeActive(context: CompositionContext): boolean {
  const plan = context.generationMetadata.duoSongModeSectionPlan;
  return Array.isArray(plan) && plan.length >= 2;
}
