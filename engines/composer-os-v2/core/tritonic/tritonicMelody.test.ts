/**
 * V104p2 — Tritonic melody generation tests.
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { buildTritonicDictionary } from './tritonicCell';
import {
  buildMusicContextFromTritonicMelody,
  extractSingableMelodyMidis,
  melodyMidisToCoreMotif,
} from './tritonicMelody';
import { realiseTritonic, type TritonicRealisationContext } from './tritonicRealisation';

function defaultCtx(overrides: Partial<TritonicRealisationContext> = {}): TritonicRealisationContext {
  const dict = buildTritonicDictionary();
  return {
    mode: 'sq',
    cells: dict.cells,
    behaviourOptions: {
      oddityScore: 0.2,
      delayedResolution: false,
      melodyPriority: true,
    },
    ...overrides,
  };
}

describe('extractSingableMelodyMidis', () => {
  it('returns one MIDI note per cell with ≤6 semitone steps', () => {
    const result = realiseTritonic(defaultCtx({ mode: 'sq' }));
    const cells = result.phrases.flat();
    const midis = extractSingableMelodyMidis(cells);
    expect(midis).toHaveLength(cells.length);
    for (let i = 1; i < midis.length; i++) {
      expect(Math.abs(midis[i]! - midis[i - 1]!)).toBeLessThanOrEqual(6);
    }
  });
});

describe('melodyMidisToCoreMotif', () => {
  it('derives interval and contour patterns from MIDI line', () => {
    const motif = melodyMidisToCoreMotif([67, 69, 67, 65]);
    expect(motif.intervalPattern).toEqual([2, -2, -2]);
    expect(motif.contourPattern).toEqual([1, -1, -1]);
    expect(motif.rhythmPattern).toHaveLength(4);
  });
});

describe('buildMusicContextFromTritonicMelody', () => {
  it('harmony.checksum matches normalised bars', () => {
    const mc = buildMusicContextFromTritonicMelody(defaultCtx(), 2);
    const normalised = mc.harmony.bars.map(normalizeChordSymbol);
    expect(mc.harmony.bars).toEqual(normalised);
    expect(mc.harmony.checksum).toBe(computeMusicContextChecksum(normalised));
  });

  it('motif produced from voice-led cell chain', () => {
    const mc = buildMusicContextFromTritonicMelody(defaultCtx({ mode: 'bb' }), 10);
    expect(mc.motif).toBeDefined();
    expect(mc.motif!.producer).toBe('tritonic');
    expect(mc.motif!.seedPitches!.length).toBeGreaterThan(0);
    expect(mc.motif!.intervalPattern.length).toBe(mc.motif!.seedPitches!.length - 1);
    expect(mc.motif!.anchorMidi).toBe(mc.motif!.seedPitches![0]);
  });

  it('receipt tritonic_melody_complete with harmony + melody checksums', () => {
    const mc = buildMusicContextFromTritonicMelody(defaultCtx({ mode: 'ecm' }), 7);
    const receipt = mc.receipts.find((r) => r.kind === 'tritonic_melody_complete');
    expect(receipt).toBeDefined();
    expect(receipt?.engine).toBe('tritonic');
    expect(receipt?.payload).toMatchObject({
      mode: 'ecm',
      harmonyChecksum: mc.harmony.checksum,
    });
    expect((receipt?.payload as { melodyChecksum?: string }).melodyChecksum).toBeTruthy();
  });

  it('presetId and provenance identify tritonic melody producer', () => {
    const mc = buildMusicContextFromTritonicMelody(defaultCtx(), 0, { bpm: 96, seed: 42 });
    expect(mc.presetId).toBe('tritonic_melody_sq');
    expect(mc.provenance?.sourceEngineId).toBe('tritonic');
    expect(mc.bpm).toBe(96);
    expect(mc.seed).toBe(42);
  });

  it('melody line stays in singable register band', () => {
    const mc = buildMusicContextFromTritonicMelody(defaultCtx(), 0);
    for (const midi of mc.motif!.seedPitches!) {
      expect(midi).toBeGreaterThanOrEqual(55);
      expect(midi).toBeLessThanOrEqual(79);
    }
  });
});
