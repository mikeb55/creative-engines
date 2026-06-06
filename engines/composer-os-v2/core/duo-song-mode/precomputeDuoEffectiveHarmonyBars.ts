/**
 * Duo Song Mode Step 3 — per-section tonic map + precompute orchestrator + merged harmony wire.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { precomputeVerlaineEffectiveHarmonyBars } from '../song-mode/verlainFieldSlice';
import { precomputeMarrEffectiveHarmonyBars } from '../song-mode/marrMelodicSlice';
import type { SectionComposerRouting } from './resolveSectionSongwritingStyles';

export type DuoSongModeSectionPlan = NonNullable<GenerationMetadata['duoSongModeSectionPlan']>;

export type DuoSongModeSectionPlanEntry = DuoSongModeSectionPlan[number];

/** sectionLabel → tonic pitch class (0–11). */
export type DuoTonicMap = Record<string, number>;

export interface DuoMergedHarmonyBars {
  bars: string[];
  sectionOwnership: Record<number, string>;
}

const ROOT_AT_START = /^([A-G](?:#|b)?)/;

function harmonyRootPc(symbol: string): number | undefined {
  const h = parseChordSymbol(symbol).harmonyPart;
  const m = h.match(ROOT_AT_START);
  if (!m?.[1]) return undefined;
  return noteNameToPitchClass(m[1]);
}

/**
 * Locked-harmony chord read for tonic map — mirrors {@link resolveBarSymbol} spine for custom locked bars
 * without importing harmonySpineProvider (Step 3 scope boundary).
 */
function chordSymbolAtBar(context: CompositionContext, barIndex: number): string {
  const tb = context.form.totalBars;
  if (barIndex < 1 || barIndex > tb) {
    throw new Error(
      `precomputeDuoEffectiveHarmonyBars: bar ${barIndex} out of range 1–${tb}`
    );
  }

  const hcCanon = context.harmonyContext;
  if (hcCanon && hcCanon.bars.length === tb) {
    return hcCanon.bars[barIndex - 1] ?? '';
  }

  const locked = context.lockedHarmonyBarsRaw;
  if (locked && locked.length === tb) {
    return locked[barIndex - 1] ?? '';
  }

  const parsed = context.generationMetadata?.parsedCustomProgressionBars;
  if (parsed && parsed.length === tb) {
    return parsed[barIndex - 1] ?? '';
  }

  throw new Error(
    `buildDuoTonicMap: no authoritative harmony at bar ${barIndex} — set lockedHarmonyBarsRaw or parsedCustomProgressionBars covering totalBars`
  );
}

/**
 * For each section, infer tonic from that section's first bar (not global bar 1).
 */
export function buildDuoTonicMap(
  sectionPlan: DuoSongModeSectionPlan,
  context: CompositionContext
): DuoTonicMap {
  const map: DuoTonicMap = {};
  for (const section of sectionPlan) {
    const symbol = chordSymbolAtBar(context, section.startBar);
    const tonicPc = harmonyRootPc(symbol);
    if (tonicPc === undefined) {
      throw new Error(
        `buildDuoTonicMap: could not infer tonic pitch class from "${symbol}" at bar ${section.startBar} (section "${section.sectionLabel}")`
      );
    }
    map[section.sectionLabel] = tonicPc;
  }
  return map;
}

function assertSectionsCoverForm(
  totalBars: number,
  sections: readonly DuoSongModeSectionPlanEntry[]
): void {
  const covered = new Set<number>();
  for (const section of sections) {
    if (section.startBar > section.endBar) {
      throw new Error(
        `precomputeDuoEffectiveHarmonyBars: section "${section.sectionLabel}" has startBar ${section.startBar} > endBar ${section.endBar}`
      );
    }
    for (let bar = section.startBar; bar <= section.endBar; bar++) {
      covered.add(bar);
    }
  }
  const missing: number[] = [];
  for (let bar = 1; bar <= totalBars; bar++) {
    if (!covered.has(bar)) missing.push(bar);
  }
  if (missing.length > 0) {
    const listed =
      missing.length <= 12
        ? missing.join(', ')
        : `${missing.slice(0, 12).join(', ')} … (+${missing.length - 12} more)`;
    throw new Error(
      `precomputeDuoEffectiveHarmonyBars: section plan does not cover every bar 1–${totalBars}; unmapped bar(s): ${listed}`
    );
  }
}

function sliceLockedHarmony(
  bars: readonly string[] | undefined,
  startBar: number,
  endBar: number
): string[] | undefined {
  if (!bars || bars.length === 0) return undefined;
  return bars.slice(startBar - 1, endBar);
}

function cloneContextForSection(
  context: CompositionContext,
  section: DuoSongModeSectionPlanEntry,
  tonicPc: number
): CompositionContext {
  const span = section.endBar - section.startBar + 1;
  const slicedLocked = sliceLockedHarmony(context.lockedHarmonyBarsRaw, section.startBar, section.endBar);
  const slicedParsed = sliceLockedHarmony(
    context.generationMetadata.parsedCustomProgressionBars,
    section.startBar,
    section.endBar
  );
  const slicedHarmonyContext =
    context.harmonyContext && context.harmonyContext.bars.length >= section.endBar
      ? {
          ...context.harmonyContext,
          bars: context.harmonyContext.bars.slice(section.startBar - 1, section.endBar),
        }
      : undefined;

  const genMeta: GenerationMetadata & Record<string, unknown> = {
    ...context.generationMetadata,
    songwriterStyleId: section.songwriterStyleId,
    duoTonicPc: tonicPc,
    verlaineEffectiveHarmonyBars: undefined,
    marrEffectiveHarmonyBars: undefined,
    verlaineFieldPlan: undefined,
    marrMelodicPlan: undefined,
    verlaineDeviceReceipts: undefined,
    marrDeviceReceipts: undefined,
  };

  if (slicedParsed) {
    genMeta.parsedCustomProgressionBars = slicedParsed;
  }

  return {
    ...context,
    form: {
      ...context.form,
      totalBars: span,
      sections: [
        {
          label: section.sectionLabel,
          startBar: 1,
          length: span,
        },
      ],
    },
    lockedHarmonyBarsRaw: slicedLocked ?? context.lockedHarmonyBarsRaw,
    harmonyContext: slicedHarmonyContext,
    generationMetadata: genMeta,
  };
}

function runPrecomputeForComposer(context: CompositionContext, composerId: string): void {
  switch (composerId) {
    case 'verlaine':
      precomputeVerlaineEffectiveHarmonyBars(context);
      return;
    case 'marr':
      precomputeMarrEffectiveHarmonyBars(context);
      return;
    default:
      throw new Error(
        `precomputeDuoEffectiveHarmonyBars: unsupported duo section composer "${composerId}" — supported: verlaine, marr`
      );
  }
}

function extractEffectiveHarmonyBars(
  metadata: GenerationMetadata,
  composerId: string,
  sectionLabel: string
): string[] {
  if (composerId === 'verlaine') {
    const bars = metadata.verlaineEffectiveHarmonyBars;
    if (!Array.isArray(bars) || bars.length === 0) {
      throw new Error(
        `precomputeDuoEffectiveHarmonyBars: verlaineEffectiveHarmonyBars missing after precompute (section "${sectionLabel}")`
      );
    }
    return bars;
  }
  if (composerId === 'marr') {
    const bars = metadata.marrEffectiveHarmonyBars;
    if (!Array.isArray(bars) || bars.length === 0) {
      throw new Error(
        `precomputeDuoEffectiveHarmonyBars: marrEffectiveHarmonyBars missing after precompute (section "${sectionLabel}")`
      );
    }
    return bars;
  }
  throw new Error(
    `precomputeDuoEffectiveHarmonyBars: unsupported duo section composer "${composerId}"`
  );
}

/**
 * Run section-scoped precomputes and stitch one full-form merged harmony array.
 */
export function precomputeDuoEffectiveHarmonyBars(
  context: CompositionContext,
  routing: SectionComposerRouting,
  tonicMap: DuoTonicMap
): DuoMergedHarmonyBars {
  const totalBars = context.form.totalBars;
  const sections = routing.sectionComposerMap;

  if (routing.mode !== 'duo' || sections.length < 2) {
    throw new Error(
      'precomputeDuoEffectiveHarmonyBars: routing.mode must be "duo" with at least 2 sections'
    );
  }

  assertSectionsCoverForm(totalBars, sections);

  const bars: string[] = new Array(totalBars);
  const sectionOwnership: Record<number, string> = {};

  for (const section of sections) {
    const tonicPc = tonicMap[section.sectionLabel];
    if (tonicPc === undefined) {
      throw new Error(
        `precomputeDuoEffectiveHarmonyBars: missing tonic for section "${section.sectionLabel}" in tonicMap`
      );
    }

    const sectionContext = cloneContextForSection(context, section, tonicPc);
    runPrecomputeForComposer(sectionContext, section.songwriterStyleId);

    const sectionBars = extractEffectiveHarmonyBars(
      sectionContext.generationMetadata,
      section.songwriterStyleId,
      section.sectionLabel
    );

    const expectedSpan = section.endBar - section.startBar + 1;
    if (sectionBars.length !== expectedSpan) {
      throw new Error(
        `precomputeDuoEffectiveHarmonyBars: section "${section.sectionLabel}" effective bars length ${sectionBars.length} !== expected ${expectedSpan}`
      );
    }

    for (let localBar = 1; localBar <= expectedSpan; localBar++) {
      const globalBar = localBar + section.startBar - 1;
      const symbol = sectionBars[localBar - 1];
      if (symbol === undefined || symbol === '') {
        throw new Error(
          `precomputeDuoEffectiveHarmonyBars: empty harmony at global bar ${globalBar} (section "${section.sectionLabel}")`
        );
      }
      bars[globalBar - 1] = symbol;
      sectionOwnership[globalBar] = section.sectionLabel;
    }
  }

  for (let bar = 1; bar <= totalBars; bar++) {
    const symbol = bars[bar - 1];
    if (symbol === undefined || symbol === '') {
      throw new Error(
        `precomputeDuoEffectiveHarmonyBars: merged harmony has gap at bar ${bar}`
      );
    }
    if (sectionOwnership[bar] === undefined) {
      throw new Error(
        `precomputeDuoEffectiveHarmonyBars: sectionOwnership missing for bar ${bar}`
      );
    }
  }

  const merged: DuoMergedHarmonyBars = { bars, sectionOwnership };

  context.generationMetadata.duoMergedHarmonyBars = bars;
  context.generationMetadata.duoSectionOwnership = sectionOwnership;

  return merged;
}
