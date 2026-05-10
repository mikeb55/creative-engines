/**
 * Big Band drum intensity — 5-lever policy matrix per form phase.
 */

import type { BigBandFormPhase } from './bigBandPlanTypes';

export type DrumIntensity = 'sparse' | 'standard' | 'driving';

/** Policy lookup phases (chart sections); `background_figures` maps from {@link BigBandFormPhase}. */
export type BigBandPhase = 'intro' | 'melody_head' | 'solo_section' | 'shout_chorus' | 'ending';

export interface DrumPolicy {
  timeTexture: 'ride' | 'hihat' | 'brush' | 'broken';
  cueSelectivity: number;
  setupStrength: number;
  fillLengthCeiling: number;
  dynamicCeiling: number;
}

const MATRIX: Record<BigBandPhase, Record<DrumIntensity, DrumPolicy>> = {
  intro: {
    sparse: {
      timeTexture: 'brush',
      cueSelectivity: 0.2,
      setupStrength: 0.3,
      fillLengthCeiling: 1,
      dynamicCeiling: 0.5,
    },
    standard: {
      timeTexture: 'ride',
      cueSelectivity: 0.4,
      setupStrength: 0.5,
      fillLengthCeiling: 2,
      dynamicCeiling: 0.65,
    },
    driving: {
      timeTexture: 'ride',
      cueSelectivity: 0.4,
      setupStrength: 0.6,
      fillLengthCeiling: 2,
      dynamicCeiling: 0.7,
    },
  },
  melody_head: {
    sparse: {
      timeTexture: 'ride',
      cueSelectivity: 0.3,
      setupStrength: 0.4,
      fillLengthCeiling: 1,
      dynamicCeiling: 0.6,
    },
    standard: {
      timeTexture: 'ride',
      cueSelectivity: 0.5,
      setupStrength: 0.55,
      fillLengthCeiling: 2,
      dynamicCeiling: 0.7,
    },
    driving: {
      timeTexture: 'hihat',
      cueSelectivity: 0.7,
      setupStrength: 0.75,
      fillLengthCeiling: 2,
      dynamicCeiling: 0.8,
    },
  },
  solo_section: {
    sparse: {
      timeTexture: 'broken',
      cueSelectivity: 0.2,
      setupStrength: 0.3,
      fillLengthCeiling: 1,
      dynamicCeiling: 0.55,
    },
    standard: {
      timeTexture: 'broken',
      cueSelectivity: 0.4,
      setupStrength: 0.5,
      fillLengthCeiling: 2,
      dynamicCeiling: 0.65,
    },
    driving: {
      timeTexture: 'broken',
      cueSelectivity: 0.6,
      setupStrength: 0.65,
      fillLengthCeiling: 2,
      dynamicCeiling: 0.75,
    },
  },
  shout_chorus: {
    sparse: {
      timeTexture: 'ride',
      cueSelectivity: 0.5,
      setupStrength: 0.6,
      fillLengthCeiling: 1,
      dynamicCeiling: 0.75,
    },
    standard: {
      timeTexture: 'ride',
      cueSelectivity: 0.7,
      setupStrength: 0.75,
      fillLengthCeiling: 3,
      dynamicCeiling: 0.85,
    },
    driving: {
      timeTexture: 'hihat',
      cueSelectivity: 0.9,
      setupStrength: 0.9,
      fillLengthCeiling: 4,
      dynamicCeiling: 0.95,
    },
  },
  ending: {
    sparse: {
      timeTexture: 'brush',
      cueSelectivity: 0.2,
      setupStrength: 0.3,
      fillLengthCeiling: 1,
      dynamicCeiling: 0.5,
    },
    standard: {
      timeTexture: 'ride',
      cueSelectivity: 0.4,
      setupStrength: 0.5,
      fillLengthCeiling: 2,
      dynamicCeiling: 0.65,
    },
    driving: {
      timeTexture: 'ride',
      cueSelectivity: 0.7,
      setupStrength: 0.8,
      fillLengthCeiling: 3,
      dynamicCeiling: 0.8,
    },
  },
};

export function mapBigBandFormPhaseToPolicyPhase(phase: BigBandFormPhase | undefined): BigBandPhase {
  switch (phase) {
    case 'intro':
      return 'intro';
    case 'melody_head':
      return 'melody_head';
    case 'solo_section':
      return 'solo_section';
    case 'shout_chorus':
      return 'shout_chorus';
    case 'ending':
      return 'ending';
    case 'background_figures':
      return 'melody_head';
    default:
      return 'melody_head';
  }
}

export function getDrumPolicy(phase: BigBandPhase, intensity: DrumIntensity): DrumPolicy {
  const row = MATRIX[phase];
  const pol = row[intensity];
  return { ...pol };
}

/** Deterministic 0–1 unit for Big Band drum stochastic gates (cue selectivity, etc.). */
export function drumDeterministicUnit(seed: number, barIndex: number, salt: number): number {
  const x = Math.imul(seed ^ salt, barIndex * 7919 + 104729) >>> 0;
  const mix = (x ^ (x >>> 13) ^ (x << 17)) >>> 0;
  return (mix % 100000) / 100000;
}
