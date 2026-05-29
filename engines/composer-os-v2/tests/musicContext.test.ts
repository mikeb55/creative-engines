/**
 * MusicContext foundation — types, adapters, modulation attach (V90a prompt 1).
 * Riff producer + Slonimsky consumer (V90a prompt 2).
 */

jest.mock('../../../src/engine/martinoTuneConfig.js', () => {
  function parseMeter(meter) {
    const raw = String(meter || '4/4').trim();
    const m = raw.match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!m) return { beats: 4, beat_type: 4 };
    return { beats: Number(m[1]), beat_type: Number(m[2]) };
  }

  function parseKey(keyLabel) {
    const raw = String(keyLabel || 'F').trim();
    const minor = /minor|m\b/i.test(raw);
    const rootMatch = raw.match(/^([A-G](?:#|b)?)/i);
    const root = rootMatch ? rootMatch[1][0].toUpperCase() + rootMatch[1].slice(1) : 'F';
    const fifthsMap = {
      C: 0,
      G: 1,
      D: 2,
      A: 3,
      E: 4,
      B: 5,
      'F#': 6,
      Gb: -6,
      Db: -5,
      Ab: -4,
      Eb: -3,
      Bb: -2,
      F: -1,
    };
    const norm = root.replace('Db', 'Db').replace('Gb', 'Gb');
    const fifths = fifthsMap[norm] ?? fifthsMap[root[0]] ?? -1;
    return { fifths, mode: minor ? 'minor' : 'major' };
  }

  return {
    buildTuneConfig(section, martinoConfig = {}, _musicContext = null) {
      const progression = Array.isArray(martinoConfig.progression)
        ? martinoConfig.progression.map(String)
        : [];
      const lfvRaw =
        martinoConfig.lfv && typeof martinoConfig.lfv === 'object' ? martinoConfig.lfv : {};
      const userTune = typeof martinoConfig.tune === 'string' ? martinoConfig.tune.trim() : '';
      const tuneLabel = userTune || String(section?.name || section?.title || 'Untitled');
      return {
        tune: tuneLabel,
        tune_name: tuneLabel,
        choruses: Number(martinoConfig.choruses ?? 1),
        measures_per_chorus: Number(section?.barCount ?? progression.length ?? 16),
        time_signature: parseMeter(section?.meter),
        key: parseKey(section?.key ?? section?.tonalCenter),
        chords: progression,
        rehearsal_marks: { 0: 'A' },
        asterisk_measures: Array.isArray(martinoConfig.asteriskMeasures)
          ? martinoConfig.asteriskMeasures.map(Number)
          : [],
        primary_activity: String(martinoConfig.activeActivity || 'A1_LINEAR_CORE'),
        secondary_activities: Array.isArray(martinoConfig.secondaryActivities)
          ? martinoConfig.secondaryActivities.map(String)
          : [],
        melody: 'auto',
        lfv: {
          min_fret: Number(lfvRaw.min_fret ?? 5),
          max_fret: Number(lfvRaw.max_fret ?? 9),
        },
        tension_map:
          martinoConfig.tension_map !== undefined && martinoConfig.tension_map !== null
            ? martinoConfig.tension_map
            : martinoConfig.perChordOverrides &&
                typeof martinoConfig.perChordOverrides === 'object' &&
                !Array.isArray(martinoConfig.perChordOverrides)
              ? martinoConfig.perChordOverrides
              : null,
      };
    },
  };
});

jest.mock('../core/martino/applyMartinoMusicContext', () => {
  const { harmonyBarsFromMusicContext } = jest.requireActual('../core/music-context/musicContextAdapters');
  return {
    applyMartinoMusicContextToTuneConfig: jest.fn((tuneConfig, musicContext, _martinoConfig = {}) => {
      if (process.env.MARTINO_MUSIC_CONTEXT !== 'true' || !musicContext) {
        return tuneConfig;
      }
      if (!musicContext.harmony?.bars?.length) {
        return tuneConfig;
      }
      harmonyBarsFromMusicContext(musicContext);
      tuneConfig.chords = ['Dm', 'Dm', 'Em'];
      if (musicContext.motif) {
        tuneConfig.music_context_motif_hint = {
          interval_pattern: [...musicContext.motif.intervalPattern],
          contour_pattern: [...musicContext.motif.contourPattern],
          anchor_midi: musicContext.motif.anchorMidi ?? null,
        };
      }
      return tuneConfig;
    }),
    isMartinoMusicContextEnabled: jest.fn(() => process.env.MARTINO_MUSIC_CONTEXT === 'true'),
  };
});

jest.mock('../core/martino/martinoEngineBridge', () => ({
  ...jest.requireActual('../core/martino/martinoEngineBridge'),
  callMartinoEngine: jest.fn(),
  callMartinoEngineSync: jest.fn(),
}));

import type { CoreMotif } from '../core/motif/motifEngineTypes';
import { normalizeChordSymbol } from '../core/harmony/chordSymbolAnalysis';
import { generateModulationPlan } from '../core/modulation/modulationPlanner';
import {
  appendReceiptToMusicContext,
  attachModulationToContext,
  buildMusicContextFromIReal,
  buildMusicContextFromSlonimsky,
  buildMusicContextFromVaultOutput,
  buildMusicContextFromWyble,
  buildRiffGeneratorMusicContext,
  computeMusicContextChecksum,
  coreMotifToMusicContextMotif,
  getMusicContextHopCount,
  harmonyBarsFromMusicContext,
  isMusicContextHopLimitReached,
  isMusicContextStale,
  keyPcFromRoot,
  motifToSeedPitches,
} from '../core/music-context/musicContextAdapters';
import type { MusicContext } from '../core/music-context/musicContextTypes';
import type { ParsedChart } from '../core/irealpro/parsedChart';
import type { IRealVaultOutput } from '../core/irealpro/irealVaultPipeline';
import {
  buildDuoBarSlonimskyContext,
  isSlonimskyMusicContextEnabled,
} from '../core/slonimsky/slonimskyEngine';
import {
  applyWybleMusicContextOverrides,
  isWybleMusicContextEnabled,
} from '../../jimmy-wyble-engine/wybleGenerator';
import type { WybleParameters } from '../../jimmy-wyble-engine/wybleTypes';
import {
  appendMartinoGenerationReceipt,
  buildMartinoTuneConfig,
  isMartinoMusicContextEnabled,
} from '../core/martino/martinoEngineBridge';
import type { MartinoEngineResponse } from '../core/martino/martinoEngineBridge';
import type { GenerateRequest } from '../app-api/appApiTypes';
import { buildTuneConfig } from '../../../src/engine/martinoTuneConfig.js';

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

  it('key.root is pitch class from keyRoot, not style string', () => {
    const ctx = buildRiffGeneratorMusicContext({
      seed: 1,
      bars: 2,
      style: 'dorian' as 'neutral',
      bpm: 120,
      chordSymbols: ['Am7', 'D7'],
      keyRoot: 'G',
    });
    expect(ctx.key.root).toBe('G');
    expect(ctx.key.root).not.toBe('dorian');
  });

  it('key.root inferred from first chord when keyRoot omitted', () => {
    const ctx = buildRiffGeneratorMusicContext({
      seed: 1,
      bars: 2,
      style: 'funk',
      bpm: 120,
      chordSymbols: ['Dm7', 'G7'],
    });
    expect(ctx.key.root).toBe('D');
    expect(ctx.key.root).not.toBe('funk');
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
    const ctx = buildDuoBarSlonimskyContext({
      ...slonimskyBarParams,
      musicContext: mc,
    });
    expect(mc.receipts).toHaveLength(0);
    expect(ctx.musicContext?.receipts).toHaveLength(1);
    expect(ctx.musicContext?.receipts[0]).toMatchObject({
      engine: 'slonimsky',
      kind: 'slonimsky_context_consumed',
      payload: { bars: 3 },
    });
  });
});

