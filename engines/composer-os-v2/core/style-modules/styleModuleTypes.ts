/**
 * Composer OS V2 — Style module types
 * Style modules are modifiers only; no independent generation pipelines.
 */

import type { CompositionContext } from '../compositionContext';

export type StyleModuleId = 'barry_harris' | 'metheny' | 'triad_pairs' | string;

export interface StyleModule {
  id: StyleModuleId;
  modify(context: CompositionContext): CompositionContext;
}

/** Style stack: primary shapes behaviour, secondary modifies, colour adds detail. */
export interface StyleStack {
  primary: 'barry_harris' | 'metheny';
  secondary?: 'metheny' | 'barry_harris';
  colour?: 'triad_pairs';
  weights: {
    primary: number;
    secondary?: number;
    colour?: number;
  };
}

export function normalizeStyleWeights(stack: StyleStack): { primary: number; secondary: number; colour: number } {
  let p = stack.weights.primary;
  let s = stack.weights.secondary ?? 0;
  let c = stack.weights.colour ?? 0;
  const total = p + s + c || 1;
  return { primary: p / total, secondary: s / total, colour: c / total };
}

export function styleStackToModuleIds(stack: StyleStack): string[] {
  const ids: string[] = [stack.primary];
  if (stack.secondary) ids.push(stack.secondary);
  if (stack.colour) ids.push(stack.colour);
  return ids;
}
