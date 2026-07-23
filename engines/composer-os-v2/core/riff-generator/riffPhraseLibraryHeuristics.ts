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
    notes:
      'Jeff McErlain 50 Blues-Rock Guitar Licks You MUST Know — pentatonic bias; bends/slides; lower chromaticity; distinct from southern_rock major/mixolydian swagger',
  },
  southern_rock: {
    expectedTags: ['mixolydian', 'major_center', 'twin_guitar', 'country_rock_swagger'],
    highIntervalDensity: ['M3', 'P4', 'P5', 'M2'],
    contourHints: ['harmony_3rd_6th', 'swagger_pickup', 'open_string_ring'],
    chromaticityBand: { min: 0.05, max: 0.3 },
    preferredPhraseEndTypes: ['sustain', 'open'],
    notes:
      'TrueFire 50 Southern Rock Licks You MUST Know — major/Mixolydian center; twin-guitar harmony 3rds/6ths when detectable; country-rock swagger feel; distinct from blues_rock minor-pentatonic/blues-bend',
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
  white_rock_funk: {
    expectedTags: ['16th', 'syncopated', 'rock_accent', 'funk_grid'],
    highIntervalDensity: ['M2', 'P4', 'P5'],
    contourHints: ['syncopated_16th_grid', 'rock_leaning_accents'],
    chromaticityBand: { min: 0.15, max: 0.45 },
    preferredPhraseEndTypes: ['sustain', 'rest'],
    notes:
      'syncopated 16th-grid; rock-leaning accents; moderate chromaticity; source: Chris Buono 30 Funk Rock Riffs You MUST Know',
  },
  black_soul_funk: {
    expectedTags: ['ghost_note', 'muted_strum', 'backbeat', 'call_response', 'downbeat_accent'],
    highIntervalDensity: ['P4', 'P5', 'm3'],
    contourHints: ['call_response', 'strong_downbeat_backbeat', 'ghost_mute_texture'],
    chromaticityBand: { min: 0.05, max: 0.35 },
    preferredPhraseEndTypes: ['rest', 'sustain'],
    notes:
      'ghost notes / muted strums when detectable; strong downbeat + backbeat accents; call-response common; source: Funk Fundamentals / Funk Survival Guide',
  },
};
