/**
 * Section transitions, velocity collisions, notation render mode, and pragmatic blend defaults.
 */

import type { RhythmEngineId } from './songFormRhythmTypes';

export type PercussionRenderMode = 'single-part-multi-voice' | 'separate-parts';

export interface SectionTransitionPolicy {
  mode: 'hard' | 'overlap';
  overlapBars?: number;
  outgoingGainCurve?: 'linear' | 'equalPower';
  incomingGainCurve?: 'linear' | 'equalPower';
  quantizeAtBarBoundary: boolean;
}

export const defaultTransitionPolicy: SectionTransitionPolicy = {
  mode: 'hard',
  quantizeAtBarBoundary: true,
};

export interface TransitionTradeoff {
  mode: 'hard' | 'overlap';
  pros: string[];
  cons: string[];
}

export const transitionTradeoffs: TransitionTradeoff[] = [
  {
    mode: 'hard',
    pros: ['Clear notation', 'Simple MusicXML export', 'Predictable playback', 'Easy rehearsal'],
    cons: ['Abrupt stylistic cut', 'Less textural continuity'],
  },
  {
    mode: 'overlap',
    pros: ['Smoother musical handoff', 'Can create hybrid groove energy'],
    cons: ['Harder notation', 'Possible meter ambiguity', 'More exporter complexity'],
  },
];

export interface VelocityPolicy {
  sameMidiNoteSameTick: 'max' | 'sum-clamped' | 'priority';
  /** Pulse window width on the internal grid (e.g. 1–2 at 144-pulse resolution). */
  nearTickWindow?: number;
  nearTickBehavior?: 'keep-both' | 'collapse-to-earliest' | 'collapse-to-strongest';
  lanePriority?: Record<string, number>;
}

export const defaultVelocityPolicy: VelocityPolicy = {
  sameMidiNoteSameTick: 'max',
  nearTickWindow: 1,
  nearTickBehavior: 'keep-both',
  lanePriority: {
    kick: 100,
    low: 90,
    snare: 80,
    high: 70,
    hiHat: 60,
    jingle: 50,
    ghost: 10,
  },
};

export function resolveVelocityConflict(
  a: { laneId: string; midiNote: number; velocity: number },
  b: { laneId: string; midiNote: number; velocity: number },
  policy: VelocityPolicy
): number {
  if (a.midiNote !== b.midiNote) {
    throw new Error('resolveVelocityConflict: only same-note collisions should be resolved here');
  }

  switch (policy.sameMidiNoteSameTick) {
    case 'sum-clamped':
      return Math.min(127, a.velocity + b.velocity);
    case 'priority': {
      const pa = policy.lanePriority?.[a.laneId] ?? 0;
      const pb = policy.lanePriority?.[b.laneId] ?? 0;
      return pa >= pb ? a.velocity : b.velocity;
    }
    case 'max':
    default:
      return Math.max(a.velocity, b.velocity);
  }
}

export interface RenderPolicy {
  mode: PercussionRenderMode;
  /** When true, each part may carry its native meter (multi-part export). */
  keepNativeMetersPerPart?: boolean;
}

export interface BlendArchitectureRecommendation {
  withinSongTransitions: 'section-based-hard-switch';
  sameBarBlendInternalGrid: 'dynamic-lcm-per-bar';
  notationStrategy: 'single-part-multi-voice' | 'separate-parts';
  defaultVelocityConflict: 'max';
}

export const recommendation: BlendArchitectureRecommendation = {
  withinSongTransitions: 'section-based-hard-switch',
  sameBarBlendInternalGrid: 'dynamic-lcm-per-bar',
  notationStrategy: 'separate-parts',
  defaultVelocityConflict: 'max',
};

export const pragmaticPlan = {
  sectionChanges: 'hard at bar boundary',
  sameBarInternalTiming: 'LCM per blended bar',
  defaultExportMode: 'separate-parts',
  advancedCompactExportMode: 'single-part-multi-voice',
  velocityCollisionRule: 'max for same-note, keep-both for different notes',
} as const;

export interface EnginePartAssignment {
  partId: string;
  engine: RhythmEngineId;
  presetId: string;
  meter: string;
  gridSteps: number;
}

export interface MultiPartScorePlan {
  parts: EnginePartAssignment[];
  syncByBarIndex: boolean;
}

export const simpleBlendPlan: MultiPartScorePlan = {
  parts: [
    {
      partId: 'P1',
      engine: 'afrobeat',
      presetId: 'tony_allen_basic',
      meter: '4/4',
      gridSteps: 16,
    },
    {
      partId: 'P2',
      engine: 'rebetiko',
      presetId: 'zeibekiko_9_8',
      meter: '9/8',
      gridSteps: 18,
    },
  ],
  syncByBarIndex: true,
};
