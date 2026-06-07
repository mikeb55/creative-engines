/**
 * Mosaic Mode Step 3 — per-section tonic map + precompute orchestrator + merged harmony wire.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { noteNameToPitchClass, parseChordSymbol } from '../harmony/chordSymbolAnalysis';
import { measureBeatSpanQuartersOf } from '../score-model/measureBeatSpan';
import type { ScoreEvent, ScoreModel } from '../score-model/scoreModelTypes';
import { isMosaicModeActive } from './mosaicBarHelpers';
import {
  extractEffectiveHarmonyFromMetadata,
  getDispatchEntry,
} from './mosaicComposerDispatch';
import type { SectionComposerRouting } from './resolveMosaicSectionStyles';
import {
  jackWhiteSliceParamsForComposer,
  postProcessJackWhiteMosaicHarmony,
} from '../composer/voiceRuleBundles';

export type MosaicModeSectionPlan = NonNullable<GenerationMetadata['mosaicSectionPlan']>;

export type MosaicModeSectionPlanEntry = MosaicModeSectionPlan[number];

/** sectionLabel → tonic pitch class (0–11). */
export type MosaicTonicMap = Record<string, number>;

export interface MosaicMergedHarmonyBars {
  bars: string[];
  sectionOwnership: Record<number, string>;
}

/** One section harmonic contract for modular LOCK validation (bar ranges independent). */
export interface SectionLockEntry {
  sectionLabel: string;
  startBar: number;
  /** endBar is inclusive — last bar IN this section */
  endBar: number;
  composerId: string;
  expectedHarmonyBars: string[];
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
      `precomputeMosaicEffectiveHarmonyBars: bar ${barIndex} out of range 1–${tb}`
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
    `buildMosaicTonicMap: no authoritative harmony at bar ${barIndex} — set lockedHarmonyBarsRaw or parsedCustomProgressionBars covering totalBars`
  );
}

/**
 * Pipeline-truth LOCK: when custom_locked spine covers the form, export/score harmony reads
 * must match pasted symbols — slice precompute may enrich symbols for section eval only.
 */
function overlayLockedSpineOnMergedBars(context: CompositionContext, bars: string[]): void {
  if (context.generationMetadata.customHarmonyLocked !== true) return;

  const totalBars = context.form.totalBars;
  const locked = context.lockedHarmonyBarsRaw;
  if (locked && locked.length === totalBars) {
    for (let i = 0; i < totalBars; i++) {
      const symbol = locked[i]?.trim();
      if (symbol) bars[i] = symbol;
    }
    return;
  }

  const parsed = context.generationMetadata.parsedCustomProgressionBars;
  if (parsed && parsed.length === totalBars) {
    for (let i = 0; i < totalBars; i++) {
      const symbol = parsed[i]?.trim();
      if (symbol) bars[i] = symbol;
    }
  }
}

/**
 * Pipeline-truth LOCK: pad underfilled mosaic voices on 4/4 bars when custom_locked spine is active.
 * `padMosaicUnderfillBars` only pads non-4/4 meters; locked long-form mosaic still needs full bar spans.
 */
export function padCustomLockedMosaicUnderfillBars(
  score: ScoreModel,
  context: CompositionContext
): ScoreModel {
  if (!isMosaicModeActive(context)) return score;
  if (context.generationMetadata.customHarmonyLocked !== true) return score;

  const out = structuredClone(score) as ScoreModel;
  for (const part of out.parts) {
    for (const m of part.measures) {
      const cap = measureBeatSpanQuartersOf(m);
      const voices = new Map<number, ScoreEvent[]>();
      for (const e of m.events) {
        const v = e.voice ?? 1;
        if (!voices.has(v)) voices.set(v, []);
        voices.get(v)!.push(e);
      }
      if (voices.size === 0) continue;
      const newEvents: ScoreEvent[] = [];
      for (const [voice, events] of voices.entries()) {
        const sorted = [...events].sort((a, b) => a.startBeat - b.startBeat);
        let cursor = 0;
        for (const e of sorted) {
          const sb = e.startBeat;
          if (sb - cursor > 0.01) {
            newEvents.push({ kind: 'rest', startBeat: cursor, duration: sb - cursor, voice });
          }
          newEvents.push(e);
          cursor = Math.max(cursor, sb + e.duration);
        }
        if (cap - cursor > 0.01) {
          newEvents.push({ kind: 'rest', startBeat: cursor, duration: cap - cursor, voice });
        }
      }
      m.events = newEvents.sort((a, b) => a.startBeat - b.startBeat);
    }
  }
  return out;
}

/**
 * For each section, infer tonic from that section's first bar (not global bar 1).
 */
