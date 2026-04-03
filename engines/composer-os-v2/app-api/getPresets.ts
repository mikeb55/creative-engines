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
      'Same duo harmony as Guitar/Bass Duo, with one single-note guitar line and one single-note bass line (no chordal guitar layer).',
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
      'Song Mode: structural song + lead-sheet-ready contract (JSON summary; no MusicXML lead sheet export in this build).',
    supported: true,
  },
  {
    id: bigBandPreset.id,
    name: bigBandPreset.name,
    description:
      'Big band planning mode: form/section/density/orchestration via runBigBandMode (no full ensemble MusicXML yet).',
    supported: true,
  },
  {
    id: stringQuartetPreset.id,
    name: stringQuartetPreset.name,
    description:
      'String quartet planning: form/texture/density/orchestration via runStringQuartetMode (no quartet MusicXML yet).',
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