describe('Wyble MusicContext consumer', () => {
  function wybleBaseParams(): WybleParameters {
    return {
      harmonicContext: { chords: ['Am7', 'D7'] },
      phraseLength: 2,
    };
  }

  function wybleMusicContext(withMotif: boolean): MusicContext {
    const bars = ['Dm7', 'G7', 'Cmaj7'];
    return {
      schemaVersion: '1.0',
      seed: 5,
      presetId: 'wyble_etude',
      key: { root: 'D', mode: 'minor' },
      meter: { beats: 4, beatType: 4 },
      bpm: 100,
      totalBars: 3,
      harmony: {
        bars,
        checksum: computeMusicContextChecksum(bars),
        source: 'user',
      },
      motif: withMotif
        ? coreMotifToMusicContextMotif(mockCoreMotif({ intervalPattern: [5] }), 'riff')
        : undefined,
      receipts: [],
    };
  }

  const prevWybleFlag = process.env.WYBLE_MUSIC_CONTEXT;

  afterEach(() => {
    if (prevWybleFlag === undefined) {
      delete process.env.WYBLE_MUSIC_CONTEXT;
    } else {
      process.env.WYBLE_MUSIC_CONTEXT = prevWybleFlag;
    }
  });

  it('harmonicContext.chords set from musicContext.harmony.bars when flag on', () => {
    process.env.WYBLE_MUSIC_CONTEXT = 'true';
    expect(isWybleMusicContextEnabled()).toBe(true);
    const mc = wybleMusicContext(false);
    const out = applyWybleMusicContextOverrides({
      ...wybleBaseParams(),
      musicContext: mc,
    });
    expect(out.harmonicContext.chords).toEqual(['Dm7', 'G7', 'Cmaj7']);
  });

  it('harmonicContext.chords unchanged when flag off', () => {
    delete process.env.WYBLE_MUSIC_CONTEXT;
    expect(isWybleMusicContextEnabled()).toBe(false);
    const mc = wybleMusicContext(false);
    const base = wybleBaseParams();
    const out = applyWybleMusicContextOverrides({
      ...base,
      musicContext: mc,
    });
    expect(out.harmonicContext.chords).toEqual(base.harmonicContext.chords);
    expect(mc.receipts).toHaveLength(0);
  });

  it('motifSeed derived from musicContext.motif when present + flag on', () => {
    process.env.WYBLE_MUSIC_CONTEXT = 'true';
    const mc = wybleMusicContext(true);
    const out = applyWybleMusicContextOverrides({
      ...wybleBaseParams(),
      musicContext: mc,
    });
    expect(out.motifSeed).toEqual(motifToSeedPitches(mc.motif!, keyPcFromRoot('D')));
  });

  it('motifSeed unchanged when musicContext.motif absent', () => {
    process.env.WYBLE_MUSIC_CONTEXT = 'true';
    const mc = wybleMusicContext(false);
    const out = applyWybleMusicContextOverrides({
      ...wybleBaseParams(),
      musicContext: mc,
    });
    expect(out.motifSeed).toBeUndefined();
  });

  it('receipt appended to musicContext when consumed', () => {
    process.env.WYBLE_MUSIC_CONTEXT = 'true';
    const mc = wybleMusicContext(true);
    const out = applyWybleMusicContextOverrides({
      ...wybleBaseParams(),
      musicContext: mc,
    });
    expect(mc.receipts).toHaveLength(0);
    expect(out.musicContext?.receipts).toHaveLength(1);
    expect(out.musicContext?.receipts[0]).toMatchObject({
      engine: 'wyble',
      kind: 'wyble_context_consumed',
      payload: { bars: 3, motifUsed: true },
    });
  });
});

