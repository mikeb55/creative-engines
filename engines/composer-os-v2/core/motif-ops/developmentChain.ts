/**
 * Developing variation: each step is applied to the previous result.
 * Lineage ids stay readable: m1, m1.r, m1.r.fh.
 */

import { applyOperator, type OperatorParams } from './operators';
import { lineageSuffix, type Motif, type OperatorId, type TransformStep } from './types';

export interface ChainPlanStep {
  op: OperatorId;
  params?: OperatorParams;
}

export interface DevelopmentChain {
  rootId: string;
  steps: TransformStep[];
  /** results[i] is the motif after steps[0..i]. */
  results: Motif[];
  lineageIds: string[];
}

export interface LineagePlacement {
  lineageId: string;
  bar: number;
  beat: number;
  op?: string;
}

export function buildChain(root: Motif, plan: readonly ChainPlanStep[]): DevelopmentChain {
  const rootId = root.id || 'm1';
  let current: Motif = { ...root, id: rootId, events: root.events.map((event) => ({ ...event })) };
  const steps: TransformStep[] = [];
  const results: Motif[] = [];
  const lineageIds = [rootId];
  for (const item of plan) {
    const applied = applyOperator(current, item.op, item.params);
    const toId = `${current.id}.${lineageSuffix(item.op)}`;
    const motif: Motif = { ...applied.motif, id: toId };
    const step: TransformStep = { ...applied.step, fromId: current.id, toId, params: { ...(item.params ?? {}) } };
    steps.push(step);
    results.push(motif);
    lineageIds.push(toId);
    current = motif;
  }
  return { rootId, steps, results, lineageIds };
}

export function placementsForChain(chain: DevelopmentChain, bars: readonly number[], beats: readonly number[] = []): LineagePlacement[] {
  return chain.lineageIds.map((lineageId, index) => ({
    lineageId,
    bar: bars[index] ?? index + 1,
    beat: beats[index] ?? 0,
    op: index === 0 ? undefined : chain.steps[index - 1]?.op,
  }));
}
