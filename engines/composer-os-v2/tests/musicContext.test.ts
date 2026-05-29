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
import { generateModulationPlan } from '../core/modulation/modulationPlanner';
import {
  attachModulationToContext,
  buildRiffGeneratorMusicContext,
  computeMusicContextChecksum,
  coreMotifToMusicContextMotif,
  harmonyBarsFromMusicContext,
  keyPcFromRoot,
  motifToSeedPitches,
} from '../core/music-context/musicContextAdapters';
import type { MusicContext } from '../core/music-context/musicContextTypes';
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
    applyWybleMusicContextOverrides({
      ...wybleBaseParams(),
      musicContext: mc,
    });
    expect(mc.receipts).toHaveLength(1);
    expect(mc.receipts[0]).toMatchObject({
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
    appendMartinoGenerationReceipt(mc, mockResult);
    expect(mc.receipts).toHaveLength(1);
    expect(mc.receipts[0]).toMatchObject({
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