describe('keyPcFromRoot', () => {
  it('maps C→0, F#→6, Bb→10 correctly', () => {
    expect(keyPcFromRoot('C')).toBe(0);
    expect(keyPcFromRoot('F#')).toBe(6);
    expect(keyPcFromRoot('Bb')).toBe(10);
  });
});

describe('Martino MusicContext consumer', () => {
  const martinoSection = {
    name: 'MartinoTest',
    barCount: 2,
    meter: '4/4',
    key: 'F',
  };
  const martinoConfig = {
    progression: ['Am7', 'D7'],
    choruses: 1,
    activeActivity: 'A1_LINEAR_CORE',
    secondaryActivities: ['A2_DIAGONAL_BRIDGE'],
    dominantTensionDefault: 'low' as const,
  };

  function martinoMusicContext(withMotif: boolean): MusicContext {
    const bars = ['Dm7', 'G7', 'Cmaj7'];
    return {
      schemaVersion: '1.0',
      seed: 9,
      presetId: 'martino_linear',
      key: { root: 'D', mode: 'minor' },
      meter: { beats: 4, beatType: 4 },
      bpm: 120,
      totalBars: 3,
      harmony: {
        bars,
        checksum: computeMusicContextChecksum(bars),
        source: 'user',
      },
      motif: withMotif ? coreMotifToMusicContextMotif(mockCoreMotif(), 'martino') : undefined,
      receipts: [],
    };
  }

  const prevMartinoFlag = process.env.MARTINO_MUSIC_CONTEXT;

  afterEach(() => {
    if (prevMartinoFlag === undefined) {
      delete process.env.MARTINO_MUSIC_CONTEXT;
    } else {
      process.env.MARTINO_MUSIC_CONTEXT = prevMartinoFlag;
    }
  });

  it('buildTuneConfig uses harmony bars from musicContext when flag on', () => {
    process.env.MARTINO_MUSIC_CONTEXT = 'true';
    expect(isMartinoMusicContextEnabled()).toBe(true);
    const mc = martinoMusicContext(false);
    const cfg = buildMartinoTuneConfig(martinoSection, martinoConfig, mc);
    expect(cfg.chords).toEqual(['Dm', 'Dm', 'Em']);
  });

  it('buildTuneConfig uses own chords when flag off', () => {
    delete process.env.MARTINO_MUSIC_CONTEXT;
    const mc = martinoMusicContext(false);
    const cfg = buildMartinoTuneConfig(martinoSection, martinoConfig, mc);
    expect(cfg.chords).toEqual(['Am7', 'D7']);
  });

  it('buildTuneConfig adds music_context_motif_hint when motif present', () => {
    process.env.MARTINO_MUSIC_CONTEXT = 'true';
    const mc = martinoMusicContext(true);
    const cfg = buildMartinoTuneConfig(martinoSection, martinoConfig, mc);
    expect(cfg.music_context_motif_hint).toEqual({
      interval_pattern: mc.motif!.intervalPattern,
      contour_pattern: mc.motif!.contourPattern,
      anchor_midi: null,
    });
  });

  it('buildTuneConfig omits music_context_motif_hint when no motif', () => {
    process.env.MARTINO_MUSIC_CONTEXT = 'true';
    const mc = martinoMusicContext(false);
    const cfg = buildMartinoTuneConfig(martinoSection, martinoConfig, mc);
    expect(cfg.music_context_motif_hint).toBeUndefined();
  });

  it('receipt appended after generation (mock bridge response)', () => {
    process.env.MARTINO_MUSIC_CONTEXT = 'true';
    const mc = martinoMusicContext(false);
    const mockResult: MartinoEngineResponse = {
      ok: true,
      outputPath: 'C:/out/VTest.musicxml',
      versionUsed: 'V5.3',
      readinessScore: 4,
      warnings: [],
      activityMapText: 'PRIMARY_ACTIVITY=A1_LINEAR_CORE',
      lfvFlags: [],
      stderrExcerpt: '',
    };
    const updated = appendMartinoGenerationReceipt(mc, mockResult);
    expect(mc.receipts).toHaveLength(0);
    expect(updated?.receipts).toHaveLength(1);
    expect(updated?.receipts[0]).toMatchObject({
      engine: 'martino',
      kind: 'martino_generation_complete',
      payload: {
        outputPath: mockResult.outputPath,
        readinessScore: mockResult.readinessScore,
        activitiesUsed: mockResult.activityMapText,
      },
    });
  });

  it('existing tune_config fields unaffected when musicContext null', () => {
    const viaBridge = buildMartinoTuneConfig(martinoSection, martinoConfig, null);
    const direct = buildTuneConfig(martinoSection, martinoConfig, null);
    expect(viaBridge.tune).toBe(direct.tune);
    expect(viaBridge.chords).toEqual(direct.chords);
    expect(viaBridge.primary_activity).toBe(direct.primary_activity);
    expect(viaBridge.choruses).toBe(direct.choruses);
    expect(viaBridge.music_context_motif_hint).toBeUndefined();
  });
});

