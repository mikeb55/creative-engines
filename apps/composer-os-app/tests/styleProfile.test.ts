import { describe, expect, it } from 'vitest';
import {
  buildGenerationContext,
  migrateLegacySongwriterValue,
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
});
