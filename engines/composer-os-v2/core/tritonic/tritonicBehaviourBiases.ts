/**
 * V104p5 — Tritonic behaviour biases (0..1 floats, neutral = 0.5).
 * Steers voice-leading and phrase state without replacing generative logic.
 * Always-on — no feature flag.
 */

import type { TritonicCell } from './tritonicCell';
import type { TritonicStateMachine } from './tritonicStateMachine';
import type { TritonicTimelineEvent } from './tritonicTimeline';
import type { VoiceLeadingResult } from './tritonicVoiceLeading';

export type TritonicBehaviourBiases = {
  tension: number;
  resolutionDelay: number;
  density: number;
  registralSpread: number;
  contourBias: number;
  cadenceAvoidance: number;
  rhythmicDisplacement: number;
  anchorAdhesion: number;
  motifSingability: number;
};

export const NEUTRAL_TRITONIC_BEHAVIOUR_BIAS = 0.5;

const BIAS_KEYS: (keyof TritonicBehaviourBiases)[] = [
  'tension',
  'resolutionDelay',
  'density',
  'registralSpread',
  'contourBias',
  'cadenceAvoidance',
  'rhythmicDisplacement',
  'anchorAdhesion',
  'motifSingability',
];

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** All-neutral bias profile (no steering). */
export function neutralTritonicBehaviourBiases(): TritonicBehaviourBiases {
  return {
    tension: NEUTRAL_TRITONIC_BEHAVIOUR_BIAS,
    resolutionDelay: NEUTRAL_TRITONIC_BEHAVIOUR_BIAS,
    density: NEUTRAL_TRITONIC_BEHAVIOUR_BIAS,
    registralSpread: NEUTRAL_TRITONIC_BEHAVIOUR_BIAS,
    contourBias: NEUTRAL_TRITONIC_BEHAVIOUR_BIAS,
    cadenceAvoidance: NEUTRAL_TRITONIC_BEHAVIOUR_BIAS,
    rhythmicDisplacement: NEUTRAL_TRITONIC_BEHAVIOUR_BIAS,
    anchorAdhesion: NEUTRAL_TRITONIC_BEHAVIOUR_BIAS,
    motifSingability: NEUTRAL_TRITONIC_BEHAVIOUR_BIAS,
  };
}

export function resolveTritonicBehaviourBiases(
  partial?: Partial<TritonicBehaviourBiases>,
): TritonicBehaviourBiases {
  const neutral = neutralTritonicBehaviourBiases();
  if (!partial) return neutral;
  const out = { ...neutral };
  for (const key of BIAS_KEYS) {
    const v = partial[key];
    if (v !== undefined) out[key] = clamp01(v);
  }
  return out;
}

export function isNeutralTritonicBehaviourBiases(biases: TritonicBehaviourBiases): boolean {
  return BIAS_KEYS.every((k) => Math.abs(biases[k] - NEUTRAL_TRITONIC_BEHAVIOUR_BIAS) < 1e-9);
}

function biasDelta(value: number): number {
  return (value - NEUTRAL_TRITONIC_BEHAVIOUR_BIAS) * 2;
}

function biasCandidateScore(
  candidate: VoiceLeadingResult,
  biases: TritonicBehaviourBiases,
  state: TritonicStateMachine | null | undefined,
): number {
  let score = candidate.smoothness * 0.35 + candidate.to.tension * 0.35;
  score += biasDelta(biases.tension) * candidate.to.tension * 0.2;
  score += biasDelta(biases.contourBias) * candidate.smoothness * 0.18;
  score += biasDelta(biases.resolutionDelay) * (candidate.to.tension >= 0.5 ? 0.12 : -0.12);
  score += biasDelta(biases.motifSingability) * candidate.smoothness * 0.15;
  score += biasDelta(biases.anchorAdhesion) * (1 - candidate.to.tension) * 0.12;
  score += biasDelta(biases.registralSpread) * (1 - candidate.smoothness) * 0.1;
  if (state) {
    score += biasDelta(biases.cadenceAvoidance) * (1 - state.resolutionEligibility) * 0.12;
    score -= biasDelta(biases.cadenceAvoidance) * candidate.to.tension * 0.06;
  }
  return score;
}

/**
 * Soft rerank after Wayne behaviour — neutral biases preserve input order.
 */
export function applyTritonicBehaviourBiases(
  candidates: readonly VoiceLeadingResult[],
  biases: TritonicBehaviourBiases,
  state?: TritonicStateMachine | null,
): VoiceLeadingResult[] {
  if (candidates.length === 0) return [];
  if (isNeutralTritonicBehaviourBiases(biases)) return [...candidates];
  return [...candidates].sort(
    (a, b) => biasCandidateScore(b, biases, state) - biasCandidateScore(a, biases, state),
  );
}

/** Start-cell nudge from tension bias (neutral → caller uses mode default). */
export function biasSteeredStartCellSort(
  pool: readonly TritonicCell[],
  modeDefaultSort: (a: TritonicCell, b: TritonicCell) => number,
  biases: TritonicBehaviourBiases,
): TritonicCell[] {
  if (isNeutralTritonicBehaviourBiases(biases)) {
    return [...pool].sort(modeDefaultSort);
  }
  const tensionDelta = biasDelta(biases.tension);
  return [...pool].sort((a, b) => {
    const biasSort = tensionDelta * (b.tension - a.tension);
    if (Math.abs(biasSort) > 1e-9) return biasSort;
    return modeDefaultSort(a, b);
  });
}

/** Resolution eligibility adjusted by resolutionDelay + cadenceAvoidance biases. */
export function biasSteeredResolutionEligibility(
  baseEligibility: number,
  cellTension: number,
  biases: TritonicBehaviourBiases,
): number {
  if (isNeutralTritonicBehaviourBiases(biases)) return baseEligibility;
  let score = baseEligibility;
  score -= biasDelta(biases.resolutionDelay) * (cellTension < 0.5 ? 0.15 : -0.08);
  score -= biasDelta(biases.cadenceAvoidance) * (cellTension < 0.5 ? 0.12 : 0);
  score += biasDelta(biases.anchorAdhesion) * (1 - cellTension) * 0.1;
  return Math.max(0, Math.min(1, score));
}

/** Soft timeline nudge from density + rhythmicDisplacement (neutral → identity). */
export function nudgeTimelineForBehaviourBiases(
  events: readonly TritonicTimelineEvent[],
  biases: TritonicBehaviourBiases,
): TritonicTimelineEvent[] {
  if (isNeutralTritonicBehaviourBiases(biases)) return [...events];
  const displacement = biasDelta(biases.rhythmicDisplacement);
  const densityDelta = biasDelta(biases.density);
  return events.map((e, i) => {
    let beat = e.beat;
    if (Math.abs(displacement) > 1e-9 && e.beat === 1 && i % 2 === 1) {
      beat = displacement > 0 ? 2 : 1;
    }
    let duration = e.duration;
    if (Math.abs(densityDelta) > 1e-9) {
      duration = Math.max(0.5, e.duration + densityDelta * 0.25);
    }
    return beat === e.beat && duration === e.duration ? e : { ...e, beat, duration };
  });
}