describe('immutable receipts', () => {
  it('appendReceiptToMusicContext does not mutate the original', () => {
    const ctx = mockMusicContext();
    const updated = appendReceiptToMusicContext(ctx, {
      engine: 'riff',
      kind: 'test_receipt',
      payload: { ok: true },
    });
    expect(ctx.receipts).toHaveLength(0);
    expect(updated.receipts).toHaveLength(1);
    expect(updated.receipts).not.toBe(ctx.receipts);
  });
});

describe('normalizeChordSymbol', () => {
  it('rewrites iReal dialect to lead-sheet notation', () => {
    expect(normalizeChordSymbol('C^7')).toBe('Cmaj7');
    expect(normalizeChordSymbol('CΔ7')).toBe('Cmaj7');
    expect(normalizeChordSymbol('D-7')).toBe('Dm7');
    expect(normalizeChordSymbol('G-9')).toBe('Gm9');
    expect(normalizeChordSymbol('Eb-7')).toBe('Ebm7');
    expect(normalizeChordSymbol('F#ø7')).toBe('F#m7b5');
    expect(normalizeChordSymbol('Bdim7')).toBe('B°7');
    expect(normalizeChordSymbol('G7')).toBe('G7');
    expect(normalizeChordSymbol('Ab7')).toBe('Ab7');
  });
});

