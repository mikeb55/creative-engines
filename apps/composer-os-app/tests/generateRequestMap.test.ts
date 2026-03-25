/**
 * UI → GenerateRequest field names (contract with Composer OS app API).
 */
import { describe, it, expect } from 'vitest';
import { mapCoreUiToGenerationFields } from '../src/utils/buildGenerateRequestBody';

describe('mapCoreUiToGenerationFields', () => {
  it('maps key/tempo/bars/variation/stability and style pairing to engine request fields', () => {
    const body = mapCoreUiToGenerationFields({
      presetId: 'big_band',
      seed: 100,
      tonalCenter: 'Bb',
      bpm: 144,
      totalBars: 48,
      variationId: 'v-3',
      creativeControlLevel: 'balanced',
      stylePairing: { songwriterStyle: 'beatles', arrangerStyle: 'ellington', era: 'swing' },
      ensembleConfigId: 'medium_band',
    });
    expect(body['tonalCenter']).toBe('Bb');
    expect(body['bpm']).toBe(144);
    expect(body['totalBars']).toBe(48);
    expect(body['variationId']).toBe('v-3');
    expect(body['creativeControlLevel']).toBe('balanced');
    expect(body['stylePairing']).toEqual({
      songwriterStyle: 'beatles',
      arrangerStyle: 'ellington',
      era: 'swing',
    });
    expect(body['ensembleConfigId']).toBe('medium_band');
    expect(body['presetId']).toBe('big_band');
    expect(body['seed']).toBe(100);
  });

  it('omits empty tonal centre and zero BPM', () => {
    const body = mapCoreUiToGenerationFields({
      presetId: 'guitar_bass_duo',
      seed: 1,
      tonalCenter: '   ',
      bpm: 0,
      totalBars: 32,
      variationId: 'x',
      creativeControlLevel: 'stable',
    });
    expect(body['tonalCenter']).toBeUndefined();
    expect(body['bpm']).toBeUndefined();
  });
});
