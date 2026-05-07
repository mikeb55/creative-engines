/**
 * Merge two rhythmic layers onto a common LCM pulse grid (e.g. 16 vs 18 → 144 pulses).
 * Buckets are per (`pulseIndex`, `midiNote`) so different drums at the same pulse stay distinct.
 */

import type { RhythmEngineId } from './songFormRhythmTypes';
import { lcm } from './rhythmPulseGrid';

export type ConflictStrategy = 'max' | 'sum-clamped' | 'priority';

export interface MergeLayerInput {
  engine: RhythmEngineId;
  laneId: string;
  midiNote: number;
  stepVelocities: number[];
  /** Higher wins when `strategy === 'priority'`. */
  priority?: number;
}

export interface MergedPulseContributor {
  engine: RhythmEngineId;
  laneId: string;
  midiNote: number;
  sourceStepIndex: number;
  sourceStepCount: number;
  velocity: number;
  priority: number;
}

export interface MergedPulseEvent {
  pulseIndex: number;
  midiNote: number;
  velocity: number;
  contributors: MergedPulseContributor[];
}

export interface MergedLayerOutput {
  pulsesPerBar: number;
  events: MergedPulseEvent[];
}

function bucketKey(pulseIndex: number, midiNote: number): string {
  return `${pulseIndex}\0${midiNote}`;
}

function contributorPriority(c: MergedPulseContributor): number {
  return c.priority;
}

export function mergeRhythmLayers(
  a: MergeLayerInput,
  b: MergeLayerInput,
  strategy: ConflictStrategy = 'max'
): MergedLayerOutput {
  const na = a.stepVelocities.length;
  const nb = b.stepVelocities.length;
  if (na < 1 || nb < 1) {
    throw new Error('mergeRhythmLayers: each layer needs at least one step');
  }
  const pulsesPerBar = lcm(na, nb);
  const aStride = pulsesPerBar / na;
  const bStride = pulsesPerBar / nb;

  const bucket = new Map<string, MergedPulseEvent>();

  const pushContributor = (layer: MergeLayerInput, stride: number) => {
    const pri = layer.priority ?? 0;
    layer.stepVelocities.forEach((velocity, sourceStepIndex) => {
      if (velocity <= 0) return;
      const pulseIndex = sourceStepIndex * stride;
      const key = bucketKey(pulseIndex, layer.midiNote);
      const existing = bucket.get(key) ?? {
        pulseIndex,
        midiNote: layer.midiNote,
        velocity: 0,
        contributors: [] as MergedPulseContributor[],
      };

      const contrib: MergedPulseContributor = {
        engine: layer.engine,
        laneId: layer.laneId,
        midiNote: layer.midiNote,
        sourceStepIndex,
        sourceStepCount: layer.stepVelocities.length,
        velocity,
        priority: pri,
      };
      existing.contributors.push(contrib);

      const contribs = existing.contributors;
      if (strategy === 'max') {
        existing.velocity = Math.max(...contribs.map((c) => c.velocity));
      } else if (strategy === 'sum-clamped') {
        existing.velocity = Math.min(127, contribs.reduce((s, c) => s + c.velocity, 0));
      } else {
        const sorted = contribs.slice().sort((x, y) => {
          const dp = contributorPriority(y) - contributorPriority(x);
          if (dp !== 0) return dp;
          return y.velocity - x.velocity;
        });
        existing.velocity = sorted[0]?.velocity ?? 0;
      }

      bucket.set(key, existing);
    });
  };

  pushContributor(a, aStride);
  pushContributor(b, bStride);

  return {
    pulsesPerBar,
    events: [...bucket.values()].sort((x, y) =>
      x.pulseIndex !== y.pulseIndex ? x.pulseIndex - y.pulseIndex : x.midiNote - y.midiNote
    ),
  };
}
