import type { FormMap, GenerationMetadata } from '../compositionContext';

/** One section entry from {@link GenerationMetadata.mosaicSectionPlan} (Step 1). */
export type MosaicModeSectionPlanEntry = NonNullable<
  GenerationMetadata['mosaicSectionPlan']
>[number];

export interface SectionComposerRouting {
  mode: 'single' | 'duo';
  primarySongwriterStyleId: string;
  barComposerMap: Record<number, string>;
  sectionComposerMap: MosaicModeSectionPlanEntry[];
}

function buildSingleComposerRouting(
  formMap: FormMap,
  songwriterStyleId: string
): SectionComposerRouting {
  const barComposerMap: Record<number, string> = {};
  for (let bar = 1; bar <= formMap.totalBars; bar++) {
    barComposerMap[bar] = songwriterStyleId;
  }
  return {
    mode: 'single',
    primarySongwriterStyleId: songwriterStyleId,
    barComposerMap,
    sectionComposerMap: [],
  };
}

function findUnmappedBars(
  formMap: FormMap,
  barComposerMap: Record<number, string>
): number[] {
  const missing: number[] = [];
  for (let bar = 1; bar <= formMap.totalBars; bar++) {
    const styleId = barComposerMap[bar];
    if (styleId === undefined || styleId === '') {
      missing.push(bar);
    }
  }
  return missing;
}

/**
 * Pure resolver: map each form bar to a songwriter style from metadata.
 * Single-composer when `mosaicSectionPlan` is absent or has fewer than 2 entries;
 * duo mode when the plan has 2+ contiguous section ranges covering every bar.
 */
export function resolveMosaicSectionStyles(
  formMap: FormMap,
  generationMetadata: GenerationMetadata
): SectionComposerRouting {
  const plan = generationMetadata.mosaicSectionPlan;

  if (!plan || plan.length === 0 || plan.length < 2) {
    const songwriterStyleId = generationMetadata.songwriterStyleId;
    if (!songwriterStyleId) {
      throw new Error(
        'resolveMosaicSectionStyles: songwriterStyleId is required when mosaicSectionPlan is absent or has fewer than 2 entries'
      );
    }
    return buildSingleComposerRouting(formMap, songwriterStyleId);
  }

  const barComposerMap: Record<number, string> = {};
  for (const section of plan) {
    if (section.startBar > section.endBar) {
      throw new Error(
        `resolveMosaicSectionStyles: section "${section.sectionLabel}" has startBar ${section.startBar} > endBar ${section.endBar}`
      );
    }
    for (let bar = section.startBar; bar <= section.endBar; bar++) {
      const existing = barComposerMap[bar];
      if (existing !== undefined && existing !== section.songwriterStyleId) {
        throw new Error(
          `resolveMosaicSectionStyles: bar ${bar} is covered by overlapping sections with different songwriterStyleId values ("${existing}" vs "${section.songwriterStyleId}")`
        );
      }
      barComposerMap[bar] = section.songwriterStyleId;
    }
  }

  const unmappedBars = findUnmappedBars(formMap, barComposerMap);
  if (unmappedBars.length > 0) {
    const listed =
      unmappedBars.length <= 12
        ? unmappedBars.join(', ')
        : `${unmappedBars.slice(0, 12).join(', ')} … (+${unmappedBars.length - 12} more)`;
    throw new Error(
      `resolveMosaicSectionStyles: mosaicSectionPlan does not cover every bar 1–${formMap.totalBars}; unmapped bar(s): ${listed}`
    );
  }

  return {
    mode: 'duo',
    primarySongwriterStyleId: plan[0]!.songwriterStyleId,
    barComposerMap,
    sectionComposerMap: plan.map((entry) => ({ ...entry })),
  };
}
