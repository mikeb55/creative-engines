/**
 * MusicContext foundation — types, adapters, modulation attach (V90a prompt 1).
 */

import type { CoreMotif } from '../core/motif/motifEngineTypes';
import { generateModulationPlan } from '../core/modulation/modulationPlanner';
import {
  attachModulationToContext,
  computeMusicContextChecksum,
  coreMotifToMusicContextMotif,
  harmonyBarsFromMusicContext,
  motifToSeedPitches,
} from '../core/music-context/musicContextAdapters';
import type { MusicContext } from '../core/music-context/musicContextTypes';

function mockCoreMotif(overrides: Partial<CoreMotif> = {}): CoreMotif {
  return {
    id: 'motif-abc',
    intervalPattern: [2, -1, 3],
    rhythmPattern: [
      { startBeat: 0, duration: 1 },
      { startBeat: 1, duration: 0.5 },
    ],
    contourPattern: [1, -1, 1],
    roleTags: ['guide-tone'],
    registerTags: ['mid'],
    ...overrides,
  };
}

function mockMusicContext(overrides: Partial<MusicContext> = {}): MusicContext {
  const bars = ['Dm7', 'G7', 'Cmaj7', 'Am7'];
  return {
    schemaVersion: '1.0',
    seed: 42,
    presetId: 'guitar_bass_duo',
    key: { root: 'D', mode: 'minor' },
    meter: { beats: 4, beatType: 4 },
    bpm: 120,
    totalBars: 4,
    harmony: {
      bars,
      checksum: computeMusicContextChecksum(bars),
      source: 'generated',
    },
    receipts: [],
    ...overrides,
  };
}

describe('computeMusicContextChecksum', () => {
  it('same input → same output', () => {
    const bars = ['Dm7', 'G7', 'Cmaj7'];
    expect(computeMusicContextChecksum(bars)).toBe(computeMusicContextChecksum(bars));
  });

  it('different input → different output', () => {
    const a = computeMusicContextChecksum(['Dm7', 'G7']);
    const b = computeMusicContextChecksum(['Dm7', 'G7', 'Cmaj7']);
    expect(a).not.toBe(b);
  });
});

describe('coreMotifToMusicContextMotif', () => {
  it('maps all fields correctly', () => {
    const core = mockCoreMotif();
    const mapped = coreMotifToMusicContextMotif(core, 'song_mode');
    expect(mapped.id).toBe('motif-abc');
    expect(mapped.intervalPattern).toEqual([2, -1, 3]);
    expect(mapped.rhythmPattern).toEqual([
      { startBeat: 0, duration: 1 },
      { startBeat: 1, duration: 0.5 },
    ]);
    expect(mapped.contourPattern).toEqual([1, -1, 1]);
    expect(mapped.anchorMidi).toBeUndefined();
    expect(mapped.seedPitches).toBeUndefined();
  });

  it('producer field set correctly', () => {
    const core = mockCoreMotif();
    expect(coreMotifToMusicContextMotif(core, 'martino').producer).toBe('martino');
    expect(coreMotifToMusicContextMotif(core, 'riff').producer).toBe('riff');
  });
});

describe('motifToSeedPitches', () => {
  it('returns tuple [number, number]', () => {
    const motif = coreMotifToMusicContextMotif(mockCoreMotif(), 'user');
    const result = motifToSeedPitches(motif, 2);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(typeof result[0]).toBe('number');
    expect(typeof result[1]).toBe('number');
  });

  it('upperMidi >= lowerMidi', () => {
    const motif = coreMotifToMusicContextMotif(mockCoreMotif({ intervalPattern: [5] }), 'user');
    const [upper, lower] = motifToSeedPitches(motif, 0);
    expect(upper).toBeGreaterThanOrEqual(lower);
  });
});

describe('harmonyBarsFromMusicContext', () => {
  it('returns bars when checksum valid', () => {
    const ctx = mockMusicContext();
    expect(harmonyBarsFromMusicContext(ctx)).toEqual(['Dm7', 'G7', 'Cmaj7', 'Am7']);
  });

  it('throws on checksum mismatch', () => {
    const ctx = mockMusicContext({
      harmony: {
        bars: ['Dm7', 'G7'],
        checksum: 'deadbeef',
        source: 'locked',
      },
    });
    expect(() => harmonyBarsFromMusicContext(ctx)).toThrow('MusicContext harmony checksum mismatch');
  });
});

describe('attachModulationToContext', () => {
  it('attaches plan correctly', () => {
    const ctx = mockMusicContext();
    const plan = generateModulationPlan(99, 32);
    const updated = attachModulationToContext(ctx, plan);
    expect(updated.modulation).toBe(plan);
    expect(updated.modulation?.active).toBe(true);
    expect(updated.seed).toBe(ctx.seed);
    expect(ctx.modulation).toBeUndefined();
  });
});

describe('MusicContext schemaVersion', () => {
  it("schemaVersion is '1.0'", () => {
    expect(mockMusicContext().schemaVersion).toBe('1.0');
  });
});
