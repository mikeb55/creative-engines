/**
 * Population Composer — ecology selection engine (V106p1).
 * Three layers: dramatic fitness · contrast · inheritance pressure.
 */

import { mulberry32 } from '../remix/vaultSeedMix';
import { dramaticFitness, meetsDramaticCompliance } from './populationComposerBiasProfiles';
import { harmonicContrast, proposeHarmonyBar } from './populationComposerProposals';
import type {
  DramaticArcSegment,
  DramaticPhase,
  PopulationComposerPreset,
  PopulationProducerId,
  ProducerWeightSnapshot,
} from './populationComposerTypes';
import { POPULATION_PRODUCER_IDS } from './populationComposerTypes';

const DEFAULT_INHERITANCE = 0.3;
const DEFAULT_CONTRAST = 0.5;
const DEFAULT_MUTATION = 0.2;
const WEIGHT_WINDOW = 8;
const DOMINANCE_THRESHOLD = 0.55;

export type PopulationSelectionResult = {
  harmonyBars: string[];
  perBarWinners: PopulationProducerId[];
  producerWeightHistory: ProducerWeightSnapshot[];
  generationCount: number;
  dominantProducer: PopulationProducerId;
  dramaticArcCompliance: number;
};

function resolveDefaults(preset: PopulationComposerPreset): {
  inheritancePressure: number;
  contrastWeight: number;
  mutationRate: number;
  seed: number;
} {
  return {
    inheritancePressure: preset.inheritancePressure ?? DEFAULT_INHERITANCE,
    contrastWeight: preset.contrastWeight ?? DEFAULT_CONTRAST,
    mutationRate: preset.mutationRate ?? DEFAULT_MUTATION,
    seed: preset.seed ?? 0,
  };
}

export function totalBarsFromDramaticArc(arc: readonly DramaticArcSegment[]): number {
  if (arc.length === 0) return 8;
  return Math.max(...arc.map((s) => s.endBar));
}

export function phaseForBar(
  barIndex: number,
  arc: readonly DramaticArcSegment[],
): DramaticPhase {
  const barOne = barIndex + 1;
  for (const seg of arc) {
    if (barOne >= seg.startBar && barOne <= seg.endBar) return seg.phase;
  }
  return arc[arc.length - 1]?.phase ?? 'build';
}

function emptyWeights(producers: readonly PopulationProducerId[]): Record<PopulationProducerId, number> {
  const w = {} as Record<PopulationProducerId, number>;
  for (const id of POPULATION_PRODUCER_IDS) w[id] = 0;
  const share = producers.length > 0 ? 1 / producers.length : 0;
  for (const p of producers) w[p] = share;
  return w;
}

function rollingWeights(
  winners: readonly PopulationProducerId[],
  producers: readonly PopulationProducerId[],
  window: number,
): Record<PopulationProducerId, number> {
  const w = emptyWeights(producers);
  const slice = winners.slice(-window);
  if (slice.length === 0) return w;
  for (const p of slice) {
    if (producers.includes(p)) w[p] += 1 / slice.length;
  }
  return w;
}

function underrepresentedProducer(
  weights: Record<PopulationProducerId, number>,
  producers: readonly PopulationProducerId[],
): PopulationProducerId | null {
  let min = Infinity;
  let pick: PopulationProducerId | null = null;
  for (const p of producers) {
    if (weights[p]! < min) {
      min = weights[p]!;
      pick = p;
    }
  }
  return pick;
}

function dominantShare(
  weights: Record<PopulationProducerId, number>,
  producers: readonly PopulationProducerId[],
): number {
  let max = 0;
  for (const p of producers) max = Math.max(max, weights[p]!);
  return max;
}

/** Run population ecology bar selection — deterministic given seed. */
export function runPopulationSelection(
  preset: PopulationComposerPreset,
): PopulationSelectionResult {
  const producers = preset.producers.filter((p): p is PopulationProducerId =>
    (POPULATION_PRODUCER_IDS as readonly string[]).includes(p),
  );
  if (producers.length === 0) {
    throw new Error('PopulationComposerPreset requires at least one valid producer');
  }

  const { inheritancePressure, contrastWeight, mutationRate, seed } = resolveDefaults(preset);
  const key = preset.key ?? (0 as import('../harmony/pitchFieldSpineTypes').PitchClass);
  const totalBars = totalBarsFromDramaticArc(preset.dramaticArc);
  const rng = mulberry32(seed >>> 0);

  const harmonyBars: string[] = [];
  const perBarWinners: PopulationProducerId[] = [];
  const producerWeightHistory: ProducerWeightSnapshot[] = [];
  let lastWinner: PopulationProducerId | undefined;
  let complianceHits = 0;

  for (let bar = 0; bar < totalBars; bar++) {
    const phase = phaseForBar(bar, preset.dramaticArc);
    const prev = harmonyBars[bar - 1];
    const weights = rollingWeights(perBarWinners, producers, WEIGHT_WINDOW);

    let forceUnder = false;
    if (
      perBarWinners.length >= 2 &&
      dominantShare(weights, producers) >= DOMINANCE_THRESHOLD &&
      rng() < mutationRate
    ) {
      forceUnder = true;
    }

    type Scored = { producer: PopulationProducerId; score: number; proposal: string };
    const scored: Scored[] = producers.map((producer) => {
      const proposal = proposeHarmonyBar(producer, {
        key,
        barIndex: bar,
        phase,
        seed,
        prevSymbol: prev,
      });
      const fitness = dramaticFitness(producer, phase);
      const contrast = harmonicContrast(prev, proposal);
      const inheritance = lastWinner === producer ? inheritancePressure : 0;
      const jitter = (rng() - 0.5) * 0.04;
      const score = fitness + contrastWeight * contrast + inheritance + jitter;
      return { producer, score, proposal };
    });

    let winner: Scored;
    if (forceUnder) {
      const under = underrepresentedProducer(weights, producers);
      winner =
        scored.find((s) => s.producer === under) ??
        scored.reduce((a, b) => (a.score >= b.score ? a : b));
    } else {
      winner = scored.reduce((a, b) => (a.score >= b.score ? a : b));
    }

    harmonyBars.push(winner.proposal);
    perBarWinners.push(winner.producer);
    lastWinner = winner.producer;
    if (meetsDramaticCompliance(winner.producer, phase)) complianceHits += 1;

    producerWeightHistory.push({
      barIndex: bar,
      weights: rollingWeights(perBarWinners, producers, WEIGHT_WINDOW),
    });
  }

  const winCounts = {} as Record<PopulationProducerId, number>;
  for (const p of producers) winCounts[p] = 0;
  for (const w of perBarWinners) winCounts[w] = (winCounts[w] ?? 0) + 1;
  const dominantProducer = producers.reduce((a, b) =>
    (winCounts[a] ?? 0) >= (winCounts[b] ?? 0) ? a : b,
  );

  return {
    harmonyBars,
    perBarWinners,
    producerWeightHistory,
    generationCount: totalBars,
    dominantProducer,
    dramaticArcCompliance: totalBars > 0 ? complianceHits / totalBars : 0,
  };
}
