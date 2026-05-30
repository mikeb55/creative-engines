import { describe, expect, it } from 'vitest';
import {
  GENERATE_PRODUCER_LANES,
  applyGenerateProducerSideEffects,
  getGenerateProducerTile,
  producerIdFromPresetId,
  tritonicFloatOverLabel,
} from '../src/constants/generateProducerLanes';

describe('generateProducerLanes', () => {
  it('defines three lanes with expected producer counts', () => {
    expect(GENERATE_PRODUCER_LANES).toHaveLength(3);
    expect(GENERATE_PRODUCER_LANES[0].producers.map((p) => p.id)).toEqual([
      'song_mode',
      'ireal',
      'vault',
      'comping',
    ]);
    expect(GENERATE_PRODUCER_LANES[1].producers.length).toBe(5);
    expect(GENERATE_PRODUCER_LANES[2].producers.map((p) => p.id)).toContain('tritonic');
    expect(GENERATE_PRODUCER_LANES[2].producers.map((p) => p.id)).toContain('string_quartet');
  });

  it('maps preset ids to producer ids', () => {
    expect(producerIdFromPresetId('song_mode')).toBe('song_mode');
    expect(producerIdFromPresetId('riff_generator', { riffSubMode: 'comping' })).toBe('comping');
    expect(producerIdFromPresetId('wyble_etude')).toBe('wyble');
    expect(producerIdFromPresetId('guitar_bass_duo_single_line')).toBe('duo');
  });

  it('returns side effects for chart and texture producers', () => {
    expect(applyGenerateProducerSideEffects('comping').riffSubMode).toBe('comping');
    expect(applyGenerateProducerSideEffects('wayne_shorter').songwriterStyle).toBe('wayne_shorter');
    expect(applyGenerateProducerSideEffects('monk').songwriterStyle).toBe('thelonious_monk');
    expect(applyGenerateProducerSideEffects('new_orleans').rhythmEngineId).toBe(
      'new_orleans_second_line'
    );
    expect(applyGenerateProducerSideEffects('tritonic').sqTritonicColour).toBe('subtle');
  });

  it('resolves float-over label from vault vs generated harmony', () => {
    expect(tritonicFloatOverLabel({ hasVaultChart: true, hasGeneratedHarmony: false })).toBe(
      'vault chart'
    );
    expect(tritonicFloatOverLabel({ hasVaultChart: false, hasGeneratedHarmony: true })).toBe(
      'generated harmony'
    );
    expect(tritonicFloatOverLabel({ hasVaultChart: false, hasGeneratedHarmony: false })).toContain(
      'vault chart'
    );
  });

  it('exposes selection blurbs for every tile', () => {
    for (const lane of GENERATE_PRODUCER_LANES) {
      for (const p of lane.producers) {
        expect(getGenerateProducerTile(p.id)?.selectionBlurb.length).toBeGreaterThan(10);
      }
    }
  });
});
