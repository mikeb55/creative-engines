/**
 * Mosaic global HV overlay (product 2026-07-16).
 *
 * - getDispatchEntry stays per-section songwriter (item E)
 * - global harmonicVoice overlays each section after base precompute
 * - no HV -> no overlay receipts
 * - wall composers (non-mosaic) untouched by this path
 */

import type { CompositionContext, GenerationMetadata } from '../core/compositionContext';
import {
  buildMosaicTonicMap,
  precomputeMosaicEffectiveHarmonyBars,
  type MosaicModeSectionPlanEntry,
} from '../core/mosaic-mode/precomputeMosaicEffectiveHarmonyBars';
import { resolveMosaicSectionStyles } from '../core/mosaic-mode/resolveMosaicSectionStyles';
import { isBergHvOnlyEnsembleWall } from '../core/song-mode/bergSlice';

function mosaicPlan(): MosaicModeSectionPlanEntry[] {
  return [
    {
      sectionLabel: 'A',
      startBar: 1,
      endBar: 4,
      songwriterStyleId: 'wayne_shorter',
    },
    {
      sectionLabel: 'B',
      startBar: 5,
      endBar: 8,
      songwriterStyleId: 'bill_evans',
    },
  ];
}

function mosaicCtx(opts: { harmonicVoice?: string }): CompositionContext {
  const chords = ['Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7'];
  const plan = mosaicPlan();
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: 'wayne_shorter',
    mosaicSectionPlan: plan,
    parsedCustomProgressionBars: [...chords],
    ...(opts.harmonicVoice ? { harmonicVoice: opts.harmonicVoice } : {}),
  };
  return {
    systemVersion: '2.0.0',
    presetId: 'guitar_bass_duo',
    seed: 96101,
    form: {
      totalBars: 8,
      sections: [
        { label: 'A', startBar: 1, length: 4 },
        { label: 'B', startBar: 5, length: 4 },
      ],
    },
    lockedHarmonyBarsRaw: [...chords],
    generationMetadata,
  } as CompositionContext;
}

function runMerge(ctx: CompositionContext) {
  const plan = ctx.generationMetadata.mosaicSectionPlan!;
  const routing = resolveMosaicSectionStyles(ctx.form, ctx.generationMetadata);
  const tonicMap = buildMosaicTonicMap(plan, ctx);
  return precomputeMosaicEffectiveHarmonyBars(ctx, routing, tonicMap);
}

function testNoHvUnchangedAndNoOverlayReceipt(): boolean {
  const ctx = mosaicCtx({});
  const merged = runMerge(ctx);
  if (merged.bars.length !== 8) return false;
  if (ctx.generationMetadata.mosaicGlobalHvOverlayApplied === true) return false;
  if (ctx.generationMetadata.mosaicGlobalHvId) return false;
  if ((ctx.generationMetadata.mosaicGlobalHvOverlaySections?.length ?? 0) > 0) return false;
  if (merged.sectionOwnership[1] !== 'A' || merged.sectionOwnership[5] !== 'B') return false;
  return true;
}

function testGlobalHvOverlayAcrossSections(): boolean {
  const baseline = mosaicCtx({});
  const baseMerged = runMerge(baseline);
  const baseJoin = baseMerged.bars.join('|');

  const ctx = mosaicCtx({ harmonicVoice: 'berg' });
  const merged = runMerge(ctx);
  if (ctx.generationMetadata.mosaicGlobalHvId !== 'berg') return false;
  if (ctx.generationMetadata.mosaicGlobalHvOverlayApplied !== true) return false;
  const sections = ctx.generationMetadata.mosaicGlobalHvOverlaySections ?? [];
  if (!sections.includes('A') || !sections.includes('B')) return false;
  if (merged.bars.join('|') === baseJoin) return false;
  const reg = ctx.generationMetadata.mosaicLockRegistry ?? [];
  if (reg.length !== 2) return false;
  if (reg[0]?.composerId !== 'wayne_shorter') return false;
  if (reg[1]?.composerId !== 'bill_evans') return false;
  return true;
}

function testHvSameAsSectionComposerSkipsSecondPass(): boolean {
  const chords = ['Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7'];
  const plan: MosaicModeSectionPlanEntry[] = [
    { sectionLabel: 'A', startBar: 1, endBar: 4, songwriterStyleId: 'wayne_shorter' },
    { sectionLabel: 'B', startBar: 5, endBar: 8, songwriterStyleId: 'wayne_shorter' },
  ];
  const generationMetadata: GenerationMetadata = {
    generatedAt: new Date().toISOString(),
    songwriterStyleId: 'wayne_shorter',
    harmonicVoice: 'wayne_shorter',
    mosaicSectionPlan: plan,
    parsedCustomProgressionBars: [...chords],
  };
  const ctx = {
    systemVersion: '2.0.0',
    presetId: 'guitar_bass_duo',
    seed: 96102,
    form: {
      totalBars: 8,
      sections: [
        { label: 'A', startBar: 1, length: 4 },
        { label: 'B', startBar: 5, length: 4 },
      ],
    },
    lockedHarmonyBarsRaw: [...chords],
    generationMetadata,
  } as CompositionContext;
  runMerge(ctx);
  if (ctx.generationMetadata.mosaicGlobalHvId !== 'wayne_shorter') return false;
  if (ctx.generationMetadata.mosaicGlobalHvOverlayApplied !== false) return false;
  return true;
}

function testWallGateUntouchedByMosaicOverlay(): boolean {
  return (
    isBergHvOnlyEnsembleWall({
      harmonicVoice: 'berg',
      songwriterStyleId: 'wayne_shorter',
    }) === true &&
    isBergHvOnlyEnsembleWall({
      harmonicVoice: undefined,
      songwriterStyleId: 'berg',
    }) === false
  );
}

export function runMosaicGlobalHvRoutingSmokeTests(): { name: string; ok: boolean }[] {
  return [
    ['Mosaic global HV: no HV -> no overlay receipt + ownership intact', testNoHvUnchangedAndNoOverlayReceipt],
    ['Mosaic global HV: HV=berg overlays all sections + LOCK keeps section composers', testGlobalHvOverlayAcrossSections],
    ['Mosaic global HV: HV===section composer skips second pass', testHvSameAsSectionComposerSkipsSecondPass],
    ['Mosaic global HV: Berg wall gate unchanged (item E)', testWallGateUntouchedByMosaicOverlay],
  ].map(([name, fn]) => ({ name: name as string, ok: (fn as () => boolean)() }));
}
