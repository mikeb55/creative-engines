/**
 * Song Mode — Bacharach primary v1 slice: isolated harmony dressing + surface receipts.
 */

import type { CompositionContext } from '../core/compositionContext';
import type { GenerationMetadata } from '../core/compositionContext';
import {
  applyBacharachSongModeHarmonyDressing,
  pickBridgeColourBarIndex1,
} from '../core/song-mode/bacharachHarmonyDressing';
import { BACHARACH_SONG_MODE_RULE_BUNDLE_ID } from '../core/song-mode/bacharachSongModeRuleBundle';
import { applySophisticatedPopHarmonyDressing } from '../core/song-mode/sophisticatedPopHarmonyDressing';
import { applyBacharachSongModeSurfaceV1 } from '../core/song-mode/songModeStyleSurface';

function metaBase(partial: Partial<GenerationMetadata> = {}): GenerationMetadata {
  return {
    generatedAt: new Date().toISOString(),
    songModeHookFirstIdentity: true,
    songwriterSyncopationBias: 0.55,
    songwriterDensityBias: 0.55,
    songwriterPhraseRegularity: 0.5,
    bacharachDeceptiveCadenceRate: 0.35,
    bacharachPedalUsage: 0.25,
    ...partial,
  } as GenerationMetadata;
}

function smoothColourCount(bars: string[]): number {
  let n = 0;
  for (const c of bars) {
    if (/maj7|maj9|m7|\u0394/i.test(c)) n++;
  }
  return n;
}

function stubContext(
  bars: string[],
  seed: number,
  songwriterStyleId: string,
  styleProfile?: GenerationMetadata['styleProfile']
): CompositionContext {
  return {
    seed,
    lockedHarmonyBarsRaw: [...bars],
    generationMetadata: metaBase({
      songwriterStyleId,
      styleProfile,
    }),
  } as unknown as CompositionContext;
}

describe('applyBacharachSongModeSurfaceV1', () => {
  it('applies rhythm/metadata nudges and receipts only when primary resolves to bacharach', () => {
    const m = metaBase();
    applyBacharachSongModeSurfaceV1(m, 'bacharach');
    expect(m.songwriterSyncopationBias).toBeCloseTo(0.45, 5);
    expect(m.songwriterDensityBias).toBeCloseTo(0.48, 5);
    expect(m.songwriterPhraseRegularity).toBeCloseTo(0.42, 5);
    expect(m.bacharachDeceptiveCadenceRate).toBeCloseTo(0.41, 5);
    expect(m.songModeStyleSurfaceNotes?.filter((l) => l.startsWith('Bacharach slice:')).length).toBe(3);
  });

  it('no-op for non-Bacharach primaries', () => {
    const m = metaBase();
    applyBacharachSongModeSurfaceV1(m, 'carole_king');
    expect(m.songwriterSyncopationBias).toBe(0.55);
    expect(m.songModeStyleSurfaceNotes).toBeUndefined();
  });
});

describe('Sophisticated Pop harmony dressing vs Bacharach', () => {
  it('skips Sophisticated Pop chord dressing when primary songwriter is Bacharach', () => {
    const raw = Array.from({ length: 16 }, () => 'C');
    const ctxBach = stubContext(raw, 101, 'bacharach', 'STYLE_SOPHISTICATED_POP');
    applySophisticatedPopHarmonyDressing(ctxBach);
    expect(ctxBach.lockedHarmonyBarsRaw).toEqual(raw);

    const ctxOther = stubContext(raw, 101, 'carole_king', 'STYLE_SOPHISTICATED_POP');
    applySophisticatedPopHarmonyDressing(ctxOther);
    expect(ctxOther.generationMetadata.sophisticatedPopHarmonyDiagnostics?.barsChanged ?? 0).toBeGreaterThan(0);
    expect(ctxOther.lockedHarmonyBarsRaw?.some((c, i) => c !== raw[i])).toBe(true);
  });
});

describe('applyBacharachSongModeHarmonyDressing', () => {
  const template = ['C', 'F', 'G', 'Am', 'Dm', 'G', 'C', 'F'];
  const raw24 = [...template, ...template, ...template];

  it('runs only for primary bacharach', () => {
    const ctx = stubContext(raw24, 555, 'donald_fagen');
    applyBacharachSongModeHarmonyDressing(ctx);
    expect(ctx.generationMetadata.bacharachHarmonyDiagnostics).toBeUndefined();
    expect(ctx.lockedHarmonyBarsRaw).toEqual(raw24);
  });

  it('increases smooth maj7/m7-style colours vs a non-Bacharach primary on the same grid', () => {
    const neutral = stubContext(raw24, 777, 'carole_king');
    applyBacharachSongModeHarmonyDressing(neutral);

    const bach = stubContext(raw24, 777, 'bacharach');
    applyBacharachSongModeHarmonyDressing(bach);

    expect(smoothColourCount(neutral.lockedHarmonyBarsRaw ?? [])).toBe(0);
    expect(smoothColourCount(bach.lockedHarmonyBarsRaw ?? [])).toBeGreaterThan(
      smoothColourCount(neutral.lockedHarmonyBarsRaw ?? [])
    );
    expect(bach.generationMetadata.bacharachHarmonyDiagnostics?.barsConsidered).toBe(24);
    expect(bach.generationMetadata.bacharachSongModeRuleBundleId).toBe(BACHARACH_SONG_MODE_RULE_BUNDLE_ID);
  });

  it('allows at most one mixture/colour-bridge tag per form', () => {
    const ctx = stubContext(raw24, 888, 'bacharach');
    applyBacharachSongModeHarmonyDressing(ctx);
    expect((ctx.generationMetadata.bacharachHarmonyDiagnostics?.mixtureTouches ?? 0) <= 1).toBe(true);
  });

  it('reports section B harmonic colour >= section A on uniform triad beds (bridge/B intensity)', () => {
    const ctx = stubContext(raw24, 999, 'bacharach');
    applyBacharachSongModeHarmonyDressing(ctx);
    const d = ctx.generationMetadata.bacharachHarmonyDiagnostics;
    expect(d).toBeDefined();
    expect(d!.meanColourDepthSectionB).toBeGreaterThanOrEqual(d!.meanColourDepthSectionA);
    expect(d!.sectionContrastDelta).toBeGreaterThanOrEqual(0);
  });
});

describe('pickBridgeColourBarIndex1', () => {
  it('selects a bar inside section B when B exists', () => {
    expect(pickBridgeColourBarIndex1(24, 42)).toBeGreaterThanOrEqual(9);
    expect(pickBridgeColourBarIndex1(24, 42)).toBeLessThanOrEqual(16);
    expect(pickBridgeColourBarIndex1(32, 3)).toBeGreaterThanOrEqual(17);
    expect(pickBridgeColourBarIndex1(32, 3)).toBeLessThanOrEqual(24);
  });
});
