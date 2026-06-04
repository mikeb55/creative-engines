/**
 * Henry Threadgill — episode / interval-cell plan types (shared with `compositionContext` metadata).
 */

export interface HenryThreadgillSliceParams {
  intervalCellDensity: number;
  antiMetricStrength: number;
  polymodalSeparation: number;
  episodeContrast: number;
}

export const DEFAULT_HENRY_THREADGILL_SLICE_PARAMS: HenryThreadgillSliceParams = {
  intervalCellDensity: 0.7,
  antiMetricStrength: 0.6,
  polymodalSeparation: 0.5,
  episodeContrast: 0.6,
};

export type ThreadgillEpisodeTexture = 'sparse_cell' | 'hocket_stream' | 'polymodal_field' | 'episodic_bloom';

export type ThreadgillMetricFeel = 'offset_five' | 'offset_seven' | 'fractured_four' | 'open_three';

export type ThreadgillModalLayer = 'low_anchor' | 'mid_hocket' | 'high_edge';

export type ThreadgillDensityTier = 'sparse' | 'low_medium' | 'bloom';

export interface ThreadgillEpisodeSpec {
  index: number;
  startBar: number;
  endBar: number;
  texture: ThreadgillEpisodeTexture;
  metricFeel: ThreadgillMetricFeel;
  modalLayer: ThreadgillModalLayer;
  densityTier: ThreadgillDensityTier;
  intervalFamilyIdx: number;
}

export interface HenryThreadgillEpisodePlan {
  episodes: readonly ThreadgillEpisodeSpec[];
  sliceParams: HenryThreadgillSliceParams;
  /** Seeded phrase lengths used for anti-metric episode boundaries (bars). */
  antiMetricPhraseLengths: readonly number[];
}
