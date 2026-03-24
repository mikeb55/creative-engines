/**
 * Composer OS V2 — App API: get presets
 */

import type { AppPreset } from './appApiTypes';
import { guitarBassDuoPreset } from '../presets/guitarBassDuoPreset';
import { ecmChamberPreset } from '../presets/ecmChamberPreset';
import { bigBandPreset } from '../presets/bigBandPreset';

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
    description: 'Minimal chamber jazz configuration.',
    supported: false,
  },
  {
    id: bigBandPreset.id,
    name: bigBandPreset.name,
    description: 'Placeholder for future big band instrumentation.',
    supported: false,
  },
];

export function getPresets(): AppPreset[] {
  return [...PRESETS];
}
