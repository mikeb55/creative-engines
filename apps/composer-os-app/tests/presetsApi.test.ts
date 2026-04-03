/**
 * Preset ids exposed to UI match Composer OS v2 app API (not legacy Studio lists).
 */
import * as path from 'path';
import { getPresets } from '@composer-os/app-api/getPresets';

describe('Composer OS presets API', () => {
  it('returns only known v2 preset ids from engine presets', () => {
    const presets = getPresets();
    const ids = presets.map((p) => p.id).sort();
    expect(ids).toEqual([
      'big_band',
      'ecm_chamber',
      'guitar_bass_duo',
      'guitar_bass_duo_single_line',
      'riff_generator',
      'song_mode',
      'string_quartet',
    ]);
    expect(presets.every((p) => typeof p.supported === 'boolean')).toBe(true);
  });
});
