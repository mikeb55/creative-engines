/**
 * String Quartet MusicContext producer (V105p1).
 */

import { normalizeChordSymbol } from '../harmony/chordSymbolAnalysis';
import { computeMusicContextChecksum } from '../music-context/musicContextAdapters';
import { buildMusicContextFromStringQuartet } from './stringQuartetMusicContextProducer';
import {
  STRING_QUARTET_TEXTURE_ARCHETYPES,
  type StringQuartetMusicContextPreset,
  type StringQuartetTextureArchetype,
} from './stringQuartetMusicContextTypes';
import {
  SQ_MC_MIDI_BOUNDS,
  solveStringQuartetVoiceLeading,
  tritonicFloatEnabled,
  assignStringQuartetRoles,
} from './stringQuartetMusicContextRealisation';

function samplePreset(
  overrides: Partial<StringQuartetMusicContextPreset> &
    Pick<StringQuartetMusicContextPreset, 'textureArchetype'>,
): StringQuartetMusicContextPreset {
  return {
    key: 0,
    tempo: 0,
    seed: 75001,
    ...overrides,
  };
}

describe('buildMusicContextFromStringQuartet', () => {
  it.each(STRING_QUARTET_TEXTURE_ARCHETYPES)(
    'returns valid MusicContext for texture %s',
    (textureArchetype) => {
      const ctx = buildMusicContextFromStringQuartet(samplePreset({ textureArchetype }));
      expect(ctx.schemaVersion).toBe('1.0');
      expect(ctx.presetId).toBe('string_quartet');
      expect(ctx.harmony.bars.length).toBe(8);
      expect(ctx.totalBars).toBe(8);
      expect(ctx.harmony.bars.every((b) => b.trim().length > 0)).toBe(true);
    },
  );

  it('harmony.checksum matches normalised bars', () => {
    const ctx = buildMusicContextFromStringQuartet(
      samplePreset({ textureArchetype: 'contrapuntal_weave', key: 7 }),
    );
    const expected = computeMusicContextChecksum(ctx.harmony.bars.map(normalizeChordSymbol));
    expect(ctx.harmony.checksum).toBe(expected);
    expect(ctx.harmony.bars).toEqual(ctx.harmony.bars.map(normalizeChordSymbol));
  });

  it("provenance.sourceEngineId === 'string_quartet'", () => {
    const ctx = buildMusicContextFromStringQuartet(samplePreset({ textureArchetype: 'chorale' }));
    expect(ctx.provenance?.sourceEngineId).toBe('string_quartet');
    expect(typeof ctx.provenance?.capturedAt).toBe('number');
  });

  it('receipt kind string_quartet_realisation_complete carries diagnostics', () => {
    const textures: StringQuartetTextureArchetype[] = ['pad_suspension', 'pizzicato_pulse'];
    for (const textureArchetype of textures) {
      const ctx = buildMusicContextFromStringQuartet(
        samplePreset({ textureArchetype, tempo: 100, seed: 4242 }),
      );
      const receipt = ctx.receipts.find((r) => r.kind === 'string_quartet_realisation_complete');
      expect(receipt?.engine).toBe('string_quartet');
      expect(receipt?.payload).toMatchObject({
        textureArchetype,
        barCount: 8,
        bpm: 100,
        tritonicFloatEnabled: tritonicFloatEnabled(textureArchetype),
        voiceCrossingCount: expect.any(Number),
        lowRegisterCrowdingCount: expect.any(Number),
        outerVoiceParallelsCount: expect.any(Number),
        meanLeapPerPart: {
          violin_1: expect.any(Number),
          violin_2: expect.any(Number),
          viola: expect.any(Number),
          cello: expect.any(Number),
        },
        lineSmoothnessScore: {
          violin_1: expect.any(Number),
          violin_2: expect.any(Number),
          viola: expect.any(Number),
          cello: expect.any(Number),
        },
        registralBalanceScore: expect.any(Number),
        harmonicCompletenessScore: expect.any(Number),
        textureStabilityScore: expect.any(Number),
      });
    }
  });

  it('uses texture default tempo when preset tempo is zero', () => {
    const ctx = buildMusicContextFromStringQuartet(samplePreset({ textureArchetype: 'chorale', tempo: 0 }));
    expect(ctx.bpm).toBe(72);
  });

  it('suppresses tritonic float in chorale texture', () => {
    const ctx = buildMusicContextFromStringQuartet(samplePreset({ textureArchetype: 'chorale' }));
    const receipt = ctx.receipts.find((r) => r.kind === 'string_quartet_realisation_complete');
    expect(receipt?.payload).toMatchObject({ tritonicFloatEnabled: false });
  });

  it('assigns roles per instrument in receipt payload', () => {
    const ctx = buildMusicContextFromStringQuartet(samplePreset({ textureArchetype: 'duet_support', seed: 99 }));
    const receipt = ctx.receipts.find((r) => r.kind === 'string_quartet_realisation_complete');
    expect(receipt?.payload).toMatchObject({
      roles: {
        cello: expect.stringMatching(/root_motion|pedal|bass_counterline/),
        viola: expect.stringMatching(/hinge_voice|thirds_sevenths|modal_colour/),
        violin_2: expect.stringMatching(/bridge_voice|harmonic_completion|rhythmic_glue/),
        violin_1: expect.stringMatching(/melody|upper_extension|tritonic_float_target/),
      },
    });
  });

  it('realised parts stay within hard MIDI bounds', () => {
    const ctx = buildMusicContextFromStringQuartet(
      samplePreset({ textureArchetype: 'contrapuntal_weave', seed: 12345 }),
    );
    const roles = assignStringQuartetRoles(12345);
    const bars = solveStringQuartetVoiceLeading({
      harmonyBars: ctx.harmony.bars,
      seed: 12345,
      texture: 'contrapuntal_weave',
      roles,
    });
    for (const bar of bars) {
      for (const part of ['violin_1', 'violin_2', 'viola', 'cello'] as const) {
        const [lo, hi] = SQ_MC_MIDI_BOUNDS[part];
        expect(bar.midis[part]).toBeGreaterThanOrEqual(lo);
        expect(bar.midis[part]).toBeLessThanOrEqual(hi);
      }
    }
  });
});
