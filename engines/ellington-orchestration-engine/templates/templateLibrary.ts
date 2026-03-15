/**
 * Ellington Template Library — Real-music progression templates
 */

import type { ProgressionTemplate } from './templateTypes';

export const TEMPLATE_LIBRARY: Record<string, ProgressionTemplate> = {
  ii_V_I_major: {
    id: 'ii_V_I_major',
    name: 'ii-V-I Major',
    description: 'Classic jazz cadence in major',
    segments: [
      { chord: 'Dm7', bars: 2 },
      { chord: 'G7', bars: 2 },
      { chord: 'Cmaj7', bars: 4 },
    ],
  },
  jazz_blues: {
    id: 'jazz_blues',
    name: 'Jazz Blues',
    description: 'F blues progression',
    segments: [
      { chord: 'F7', bars: 4 },
      { chord: 'Bb7', bars: 2 },
      { chord: 'F7', bars: 2 },
      { chord: 'C7', bars: 2 },
      { chord: 'Bb7', bars: 2 },
    ],
  },
  rhythm_changes_A: {
    id: 'rhythm_changes_A',
    name: 'Rhythm Changes A',
    description: 'I-VI-ii-V in Bb',
    segments: [
      { chord: 'Bb6', bars: 2 },
      { chord: 'G7', bars: 2 },
      { chord: 'Cm7', bars: 2 },
      { chord: 'F7', bars: 2 },
    ],
  },
  beatrice_A: {
    id: 'beatrice_A',
    name: 'Beatrice A',
    description: 'Sam Rivers standard',
    segments: [
      { chord: 'Fmaj7', bars: 2 },
      { chord: 'Gbmaj7#11', bars: 2 },
      { chord: 'Fmaj7', bars: 2 },
      { chord: 'Emaj7#11', bars: 2 },
      { chord: 'Dm7', bars: 2 },
      { chord: 'Ebmaj7#11', bars: 2 },
      { chord: 'Dm7', bars: 2 },
      { chord: 'Cm7', bars: 1 },
      { chord: 'Bb7', bars: 1 },
    ],
  },
  orbit_A: {
    id: 'orbit_A',
    name: 'Orbit A',
    description: 'Wayne Shorter composition',
    segments: [
      { chord: 'Fmaj7b5', bars: 2 },
      { chord: 'G#11/Eb', bars: 2 },
      { chord: 'Dbmaj7', bars: 2 },
      { chord: 'Bmaj7', bars: 2 },
      { chord: 'Bbm9', bars: 2 },
      { chord: 'Abmaj13', bars: 2 },
      { chord: 'Gbmaj7', bars: 2 },
      { chord: 'Emaj9', bars: 2 },
    ],
  },
};

export function getTemplate(id: string): ProgressionTemplate | undefined {
  return TEMPLATE_LIBRARY[id];
}

export function listTemplateIds(): string[] {
  return Object.keys(TEMPLATE_LIBRARY);
}
