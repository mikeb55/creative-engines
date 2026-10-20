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

/** Symphonic Phase 2 phrase kinds (orchestration API) → one editable-accompaniment operator plan. */
export type SymphonicPhraseKind = 'statement' | 'development' | 'return';

export type SymphonicAccompanimentOperatorId = 'fragment-head' | 'augment' | 'displace';

export type SymphonicAccompanimentOperatorPlan = {
  operator: SymphonicAccompanimentOperatorId;
  params: Record<string, number>;
  subdivisions: number;
  phraseEndRestQuarters: number;
};

const SYMPHONIC_ACCOMPANIMENT_BY_KIND: Record<SymphonicPhraseKind, SymphonicAccompanimentOperatorPlan> = {
  statement: { operator: 'displace', params: { beats: 0.5 }, subdivisions: 4, phraseEndRestQuarters: 0 },
  development: { operator: 'fragment-head', params: { count: 2 }, subdivisions: 4, phraseEndRestQuarters: 1 },
  return: { operator: 'displace', params: { beats: 1 }, subdivisions: 4, phraseEndRestQuarters: 1 },
};

export function symphonicAccompanimentOperatorForPhraseKind(
  kind: SymphonicPhraseKind,
): SymphonicAccompanimentOperatorPlan {
  return SYMPHONIC_ACCOMPANIMENT_BY_KIND[kind];
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