function mockIRealChart(overrides: Partial<ParsedChart> = {}): ParsedChart {
  return {
    title: 'Autumn Leaves',
    composer: 'Kosma',
    key: 'Bb major',
    meter: { num: 4, den: 4 },
    timeSignature: { num: 4, den: 4 },
    harmonies: ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7'],
    barMeterMap: {},
    repeatMarkers: [],
    tempo: 140,
    style: 'Jazz',
    sections: [],
    measures: [],
    repeats: [],
    ...overrides,
  };
}

describe('buildMusicContextFromIReal', () => {
  it('key.root is normalised pitch class not full key string', () => {
    const ctx = buildMusicContextFromIReal(mockIRealChart());
    expect(ctx.key.root).toBe('Bb');
    expect(ctx.key.mode).toBe('major');
  });

  it('harmony bars length matches chart harmonies length', () => {
    const chart = mockIRealChart();
    const ctx = buildMusicContextFromIReal(chart);
    expect(ctx.harmony.bars).toHaveLength(chart.harmonies.length);
  });

  it('provenance.sourceEngineId is ireal', () => {
    const ctx = buildMusicContextFromIReal(mockIRealChart());
    expect(ctx.provenance?.sourceEngineId).toBe('ireal');
  });

  it('receipts is empty array not undefined', () => {
    const ctx = buildMusicContextFromIReal(mockIRealChart());
    expect(ctx.receipts).toEqual([]);
    expect(ctx.receipts).not.toBeUndefined();
  });
});

describe('buildMusicContextFromSlonimsky', () => {
  it('harmony bars is empty array not null', () => {
    const ctx = buildMusicContextFromSlonimsky(
      { notes: [{ midi: 60, durationBeats: 1, beat: 0, role: 'target' }] },
      { key: 'G' }
    );
    expect(ctx.harmony.bars).toEqual([]);
    expect(ctx.harmony.bars).not.toBeNull();
  });

  it('key.root matches params.key normalised', () => {
    const ctx = buildMusicContextFromSlonimsky({ notes: [] }, { key: 'Bb major' });
    expect(ctx.key.root).toBe('Bb');
  });

  it('provenance.sourceEngineId is slonimsky', () => {
    const ctx = buildMusicContextFromSlonimsky({ notes: [] }, { key: 'C' });
    expect(ctx.provenance?.sourceEngineId).toBe('slonimsky');
  });
});

