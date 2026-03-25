/**
 * Composer OS V2 — App API: get presets
 */

import type { AppPreset } from './appApiTypes';
import { guitarBassDuoPreset } from '../presets/guitarBassDuoPreset';
import { ecmChamberPreset } from '../presets/ecmChamberPreset';
import { bigBandPreset } from '../presets/bigBandPreset';
import { stringQuartetPreset } from '../presets/stringQuartetPreset';

const PRESETS: AppPreset[] = [
  {
    id: guitarBassDuoPreset.id,
    name: guitarBassDuoPreset.name,
    description: 'Clean Electric Guitar + Acoustic Upright Bass. Chord symbols and rehearsal marks.',
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
];

export function getPresets(): AppPreset[] {
  return [...PRESETS];
}
