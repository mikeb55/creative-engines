/**
 * Wyble Practice Template Library
 * Structured progressions for counterpoint etudes over common jazz progressions
 * and Mike Bryant compositions.
 */

import type { PracticeTemplate } from './templateTypes';

export const TEMPLATE_LIBRARY: Record<string, PracticeTemplate> = {
  ii_V_I_major: {
    id: 'ii_V_I_major',
    name: 'ii–V–I (major)',
    description: 'Classic Dm7 → G7 → Cmaj7',
    progression: [
      { chord: 'Dm7', bars: 2 },
      { chord: 'G7', bars: 2 },
      { chord: 'Cmaj7', bars: 4 },
    ],
  },
  minor_ii_V: {
    id: 'minor_ii_V',
    name: 'Minor ii–V',
    description: 'Bm7b5 → E7alt → Am6',
    progression: [
      { chord: 'Bm7b5', bars: 2 },
      { chord: 'E7alt', bars: 2 },
      { chord: 'Am6', bars: 4 },
    ],
  },
  rhythm_changes_A: {
    id: 'rhythm_changes_A',
    name: 'Rhythm Changes A',
    description: 'Bb6 → G7 → Cm7 → F7',
    progression: [
      { chord: 'Bb6', bars: 2 },
      { chord: 'G7', bars: 2 },
      { chord: 'Cm7', bars: 2 },
      { chord: 'F7', bars: 2 },
    ],
  },
  jazz_blues: {
    id: 'jazz_blues',
    name: 'Jazz Blues',
    description: '12-bar jazz blues in F',
    progression: [
      { chord: 'F7', bars: 4 },
      { chord: 'Bb7', bars: 2 },
      { chord: 'F7', bars: 2 },
      { chord: 'C7', bars: 2 },
      { chord: 'Bb7', bars: 2 },
    ],
  },
  minor_blues: {
    id: 'minor_blues',
    name: 'Minor Blues',
    description: '12-bar minor blues',
    progression: [
      { chord: 'Cm7', bars: 4 },
      { chord: 'Fm7', bars: 2 },
      { chord: 'Cm7', bars: 2 },
      { chord: 'G7alt', bars: 2 },
      { chord: 'Fm7', bars: 2 },
    ],
  },
  autumn_leaves_fragment: {
    id: 'autumn_leaves_fragment',
    name: 'Autumn Leaves (fragment)',
    description: 'Am7b5 → D7 → Gm',
    progression: [
      { chord: 'Am7b5', bars: 2 },
      { chord: 'D7', bars: 2 },
      { chord: 'Gm', bars: 4 },
    ],
  },
  solar_cycle: {
    id: 'solar_cycle',
    name: 'Solar Cycle',
    description: 'Cm7 → F7 → Bbmaj7',
    progression: [
      { chord: 'Cm7', bars: 2 },
      { chord: 'F7', bars: 2 },
      { chord: 'Bbmaj7', bars: 4 },
    ],
  },
  giant_steps_fragment: {
    id: 'giant_steps_fragment',
    name: 'Giant Steps (fragment)',
    description: 'Bmaj7 → D7 → Gmaj7 → Bb7',
    progression: [
      { chord: 'Bmaj7', bars: 2 },
      { chord: 'D7', bars: 2 },
      { chord: 'Gmaj7', bars: 2 },
      { chord: 'Bb7', bars: 2 },
    ],
  },
  beatrice_A: {
    id: 'beatrice_A',
    name: "Beatrice (Sam Rivers) A",
    description: 'Simplified A section from Beatrice',
    progression: [
      { chord: 'Fmaj7', bars: 2 },
      { chord: 'Gbmaj7', bars: 2 },
      { chord: 'Fmaj7', bars: 2 },
      { chord: 'Emaj7', bars: 2 },
      { chord: 'Dm7', bars: 2 },
      { chord: 'Ebmaj7', bars: 2 },
      { chord: 'Dm7', bars: 2 },
      { chord: 'Cm7', bars: 1 },
      { chord: 'Bb7', bars: 1 },
    ],
  },
  orbit_A: {
    id: 'orbit_A',
    name: 'Orbit (Mike Bryant) A',
    description: 'A section from Orbit',
    progression: [
      { chord: 'Fmaj7', bars: 2 },
      { chord: 'G7', bars: 2 },
      { chord: 'Dbmaj7', bars: 2 },
      { chord: 'Bmaj7', bars: 2 },
      { chord: 'Bbm7', bars: 2 },
      { chord: 'Abmaj7', bars: 2 },
      { chord: 'Gbmaj7', bars: 2 },
      { chord: 'Emaj7', bars: 2 },
    ],
  },
};

/** Template IDs in display order for the desktop UI */
export const TEMPLATE_ORDER: string[] = [
  'ii_V_I_major',
  'minor_ii_V',
  'jazz_blues',
  'minor_blues',
  'rhythm_changes_A',
  'autumn_leaves_fragment',
  'solar_cycle',
  'giant_steps_fragment',
  'beatrice_A',
  'orbit_A',
];

export function getTemplate(id: string): PracticeTemplate | undefined {
  return TEMPLATE_LIBRARY[id];
}

export function getAllTemplateIds(): string[] {
  return TEMPLATE_ORDER;
}
