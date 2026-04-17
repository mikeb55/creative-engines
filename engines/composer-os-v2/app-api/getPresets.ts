/**
 * Composer OS V2 — App API: get presets
 */

import type { AppPreset } from './appApiTypes';
import { guitarBassDuoPreset } from '../presets/guitarBassDuoPreset';
import { ecmChamberPreset } from '../presets/ecmChamberPreset';
import { bigBandPreset } from '../presets/bigBandPreset';
import { stringQuartetPreset } from '../presets/stringQuartetPreset';
import { songModePreset } from '../presets/songModePreset';

const PRESETS: AppPreset[] = [
  {
    id: guitarBassDuoPreset.id,
    name: guitarBassDuoPreset.name,
    description: 'Clean Electric Guitar + Acoustic Upright Bass. Chord symbols and rehearsal marks.',
    supported: true,
  },
  {
    id: 'guitar_bass_duo_single_line',
    name: 'Guitar–Bass Duo (Single-Line)',
    description:
      'Same duo harmony path with one single-note guitar line and one single-note bass line (conversational interplay).',
    supported: true,
  },
  {
    id: 'wyble_etude',
    name: 'Wyble Etude',
    description: 'Two-voice contrapuntal guitar etude (Jimmy Wyble style)',
    supported: true,
  },
  {
    id: ecmChamberPreset.id,
    name: ecmChamberPreset.name,
    description:
      'ECM chamber jazz: Metheny-style quartet or Schneider/Wheeler-style chamber modes (straight feel, modal harmony).',
    supported: true,
  },
  {
    id: songModePreset.id,
    name: songModePreset.name,
    description:
      'Song plan (hooks, sections, rules) then golden-path Guitar–Bass Duo realisation as exported MusicXML.',
    supported: true,
  },
  {
    id: bigBandPreset.id,
    name: bigBandPreset.name,
    description:
      'Full 7-part ensemble MusicXML when realisation and export pass; planning JSON if realisation or export fails.',
    supported: true,
  },
  {
    id: stringQuartetPreset.id,
    name: stringQuartetPreset.name,
    description:
      'Four strings plus piano harmony staff — MusicXML when realisation and export pass; planning JSON if not.',
    supported: true,
  },
  {
    id: 'riff_generator',
    name: 'Riff Generator',
    description:
      'Short loopable riffs (1–4 bars), high-identity rhythm & melody, LOCK grid, GCE ≥ 9, Sibelius-safe MusicXML to your library Riffs folder.',
    supported: true,
  },
];

export function getPresets(): AppPreset[] {
  return [...PRESETS];
}
