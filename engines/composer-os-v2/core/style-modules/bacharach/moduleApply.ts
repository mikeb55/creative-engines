/**
 * Bacharach style module — lightweight phrase asymmetry + melodic harmony bias.
 */

import type { CompositionContext } from '../../compositionContext';
import type { StyleModule } from '../styleModuleTypes';
import { BACHARACH_MODULE_ID } from './moduleTypes';

export function applyBacharach(context: CompositionContext): CompositionContext {
  const overrides = (context as { styleOverrides?: Record<string, unknown> }).styleOverrides ?? {};
  return {
    ...context,
    styleOverrides: {
      ...overrides,
      bacharach: {
        phraseAsymmetry: true,
        melodyFirstHarmony: true,
        chromaticPassingWeight: 0.32,
        avoidCadenceCliches: true,
        elegantColour: true,
      },
    },
  } as CompositionContext;
}

export const bacharachModule: StyleModule = {
  id: BACHARACH_MODULE_ID,
  modify: applyBacharach,
};
