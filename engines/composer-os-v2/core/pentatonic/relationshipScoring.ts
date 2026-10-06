/**
 * Purpose-to-HOME and colour-to-HOME scoring tables.
 * Heuristic preferences. Not probabilities. Not harmonic-function laws.
 *
 * `continuity` purpose is absent here. It uses Jaccard similarity with the
 * current collection inside the evaluator, because it is not a HOME-relationship lookup.
 */

import type { PentatonicColourTension, PentatonicPurpose } from './types';

export const PENTATONIC_RELATIONSHIP_SCORING_VERSION = 'pentatonic-relationship-scoring-1.0';

export interface HomeRelationshipScoreTable {
  /** Score when the candidate has this HOME relationship id. */
  byRelationshipId: Readonly<Record<string, number>>;
  /** Score when the candidate has no HOME relationship, or an id missing from the table. */
  fallback: number;
}

/** Purpose values that read a HOME relationship. `continuity` is not in this map. */
export const PURPOSE_HOME_RELATIONSHIP_SCORES: Readonly<
  Record<Exclude<PentatonicPurpose, 'continuity'>, HomeRelationshipScoreTable>
> = {
  lyrical_answer: {
    byRelationshipId: { home: 1, major: 0.85, six_nine_suspended: 0.7, suspended: 0.65, major_7_colour: 0.45 },
    fallback: 0.4,
  },
  colour: {
    byRelationshipId: { six_nine_suspended: 1, suspended: 1, major_7_colour: 1, major: 0.75, home: 0.35 },
    fallback: 0.5,
  },
  tension: {
    byRelationshipId: { major_7_colour: 1, suspended: 0.7, six_nine_suspended: 0.55, major: 0.4, home: 0.25 },
    fallback: 0.45,
  },
  restraint: {
    byRelationshipId: { home: 1, major: 0.7, six_nine_suspended: 0.55, suspended: 0.45, major_7_colour: 0.3 },
    fallback: 0.35,
  },
};

export const COLOUR_HOME_RELATIONSHIP_SCORES: Readonly<Record<PentatonicColourTension, HomeRelationshipScoreTable>> = {
  home: {
    byRelationshipId: { home: 1 },
    fallback: 0.2,
  },
  suspended: {
    byRelationshipId: { suspended: 1, six_nine_suspended: 1 },
    fallback: 0.25,
  },
  major_7: {
    byRelationshipId: { major_7_colour: 1 },
    fallback: 0.3,
  },
  brighter: {
    byRelationshipId: { major: 1, home: 0.55 },
    fallback: 0.35,
  },
};

export function homeRelationshipTableScore(table: HomeRelationshipScoreTable, relationshipId: string | null): number {
  if (!relationshipId) return table.fallback;
  return table.byRelationshipId[relationshipId] ?? table.fallback;
}
