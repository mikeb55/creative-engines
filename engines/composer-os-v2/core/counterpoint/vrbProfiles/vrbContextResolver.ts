/**
 * Per-bar SQ→BB VRB resolution from section context map + form sections.
 */

import type { CompositionContext } from '../../compositionContext';
import { getSqVrbProfile } from './sqVrbProfileRegistry';
import {
  buildGlobalVrbContextMap,
  resolveSectionVrbId,
  USE_PER_SECTION_VRB,
  type SectionVrbContext,
  type VrbContextMap,
} from './vrbContextMap';

export interface BarSectionContext {
  bar: number;
  sectionId: string;
  /** dominant vrbId for this bar */
  vrbId: string;
  isTransitionBar: boolean;
}

export type SqToBbFormSectionRef = { label: string; startBar: number; length: number };

export function perSectionVrbResolutionEnabled(): boolean {
  return USE_PER_SECTION_VRB || process.env.COMPOSER_OS_TEST_PER_SECTION_VRB === '1';
}

/** Multi-label section map on metadata (not legacy sq_bb-only global). */
export function hasExplicitPerSectionVrbAssignment(context: CompositionContext): boolean {
  const stored = context.generationMetadata?.sqToBbVrbContextBySection;
  if (!stored) return false;
  const keys = Object.keys(stored);
  if (keys.length === 0) return false;
  const hasBlend = Object.values(stored).some(
    (ctx) => Boolean(ctx.blendedVrbId) || (ctx.vrbs?.length ?? 0) >= 2,
  );
  if (hasBlend) return true;
  return keys.length > 1 || keys[0] !== 'sq_bb';
}

/** Resolved SQ profile for a section (blended or single). */
export function resolveSqVrbProfileForSection(ctx: SectionVrbContext): ReturnType<typeof getSqVrbProfile> {
  return getSqVrbProfile(resolveSectionVrbId(ctx));
}

function findSectionForBar(
  bar: number,
  sections: readonly SqToBbFormSectionRef[],
): SqToBbFormSectionRef | null {
  for (const section of sections) {
    if (bar >= section.startBar && bar < section.startBar + section.length) {
      return section;
    }
  }
  return null;
}

function isBarInSectionTransition(
  bar: number,
  section: SqToBbFormSectionRef,
  sectionCtx: SectionVrbContext,
): boolean {
  const transitionBars = sectionCtx.transitionBars;
  if (transitionBars <= 0) return false;
  const sectionEndBar = section.startBar + section.length - 1;
  const transitionStartBar = sectionEndBar - transitionBars + 1;
  return bar >= transitionStartBar && bar <= sectionEndBar;
}

function globalBarSectionContext(bar: number, globalFallback: string): BarSectionContext {
  return {
    bar,
    sectionId: 'sq_bb',
    vrbId: globalFallback,
    isTransitionBar: false,
  };
}

export function resolveVrbForBar(
  bar: number,
  contextMap: VrbContextMap,
  globalFallback: string,
  sections: readonly SqToBbFormSectionRef[],
): BarSectionContext {
  if (!perSectionVrbResolutionEnabled()) {
    return globalBarSectionContext(bar, globalFallback);
  }

  const section = findSectionForBar(bar, sections);
  if (!section) {
    return globalBarSectionContext(bar, globalFallback);
  }

  const sectionCtx = contextMap.get(section.label);
  if (!sectionCtx) {
    return globalBarSectionContext(bar, globalFallback);
  }

  return {
    bar,
    sectionId: section.label,
    vrbId: resolveSectionVrbId(sectionCtx) || globalFallback,
    isTransitionBar: isBarInSectionTransition(bar, section, sectionCtx),
  };
}

export function vrbContextMapFromSectionRecord(
  record: Readonly<Record<string, SectionVrbContext>> | undefined,
): VrbContextMap {
  if (!record) return new Map();
  return new Map(Object.entries(record));
}

export function sectionRecordFromVrbContextMap(map: VrbContextMap): Record<string, SectionVrbContext> {
  return Object.fromEntries(map.entries());
}

/** Read SQ→BB VRB wire from composition context (map, sections, global fallback). */
export function readSqToBbVrbWire(context: CompositionContext): {
  contextMap: VrbContextMap;
  sections: SqToBbFormSectionRef[];
  globalFallback: string;
} {
  const totalBars = context.form?.totalBars ?? 32;
  const globalFallback =
    context.generationMetadata?.sqLineVrbId ??
    context.voiceBundle?.sqVrbProfileId ??
    context.voiceBundle?.contrapuntalLinePolicy?.vrbId ??
    '';
  const sections: SqToBbFormSectionRef[] =
    context.form?.sections?.map((s) => ({
      label: s.label,
      startBar: s.startBar,
      length: s.length,
    })) ?? [{ label: 'sq_bb', startBar: 1, length: totalBars }];
  const stored = context.generationMetadata?.sqToBbVrbContextBySection;
  const contextMap = stored
    ? vrbContextMapFromSectionRecord(stored)
    : buildGlobalVrbContextMap(globalFallback, totalBars);
  return { contextMap, sections, globalFallback };
}
