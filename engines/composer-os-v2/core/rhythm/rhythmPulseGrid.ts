/**
 * Shared pulse grids for merging heterogeneous step grids (e.g. 16 vs 18) without time-stretching identity.
 */

export interface StepGrid {
  stepsPerBar: number;
  velocities: number[];
}

export interface PulseGrid {
  pulsesPerBar: number;
  velocities: number[];
}

export function gcd(a: number, b: number): number {
  const x = Math.abs(Math.floor(a));
  const y = Math.abs(Math.floor(b));
  return y === 0 ? x : gcd(y, x % y);
}

export function lcm(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return Math.abs(a * b) / gcd(a, b);
}

/**
 * Projects one bar of step velocities onto a pulse raster; each step anchors at `step * (pulsesPerBar / stepsPerBar)`.
 * Caller must ensure `pulsesPerBar` is a multiple of `stepVelocities.length`.
 */
export function projectStepsToPulseGrid(stepVelocities: number[], pulsesPerBar: number): PulseGrid {
  const stepsPerBar = stepVelocities.length;
  if (stepsPerBar < 1) {
    throw new Error('rhythmPulseGrid: stepsPerBar must be >= 1');
  }
  if (pulsesPerBar % stepsPerBar !== 0) {
    throw new Error(`rhythmPulseGrid: pulsesPerBar ${pulsesPerBar} not divisible by stepsPerBar ${stepsPerBar}`);
  }
  const pulseStride = pulsesPerBar / stepsPerBar;
  const pulses = new Array<number>(pulsesPerBar).fill(0);
  for (let step = 0; step < stepsPerBar; step++) {
    const pulseIndex = Math.round(step * pulseStride);
    pulses[pulseIndex] = stepVelocities[step] ?? 0;
  }
  return { pulsesPerBar, velocities: pulses };
}

export interface SharedGridResolution {
  pulsesPerBar: number;
  stepStrideA: number;
  stepStrideB: number;
}

export function getSharedGridResolution(aSteps: number, bSteps: number): SharedGridResolution {
  const pulsesPerBar = lcm(aSteps, bSteps);
  return {
    pulsesPerBar,
    stepStrideA: pulsesPerBar / aSteps,
    stepStrideB: pulsesPerBar / bSteps,
  };
}

export interface BarTimingPlan {
  meter: string;
  sourceStepCounts: number[];
  pulsesPerBar: number;
}

export function createBarTimingPlan(meter: string, sourceStepCounts: number[]): BarTimingPlan {
  if (sourceStepCounts.length === 0) {
    return { meter, sourceStepCounts, pulsesPerBar: 1 };
  }
  const pulsesPerBar = sourceStepCounts.reduce((acc, n) => lcm(acc, n));
  return { meter, sourceStepCounts: [...sourceStepCounts], pulsesPerBar };
}
