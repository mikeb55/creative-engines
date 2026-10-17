/**
 * Install a phrase-coherent secondary harmony slice onto the primary authority list.
 * Both slices are precomputed. One contiguous phrase block takes the secondary symbols.
 */

import type { CompositionContext } from '../compositionContext';
import type { PartModel } from '../score-model/scoreModelTypes';
import { precomputeBacharachEffectiveHarmonyBars } from './bacharachSlice';
import { precomputeDebussyEffectiveHarmonyBars } from './debussySlice';
import { precomputeGilEvansEffectiveHarmonyBars } from './gilEvansSlice';
import { precomputeJoniMitchellEffectiveHarmonyBars } from './joniMitchellSlice';
import { precomputePatMethenyEffectiveHarmonyBars } from './patMethenySlice';
import { precomputeWayneShorterEffectiveHarmonyBars } from './wayneShorterSlice';
import { phraseCoherentHarmonyBlend } from './composerProfileBlendIds';

const SLICE_PRECOMPUTE: Record<string, (context: CompositionContext) => void> = {
  wayne_shorter: precomputeWayneShorterEffectiveHarmonyBars,
  bacharach: precomputeBacharachEffectiveHarmonyBars,
  debussy: precomputeDebussyEffectiveHarmonyBars,
  gil_evans: precomputeGilEvansEffectiveHarmonyBars,
  pat_metheny: precomputePatMethenyEffectiveHarmonyBars,
  joni_mitchell: precomputeJoniMitchellEffectiveHarmonyBars,
};

const SLICE_EFF_KEY: Record<string, string> = {
  wayne_shorter: 'wayneShorterEffectiveHarmonyBars',
  bacharach: 'bacharachEffectiveHarmonyBars',
  debussy: 'debussyEffectiveHarmonyBars',
  gil_evans: 'gilEvansEffectiveHarmonyBars',
  pat_metheny: 'patMethenyEffectiveHarmonyBars',
  joni_mitchell: 'joniMitchellEffectiveHarmonyBars',
};

function readBars(meta: object, key: string, totalBars: number): string[] | null {
  const arr = (meta as Record<string, unknown>)[key];
  if (!Array.isArray(arr) || arr.length !== totalBars) return null;
  if (!arr.every((x) => typeof x === 'string')) return null;
  return arr as string[];
}

function precomputeSliceBarsIsolated(context: CompositionContext, styleId: string): string[] | null {
  const run = SLICE_PRECOMPUTE[styleId];
  const key = SLICE_EFF_KEY[styleId];
  if (!run || !key) return null;
  const meta: Record<string, unknown> = {
    ...(context.generationMetadata as unknown as Record<string, unknown>),
    songwriterStyleId: styleId,
    harmonicVoice: undefined,
  };
  for (const eff of Object.values(SLICE_EFF_KEY)) delete meta[eff];
  delete meta.harmonyContext;
  const isolated = {
    ...context,
    harmonyContext: undefined,
    generationMetadata: meta,
  } as CompositionContext;
  run(isolated);
  return readBars(isolated.generationMetadata as object, key, context.form.totalBars);
}

/** After primary slice precompute, replace one phrase block with the secondary slice. */
export function installComposerProfileHarmonyBlend(context: CompositionContext): void {
  const receipt = context.generationMetadata?.composerProfileBlend;
  if (!receipt || receipt.status !== 'phrase_block') return;
  if (context.generationMetadata?.songModeHookFirstIdentity !== true) return;
  const primaryKey = SLICE_EFF_KEY[receipt.requestedPrimaryId];
  const primaryBars = primaryKey
    ? readBars(context.generationMetadata as object, primaryKey, context.form.totalBars)
    : null;
  const secondaryBars = precomputeSliceBarsIsolated(context, receipt.requestedSecondaryId);
  if (!primaryKey || !primaryBars || !secondaryBars) {
    receipt.status = 'unsupported_secondary';
    receipt.reason =
      receipt.reason ??
      `UNSUPPORTED: could not precompute both harmony slices for ${receipt.requestedPrimaryId} + ${receipt.requestedSecondaryId}. Primary bars were left unchanged.`;
    return;
  }
  const blended = phraseCoherentHarmonyBlend(primaryBars, secondaryBars, receipt.weight, receipt.phraseBars);
  (context.generationMetadata as unknown as Record<string, unknown>)[primaryKey] = blended.symbols;
  const merged = context.generationMetadata.mosaicMergedHarmonyBars;
  if (Array.isArray(merged) && merged.length === blended.symbols.length) {
    context.generationMetadata.mosaicMergedHarmonyBars = [...blended.symbols];
  }
  const hc = context.harmonyContext;
  if (hc && hc.bars.length === blended.symbols.length && hc.styleId === receipt.requestedPrimaryId) {
    context.harmonyContext = { ...hc, bars: [...blended.symbols] };
  }
  receipt.secondaryBars = blended.secondaryBars;
}

const SECONDARY_PHRASE_STEP: Record<string, number> = {
  joni_mitchell: 2,
  bacharach: 1,
  debussy: -1,
  wayne_shorter: 3,
  gil_evans: -2,
  pat_metheny: 2,
};

/**
 * When two slices print the same symbol, the secondary profile still moves one melody pitch
 * in its phrase. The step is the secondary id's colour, kept inside the guitar register.
 */
export function colourSecondaryBlendGuitarPhrase(guitar: PartModel, context: CompositionContext): void {
  const receipt = context.generationMetadata?.composerProfileBlend;
  if (!receipt || receipt.status !== 'phrase_block' || !receipt.secondaryBars?.length) return;
  const step = SECONDARY_PHRASE_STEP[receipt.requestedSecondaryId] ?? 1;
  const bars = new Set(receipt.secondaryBars);
  for (const measure of guitar.measures) {
    if (!bars.has(measure.index)) continue;
    const notes = measure.events.filter((e) => e.kind === 'note' && (e.voice ?? 1) === 1);
    const target = notes[notes.length - 1];
    if (!target || target.kind !== 'note') continue;
    let next = target.pitch + step;
    if (next > 84 || next < 52) next = target.pitch - step;
    if (next > 84 || next < 52 || next === target.pitch) continue;
    target.pitch = next;
  }
}
