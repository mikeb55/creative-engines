/**
 * Category tagging heuristics for phrase ingest (advisory; human override in audit CSV).
 * Phase-1: descriptors only — not wired into melody path.
 */

import type { RiffPhraseCategory, RiffPhraseEndType } from './riffPhraseLibraryTypes';

export interface RiffPhraseCategoryTagHeuristic {
  expectedTags: string[];
  /** Interval-class keys expected high in hist (RiffIntervalWeightMap keys). */
  highIntervalDensity: Array<'m2' | 'M2' | 'm3' | 'M3' | 'P4' | 'tritone' | 'P5' | 'M6'>;
  contourHints: string[];
  chromaticityBand: { min: number; max: number };
  preferredPhraseEndTypes: RiffPhraseEndType[];
  notes: string;
}

export const RIFF_PHRASE_CATEGORY_TAG_HEURISTICS: Record<
  RiffPhraseCategory,
  RiffPhraseCategoryTagHeuristic
> = {
  bebop_jazz_blues: {
    expectedTags: ['swing8', 'enclosure', 'blues_third', 'chromatic_approach'],
    highIntervalDensity: ['m2', 'M2'],
    contourHints: ['pickup_common', 'stepwise_with_enclosure'],
    chromaticityBand: { min: 0.3, max: 0.7 },
    preferredPhraseEndTypes: ['chromatic_resolve'],
    notes: 'swing8/triplet; enclosure; blues b3/b5',
  },
  blues_rock: {
    expectedTags: ['pentatonic', 'bend', 'call_response'],
    highIntervalDensity: ['m3', 'P4', 'P5'],
    contourHints: ['call_response_holes'],
    chromaticityBand: { min: 0.05, max: 0.35 },
    preferredPhraseEndTypes: ['rest', 'sustain'],
    notes: 'pentatonic bias; bends/slides; lower chromaticity',
  },
  jazz_rock: {
    expectedTags: ['16th', 'syncopated', 'mixolydian_hint'],
    highIntervalDensity: ['M2', 'm3', 'P4'],
    contourHints: ['syncopated_start', 'odd_grouping'],
    chromaticityBand: { min: 0.15, max: 0.45 },
    preferredPhraseEndTypes: ['sustain', 'open'],
    notes: '16th grid; syncopated starts; moderate chromatic',
  },
  modern_rock: {
    expectedTags: ['power_fifth', 'sparse', 'dead_note'],
    highIntervalDensity: ['P5', 'P4'],
    contourHints: ['sparse_rest_mask'],
    chromaticityBand: { min: 0.0, max: 0.2 },
    preferredPhraseEndTypes: ['rest', 'leap_off'],
    notes: 'power/fifth leaps; sparse; low chromaticity',
  },
  progressive_blues: {
    expectedTags: ['odd_meter', 'wide_register', 'open_end'],
    highIntervalDensity: ['m3', 'M2', 'tritone'],
    contourHints: ['irregular_cell', 'wide_register'],
    chromaticityBand: { min: 0.2, max: 0.5 },
    preferredPhraseEndTypes: ['open', 'sustain'],
    notes: 'mixed/odd meter; wider register; open ends',
  },
  sax_inspired: {
    expectedTags: ['chromatic_run', 'arched', 'sustain'],
    highIntervalDensity: ['m2', 'M2'],
    contourHints: ['arched', 'long_sustain_tail'],
    chromaticityBand: { min: 0.35, max: 0.75 },
    preferredPhraseEndTypes: ['sustain', 'chromatic_resolve'],
    notes: 'long sustains; enclosure + chromatic runs',
  },
  diminished_lines: {
    expectedTags: [
      'diminished',
      'octatonic',
      'm3_chain',
      'tritone',
      'chromatic_approach',
      'symmetrical',
    ],
    highIntervalDensity: ['m3', 'tritone'],
    contourHints: ['symmetrical', 'octatonic', 'repeating_m3_cell'],
    chromaticityBand: { min: 0.45, max: 0.85 },
    preferredPhraseEndTypes: ['chromatic_resolve', 'open'],
    notes:
      'high m3/tritone density; symmetrical/octatonic contour; frequent chromatic approach; moderate-high chromaticityScore; ends often chromatic_resolve or open',
  },
};
