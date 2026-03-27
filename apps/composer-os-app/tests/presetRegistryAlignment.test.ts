/**
 * UI static registry must match engine getPresets() (ids + descriptions).
 */
import { describe, expect, it } from 'vitest';
import { getPresets } from '@composer-os/app-api/getPresets';
import { APP_PRESET_REGISTRY, mergePresetsWithRegistry } from '../src/constants/composerOsPresetUi';

describe('APP_PRESET_REGISTRY', () => {
  it('matches engine getPresets() ids and fields', () => {
    const engine = getPresets();
    expect(APP_PRESET_REGISTRY.length).toBe(engine.length);
    for (let i = 0; i < engine.length; i++) {
      expect(APP_PRESET_REGISTRY[i].id).toBe(engine[i].id);
      expect(APP_PRESET_REGISTRY[i].name).toBe(engine[i].name);
      expect(APP_PRESET_REGISTRY[i].description).toBe(engine[i].description);
      expect(APP_PRESET_REGISTRY[i].supported).toBe(engine[i].supported);
    }
  });

  it('mergePresetsWithRegistry fills missing API entries from static registry', () => {
    const partial = [{ id: 'guitar_bass_duo', name: 'X', description: 'Y', supported: true }];
    const merged = mergePresetsWithRegistry(partial);
    expect(merged.length).toBe(6);
    expect(merged.some((p) => p.id === 'riff_generator')).toBe(true);
    expect(merged.find((p) => p.id === 'riff_generator')?.name).toBe('Riff Generator');
  });
});
