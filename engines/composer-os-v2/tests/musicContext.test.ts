/**
 * MusicContext foundation — types, adapters, modulation attach (V90a prompt 1).
 * Riff producer + Slonimsky consumer (V90a prompt 2).
 */

import type { CoreMotif } from '../core/motif/motifEngineTypes';
import { generateModulationPlan } from '../core/modulation/modulationPlanner';
import {
  attachModulationToContext,
  buildRiffGeneratorMusicContext,
  computeMusicContextChecksum,
  coreMotifToMusicContextMotif,
  harmonyBarsFromMusicContext,
  motifToSeedPitches,
} from '../core/music-context/musicContextAdapters';
import type { MusicContext } from '../core/music-context/musicContextTypes';
import {
  buildDuoBarSlonimskyContext,
  isSlonimskyMusicContextEnabled,
} from '../core/slonimsky/slonimskyEngine';

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

describe('Riff MusicContext producer', () => {
  const riffBase = {
    seed: 90210,
    bars: 2 as const,
    style: 'neutral' as const,
    bpm: 100,
    chordSymbols: ['Dm7', 'G7'],
  };

  it('runRiffGenerator result includes musicContext when chordSymbols provided', async () => {
    const { runRiffGenerator } = await import('../core/riff-generator/runRiffGenerator');
    const r = runRiffGenerator(90210, {
      bars: 2,
      density: 'medium',
      style: 'neutral',
      grid: 'eighth',
      lineMode: 'single_line',
      bassEnabled: false,
      bpm: 100,
      title: 'McTest',
      chordProgressionText: 'Dm7 | G7',
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.musicContext).toBeDefined();
    expect(r.musicContext?.presetId).toBe('riff_generator');
  });

  it('musicContext.harmony.bars matches params.chordSymbols', () => {
    const ctx = buildRiffGeneratorMusicContext(riffBase);
    expect(ctx.harmony.bars).toEqual(['Dm7', 'G7']);
  });

  it('musicContext.harmony.checksum is valid', () => {
    const ctx = buildRiffGeneratorMusicContext(riffBase);
    expect(ctx.harmony.checksum).toBe(computeMusicContextChecksum(ctx.harmony.bars));
    expect(() => harmonyBarsFromMusicContext(ctx)).not.toThrow();
  });

  it('musicContext.motif is set when coreMotif present in result', () => {
    const core = mockCoreMotif();
    const ctx = buildRiffGeneratorMusicContext(riffBase, core);
    expect(ctx.motif).toEqual(coreMotifToMusicContextMotif(core, 'riff'));
  });

  it('musicContext.motif is undefined when no coreMotif', () => {
    const ctx = buildRiffGeneratorMusicContext(riffBase, undefined);
    expect(ctx.motif).toBeUndefined();
  });

  it('musicContext.receipts has one entry with engine: riff', () => {
    const ctx = buildRiffGeneratorMusicContext(riffBase, mockCoreMotif());
    expect(ctx.receipts).toHaveLength(1);
    expect(ctx.receipts[0]).toMatchObject({
      engine: 'riff',
      kind: 'riff_generator_complete',
    });
  });
});

describe('Slonimsky MusicContext consumer', () => {
  const slonimskyBarParams = {
    duoIntent: 'guitar_lead' as const,
    phase: 3,
    seed: 77,
    totalQuarterBeats: 16,
    chordSymbol: 'Am7',
    keyPc: 9,
    effectiveLow: 48,
    effectiveHigh: 84,
  };

  function slonimskyMusicContext(): MusicContext {
    const bars = ['Dm7', 'G7', 'Cmaj7'];
    return {
      schemaVersion: '1.0',
      seed: 12,
      presetId: 'guitar_bass_duo',
      key: { root: 'D', mode: 'minor' },
      meter: { beats: 4, beatType: 4 },
      bpm: 120,
      totalBars: 3,
      harmony: {
        bars,
        checksum: computeMusicContextChecksum(bars),
        source: 'user',
      },
      motif: coreMotifToMusicContextMotif(mockCoreMotif({ contourPattern: [1, 1, 1] }), 'riff'),
      receipts: [],
    };
  }

  const prevFlag = process.env.SLONIMSKY_MUSIC_CONTEXT;

  afterEach(() => {
    if (prevFlag === undefined) {
      delete process.env.SLONIMSKY_MUSIC_CONTEXT;
    } else {
      process.env.SLONIMSKY_MUSIC_CONTEXT = prevFlag;
    }
  });

  it('SlonimskyContext uses harmony bars from musicContext when flag on', () => {
    process.env.SLONIMSKY_MUSIC_CONTEXT = 'true';
    expect(isSlonimskyMusicContextEnabled()).toBe(true);
    const mc = slonimskyMusicContext();
    const ctx = buildDuoBarSlonimskyContext({
      ...slonimskyBarParams,
      musicContext: mc,
    });
    expect(ctx.chordSymbol).toBe('Cmaj7');
    expect(ctx.keyPc).toBe(2);
  });

  it('SlonimskyContext uses own bars when flag off', () => {
    delete process.env.SLONIMSKY_MUSIC_CONTEXT;
    expect(isSlonimskyMusicContextEnabled()).toBe(false);
    const mc = slonimskyMusicContext();
    const ctx = buildDuoBarSlonimskyContext({
      ...slonimskyBarParams,
      musicContext: mc,
    });
    expect(ctx.chordSymbol).toBe('Am7');
    expect(ctx.keyPc).toBe(9);
    expect(mc.receipts).toHaveLength(0);
  });

  it('Receipt appended to musicContext when consumed', () => {
    process.env.SLONIMSKY_MUSIC_CONTEXT = 'true';
    const mc = slonimskyMusicContext();
    buildDuoBarSlonimskyContext({
      ...slonimskyBarParams,
      musicContext: mc,
    });
    expect(mc.receipts).toHaveLength(1);
    expect(mc.receipts[0]).toMatchObject({
      engine: 'slonimsky',
      kind: 'slonimsky_context_consumed',
      payload: { bars: 3 },
    });
  });
});
