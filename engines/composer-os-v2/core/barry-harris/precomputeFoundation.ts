/**
 * V82b+c - Barry Harris chord-melody precompute hook.
 */

import type { CompositionContext, GenerationMetadata } from '../compositionContext';
import { buildMosaicTonicMap, type MosaicModeSectionPlanEntry } from '../mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import type { MosaicImportTimeline } from '../import/mosaicImportTimeline';
import { readHarmonyBarSymbol, reinterpretFakeBookSymbol } from './reinterpret';
import { buildScaleOfChords, isMinorTonicHarmonySymbol } from './scaleOfChords';
import { resolveBarryHarrisSectionSpans } from './sectionResolver';
import type { BarryHarrisChordMelodyFoundation, ChordMelodyChoice } from './types';

function sectionSpansToMosaicPlan(
  spans: ReturnType<typeof resolveBarryHarrisSectionSpans>
): MosaicModeSectionPlanEntry[] {
  return spans.map((s) => ({
    sectionLabel: s.sectionLabel,
    startBar: s.startBar,
    endBar: s.endBar,
    songwriterStyleId: 'barry_harris',
  }));
}

function findSectionLabelForBar(
  spans: ReturnType<typeof resolveBarryHarrisSectionSpans>,
  bar: number
): string | undefined {
  for (const s of spans) {
    if (bar >= s.startBar && bar <= s.endBar) return s.sectionLabel;
  }
  return undefined;
}

export function precomputeBarryHarrisChordMelodyFoundation(
  context: CompositionContext,
  importTimeline?: MosaicImportTimeline
): BarryHarrisChordMelodyFoundation {
  const spans = resolveBarryHarrisSectionSpans(context);
  const planEntries = sectionSpansToMosaicPlan(spans);
  const tonicMap = buildMosaicTonicMap(planEntries, context);
  const scalesBySection: BarryHarrisChordMelodyFoundation['scalesBySection'] = {};

  for (const span of spans) {
    const tonicPc = tonicMap[span.sectionLabel];
    if (tonicPc === undefined) {
      throw new Error(`precomputeBarryHarrisChordMelodyFoundation: missing tonic for "${span.sectionLabel}"`);
    }
    const startSymbol = readHarmonyBarSymbol(context, span.startBar, importTimeline);
    scalesBySection[span.sectionLabel] = buildScaleOfChords(tonicPc, isMinorTonicHarmonySymbol(startSymbol));
  }

  const choices: ChordMelodyChoice[] = [];
  for (let bar = 1; bar <= context.form.totalBars; bar++) {
    const sectionLabel = findSectionLabelForBar(spans, bar);
    if (!sectionLabel) continue;
    const fakeBookSymbol = readHarmonyBarSymbol(context, bar, importTimeline);
    const anchor = reinterpretFakeBookSymbol(fakeBookSymbol);
    if (!anchor) continue;
    choices.push({ bar, sectionLabel, fakeBookSymbol, anchor });
  }

  return { sectionSpans: spans, scalesBySection, choices };
}

export function stashBarryHarrisChordMelodyFoundation(
  context: CompositionContext,
  importTimeline?: MosaicImportTimeline
): void {
  const foundation = precomputeBarryHarrisChordMelodyFoundation(context, importTimeline);
  const genMeta = context.generationMetadata as GenerationMetadata & {
    barryHarrisChordMelodyFoundation?: BarryHarrisChordMelodyFoundation;
  };
  genMeta.barryHarrisChordMelodyFoundation = foundation;
}