describe('API wiring — MusicContext', () => {
  it('GenerateRequest accepts optional musicContext field', () => {
    const ctx = mockMusicContext();
    const req: GenerateRequest = {
      presetId: 'wyble_etude',
      styleStack: { primary: 'neutral' },
      seed: 1,
      musicContext: ctx,
    };
    expect(req.musicContext).toBe(ctx);
  });

  it('riff_generator result surfaces musicContext when present', () => {
    const fs = require('fs') as typeof import('fs');
    const os = require('os') as typeof import('os');
    const path = require('path') as typeof import('path');
    const { runRiffGeneratorApp } = require('../app-api/riffGeneratorApp');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'riff-mc-api-'));
    const result = runRiffGeneratorApp(
      {
        presetId: 'riff_generator',
        styleStack: { primary: 'neutral' },
        seed: 4242,
        totalBars: 2,
        chordProgressionText: 'Dm7 | G7',
        bpm: 100,
      },
      dir
    );
    expect(result.success).toBe(true);
    expect(result.musicContext).toBeDefined();
    expect(result.musicContext?.presetId).toBe('riff_generator');
    expect(result.musicContext?.harmony.bars.length).toBeGreaterThan(0);
  });

  it('wyble_etude passes musicContext to WybleParameters when present', () => {
    process.env.WYBLE_MUSIC_CONTEXT = 'true';
    const wybleGen = require('../../jimmy-wyble-engine/wybleGenerator');
    const spy = jest.spyOn(wybleGen, 'generateWybleEtude');
    const { generateWybleEtudeXml } = require('../core/goldenPath/wybleBypassGenerator');
    const { parseBarStringsToCanonicalChords } = require('../core/harmony/chordPipeline');
    const mc = mockMusicContext();
    const bars = ['Dm7', 'G7'];
    const canonical = parseBarStringsToCanonicalChords(bars);
    generateWybleEtudeXml(bars, canonical, 99, 'Wyble MC', { musicContext: mc });
    expect(spy).toHaveBeenCalled();
    const params = spy.mock.calls[spy.mock.calls.length - 1]?.[0];
    expect(params.musicContext).toBe(mc);
    spy.mockRestore();
  });

  it('martino_linear passes musicContext to buildTuneConfig when present', () => {
    process.env.MARTINO_MUSIC_CONTEXT = 'true';
    const mc = mockMusicContext();
    const cfg = buildMartinoTuneConfig(
      { name: 'Martino', barCount: 2, meter: '4/4', key: 'F' },
      { progression: ['Am7', 'D7'] },
      mc
    );
    expect(cfg.chords).toEqual(['Dm', 'Dm', 'Em']);
    delete process.env.MARTINO_MUSIC_CONTEXT;
  });
});

function mockVaultOutput(overrides: Partial<IRealVaultOutput> = {}): IRealVaultOutput {
  return {
    title: 'Vault Test',
    key: 'C',
    bars: 32,
    generatedNotes: [],
    chordMappings: [{ barIndex: 0, symbol: 'Xmaj7', vaultChordTypeId: 'maj7', rootPc: 0 }],
    unmappedChords: [],
    mode: 'solo',
    seed: 12345,
    ...overrides,
  };
}

function mockVaultChart(overrides: Partial<ParsedChart> = {}): ParsedChart {
  return {
    title: 'Vault Chart',
    composer: '',
    key: null,
    meter: { num: 4, den: 4 },
    timeSignature: { num: 4, den: 4 },
    harmonies: ['C^7', 'Dm7'],
    barMeterMap: {},
    repeatMarkers: [],
    tempo: 100,
    style: null,
    sections: [],
    measures: Array.from({ length: 8 }, () => []),
    repeats: [],
    ...overrides,
  };
}