export function buildMosaicTonicMap(
  sectionPlan: MosaicModeSectionPlan,
  context: CompositionContext
): MosaicTonicMap {
  const map: MosaicTonicMap = {};
  for (const section of sectionPlan) {
    const symbol = chordSymbolAtBar(context, section.startBar);
    const tonicPc = harmonyRootPc(symbol);
    if (tonicPc === undefined) {
      throw new Error(
        `buildMosaicTonicMap: could not infer tonic pitch class from "${symbol}" at bar ${section.startBar} (section "${section.sectionLabel}")`
      );
    }
    map[section.sectionLabel] = tonicPc;
  }
  return map;
}

function assertSectionsCoverForm(
  totalBars: number,
  sections: readonly MosaicModeSectionPlanEntry[]
): void {
  const covered = new Set<number>();
  for (const section of sections) {
    if (section.startBar > section.endBar) {
      throw new Error(
        `precomputeMosaicEffectiveHarmonyBars: section "${section.sectionLabel}" has startBar ${section.startBar} > endBar ${section.endBar}`
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
      `precomputeMosaicEffectiveHarmonyBars: section plan does not cover every bar 1–${totalBars}; unmapped bar(s): ${listed}`
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

/** Parent locked-harmony bar 1 tonic wrapper — section precompute reads bar 1 as section tonic. */
function applySectionTonicBar1Wrapper(
  sectionContext: CompositionContext,
  parentContext: CompositionContext,
  section: MosaicModeSectionPlanEntry
): void {
  const parentLocked = parentContext.lockedHarmonyBarsRaw;
  if (!parentLocked || parentLocked.length < section.startBar) return;
  const sectionTonicSymbol = parentLocked[section.startBar - 1];
  if (!sectionTonicSymbol) return;
  const span = section.endBar - section.startBar + 1;
  const wrapped = sectionContext.lockedHarmonyBarsRaw
    ? [...sectionContext.lockedHarmonyBarsRaw]
    : new Array<string>(span).fill(sectionTonicSymbol);
  if (wrapped.length >= 1) {
    wrapped[0] = sectionTonicSymbol;
  }
  sectionContext.lockedHarmonyBarsRaw = wrapped;
  if (sectionContext.generationMetadata.parsedCustomProgressionBars) {
    const parsed = [...sectionContext.generationMetadata.parsedCustomProgressionBars];
    if (parsed.length >= 1) {
      parsed[0] = sectionTonicSymbol;
      sectionContext.generationMetadata.parsedCustomProgressionBars = parsed;
    }
  }
}

export function cloneDuoSectionContext(
  context: CompositionContext,
  section: MosaicModeSectionPlanEntry,
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

  const jwSliceParams = jackWhiteSliceParamsForComposer(section.songwriterStyleId);
  if (jwSliceParams) {
    genMeta.jackWhiteSliceParams = jwSliceParams;
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

function extractEffectiveHarmonyBars(
  metadata: GenerationMetadata,
  composerId: string,
  sectionLabel: string
): string[] {
  const bars = extractEffectiveHarmonyFromMetadata(metadata, composerId);
  if (!Array.isArray(bars) || bars.length === 0) {
    const entry = getDispatchEntry(composerId);
    throw new Error(
      `precomputeMosaicEffectiveHarmonyBars: ${entry?.effectiveHarmonyKey ?? 'effectiveHarmonyBars'} missing after precompute (section "${sectionLabel}", composer "${composerId}")`
    );
  }
  return bars;
}

function assertNoOverlappingSectionRanges(sections: readonly MosaicModeSectionPlanEntry[]): void {
  const barOwner = new Map<number, string>();
  for (const section of sections) {
    for (let bar = section.startBar; bar <= section.endBar; bar++) {
      const existing = barOwner.get(bar);
      if (existing !== undefined) {
        throw new Error(
          `DUO LOCK: overlapping sections at bar ${bar} — sections ${existing} and ${section.sectionLabel}`
        );
      }
      barOwner.set(bar, section.sectionLabel);
    }
  }
}

function buildSectionLockRegistry(
  sections: readonly MosaicModeSectionPlanEntry[],
  mergedBars: readonly string[]
): SectionLockEntry[] {
  const registry: SectionLockEntry[] = [];
  for (const section of sections) {
    const expectedHarmonyBars: string[] = [];
    for (let bar = section.startBar; bar <= section.endBar; bar++) {
      const localIndex = bar - section.startBar;
      const symbol = mergedBars[bar - 1];
      if (symbol === undefined || symbol === '') {
        throw new Error(
          `precomputeMosaicEffectiveHarmonyBars: empty merged harmony at bar ${bar} for section "${section.sectionLabel}"`
        );
      }
      expectedHarmonyBars[localIndex] = symbol;
    }
    registry.push({
      sectionLabel: section.sectionLabel,
      startBar: section.startBar,
      endBar: section.endBar,
      composerId: section.songwriterStyleId,
      expectedHarmonyBars,
    });
  }
  return registry;
}

/**
 * Run section-scoped precomputes and stitch one full-form merged harmony array.
 */
export function precomputeMosaicEffectiveHarmonyBars(
  context: CompositionContext,
  routing: SectionComposerRouting,
  tonicMap: MosaicTonicMap
): MosaicMergedHarmonyBars {
  const totalBars = context.form.totalBars;
  const sections = routing.sectionComposerMap;

  if (routing.mode !== 'duo' || sections.length < 2) {
    throw new Error(
      'precomputeMosaicEffectiveHarmonyBars: routing.mode must be "duo" with at least 2 sections'
    );
  }

  assertSectionsCoverForm(totalBars, sections);

  const bars: string[] = new Array(totalBars);
  const sectionOwnership: Record<number, string> = {};

  for (const section of sections) {
    const tonicPc = tonicMap[section.sectionLabel];
    if (tonicPc === undefined) {
      throw new Error(
        `precomputeMosaicEffectiveHarmonyBars: missing tonic for section "${section.sectionLabel}" in tonicMap`
      );
    }

    const entry = getDispatchEntry(section.songwriterStyleId);
    if (!entry) {
      throw new Error(
        `DUO: no dispatch entry for composer ${section.songwriterStyleId} — add to mosaicComposerDispatch.ts`
      );
    }

    const sectionContext = cloneDuoSectionContext(context, section, tonicPc);
    applySectionTonicBar1Wrapper(sectionContext, context, section);
    entry.precompute(sectionContext);
    if (section.songwriterStyleId === 'jack_white') {
      postProcessJackWhiteMosaicHarmony(sectionContext.generationMetadata);
    }

    const sectionBars = extractEffectiveHarmonyBars(
      sectionContext.generationMetadata,
      section.songwriterStyleId,
      section.sectionLabel
    );

    const expectedSpan = section.endBar - section.startBar + 1;
    if (sectionBars.length !== expectedSpan) {
      throw new Error(
        `precomputeMosaicEffectiveHarmonyBars: section "${section.sectionLabel}" effective bars length ${sectionBars.length} !== expected ${expectedSpan}`
      );
    }

    for (let globalBar = section.startBar; globalBar <= section.endBar; globalBar++) {
      const sectionLocalIndex = globalBar - section.startBar;
      const symbol = sectionBars[sectionLocalIndex];
      if (symbol === undefined || symbol === '') {
        throw new Error(
          `precomputeMosaicEffectiveHarmonyBars: empty harmony at global bar ${globalBar} (section "${section.sectionLabel}")`
        );
      }
      bars[globalBar - 1] = symbol;
      sectionOwnership[globalBar] = section.sectionLabel;
    }

    const parentMeta = context.generationMetadata as GenerationMetadata & Record<string, unknown>;
    const sectionMeta = sectionContext.generationMetadata as GenerationMetadata & Record<string, unknown>;
    (parentMeta as Record<string, unknown>)[entry.effectiveHarmonyKey as string] = [...sectionBars];

    if (section.songwriterStyleId === 'verlaine') {
      if (sectionMeta.verlaineDeviceReceipts?.length) {
        context.generationMetadata.verlaineDeviceReceipts = [...sectionMeta.verlaineDeviceReceipts];
      }
      if (sectionMeta.verlaineFieldPlan) {
        context.generationMetadata.verlaineFieldPlan = sectionMeta.verlaineFieldPlan;
      }
      if (sectionMeta.verlaineSliceParams) {
        context.generationMetadata.verlaineSliceParams = sectionMeta.verlaineSliceParams;
      }
    } else if (section.songwriterStyleId === 'marr') {
      if (sectionMeta.marrDeviceReceipts?.length) {
        context.generationMetadata.marrDeviceReceipts = [...sectionMeta.marrDeviceReceipts];
      }
      if (sectionMeta.marrMelodicPlan) {
        context.generationMetadata.marrMelodicPlan = sectionMeta.marrMelodicPlan;
      }
      if (sectionMeta.marrSliceParams) {
        context.generationMetadata.marrSliceParams = sectionMeta.marrSliceParams;
      }
    }
  }

  overlayLockedSpineOnMergedBars(context, bars);

  for (let bar = 1; bar <= totalBars; bar++) {
    const symbol = bars[bar - 1];
    if (symbol === undefined || symbol === '') {
      throw new Error(
        `precomputeMosaicEffectiveHarmonyBars: merged harmony has gap at bar ${bar}`
      );
    }
    if (sectionOwnership[bar] === undefined) {
      throw new Error(
        `precomputeMosaicEffectiveHarmonyBars: sectionOwnership missing for bar ${bar}`
      );
    }
  }

  const merged: MosaicMergedHarmonyBars = { bars, sectionOwnership };

  assertNoOverlappingSectionRanges(sections);
  const mosaicLockRegistry = buildSectionLockRegistry(sections, bars);

  context.generationMetadata.mosaicMergedHarmonyBars = bars;
  context.generationMetadata.mosaicSectionOwnership = sectionOwnership;
  context.generationMetadata.mosaicLockRegistry = mosaicLockRegistry;

  return merged;
}
