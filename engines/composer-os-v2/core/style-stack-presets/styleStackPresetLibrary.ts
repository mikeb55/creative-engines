/**
 * Curated style stack presets.
 */

import type { StyleStackPresetDefinition, StyleStackPresetId } from './styleStackPresetTypes';

const blend = { primary: 'medium' as const, secondary: 'light' as const, colour: 'subtle' as const };

export const STYLE_STACK_PRESET_LIBRARY: Record<StyleStackPresetId, StyleStackPresetDefinition> = {
  bacharach_pattison_ecm: {
    id: 'bacharach_pattison_ecm',
    displayName: 'Bacharach × Pattison ECM',
    description: 'Songwriter harmony colour with ECM narrative weight.',
    stack: {
      primary: 'bacharach',
      secondary: 'metheny',
      colour: 'triad_pairs',
      styleBlend: blend,
    },
  },
  thad_bebop_swing: {
    id: 'thad_bebop_swing',
    displayName: 'Thad × Bebop Swing',
    description: 'Line-forward bebop stack over swing-era bias.',
    stack: {
      primary: 'barry_harris',
      secondary: 'metheny',
      colour: 'triad_pairs',
      styleBlend: blend,
    },
  },
  songwriter_classic_hook: {
    id: 'songwriter_classic_hook',
    displayName: 'Classic Hook Stack',
    description: 'Bacharach + Metheny for memorable hooks.',
    stack: {
      primary: 'bacharach',
      secondary: 'metheny',
      colour: 'barry_harris',
      styleBlend: blend,
    },
  },
  quartet_lyrical_counterpoint: {
    id: 'quartet_lyrical_counterpoint',
    displayName: 'Quartet Lyrical Counterpoint',
    description: 'Singing lines with light triad-pair colour.',
    stack: {
      primary: 'bacharach',
      secondary: 'metheny',
      colour: 'triad_pairs',
      styleBlend: blend,
    },
  },
};

export function listStyleStackPresetIds(): StyleStackPresetId[] {
  return Object.keys(STYLE_STACK_PRESET_LIBRARY) as StyleStackPresetId[];
}

export function getStyleStackPreset(id: StyleStackPresetId): StyleStackPresetDefinition | undefined {
  return STYLE_STACK_PRESET_LIBRARY[id];
}
