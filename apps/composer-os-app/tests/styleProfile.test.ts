import { describe, expect, it } from 'vitest';
import {
  BADALAMENTI_HARMONIC_STYLE_KEYS,
  GIL_EVANS_HARMONIC_STYLE_KEYS,
  HERRMANN_HARMONIC_STYLE_KEYS,
  JOHN_COLTRANE_HARMONIC_STYLE_KEYS,
  MORRICONE_HARMONIC_STYLE_KEYS,
  QUINCY_JONES_FILM_HARMONIC_STYLE_KEYS,
} from '@composer-os/core/song-mode/harmonicVoiceStyleContextKeys';
import {
  buildGenerationContext,
  migrateLegacySongwriterValue,
  resolveHarmonicContextKeys,
  resolveRhythmContextKeys,
} from '../src/types/styleProfile';

describe('styleProfile', () => {
  it('migrateLegacySongwriterValue(greek_rebetiko) returns rhythm engineId', () => {
    const m = migrateLegacySongwriterValue('greek_rebetiko');
    expect(m.rhythm?.engineId).toBe('greek_rebetiko');
    expect(m.harmonic?.voiceId).toBeUndefined();
  });

  it('migrateLegacySongwriterValue(debussy) returns harmonic voiceId', () => {
    const m = migrateLegacySongwriterValue('debussy');
    expect(m.harmonic?.voiceId).toBe('debussy');
    expect(m.rhythm?.engineId).toBeUndefined();
  });

  it('buildGenerationContext with both selected returns combinedKeys with hv: and gr:', () => {
    const ctx = buildGenerationContext({
      harmonic: { voiceId: 'debussy' },
      rhythm: { engineId: 'greek_rebetiko', presetId: 'zeibekiko_9_8', contextKeys: [] },
    });
    expect(ctx.harmonicKeys).toEqual(['hv:debussy']);
    expect(ctx.rhythmKeys).toEqual(['gr:core', 'gr:zeibekiko_9_8']);
    expect(ctx.combinedKeys).toEqual(['hv:debussy', 'gr:core', 'gr:zeibekiko_9_8']);
  });

  it('buildGenerationContext with only harmonic returns empty rhythmKeys', () => {
    const ctx = buildGenerationContext({
      harmonic: { voiceId: 'bill_evans' },
      rhythm: { engineId: null, presetId: null, contextKeys: [] },
    });
    expect(ctx.harmonicKeys).toEqual(['hv:bill_evans']);
    expect(ctx.rhythmKeys).toEqual([]);
  });

  it('buildGenerationContext with only rhythm returns empty harmonicKeys', () => {
    const ctx = buildGenerationContext({
      harmonic: { voiceId: null },
      rhythm: { engineId: 'brazilian', presetId: null, contextKeys: [] },
    });
    expect(ctx.harmonicKeys).toEqual([]);
    expect(ctx.rhythmKeys).toEqual(['br:core']);
  });

  it("resolveRhythmContextKeys('brazilian', 'bossa-nova-basic') returns br: keys", () => {
    expect(resolveRhythmContextKeys('brazilian', 'bossa-nova-basic')).toEqual([
      'br:core',
      'br:bossa-nova-basic',
    ]);
  });

  it('resolveHarmonicContextKeys(morricone) includes hv + research tags', () => {
    expect(MORRICONE_HARMONIC_STYLE_KEYS).toHaveLength(10);
    expect(resolveHarmonicContextKeys('morricone')).toEqual(['hv:morricone', ...MORRICONE_HARMONIC_STYLE_KEYS]);
  });

  it('resolveHarmonicContextKeys(herrmann) includes hv + research tags', () => {
    expect(HERRMANN_HARMONIC_STYLE_KEYS).toHaveLength(10);
    expect(resolveHarmonicContextKeys('herrmann')).toEqual(['hv:herrmann', ...HERRMANN_HARMONIC_STYLE_KEYS]);
  });

  it('resolveHarmonicContextKeys(quincy_jones_film) includes hv + research tags', () => {
    expect(QUINCY_JONES_FILM_HARMONIC_STYLE_KEYS).toHaveLength(10);
    expect(resolveHarmonicContextKeys('quincy_jones_film')).toEqual([
      'hv:quincy_jones_film',
      ...QUINCY_JONES_FILM_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(badalamenti) includes hv + research tags', () => {
    expect(BADALAMENTI_HARMONIC_STYLE_KEYS).toHaveLength(10);
    expect(resolveHarmonicContextKeys('badalamenti')).toEqual([
      'hv:badalamenti',
      ...BADALAMENTI_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(john_coltrane) returns hv + 14 research tags', () => {
    expect(JOHN_COLTRANE_HARMONIC_STYLE_KEYS).toHaveLength(14);
    expect(resolveHarmonicContextKeys('john_coltrane')).toEqual([
      'hv:john_coltrane',
      ...JOHN_COLTRANE_HARMONIC_STYLE_KEYS,
    ]);
  });

  it('resolveHarmonicContextKeys(gil_evans) returns hv + 15 research tags', () => {
    expect(GIL_EVANS_HARMONIC_STYLE_KEYS).toHaveLength(15);
    expect(resolveHarmonicContextKeys('gil_evans')).toEqual([
      'hv:gil_evans',
      ...GIL_EVANS_HARMONIC_STYLE_KEYS,
    ]);
  });
});
