/**
 * Sonic Youth — deterministic texture phase transitions (pure, no I/O).
 */

import type { NoiseLevel, SYDissonancePreset, SYTextureState } from './sonicYouthChordTypes';

function cycleNext(current: SYTextureState): SYTextureState {
  switch (current) {
    case 'riff':
      return 'shimmer';
    case 'shimmer':
      return 'noise_wall';
    case 'noise_wall':
      return 'clearing';
    case 'clearing':
      return 'riff';
  }
}

/**
 * Advance one step along the texture cycle, biased by noise + inter-guitar friction.
 *
 * Default progression: riff → shimmer → noise_wall → clearing → riff.
 * - `clean` / `low_friction` pull toward riff/shimmer (e.g. noise_wall → shimmer instead of clearing).
 * - `feedback` / `high_friction` pull toward noise_wall (from riff, shimmer, or clearing).
 * - `prepared` forces the next state to clearing.
 */
export function getNextTextureState(
  current: SYTextureState,
  noiseLevel: NoiseLevel,
  dissonance: SYDissonancePreset
): SYTextureState {
  if (noiseLevel === 'prepared') {
    return 'clearing';
  }

  const base = cycleNext(current);

  const noiseWallBias = noiseLevel === 'feedback' || dissonance === 'high_friction';
  const riffShimmerBias = noiseLevel === 'clean' || dissonance === 'low_friction';

  if (noiseWallBias && riffShimmerBias) {
    if (dissonance === 'high_friction') {
      return current === 'noise_wall' ? base : 'noise_wall';
    }
    if (dissonance === 'low_friction') {
      return current === 'noise_wall' ? 'shimmer' : base;
    }
    if (noiseLevel === 'feedback') {
      return current === 'noise_wall' ? base : 'noise_wall';
    }
    if (noiseLevel === 'clean') {
      return current === 'noise_wall' ? 'shimmer' : base;
    }
    return base;
  }

  if (noiseWallBias) {
    return current === 'noise_wall' ? base : 'noise_wall';
  }

  if (riffShimmerBias) {
    return current === 'noise_wall' ? 'shimmer' : base;
  }

  return base;
}
