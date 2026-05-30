/**
 * Population Composer — producer bias signatures and dramatic-phase fitness.
 */

import type { DramaticPhase, PopulationProducerId } from './populationComposerTypes';

export type BiasSignature = Record<DramaticPhase, number>;

/** Natural tendency per producer (0–1 affinity to each dramatic phase). */
export const PRODUCER_BIAS_SIGNATURE: Record<PopulationProducerId, BiasSignature> = {
  tritonic: {
    build: 0.82,
    suspend: 0.48,
    fracture: 0.88,
    cadence: 0.58,
    restart: 0.42,
  },
  monk: {
    build: 0.52,
    suspend: 0.28,
    fracture: 0.94,
    cadence: 0.72,
    restart: 0.86,
  },
  wayne_shorter: {
    build: 0.58,
    suspend: 0.86,
    fracture: 0.68,
    cadence: 0.48,
    restart: 0.82,
  },
  vault: {
    build: 0.38,
    suspend: 0.92,
    fracture: 0.22,
    cadence: 0.96,
    restart: 0.32,
  },
  big_band: {
    build: 0.88,
    suspend: 0.46,
    fracture: 0.38,
    cadence: 0.84,
    restart: 0.62,
  },
};

const PHASE_COMPLIANCE_THRESHOLD = 0.6;

export function dramaticFitness(
  producer: PopulationProducerId,
  phase: DramaticPhase,
): number {
  return PRODUCER_BIAS_SIGNATURE[producer][phase];
}

export function meetsDramaticCompliance(
  producer: PopulationProducerId,
  phase: DramaticPhase,
): boolean {
  return dramaticFitness(producer, phase) >= PHASE_COMPLIANCE_THRESHOLD;
}
