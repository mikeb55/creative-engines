/**
 * V88 practice layer tests.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { buildMusicContextFromHarmonyBars } from '../music-context/harmonyBarsMusicContextShell';
import type { MusicContext } from '../music-context/musicContextTypes';
import { buildPracticeLayerFromMusicContext } from './practiceLayerBuilder';

function sampleCtx(overrides?: Partial<MusicContext>): MusicContext {
  const harmonyBars = ['Dm7', 'G7', 'Cmaj7', 'Cmaj7'];
  const base = buildMusicContextFromHarmonyBars({
    harmonyBars,
    sourceEngineId: 'duo',
    presetId: 'guitar_bass_duo',
    seed: 42,
    bpm: 120,
  });
  return { ...base, ...overrides, harmony: overrides?.harmony ?? base.harmony };
}

describe('buildPracticeLayerFromMusicContext', () => {
  it('works with any MusicContext producer (duo-shaped)', () => {
    const layer = buildPracticeLayerFromMusicContext(sampleCtx());
    expect(layer.provenance.sourceEngineId).toBe('practice_layer');
    expect(layer.receipt.kind).toBe('practice_layer_complete');
    expect(layer.targetChordSymbols).toEqual(['Dm7', 'G7', 'Cmaj7']);
    expect(layer.guideToneLines.length).toBe(4);
    expect(layer.scaleRecommendations.length).toBe(3);
    expect(layer.practiceSequence.length).toBeGreaterThan(0);
  });

  it('receipt payload carries required metrics', () => {
    const layer = buildPracticeLayerFromMusicContext(sampleCtx());
    expect(layer.receipt.payload).toMatchObject({
      chordCount: 3,
      guideToneLineLength: 4,
      difficultyRating: expect.stringMatching(/easy|medium|hard|advanced/),
      scaleCount: 3,
    });
  });

  it('uses motif rhythm when present for rhythmicFocus', () => {
    const ctx = sampleCtx({
      motif: {
        id: 'test',
        intervalPattern: [2, -1],
        rhythmPattern: [
          { startBeat: 0, duration: 1 },
          { startBeat: 1, duration: 1 },
          { startBeat: 2, duration: 2 },
          { startBeat: 0, duration: 1 },
          { startBeat: 1, duration: 1 },
        ],
        contourPattern: [1, -1],
        producer: 'song_mode',
      },
    });
    const layer = buildPracticeLayerFromMusicContext(ctx);
    expect(layer.rhythmicFocus.motifDerived).toBe(true);
    expect(layer.rhythmicFocus.dominantDurationBeats).toBe(1);
  });

  it('rates advanced harmony harder', () => {
    const bars = ['Cmaj7', 'F#m7b5', 'B7alt', 'E7#9', 'Am7', 'D7alt', 'Gmaj7#11'];
    const ctx = buildMusicContextFromHarmonyBars({
      harmonyBars: bars,
      sourceEngineId: 'monk',
      presetId: 'monk',
      seed: 1,
    });
    const layer = buildPracticeLayerFromMusicContext(ctx);
    expect(['hard', 'advanced']).toContain(layer.difficultyRating);
    expect(layer.scaleRecommendations.some((s) => s.scale === 'altered')).toBe(true);
  });

  it('throws on harmony checksum mismatch', () => {
    const ctx = sampleCtx({
      harmony: {
        bars: ['Dm7', 'G7'].map(normalizeChordSymbol),
        checksum: 'bad-checksum',
        source: 'generated',
      },
    });
    expect(() => buildPracticeLayerFromMusicContext(ctx)).toThrow(/checksum/i);
  });

  it('guide-tone lines include voice-leading motion after first bar', () => {
    const layer = buildPracticeLayerFromMusicContext(sampleCtx());
    expect(layer.guideToneLines[0]?.voiceLeadingMotion).toBeNull();
    expect(layer.guideToneLines[1]?.voiceLeadingMotion).not.toBeNull();
  });

  it('practiceSequence starts with key centre then chord vocabulary', () => {
    const layer = buildPracticeLayerFromMusicContext(sampleCtx());
    expect(layer.practiceSequence[0]?.focus).toBe('key_center');
    expect(layer.practiceSequence[1]?.focus).toBe('chord_vocabulary');
    expect(layer.practiceSequence.at(-1)?.focus).toBe('rhythm');
  });
});

describe('buildPracticeLayerFromMusicContext — producer agnostic', () => {
  it('accepts string_quartet-shaped context', () => {
    const bars = ['Cmaj7', 'Am7', 'Dm7', 'G7'];
    const ctx = buildMusicContextFromHarmonyBars({
      harmonyBars: bars,
      sourceEngineId: 'string_quartet',
      presetId: 'string_quartet',
      seed: 99,
    });
    const layer = buildPracticeLayerFromMusicContext(ctx);
    expect(layer.receipt.engine).toBe('practice_layer');
    expect(layer.targetChordSymbols.length).toBe(4);
    expect(computeMusicContextChecksum(bars.map(normalizeChordSymbol))).toBe(ctx.harmony.checksum);
  });
});
