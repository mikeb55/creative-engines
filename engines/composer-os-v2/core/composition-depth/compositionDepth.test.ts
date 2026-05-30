/**
 * V89 composition depth tests.
 */

import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import { buildCompositionDepthFromMusicContext } from './compositionDepthBuilder';

function sampleCtx(bars: string[] = ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'F#m7b5', 'B7']) {
  return buildMusicContextFromHarmonyBars({
    harmonyBars: bars,
    sourceEngineId: 'duo',
    presetId: 'guitar_bass_duo',
    seed: 4242,
    bpm: 96,
  });
}

describe('buildCompositionDepthFromMusicContext', () => {
  it('works with any MusicContext producer', () => {
    const depth = buildCompositionDepthFromMusicContext(sampleCtx());
    expect(depth.provenance.sourceEngineId).toBe('composition_depth');
    expect(depth.receipt.kind).toBe('composition_depth_complete');
    expect(depth.sectionArcMap.length).toBeGreaterThan(0);
    expect(depth.harmonicDevelopmentPlan.length).toBe(depth.sectionArcMap.length);
    expect(depth.motivicTransformations.length).toBe(4);
    expect(depth.reharmonisationSuggestions.length).toBeGreaterThan(0);
    expect(depth.composerNotes.length).toBeGreaterThan(20);
  });

  it('receipt payload carries required metrics', () => {
    const depth = buildCompositionDepthFromMusicContext(sampleCtx());
    expect(depth.receipt.payload).toMatchObject({
      sectionCount: expect.any(Number),
      reharmonisationCount: expect.any(Number),
      motivicTransformationCount: 4,
      arcSpanBars: 8,
    });
    expect(depth.receipt.payload).toMatchObject({
      reharmonisationCount: depth.reharmonisationSuggestions.reduce(
        (n, r) => n + r.alternatives.length,
        0,
      ),
    });
  });

  it('sectionArcMap covers exposition through resolution', () => {
    const depth = buildCompositionDepthFromMusicContext(sampleCtx());
    const fns = depth.sectionArcMap.map((s) => s.function);
    expect(fns).toContain('exposition');
    expect(fns).toContain('resolution');
  });

  it('harmonicDevelopmentPlan includes tension rise, plateau, and release phases', () => {
    const depth = buildCompositionDepthFromMusicContext(sampleCtx());
    const phases = new Set(depth.harmonicDevelopmentPlan.map((s) => s.phase));
    expect(phases.has('tension_rise')).toBe(true);
    expect(phases.has('release')).toBe(true);
  });

  it('reharmonisationSuggestions provide 1–2 alternatives per unique chord', () => {
    const depth = buildCompositionDepthFromMusicContext(sampleCtx());
    for (const row of depth.reharmonisationSuggestions) {
      expect(row.alternatives.length).toBeGreaterThanOrEqual(1);
      expect(row.alternatives.length).toBeLessThanOrEqual(2);
      expect(row.originalSymbol.length).toBeGreaterThan(0);
    }
  });

  it('uses source motif when present', () => {
    const ctx = sampleCtx();
    const withMotif = {
      ...ctx,
      motif: {
        id: 'hook-a',
        intervalPattern: [4, -2, 3],
        rhythmPattern: [{ startBeat: 0, duration: 1 }],
        contourPattern: [1, -1, 1],
        producer: 'song_mode' as const,
      },
    };
    const depth = buildCompositionDepthFromMusicContext(withMotif);
    expect(depth.motivicTransformations.every((t) => t.sourceMotifId === 'hook-a')).toBe(true);
    expect(depth.motivicTransformations.find((t) => t.kind === 'inversion')?.intervalPattern).toEqual([
      -4, 2, -3,
    ]);
  });

  it('throws on harmony checksum mismatch', () => {
    const ctx = sampleCtx();
    expect(() =>
      buildCompositionDepthFromMusicContext({
        ...ctx,
        harmony: { ...ctx.harmony, checksum: 'invalid' },
      }),
    ).toThrow(/checksum/i);
  });

  it('producer-agnostic — monk-shaped context', () => {
    const ctx = buildMusicContextFromHarmonyBars({
      harmonyBars: ['Bb7', 'Eb7', 'F7', 'Bb7', 'Bb7', 'Eb7', 'Ab7', 'Db7'],
      sourceEngineId: 'monk',
      presetId: 'monk',
      seed: 99,
    });
    const depth = buildCompositionDepthFromMusicContext(ctx);
    expect(depth.receipt.engine).toBe('composition_depth');
    expect(depth.composerNotes).toMatch(/Develops the existing/);
  });
});
