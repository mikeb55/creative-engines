/**
 * Population Composer types (V106p1) — ecology-based hybrid MusicContext producer.
 */

import type { PitchClass } from '../harmony/pitchFieldSpineTypes';

export type DramaticPhase = 'build' | 'suspend' | 'fracture' | 'cadence' | 'restart';

export type PopulationProducerId =
  | 'tritonic'
  | 'monk'
  | 'wayne_shorter'
  | 'vault'
  | 'big_band';

export const POPULATION_PRODUCER_IDS: readonly PopulationProducerId[] = [
  'tritonic',
  'monk',
  'wayne_shorter',
  'vault',
  'big_band',
];

export type DramaticArcSegment = {
  /** 1-indexed inclusive bar start */
  startBar: number;
  /** 1-indexed inclusive bar end */
  endBar: number;
  phase: DramaticPhase;
};

export type ProducerWeightSnapshot = {
  barIndex: number;
  weights: Record<PopulationProducerId, number>;
};

/** Preset surface for population ecology MusicContext producer — always-on, no feature flag. */
export interface PopulationComposerPreset {
  producers: readonly PopulationProducerId[];
  dramaticArc: readonly DramaticArcSegment[];
  inheritancePressure?: number;
  contrastWeight?: number;
  mutationRate?: number;
  seed?: number;
  key?: PitchClass;
  bpm?: number;
}

export type PopulationComposerReceiptPayload = {
  generationCount: number;
  dominantProducer: PopulationProducerId;
  producerWeightHistory: ProducerWeightSnapshot[];
  dramaticArcCompliance: number;
  barCount: number;
  harmonyChecksum: string;
  perBarWinners: PopulationProducerId[];
};
