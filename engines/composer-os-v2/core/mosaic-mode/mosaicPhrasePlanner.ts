/**
 * Mosaic Mode — phrase role planning (density, dynamics, motif prominence per section).
 */

import type { MosaicModeSectionPlanEntry } from './precomputeMosaicEffectiveHarmonyBars';

export type PhraseRole = 'statement' | 'development' | 'climax' | 'release';

export type MotifProminence = 'lead' | 'support' | 'absent';

export type PhraseRoleHints = {
  densityMultiplier: number;
  dynamicShift: number;
  motifProminence: MotifProminence;
};

export function resolvePhraseRole(section: MosaicModeSectionPlanEntry): PhraseRole | null {
  return section.phraseRole ?? null;
}

export function buildPhraseRoleHints(role: PhraseRole): PhraseRoleHints {
  switch (role) {
    case 'statement':
      return { densityMultiplier: 0.75, dynamicShift: 0, motifProminence: 'lead' };
    case 'development':
      return { densityMultiplier: 1.1, dynamicShift: 0, motifProminence: 'support' };
    case 'climax':
      return { densityMultiplier: 1.3, dynamicShift: 1, motifProminence: 'lead' };
    case 'release':
      return { densityMultiplier: 0.6, dynamicShift: -1, motifProminence: 'absent' };
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
