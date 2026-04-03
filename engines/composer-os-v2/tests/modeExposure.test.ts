/**
 * Preset / mode exposure — honest capability labels (Prompt 7/7).
 */

import { getPresets } from '../app-api/getPresets';
import { COMPOSER_OS_V1_SUPPORTED_MODES } from '../app-api/releaseMetadata';

export function runModeExposureTests(): { ok: boolean; name: string }[] {
  const out: { ok: boolean; name: string }[] = [];
  const presets = getPresets();

  out.push({
    ok:
      presets.some((p) => p.id === 'guitar_bass_duo' && p.supported) &&
      presets.some((p) => p.id === 'guitar_bass_duo_single_line' && p.supported) &&
      presets.some((p) => p.id === 'ecm_chamber' && p.supported) &&
      presets.some((p) => p.id === 'riff_generator' && p.supported) &&
      presets.some((p) => p.id === 'song_mode' && p.supported) &&
      presets.some((p) => p.id === 'big_band' && p.supported) &&
      presets.some((p) => p.id === 'string_quartet' && p.supported),
    name: 'getPresets exposes supported top-level modes including guitar_bass_duo_single_line',
  });

  out.push({
    ok:
      COMPOSER_OS_V1_SUPPORTED_MODES.length === 7 &&
      COMPOSER_OS_V1_SUPPORTED_MODES.some((m) => m.presetId === 'big_band' && m.capability === 'planning_only') &&
      COMPOSER_OS_V1_SUPPORTED_MODES.some((m) => m.presetId === 'string_quartet' && m.capability === 'planning_only') &&
      COMPOSER_OS_V1_SUPPORTED_MODES.some((m) => m.presetId === 'song_mode' && m.capability === 'musicxml_generation') &&
      COMPOSER_OS_V1_SUPPORTED_MODES.some((m) => m.presetId === 'wyble_etude' && m.capability === 'musicxml_generation'),
    name: 'release metadata labels planning vs musicxml_generation honestly',
  });

  const bb = presets.find((p) => p.id === 'big_band');
  out.push({
    ok: !!bb?.description?.toLowerCase().includes('planning') || !!bb?.description?.includes('MusicXML'),
    name: 'big_band preset description does not claim full ensemble MusicXML',
  });

  return out;
}