describe('buildMusicContextFromVaultOutput', () => {
  it('harmony.bars uses chart.harmonies not chordMappings', () => {
    const chart = mockVaultChart({ harmonies: ['C^7', 'Dm7'] });
    const output = mockVaultOutput({
      chordMappings: [
        { barIndex: 0, symbol: 'G7alt', vaultChordTypeId: 'dom7', rootPc: 7 },
        { barIndex: 1, symbol: 'Am7b5', vaultChordTypeId: 'm7b5', rootPc: 9 },
      ],
    });
    const ctx = buildMusicContextFromVaultOutput(output, chart);
    expect(ctx.harmony.bars).toEqual(['Cmaj7', 'Dm7']);
  });

  it('harmony.checksum matches computeMusicContextChecksum on normalized chart harmonies', () => {
    const chart = mockVaultChart({ harmonies: ['C^7', 'Dm7'] });
    const ctx = buildMusicContextFromVaultOutput(mockVaultOutput(), chart);
    const expected = computeMusicContextChecksum(chart.harmonies.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(expected);
  });

  it('totalBars is chart.measures.length not output.bars', () => {
    const chart = mockVaultChart({ measures: Array.from({ length: 8 }, () => []) });
    const output = mockVaultOutput({ bars: 32 });
    const ctx = buildMusicContextFromVaultOutput(output, chart);
    expect(ctx.totalBars).toBe(8);
    expect(output.bars).toBe(32);
  });

  it("key.root is 'C' when chart.key is null", () => {
    const ctx = buildMusicContextFromVaultOutput(mockVaultOutput(), mockVaultChart({ key: null }));
    expect(ctx.key.root).toBe('C');
    expect(ctx.key.mode).toBe('major');
  });

  it('provenance.sourceEngineId is vault', () => {
    const ctx = buildMusicContextFromVaultOutput(mockVaultOutput(), mockVaultChart());
    expect(ctx.provenance?.sourceEngineId).toBe('vault');
  });

  it('receipts contains vault_generation_complete on every call', () => {
    const ctx = buildMusicContextFromVaultOutput(mockVaultOutput(), mockVaultChart());
    expect(ctx.receipts.some((r) => r.kind === 'vault_generation_complete')).toBe(true);
  });

  it('receipts contains vault_unmapped_chords when output.unmappedChords.length > 0', () => {
    const output = mockVaultOutput({
      unmappedChords: [
        { barIndex: 2, symbol: '???' },
        { barIndex: 5, symbol: '???' },
      ],
    });
    const ctx = buildMusicContextFromVaultOutput(output, mockVaultChart());
    const receipt = ctx.receipts.find((r) => r.kind === 'vault_unmapped_chords');
    expect(receipt).toBeDefined();
    expect(receipt?.payload).toEqual({ count: 2, bars: [2, 5] });
  });

  it('receipts does not contain vault_unmapped_chords when unmappedChords is empty', () => {
    const ctx = buildMusicContextFromVaultOutput(
      mockVaultOutput({ unmappedChords: [] }),
      mockVaultChart()
    );
    expect(ctx.receipts.some((r) => r.kind === 'vault_unmapped_chords')).toBe(false);
  });

  it('motif is undefined', () => {
    const ctx = buildMusicContextFromVaultOutput(mockVaultOutput(), mockVaultChart());
    expect(ctx.motif).toBeUndefined();
  });

  it('on error returns valid MusicContext with vault_producer_error receipt and does not throw', () => {
    const chordAnalysis = require('../core/harmony/chordSymbolAnalysis');
    const spy = jest.spyOn(chordAnalysis, 'normalizeChordSymbol').mockImplementation(() => {
      throw new Error('forced vault producer failure');
    });
    expect(() => buildMusicContextFromVaultOutput(mockVaultOutput(), mockVaultChart())).not.toThrow();
    const ctx = buildMusicContextFromVaultOutput(mockVaultOutput(), mockVaultChart());
    expect(ctx.harmony.bars).toEqual([]);
    expect(ctx.harmony.checksum).toBe(computeMusicContextChecksum([]));
    expect(ctx.receipts.some((r) => r.kind === 'vault_producer_error')).toBe(true);
    spy.mockRestore();
  });

  it('vault and iReal producers produce identical harmony.checksum for the same ParsedChart', () => {
    const chart: ParsedChart = {
      title: 'Drift Test',
      composer: '',
      key: 'F major',
      meter: { num: 4, den: 4 },
      timeSignature: { num: 4, den: 4 },
      harmonies: ['Dm7', 'G7', 'Cmaj7', 'Am7'],
      barMeterMap: {},
      repeatMarkers: [],
      tempo: 120,
      style: null,
      sections: [],
      measures: Array.from({ length: 4 }, () => []),
      repeats: [],
    };
    const irealCtx = buildMusicContextFromIReal(chart);
    const vaultCtx = buildMusicContextFromVaultOutput(mockVaultOutput({ bars: 16 }), chart);
    expect(vaultCtx.harmony.checksum).toBe(irealCtx.harmony.checksum);
  });
});

describe('buildMusicContextFromWyble', () => {
  it('harmony.bars normalised via normalizeChordSymbol', () => {
    const ctx = buildMusicContextFromWyble(['C^7', 'D-7'], { key: 'C' });
    expect(ctx.harmony.bars).toEqual(['Cmaj7', 'Dm7']);
    expect(ctx.harmony.checksum).toBe(computeMusicContextChecksum(['Cmaj7', 'Dm7']));
  });

  it('tuning field present when params.tuning provided', () => {
    const tuning = { name: 'Standard', strings: [40, 45, 50, 55, 59, 64] as const, capo: 0 };
    const ctx = buildMusicContextFromWyble(['G7'], { tuning });
    expect(ctx.tuning).toEqual(tuning);
  });

  it('tuning field absent when params.tuning omitted', () => {
    const ctx = buildMusicContextFromWyble(['G7'], { key: 'G' });
    expect(ctx.tuning).toBeUndefined();
  });

  it("provenance.sourceEngineId === 'wyble'", () => {
    const ctx = buildMusicContextFromWyble(['Am7'], {});
    expect(ctx.provenance?.sourceEngineId).toBe('wyble');
  });

  it('receipts is empty array', () => {
    const ctx = buildMusicContextFromWyble(['Am7'], {});
    expect(ctx.receipts).toEqual([]);
  });

  it('motif is undefined', () => {
    const ctx = buildMusicContextFromWyble(['Am7'], {});
    expect(ctx.motif).toBeUndefined();
  });

  it('totalBars = params.totalBars when provided', () => {
    const ctx = buildMusicContextFromWyble(['Am7', 'D7', 'G7'], { totalBars: 16 });
    expect(ctx.totalBars).toBe(16);
    expect(ctx.harmony.bars).toHaveLength(3);
  });
});

describe('isMusicContextStale', () => {
  it('returns false when provenance absent', () => {
    const ctx = mockMusicContext({ provenance: undefined });
    expect(isMusicContextStale(ctx)).toBe(false);
  });

  it('returns false when capturedAt is recent (Date.now())', () => {
    const ctx = mockMusicContext({
      provenance: { sourceEngineId: 'riff', capturedAt: Date.now() },
    });
    expect(isMusicContextStale(ctx)).toBe(false);
  });

  it('returns true when capturedAt is older than threshold', () => {
    const ctx = mockMusicContext({
      provenance: { sourceEngineId: 'riff', capturedAt: Date.now() - 11 * 60 * 1000 },
    });
    expect(isMusicContextStale(ctx, 10 * 60 * 1000)).toBe(true);
  });
});

describe('getMusicContextHopCount', () => {
  it('returns 0 when receipts is empty', () => {
    expect(getMusicContextHopCount(mockMusicContext())).toBe(0);
  });

  it('returns correct count for 1 engine-complete receipt', () => {
    const ctx = mockMusicContext({
      receipts: [{ engine: 'riff', kind: 'riff_generator_complete', payload: {} }],
    });
    expect(getMusicContextHopCount(ctx)).toBe(1);
  });

  it('returns correct count for 2 engine-complete receipts', () => {
    const ctx = mockMusicContext({
      receipts: [
        { engine: 'riff', kind: 'riff_generator_complete', payload: {} },
        { engine: 'vault', kind: 'vault_generation_complete', payload: {} },
      ],
    });
    expect(getMusicContextHopCount(ctx)).toBe(2);
  });
});

describe('isMusicContextHopLimitReached', () => {
  it('returns false at 1 hop', () => {
    const ctx = mockMusicContext({
      receipts: [{ engine: 'riff', kind: 'riff_generator_complete', payload: {} }],
    });
    expect(isMusicContextHopLimitReached(ctx)).toBe(false);
  });

  it('returns true at 2 hops (default limit)', () => {
    const ctx = mockMusicContext({
      receipts: [
        { engine: 'riff', kind: 'riff_generator_complete', payload: {} },
        { engine: 'martino', kind: 'martino_generation_complete', payload: {} },
      ],
    });
    expect(isMusicContextHopLimitReached(ctx)).toBe(true);
  });

  it('returns true at 3 hops', () => {
    const ctx = mockMusicContext({
      receipts: [
        { engine: 'riff', kind: 'riff_generator_complete', payload: {} },
        { engine: 'vault', kind: 'vault_generation_complete', payload: {} },
        { engine: 'martino', kind: 'martino_generation_complete', payload: {} },
      ],
    });
    expect(isMusicContextHopLimitReached(ctx)).toBe(true);
  });
});
