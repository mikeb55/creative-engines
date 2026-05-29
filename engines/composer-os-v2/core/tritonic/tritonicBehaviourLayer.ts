/**
 * V99 — Wayne behaviour layer for tritonic cell voice-leading.
 * Reranks voice-leading candidates; dictionary-only (no producer wiring).
 */

import type { VoiceLeadingResult } from './tritonicVoiceLeading';

export type WayneBehaviourOptions = {
  /** 0–1; higher = favour unrelated / dissonant cell choices. */
  oddityScore: number;
  /** When true, drop low-tension targets (tension→tension→partial, avoid resolve). */
  delayedResolution: boolean;
  /** Stub in V99 — wired in V102; accepted but no-op. */
  melodyPriority: boolean;
};

const TENSION_FLOOR = 0.5;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Higher = preferred under current oddity weight. */
function behaviourRankScore(candidate: VoiceLeadingResult, oddityScore: number): number {
  const oddity = clamp01(oddityScore);
  const smoothness = candidate.smoothness;
  const tension = candidate.to.tension;
  const roughness = 1 - smoothness;
  return (1 - oddity) * smoothness + oddity * (tension + roughness);
}

function applyDelayedResolutionFilter(candidates: VoiceLeadingResult[]): VoiceLeadingResult[] {
  const kept = candidates.filter((c) => c.to.tension >= TENSION_FLOOR);
  return kept.length > 0 ? kept : candidates;
}

function rerankByOddity(candidates: VoiceLeadingResult[], oddityScore: number): VoiceLeadingResult[] {
  return [...candidates].sort(
    (a, b) => behaviourRankScore(b, oddityScore) - behaviourRankScore(a, oddityScore),
  );
}

/**
 * Rerank voice-leading candidates per Wayne Shorter–style behaviour knobs.
 * `melodyPriority` is a V99 stub (no effect).
 */
export function applyWayneBehaviour(
  candidates: VoiceLeadingResult[],
  options: WayneBehaviourOptions,
): VoiceLeadingResult[] {
  if (candidates.length === 0) return [];

  void options.melodyPriority;

  let out = candidates;
  if (options.delayedResolution) {
    out = applyDelayedResolutionFilter(out);
  }
  return rerankByOddity(out, options.oddityScore);
}
